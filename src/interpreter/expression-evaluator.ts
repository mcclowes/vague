/**
 * Expression Evaluator - Handles evaluation of AST expressions to values
 */
import {
  Expression,
  Literal,
  SuperpositionExpression,
  RangeExpression,
  CallExpression,
  BinaryExpression,
  UnaryExpression,
  ParentReference,
  AnyOfExpression,
  LogicalExpression,
  NotExpression,
  TernaryExpression,
  MatchExpression,
} from '../ast/index.js';
import {
  isDuration,
  addDurationToDate,
  subtractDurationFromDate,
  type Duration,
} from '../plugins/date.js';
import { isRecord, isArray, getProperty, asNumber } from '../utils/type-guards.js';
import { GeneratorContext } from './context.js';
import { getGenerator } from './plugin.js';
import {
  aggregateFunctions,
  createPredicateFunctions,
  mathFunctions,
  createUniqueFn,
  distributionFunctions,
  dateFunctions,
  stringFunctions,
  sequenceFunctions,
  filterWithContext,
} from './builtins/index.js';

// Pre-computed Set for primitive type checks (faster than array.includes in hot paths)
const PRIMITIVE_TYPES = new Set(['string', 'int', 'decimal', 'boolean', 'date']);

export interface ExpressionEvaluatorDeps {
  generatePrimitive: (
    type: 'int' | 'decimal' | 'string' | 'date' | 'boolean',
    fieldName?: string,
    precision?: number
  ) => unknown;
  resolveFromObject: (obj: Record<string, unknown>, parts: string[]) => unknown;
}

export class ExpressionEvaluator {
  private ctx: GeneratorContext;
  private deps: ExpressionEvaluatorDeps;
  private predicateFunctions: ReturnType<typeof createPredicateFunctions>;
  private uniqueFn: ReturnType<typeof createUniqueFn>;

  constructor(ctx: GeneratorContext, deps: ExpressionEvaluatorDeps) {
    this.ctx = ctx;
    this.deps = deps;
    this.predicateFunctions = createPredicateFunctions(this.evaluate.bind(this));
    this.uniqueFn = createUniqueFn(this.evaluate.bind(this));
  }

  /**
   * Evaluate an AST expression to a runtime value
   */
  evaluate(expr: Expression): unknown {
    switch (expr.type) {
      case 'Literal':
        return (expr as Literal).value;

      case 'Identifier': {
        const name = (expr as { name: string }).name;
        // Check if it's a primitive type name (for superposition like "string | null")
        if (PRIMITIVE_TYPES.has(name)) {
          return this.deps.generatePrimitive(
            name as 'string' | 'int' | 'decimal' | 'boolean' | 'date'
          );
        }
        // Check let bindings (e.g., let teamNames = "A" | "B" | "C")
        if (this.ctx.bindings.has(name)) {
          return this.evaluate(this.ctx.bindings.get(name)!);
        }
        // Check collections first (for dataset-level validation)
        if (this.ctx.collections.has(name)) {
          return this.ctx.collections.get(name);
        }
        // Then check current instance context
        return this.ctx.current?.[name] ?? null;
      }

      case 'QualifiedName': {
        const parts = (expr as { parts: string[] }).parts;
        return this.resolveReference(parts);
      }

      case 'SuperpositionExpression':
        return this.pickWeighted((expr as SuperpositionExpression).options);

      case 'RangeExpression': {
        const range = expr as RangeExpression;
        const min = range.min ? asNumber(this.evaluate(range.min)) : 0;
        const max = range.max ? asNumber(this.evaluate(range.max)) : 100;
        // Return range object - caller can use it as bounds or pick a random value
        return { min, max };
      }

      case 'CallExpression':
        return this.evaluateCall(expr as CallExpression);

      case 'BinaryExpression':
        return this.evaluateBinary(expr as BinaryExpression);

      case 'ParentReference': {
        const ref = expr as ParentReference;
        if (this.ctx.parent) {
          return this.deps.resolveFromObject(this.ctx.parent, ref.path.parts);
        }
        return null;
      }

      case 'AnyOfExpression': {
        const anyOf = expr as AnyOfExpression;
        const collectionName =
          anyOf.collection.type === 'Identifier'
            ? (anyOf.collection as { name: string }).name
            : null;
        if (collectionName) {
          let items = this.ctx.collections.get(collectionName);
          if (items && items.length > 0) {
            // Apply where clause filter if present
            if (anyOf.condition) {
              items = filterWithContext(items, this.ctx, () =>
                Boolean(this.evaluate(anyOf.condition!))
              ) as Record<string, unknown>[];
            }
            if (items.length > 0) {
              return items[Math.floor(this.ctx.rng.random() * items.length)];
            }
          }
        }
        return null;
      }

      case 'LogicalExpression': {
        const logical = expr as LogicalExpression;
        const left = Boolean(this.evaluate(logical.left));
        if (logical.operator === 'and') {
          // Short-circuit: if left is false, return false
          if (!left) return false;
          return Boolean(this.evaluate(logical.right));
        } else {
          // or: short-circuit: if left is true, return true
          if (left) return true;
          return Boolean(this.evaluate(logical.right));
        }
      }

      case 'NotExpression': {
        const not = expr as NotExpression;
        return !this.evaluate(not.operand);
      }

      case 'TernaryExpression': {
        const ternary = expr as TernaryExpression;
        const condition = Boolean(this.evaluate(ternary.condition));
        return condition ? this.evaluate(ternary.consequent) : this.evaluate(ternary.alternate);
      }

      case 'MatchExpression': {
        const matchExpr = expr as MatchExpression;
        const value = this.evaluate(matchExpr.value);
        for (const arm of matchExpr.arms) {
          const pattern = this.evaluate(arm.pattern);
          if (value === pattern) {
            return this.evaluate(arm.result);
          }
        }
        // No match found - return null
        return null;
      }

      case 'UnaryExpression': {
        const unary = expr as UnaryExpression;
        const operand = asNumber(this.evaluate(unary.operand));
        if (unary.operator === '-') {
          return -operand;
        }
        // '+' operator returns the value as-is
        return operand;
      }

      case 'OrderedSequenceType': {
        // OrderedSequenceType is primarily handled in field-generator, but can appear in expressions
        // When evaluated directly, pick a random element from the sequence
        const seqType = expr as { elements: Expression[] };
        if (seqType.elements.length === 0) {
          return null;
        }
        const idx = Math.floor(this.ctx.rng.random() * seqType.elements.length);
        return this.evaluate(seqType.elements[idx]);
      }

      default: {
        // Exhaustiveness check: if we get here, we have an unhandled expression type
        const _exhaustiveCheck: never = expr;
        throw new Error(
          `Unhandled expression type: ${(expr as { type: string }).type}. ` +
            `This is a bug in Vague - please report it.`
        );
      }
    }
  }

