import type { GeneratorContext } from '../context.js';
import type { Expression, CallExpression } from '../../ast/index.js';
import { everyWithContext, someWithContext } from './collection.js';

/**
 * Type for expression evaluator function passed from generator
 */
export type ExpressionEvaluator = (expr: Expression) => unknown;

/**
 * Create predicate function handlers.
 * These need access to expression evaluation for predicates.
 */
export function createPredicateFunctions(evaluateExpression: ExpressionEvaluator) {
  return {
    /**
     * all(collection, predicate) - returns true if predicate holds for all items
     * The predicate uses .field syntax to reference item fields
     */
    all(args: unknown[], context: GeneratorContext, callExpr: CallExpression): boolean {
      const arr = args[0];
      const predicate = callExpr.arguments[1]; // Get the raw AST node
      if (!Array.isArray(arr) || !predicate) return true;

      return everyWithContext(arr, context, () => Boolean(evaluateExpression(predicate)));
    },

    /**
     * some(collection, predicate) - returns true if predicate holds for at least one item
     */
    some(args: unknown[], context: GeneratorContext, callExpr: CallExpression): boolean {
      const arr = args[0];
      const predicate = callExpr.arguments[1];
      if (!Array.isArray(arr) || !predicate) return false;

      return someWithContext(arr, context, () => Boolean(evaluateExpression(predicate)));
    },

    /**
     * none(collection, predicate) - returns true if predicate holds for no items
     */
    none(args: unknown[], context: GeneratorContext, callExpr: CallExpression): boolean {
      const arr = args[0];
      const predicate = callExpr.arguments[1];
      if (!Array.isArray(arr) || !predicate) return true;

      return !someWithContext(arr, context, () => Boolean(evaluateExpression(predicate)));
    },
  };
}
