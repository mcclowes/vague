import type { GeneratorContext } from '../context.js';
import { isRecord } from '../../utils/type-guards.js';

/**
 * Safely coerce an unknown value to a record for context assignment.
 * Returns an empty object if the value is not a valid record.
 */
function toRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

/**
 * Iterates over a collection, setting context.current to each item
 * and evaluating a callback. Properly saves/restores context.current.
 *
 * @param arr - The collection to iterate over
 * @param context - The generator context
 * @param callback - Function called for each item, receives the item
 * @returns Array of callback results
 */
export function mapWithContext<T>(
  arr: unknown[],
  context: GeneratorContext,
  callback: (item: Record<string, unknown>) => T
): T[] {
  const oldCurrent = context.current;
  try {
    return arr.map((item) => {
      const record = toRecord(item);
      context.current = record;
      return callback(record);
    });
  } finally {
    context.current = oldCurrent;
  }
}

/**
 * Filters a collection using a predicate, setting context.current for each evaluation.
 *
 * @param arr - The collection to filter
 * @param context - The generator context
 * @param predicate - Function that returns true to include the item
 * @returns Filtered array
 */
export function filterWithContext(
  arr: unknown[],
  context: GeneratorContext,
  predicate: (item: Record<string, unknown>) => boolean
): unknown[] {
  const oldCurrent = context.current;
  try {
    return arr.filter((item) => {
      const record = toRecord(item);
      context.current = record;
      return predicate(record);
    });
  } finally {
    context.current = oldCurrent;
  }
}

/**
 * Checks if all items in a collection satisfy a predicate.
 *
 * @param arr - The collection to check
 * @param context - The generator context
 * @param predicate - Function that returns true if condition is met
 * @returns true if all items satisfy the predicate
 */
export function everyWithContext(
  arr: unknown[],
  context: GeneratorContext,
  predicate: (item: Record<string, unknown>) => boolean
): boolean {
  const oldCurrent = context.current;
  try {
    for (const item of arr) {
      const record = toRecord(item);
      context.current = record;
      if (!predicate(record)) {
        return false;
      }
    }
    return true;
  } finally {
    context.current = oldCurrent;
  }
}

/**
 * Checks if any item in a collection satisfies a predicate.
 *
 * @param arr - The collection to check
 * @param context - The generator context
 * @param predicate - Function that returns true if condition is met
 * @returns true if at least one item satisfies the predicate
 */
export function someWithContext(
  arr: unknown[],
  context: GeneratorContext,
  predicate: (item: Record<string, unknown>) => boolean
): boolean {
  const oldCurrent = context.current;
  try {
    for (const item of arr) {
      const record = toRecord(item);
      context.current = record;
      if (predicate(record)) {
        return true;
      }
    }
    return false;
  } finally {
    context.current = oldCurrent;
  }
}
