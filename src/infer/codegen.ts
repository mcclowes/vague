/**
 * Code generation for schema inference.
 * Produces Vague source code from inferred schema information.
 */

import { InferredType } from './type-detector.js';
import { NumericRange, DateRange } from './range-detector.js';
import { SuperpositionOption } from './enum-detector.js';
import { DetectedFormat } from './format-detector.js';

/**
 * Information about an inferred field
 */
export interface InferredField {
  name: string;
  type: InferredType;
  nullable: boolean;
  unique: boolean;

  // Range info (for numeric/date types)
  numericRange?: NumericRange;
  dateRange?: DateRange;

  // Superposition info (for enum-like fields)
  isSuperposition: boolean;
  superpositionOptions?: SuperpositionOption[];
  hasEqualWeights?: boolean;

  // Format info (for string fields)
  format?: DetectedFormat;
  generator?: string; // e.g., "uuid()", "email()"

  // Array/object info
  isArray: boolean;
  arrayCardinality?: { min: number; max: number };
  nestedSchemaName?: string; // For nested objects/arrays of objects
}

/**
 * Information about an inferred schema
 */
export interface InferredSchema {
  name: string;
  fields: InferredField[];
  recordCount: number;
}

/**
 * Convert a value to its Vague string representation
 */
function valueToVague(value: unknown): string {
  if (typeof value === 'string') {
    // Escape quotes in strings
    const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    return `"${escaped}"`;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value === null) {
    return 'null';
  }
  return JSON.stringify(value);
}

/**
 * Generate the type expression for a field
 */
function generateFieldType(field: InferredField): string {
  // Generator function (e.g., uuid(), email())
  if (field.generator) {
    return `= ${field.generator}`;
  }

  // Superposition (enum-like)
  if (
    field.isSuperposition &&
    field.superpositionOptions &&
    field.superpositionOptions.length > 0
  ) {
    const options = field.superpositionOptions;

    // Determine if we should include weights
    const includeWeights = !field.hasEqualWeights && options.length > 1;

    const parts = options.map((opt) => {
      const valueStr = valueToVague(opt.value);
      if (includeWeights) {
        // Round weight to 2 decimal places
        const weight = Math.round(opt.weight * 100) / 100;
        return `${weight}: ${valueStr}`;
      }
      return valueStr;
    });

    return parts.join(' | ');
  }

  // Date type
  if (field.type === 'date') {
    if (field.dateRange) {
      const { minYear, maxYear } = field.dateRange;
      if (minYear === maxYear) {
        return `date in ${minYear}..${minYear}`;
      }
      return `date in ${minYear}..${maxYear}`;
    }
    return 'date';
  }

  // Numeric types with range
  if ((field.type === 'int' || field.type === 'decimal') && field.numericRange) {
    const { min, max, allInteger } = field.numericRange;
    const typeStr = allInteger ? 'int' : 'decimal';

    if (min === max) {
      // Single value - just use the value directly
      return String(min);
    }

    const uniquePrefix = field.unique ? 'unique ' : '';
    return `${uniquePrefix}${typeStr} in ${min}..${max}`;
  }

  // Array type
  if (field.isArray && field.nestedSchemaName) {
    const cardinality = field.arrayCardinality;
    if (cardinality) {
      if (cardinality.min === cardinality.max) {
        return `${cardinality.min} * ${field.nestedSchemaName}`;
      }
      return `${cardinality.min}..${cardinality.max} * ${field.nestedSchemaName}`;
    }
    return `0..10 * ${field.nestedSchemaName}`;
  }

  // Object type (nested schema)
  if (field.type === 'object' && field.nestedSchemaName) {
    return field.nestedSchemaName;
  }

  // Basic types
  const uniquePrefix = field.unique ? 'unique ' : '';
  switch (field.type) {
    case 'int':
      return `${uniquePrefix}int`;
    case 'decimal':
      return `${uniquePrefix}decimal`;
    case 'boolean':
      return 'boolean';
    case 'string':
      return `${uniquePrefix}string`;
    default:
      return 'string';
  }
}

/**
 * Generate Vague source code for a single schema
 */
export function generateSchema(schema: InferredSchema): string {
  const lines: string[] = [];

  lines.push(`schema ${schema.name} {`);

  for (let i = 0; i < schema.fields.length; i++) {
    const field = schema.fields[i];
    const typeExpr = generateFieldType(field);
    const nullableSuffix = field.nullable && !field.isSuperposition ? '?' : '';
    const comma = i < schema.fields.length - 1 ? ',' : '';

    lines.push(`  ${field.name}: ${typeExpr}${nullableSuffix}${comma}`);
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Generate Vague source code for a complete dataset
 */
export function generateDataset(
  schemas: InferredSchema[],
  datasetName: string = 'Generated'
): string {
  const lines: string[] = [];

  // Generate all schemas first
  for (const schema of schemas) {
    lines.push(generateSchema(schema));
    lines.push('');
  }

  // Generate dataset definition
  lines.push(`dataset ${datasetName} {`);

  for (let i = 0; i < schemas.length; i++) {
    const schema = schemas[i];
    // Convert PascalCase to snake_case for collection name
    const collectionName = toSnakeCase(schema.name) + 's';
    const comma = i < schemas.length - 1 ? ',' : '';

    lines.push(`  ${collectionName}: ${schema.recordCount} * ${schema.name}${comma}`);
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Convert PascalCase to snake_case
 */
function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

/**
 * Convert snake_case or kebab-case to PascalCase
 */
export function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

/**
 * Singularize a plural collection name (basic rules)
 */
export function singularize(str: string): string {
  if (str.endsWith('ies')) {
    return str.slice(0, -3) + 'y';
  }
  if (
    str.endsWith('es') &&
    (str.endsWith('sses') ||
      str.endsWith('xes') ||
      str.endsWith('zes') ||
      str.endsWith('ches') ||
      str.endsWith('shes'))
  ) {
    return str.slice(0, -2);
  }
  if (str.endsWith('s') && !str.endsWith('ss')) {
    return str.slice(0, -1);
  }
  return str;
}