  /**
   * Evaluate a condition expression, temporarily setting current context
   */
  evaluateCondition(condition: Expression, instance: Record<string, unknown>): boolean {
    const oldCurrent = this.ctx.current;
    this.ctx.current = instance;
    const result = this.evaluate(condition);
    this.ctx.current = oldCurrent;
    return Boolean(result);
  }

  /**
   * Weighted random selection from superposition options
   */
  pickWeighted(options: { weight?: number; value: Expression }[]): unknown {
    // If no weights, equal probability
    const hasWeights = options.some((o) => o.weight !== undefined);

    let result: unknown;
    if (!hasWeights) {
      const idx = Math.floor(this.ctx.rng.random() * options.length);
      result = this.evaluate(options[idx].value);
    } else {
      // Weighted selection with support for mixed weighted/unweighted options
      const explicitWeights = options.filter((o) => o.weight !== undefined);
      const unweightedOptions = options.filter((o) => o.weight === undefined);
      const totalExplicitWeight = explicitWeights.reduce((sum, o) => sum + o.weight!, 0);

      // Calculate weight for unweighted options
      let implicitWeight = 0;
      if (unweightedOptions.length > 0) {
        const remainingWeight = Math.max(0, 1 - totalExplicitWeight);
        implicitWeight = remainingWeight / unweightedOptions.length;
      }

      // Total weight is explicit weights + implicit weights for unweighted options
      const totalWeight = totalExplicitWeight + implicitWeight * unweightedOptions.length;
      let r = this.ctx.rng.random() * totalWeight;

      for (const option of options) {
        const optionWeight = option.weight ?? implicitWeight;
        r -= optionWeight;
        if (r <= 0) {
          result = this.evaluate(option.value);
          break;
        }
      }

      if (result === undefined) {
        result = this.evaluate(options[options.length - 1].value);
      }
    }

    // If result is a range object, pick a random value from it
    if (result && typeof result === 'object' && 'min' in result && 'max' in result) {
      const min = asNumber((result as { min: unknown }).min);
      const max = asNumber((result as { max: unknown }).max);
      return Math.floor(this.ctx.rng.random() * (max - min + 1)) + min;
    }

    return result;
  }

