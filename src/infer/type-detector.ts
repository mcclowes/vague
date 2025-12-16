/**
 * Type detection for schema inference.
 * Analyzes values to determine Vague primitive types.
 */

export type InferredType =
  | 'int'
  | 'decimal'
  | 'string'
  | 'date'
  | 'boolean'
  | 'null'
  | 'object'
  | 'array'
  | 'unknown';

/**
 * Detect the type of a single value
 */
export function detectValueType(value: unknown): InferredType {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'boolean') {
    return 'boolean';
  }

  if (typeof value === 'number') {
    // Check if it's an integer or decimal
    return Number.isInteger(value) ? 'int' : 'decimal';
  }

  if (typeof value === 'string') {
    // Check if it's a date string
    if (isDateString(value)) {
      return 'date';
    }
    // Check if it's a numeric string that should stay as string
    // (e.g., phone numbers, IDs with leading zeros)
    return 'string';
  }

  if (Array.isArray(value)) {
    return 'array';
  }

  if (typeof value === 'object') {
    return 'object';
  }

  return 'unknown';
}

/**
 * Check if a string looks like an ISO date
 */
function isDateString(value: string): boolean {
  // ISO 8601 date: YYYY-MM-DD
  const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;
  // ISO 8601 datetime: YYYY-MM-DDTHH:mm:ss...
  const dateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

  if (dateOnlyPattern.test(value) || dateTimePattern.test(value)) {
    // Validate it's actually a valid date
    const parsed = new Date(value);
    return !isNaN(parsed.getTime());
  }

  return false;
}

/**
 * Aggregate multiple value types into a single field type
 */
export function aggregateTypes(types: InferredType[]): {
  primaryType: InferredType;
  nullable: boolean;
  isArray: boolean;
  isObject: boolean;
} {
  const nonNullTypes = types.filter((t) => t !== 'null');
  const hasNull = types.includes('null');

  if (nonNullTypes.length === 0) {
    return { primaryType: 'null', nullable: true, isArray: false, isObject: false };
  }

  // Check for arrays
  if (nonNullTypes.includes('array')) {
    return { primaryType: 'array', nullable: hasNull, isArray: true, isObject: false };
  }

  // Check for objects
  if (nonNullTypes.includes('object')) {
    return { primaryType: 'object', nullable: hasNull, isArray: false, isObject: true };
  }

  // Get unique non-null types
  const uniqueTypes = [...new Set(nonNullTypes)];

  if (uniqueTypes.length === 1) {
    return { primaryType: uniqueTypes[0], nullable: hasNull, isArray: false, isObject: false };
  }

  // Mixed int and decimal -> decimal
  if (uniqueTypes.length === 2 && uniqueTypes.includes('int') && uniqueTypes.includes('decimal')) {
    return { primaryType: 'decimal', nullable: hasNull, isArray: false, isObject: false };
  }

  // Mixed types - default to string (most permissive)
  return { primaryType: 'string', nullable: hasNull, isArray: false, isObject: false };
}

/**
 * Analyze all values for a field and determine its type
 */
export function detectFieldType(values: unknown[]): {
  type: InferredType;
  nullable: boolean;
  isArray: boolean;
  isObject: boolean;
  allValues: unknown[];
} {
  const types = values.map(detectValueType);
  const aggregated = aggregateTypes(types);

  return {
    type: aggregated.primaryType,
    nullable: aggregated.nullable,
    isArray: aggregated.isArray,
    isObject: aggregated.isObject,
    allValues: values,
  };
}
