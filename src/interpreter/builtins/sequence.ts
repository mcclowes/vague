import type { GeneratorContext } from '../context.js';
import { isString, isFiniteNumber, isRecord, getProperty } from '../../utils/type-guards.js';

/**
 * Sequential/stateful function handlers
 */
export const sequenceFunctions = {
  /**
   * sequence(prefix, start?) - auto-incrementing values
   * e.g., sequence("INV-", 1001) returns "INV-1001", "INV-1002", etc.
   */
  sequence(args: unknown[], context: GeneratorContext): string {
    const prefix = isString(args[0]) ? args[0] : '';
    const start = isFiniteNumber(args[1]) ? args[1] : 1;

    const key = `seq:${prefix}`;
    if (!context.sequences.has(key)) {
      context.sequences.set(key, start);
    }

    const current = context.sequences.get(key)!;
    context.sequences.set(key, current + 1);

    return `${prefix}${current}`;
  },

  /**
   * sequenceInt(name, start?) - auto-incrementing integer
   * e.g., sequenceInt("order_id", 1000) returns 1000, 1001, 1002, etc.
   */
  sequenceInt(args: unknown[], context: GeneratorContext): number {
    const name = isString(args[0]) ? args[0] : 'default';
    const start = isFiniteNumber(args[1]) ? args[1] : 1;

    const key = `seqInt:${name}`;
    if (!context.sequences.has(key)) {
      context.sequences.set(key, start);
    }

    const current = context.sequences.get(key)!;
    context.sequences.set(key, current + 1);

    return current;
  },

  /**
   * previous(field) - get field from previous record in collection
   * Returns null if no previous record exists
   */
  previous(args: unknown[], context: GeneratorContext): unknown {
    const fieldName = isString(args[0]) ? args[0] : '';
    if (!context.previous || !isRecord(context.previous)) {
      return null;
    }
    return getProperty(context.previous, fieldName) ?? null;
  },
};
