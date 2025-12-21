import type { GeneratorContext } from '../context.js';
import type { CallExpression, Expression } from '../../ast/index.js';
import { warningCollector, createUniqueExhaustionWarning } from '../../warnings.js';

/**
 * Type for expression evaluator function passed from generator
 */
export type ExpressionEvaluator = (expr: Expression) => unknown;

/**
 * Pre-computed powers of 10 for common decimal precisions (0-10).
 * Avoids repeated Math.pow() calls in hot paths.
 */
const POWER_OF_10: number[] = [
  1, 10, 100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000, 10000000000,
];

/**
 * Get power of 10 with caching for common values.
 */
function getPowerOf10(decimals: number): number {
  if (decimals >= 0 && decimals < POWER_OF_10.length) {
    return POWER_OF_10[decimals];
  }
  return Math.pow(10, decimals);
}

/**
 * Math function handlers for round, floor, ceil
 */
export const mathFunctions = {
  /**
   * round(value, decimals?) - round to specified decimal places (default 0)
   */
  round(args: unknown[], _context: GeneratorContext): number {
    const value = args[0] as number;
    const decimals = (args[1] as number) ?? 0;
    const factor = getPowerOf10(decimals);
    return Math.round(value * factor) / factor;
  },

  /**
   * floor(value, decimals?) - floor to specified decimal places (default 0)
   */
  floor(args: unknown[], _context: GeneratorContext): number {
    const value = args[0] as number;
    const decimals = (args[1] as number) ?? 0;
    const factor = getPowerOf10(decimals);
    return Math.floor(value * factor) / factor;
  },

  /**
   * ceil(value, decimals?) - ceil to specified decimal places (default 0)
   */
  ceil(args: unknown[], _context: GeneratorContext): number {
    const value = args[0] as number;
    const decimals = (args[1] as number) ?? 0;
    const factor = getPowerOf10(decimals);
    return Math.ceil(value * factor) / factor;
  },
};

/**
 * Create the unique function handler.
 * Needs access to expression evaluation for the generator expression.
 */
export function createUniqueFn(evaluateExpression: ExpressionEvaluator) {
  /**
   * unique(key, generator_expr) - ensures generated value is unique within key namespace
   * The key identifies the uniqueness scope (e.g., "invoices.id")
   * Retries generation up to 100 times to find a unique value
   */
  return function unique(
    args: unknown[],
    context: GeneratorContext,
    callExpr: CallExpression
  ): unknown {
    const key = args[0] as string;
    const generatorExpr = callExpr.arguments[1];

    if (!context.uniqueValues.has(key)) {
      context.uniqueValues.set(key, new Set());
    }
    const usedValues = context.uniqueValues.get(key)!;

    const maxAttempts = 100;
    for (let i = 0; i < maxAttempts; i++) {
      const value = evaluateExpression(generatorExpr);
      if (!usedValues.has(value)) {
        usedValues.add(value);
        return value;
      }
    }
    // Fallback: return last generated value with warning
    const [schemaName, fieldName] = key.split('.');
    warningCollector.add(
      createUniqueExhaustionWarning(schemaName || 'unknown', fieldName || key, maxAttempts)
    );
    return evaluateExpression(generatorExpr);
  };
}
