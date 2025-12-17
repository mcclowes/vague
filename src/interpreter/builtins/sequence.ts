import type { GeneratorContext } from '../context.js';

/**
 * Sequential/stateful function handlers
 */
export const sequenceFunctions = {
  /**
   * sequence(prefix, start?) - auto-incrementing values
   * e.g., sequence("INV-", 1001) returns "INV-1001", "INV-1002", etc.
   */
  sequence(args: unknown[], context: GeneratorContext): string {
    const prefix = (args[0] as string) ?? '';
    const start = (args[1] as number) ?? 1;

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
    const name = (args[0] as string) ?? 'default';
    const start = (args[1] as number) ?? 1;

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
    const fieldName = args[0] as string;
    if (!context.previous) {
      return null;
    }
    return (context.previous as Record<string, unknown>)[fieldName] ?? null;
  },
};