  /**
   * Resolve a qualified reference path to a value
   */
  private resolveReference(parts: string[]): unknown {
    let value: unknown = this.ctx.current;

    // First part might be a let binding
    const [first, ...rest] = parts;
    if (this.ctx.bindings.has(first) && rest.length === 0) {
      const binding = this.ctx.bindings.get(first);
      return binding !== undefined ? this.evaluate(binding) : null;
    }

    // First part might be a collection name
    if (this.ctx.collections.has(first)) {
      value = this.ctx.collections.get(first);
      if (rest.length === 0) {
        return value;
      }
      for (const part of rest) {
        if (isArray(value)) {
          value = value
            .map((item) => (isRecord(item) ? getProperty(item, part) : null))
            .filter((v) => v !== null);
        } else if (isRecord(value)) {
          value = getProperty(value, part);
        } else {
          return null;
        }
      }
      return value;
    }

    // Otherwise start from current context
    for (const part of parts) {
      if (isArray(value)) {
        value = value
          .map((item) => (isRecord(item) ? getProperty(item, part) : null))
          .filter((v) => v !== null);
      } else if (isRecord(value)) {
        value = getProperty(value, part);
      } else {
        return null;
      }
    }

    return value;
  }

  private evaluateCall(call: CallExpression): unknown {
    const args = call.arguments.map((a) => this.evaluate(a));

    // Check aggregate functions
    if (call.callee in aggregateFunctions) {
      return aggregateFunctions[call.callee as keyof typeof aggregateFunctions](args, this.ctx);
    }

    // Check math functions
    if (call.callee in mathFunctions) {
      return mathFunctions[call.callee as keyof typeof mathFunctions](args, this.ctx);
    }

    // Check distribution functions
    if (call.callee in distributionFunctions) {
      return distributionFunctions[call.callee as keyof typeof distributionFunctions](
        args,
        this.ctx
      );
    }

    // Check date functions
    if (call.callee in dateFunctions) {
      return dateFunctions[call.callee as keyof typeof dateFunctions](args, this.ctx);
    }

    // Check string functions
    if (call.callee in stringFunctions) {
      return stringFunctions[call.callee as keyof typeof stringFunctions](args, this.ctx);
    }

    // Check sequence functions
    if (call.callee in sequenceFunctions) {
      return sequenceFunctions[call.callee as keyof typeof sequenceFunctions](args, this.ctx);
    }

    // Check predicate functions
    if (call.callee in this.predicateFunctions) {
      return this.predicateFunctions[call.callee as keyof typeof this.predicateFunctions](
        args,
        this.ctx,
        call
      );
    }

    // Check unique function
    if (call.callee === 'unique') {
      return this.uniqueFn(args, this.ctx, call);
    }

    // Try plugin generator lookup
    const generator = getGenerator(call.callee);
    if (generator) {
      return generator(args, this.ctx);
    }

    throw new Error(
      `Unknown function: '${call.callee}'. ` +
        `Check that the function name is spelled correctly or that the required plugin is registered.`
    );
  }

  private evaluateBinary(expr: BinaryExpression): unknown {
    const left = this.evaluate(expr.left);
    const right = this.evaluate(expr.right);

    switch (expr.operator) {
      case '+':
        // Date arithmetic: date string + Duration = new date string
        if (typeof left === 'string' && isDuration(right)) {
          return addDurationToDate(left, right as Duration);
        }
        // Duration + date string (commutative)
        if (isDuration(left) && typeof right === 'string') {
          return addDurationToDate(right, left as Duration);
        }
        return asNumber(left) + asNumber(right);
      case '-':
        // Date arithmetic: date string - Duration = new date string
        if (typeof left === 'string' && isDuration(right)) {
          return subtractDurationFromDate(left, right as Duration);
        }
        return asNumber(left) - asNumber(right);
      case '*':
        return asNumber(left) * asNumber(right);
      case '/': {
        const divisor = asNumber(right);
        if (divisor === 0) {
          throw new Error('Division by zero');
        }
        return asNumber(left) / divisor;
      }
      case '==':
        return left === right;
      case '<':
        // Support both numeric and string (date) comparisons
        if (typeof left === 'string' && typeof right === 'string') {
          return left < right;
        }
        return asNumber(left) < asNumber(right);
      case '>':
        if (typeof left === 'string' && typeof right === 'string') {
          return left > right;
        }
        return asNumber(left) > asNumber(right);
      case '<=':
        if (typeof left === 'string' && typeof right === 'string') {
          return left <= right;
        }
        return asNumber(left) <= asNumber(right);
      case '>=':
        if (typeof left === 'string' && typeof right === 'string') {
          return left >= right;
        }
        return asNumber(left) >= asNumber(right);
      default:
        throw new Error(
          `Unknown binary operator: '${expr.operator}'. ` +
            `This is a bug in Vague - please report it.`
        );
    }
  }
}
