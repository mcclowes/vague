/**
 * Runtime type guards for safe type narrowing.
 * Use these instead of unsafe `as` casting throughout the codebase.
 */

/**
 * Check if a value is a non-null object (not an array).
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if a value is a number (not NaN or Infinity).
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Check if a value is a safe integer (within JavaScript's safe integer range).
 */
export function isSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value);
}

/**
 * Check if a value is a string.
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Check if a value is a boolean.
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Check if a value is an array.
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Check if a value is a non-empty array.
 */
export function isNonEmptyArray<T>(value: T[] | unknown): value is [T, ...T[]] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Check if a value is null or undefined.
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if a value is a Date object with a valid date.
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * Safely get a property from an object, returning undefined if not accessible.
 */
export function getProperty(obj: unknown, key: string): unknown {
  if (isRecord(obj) && key in obj) {
    return obj[key];
  }
  return undefined;
}

/**
 * Safely set a property on an object.
 * Returns true if successful, false if the object is not a record.
 */
export function setProperty(obj: unknown, key: string, value: unknown): boolean {
  if (isRecord(obj)) {
    obj[key] = value;
    return true;
  }
  return false;
}

/**
 * Assert that a value is a record, throwing a descriptive error if not.
 */
export function assertRecord(
  value: unknown,
  context: string
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    const actualType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
    throw new TypeError(`Expected object in ${context}, got ${actualType}`);
  }
}

/**
 * Assert that a value is a finite number, throwing a descriptive error if not.
 */
export function assertFiniteNumber(value: unknown, context: string): asserts value is number {
  if (!isFiniteNumber(value)) {
    const desc =
      typeof value === 'number'
        ? Number.isNaN(value)
          ? 'NaN'
          : 'Infinity'
        : `${typeof value} (${String(value)})`;
    throw new TypeError(`Expected finite number in ${context}, got ${desc}`);
  }
}

/**
 * Coerce a value to a number, returning a default if not a valid number.
 * This is safer than `as number` because it validates the type at runtime.
 */
export function toNumber(value: unknown, defaultValue: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return defaultValue;
}

/**
 * Coerce a value to a number or undefined.
 * Returns undefined if the value is not a valid number or is nullish.
 */
export function toNumberOrUndefined(value: unknown): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return undefined;
}

/**
 * Coerce a value to a string, returning a default if not a string.
 */
export function toString(value: unknown, defaultValue: string): string {
  if (typeof value === 'string') {
    return value;
  }
  return defaultValue;
}

/**
 * Coerce a value to a string or undefined.
 */
export function toStringOrUndefined(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  return undefined;
}

/**
 * Coerce a value to a number for arithmetic operations.
 * Returns 0 for non-numeric values to maintain backward compatibility,
 * but logs a warning in development.
 */
export function asNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  // Attempt coercion for string numbers
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  // Return 0 for non-numeric values
  return 0;
}
