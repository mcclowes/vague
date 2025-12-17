/**
 * Schema inference module.
 * Reverse-engineers Vague schemas from JSON data.
 */

export { detectValueType, detectFieldType, aggregateTypes } from './type-detector.js';
export type { InferredType } from './type-detector.js';

export {
  detectNumericRange,
  detectDateRange,
  detectArrayCardinality,
  detectUniqueness,
} from './range-detector.js';
export type { NumericRange, DateRange } from './range-detector.js';

export { detectSuperposition, formatWeight, shouldIncludeWeights } from './enum-detector.js';
export type {
  SuperpositionOption,
  SuperpositionResult,
  EnumDetectorConfig,
} from './enum-detector.js';

export { detectFormat, getGeneratorForFormat, detectFieldNamePattern } from './format-detector.js';
export type { DetectedFormat } from './format-detector.js';

export {
  generateSchema,
  generateDataset,
  toPascalCase,
  singularize,
  toValidIdentifier,
} from './codegen.js';
export type { InferredField, InferredSchema } from './codegen.js';

export { detectCorrelations, constraintsToVague } from './correlation-detector.js';
export type {
  InferredConstraint,
  OrderingConstraint,
  DerivedConstraint,
  ConditionalConstraint,
  CorrelationOptions,
} from './correlation-detector.js';

import { detectFieldType } from './type-detector.js';
import {
  detectNumericRange,
  detectDateRange,
  detectArrayCardinality,
  detectUniqueness,
} from './range-detector.js';
import { detectSuperposition } from './enum-detector.js';
import { detectFormat, getGeneratorForFormat, detectFieldNamePattern } from './format-detector.js';
import {
  InferredField,
  InferredSchema,
  generateDataset,
  toPascalCase,
  singularize,
  toValidIdentifier,
} from './codegen.js';
import {
  detectCorrelations,
  InferredConstraint,
  DerivedConstraint,
  OrderingConstraint,
  ConditionalConstraint,
  constraintsToVague,
} from './correlation-detector.js';

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitize field names in a constraint
 */
function sanitizeConstraint(constraint: InferredConstraint): InferredConstraint {
  if (constraint.type === 'ordering') {
    const c = constraint as OrderingConstraint;
    return {
      ...c,
      fieldA: toValidIdentifier(c.fieldA),
      fieldB: toValidIdentifier(c.fieldB),
    };
  } else if (constraint.type === 'conditional') {
    const c = constraint as ConditionalConstraint;
    // Sanitize field names in condition and assertion
    const sanitizedCondition = c.condition.replace(
      /\b(\w+)\s*(==|!=|>=|<=|>|<)/g,
      (match, field, op) => `${toValidIdentifier(field)} ${op}`
    );
    const sanitizedAssertion = c.assertion.replace(
      /\b(\w+)\s*(==|!=|>=|<=|>|<)\s*(\w+)/g,
      (match, field1, op, field2) => {
        // Check if field2 is a number
        if (/^\d+(\.\d+)?$/.test(field2)) {
          return `${toValidIdentifier(field1)} ${op} ${field2}`;
        }
        return `${toValidIdentifier(field1)} ${op} ${toValidIdentifier(field2)}`;
      }
    );
    return {
      ...c,
      condition: sanitizedCondition,
      assertion: sanitizedAssertion,
      conditionField: toValidIdentifier(c.conditionField),
    };
  }
  return constraint;
}

/**
 * Options for schema inference
 */
export interface InferOptions {
  /** Name for the generated dataset (default: "Generated") */
  datasetName?: string;
  /** Detect and use generator functions for known patterns (default: true) */
  detectFormats?: boolean;
  /** Detect weighted superpositions (default: true) */
  weightedSuperpositions?: boolean;
  /** Maximum unique values for enum detection (default: 10) */
  maxEnumValues?: number;
  /** Detect unique fields (default: true) */
  detectUnique?: boolean;
  /** Detect correlations between fields (ordering, derived, conditional) (default: true) */
  detectCorrelations?: boolean;
  /** Minimum confidence for correlation detection (default: 0.95) */
  correlationConfidence?: number;
}

const DEFAULT_OPTIONS: Required<InferOptions> = {
  datasetName: 'Generated',
  detectFormats: true,
  weightedSuperpositions: true,
  maxEnumValues: 10,
  detectUnique: true,
  detectCorrelations: true,
  correlationConfidence: 0.95,
};

/**
 * Infer a Vague schema from JSON data
 *
 * @param data - Object with collection names as keys and arrays of records as values
 * @param options - Inference options
 * @returns Vague source code as a string
 *
 * @example
 * ```typescript
 * const data = {
 *   invoices: [
 *     { id: 1, status: "paid", total: 100.50 },
 *     { id: 2, status: "draft", total: 250.00 }
 *   ]
 * };
 *
 * const vagueCode = inferSchema(data);
 * // Returns Vague source code
 * ```
 */
export function inferSchema(data: Record<string, unknown[]>, options: InferOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const schemas: InferredSchema[] = [];
  const nestedSchemas: Map<string, InferredSchema> = new Map();

  // Process each collection
  for (const [collectionName, records] of Object.entries(data)) {
    if (!Array.isArray(records) || records.length === 0) {
      continue;
    }

    // Derive schema name from collection name
    const schemaName = toPascalCase(singularize(collectionName));

    const schema = inferSchemaFromRecords(schemaName, records, opts, nestedSchemas);

    schemas.push(schema);
  }

  // Add nested schemas first (they need to be defined before being referenced)
  const allSchemas = [...nestedSchemas.values(), ...schemas];

  return generateDataset(allSchemas, opts.datasetName);
}

/**
 * Infer schema from an array of records
 */
function inferSchemaFromRecords(
  schemaName: string,
  records: unknown[],
  options: Required<InferOptions>,
  nestedSchemas: Map<string, InferredSchema>
): InferredSchema {
  // Get all unique field names across records
  const fieldNames = new Set<string>();
  for (const record of records) {
    if (typeof record === 'object' && record !== null) {
      for (const key of Object.keys(record)) {
        fieldNames.add(key);
      }
    }
  }

  const fields: InferredField[] = [];

  for (const fieldName of fieldNames) {
    // Collect all values for this field
    const values: unknown[] = [];
    for (const record of records) {
      if (typeof record === 'object' && record !== null) {
        const rec = record as Record<string, unknown>;
        values.push(rec[fieldName]);
      }
    }

    const field = inferFieldFromValues(fieldName, values, schemaName, options, nestedSchemas);

    fields.push(field);
  }

  // Detect correlations between fields
  let constraints: string[] = [];
  let derivedFields: Map<string, string> | undefined;

  if (options.detectCorrelations && records.length >= 2) {
    const typedRecords = records.filter(
      (r): r is Record<string, unknown> => typeof r === 'object' && r !== null
    );

    if (typedRecords.length >= 2) {
      const correlations = detectCorrelations(typedRecords, {
        minConfidence: options.correlationConfidence,
      });

      // Separate derived fields from other constraints
      // Sanitize field names to valid identifiers
      derivedFields = new Map();
      const otherConstraints: InferredConstraint[] = [];

      for (const corr of correlations) {
        if (corr.type === 'derived') {
          const derived = corr as DerivedConstraint;
          // Sanitize the target field and expression
          const sanitizedTarget = toValidIdentifier(derived.targetField);
          let sanitizedExpr = derived.expression;
          // Replace all source field names with sanitized versions
          for (const sourceField of derived.sourceFields) {
            const sanitizedSource = toValidIdentifier(sourceField);
            // Use word boundary to avoid partial replacements
            sanitizedExpr = sanitizedExpr.replace(
              new RegExp(`\\b${escapeRegex(sourceField)}\\b`, 'g'),
              sanitizedSource
            );
          }

          // Check if target field has decimal precision - wrap in round() if so
          const targetField = fields.find((f) => toValidIdentifier(f.name) === sanitizedTarget);
          if (
            targetField?.numericRange &&
            !targetField.numericRange.allInteger &&
            targetField.numericRange.decimalPlaces > 0 &&
            targetField.numericRange.decimalPlaces <= 4
          ) {
            sanitizedExpr = `round(${sanitizedExpr}, ${targetField.numericRange.decimalPlaces})`;
          }

          derivedFields.set(sanitizedTarget, sanitizedExpr);
        } else {
          // Sanitize ordering and conditional constraints
          const sanitized = sanitizeConstraint(corr);
          otherConstraints.push(sanitized);
        }
      }

      // Convert remaining constraints to Vague code
      // Pass original field names for sanitization
      constraints = constraintsToVague(otherConstraints, [...fieldNames]).map((c) => c.trim());

      // Clear derivedFields if empty
      if (derivedFields.size === 0) {
        derivedFields = undefined;
      }
    }
  }

  return {
    name: schemaName,
    fields,
    recordCount: records.length,
    constraints: constraints.length > 0 ? constraints : undefined,
    derivedFields,
  };
}

/**
 * Infer field information from values
 */
function inferFieldFromValues(
  fieldName: string,
  values: unknown[],
  parentSchemaName: string,
  options: Required<InferOptions>,
  nestedSchemas: Map<string, InferredSchema>
): InferredField {
  const typeInfo = detectFieldType(values);

  const field: InferredField = {
    name: fieldName,
    type: typeInfo.type,
    nullable: typeInfo.nullable,
    unique: false,
    isSuperposition: false,
    isArray: typeInfo.isArray,
  };

  // Handle arrays
  if (typeInfo.isArray) {
    const arrays = values.filter((v): v is unknown[] => Array.isArray(v));
    field.arrayCardinality = detectArrayCardinality(values) ?? undefined;

    // Check if array contains objects (nested schema)
    const firstNonEmptyArray = arrays.find((arr) => arr.length > 0);
    if (
      firstNonEmptyArray &&
      typeof firstNonEmptyArray[0] === 'object' &&
      firstNonEmptyArray[0] !== null
    ) {
      // Flatten all array items for nested schema inference
      const allItems = arrays.flat();
      const nestedSchemaName = toPascalCase(singularize(fieldName));

      if (!nestedSchemas.has(nestedSchemaName)) {
        const nestedSchema = inferSchemaFromRecords(
          nestedSchemaName,
          allItems,
          options,
          nestedSchemas
        );
        nestedSchemas.set(nestedSchemaName, nestedSchema);
      }

      field.nestedSchemaName = nestedSchemaName;
    }

    return field;
  }

  // Handle objects (nested schema without array)
  if (typeInfo.isObject) {
    const objects = values.filter(
      (v): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
    );

    if (objects.length > 0) {
      const nestedSchemaName = toPascalCase(fieldName);

      if (!nestedSchemas.has(nestedSchemaName)) {
        const nestedSchema = inferSchemaFromRecords(
          nestedSchemaName,
          objects,
          options,
          nestedSchemas
        );
        nestedSchemas.set(nestedSchemaName, nestedSchema);
      }

      field.nestedSchemaName = nestedSchemaName;
    }

    return field;
  }

  // Check for uniqueness
  if (options.detectUnique) {
    field.unique = detectUniqueness(values, typeInfo.type);
  }

  // Try to detect superposition (enum-like field)
  if (typeInfo.type === 'string' || typeInfo.type === 'int') {
    const superposition = detectSuperposition(values, {
      maxUniqueValues: options.maxEnumValues,
    });

    if (superposition.isSuperposition) {
      field.isSuperposition = true;
      field.superpositionOptions = superposition.options;
      field.hasEqualWeights = options.weightedSuperpositions ? superposition.hasEqualWeights : true;
      return field;
    }
  }

  // Check for format patterns (UUID, email, etc.)
  if (options.detectFormats && typeInfo.type === 'string') {
    // First check field name patterns
    const nameBasedGenerator = detectFieldNamePattern(fieldName);
    if (nameBasedGenerator) {
      field.generator = nameBasedGenerator;
      return field;
    }

    // Then check value patterns
    const format = detectFormat(values);
    if (format !== 'none') {
      field.format = format;
      const generator = getGeneratorForFormat(format);
      if (generator) {
        field.generator = generator;
        return field;
      }
    }
  }

  // Detect ranges for numeric types
  if (typeInfo.type === 'int' || typeInfo.type === 'decimal') {
    field.numericRange = detectNumericRange(values) ?? undefined;
  }

  // Detect ranges for date types
  if (typeInfo.type === 'date') {
    field.dateRange = detectDateRange(values) ?? undefined;
  }

  return field;
}

/**
 * Infer schema from a single collection of records
 * Useful when you just want to generate a schema definition, not a full dataset
 */
export function inferSchemaOnly(
  schemaName: string,
  records: unknown[],
  options: InferOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const nestedSchemas: Map<string, InferredSchema> = new Map();

  const schema = inferSchemaFromRecords(schemaName, records, opts, nestedSchemas);

  // Generate just the schema definitions (no dataset)
  const lines: string[] = [];

  // Nested schemas first
  for (const nested of nestedSchemas.values()) {
    lines.push(generateSchemaCode(nested));
    lines.push('');
  }

  lines.push(generateSchemaCode(schema));

  return lines.join('\n');
}

/**
 * Generate schema code without dataset wrapper
 */
function generateSchemaCode(schema: InferredSchema): string {
  const lines: string[] = [];

  lines.push(`schema ${schema.name} {`);

  for (let i = 0; i < schema.fields.length; i++) {
    const field = schema.fields[i];
    const typeExpr = generateFieldTypeExpr(field);
    const nullableSuffix = field.nullable && !field.isSuperposition ? '?' : '';
    const comma = i < schema.fields.length - 1 ? ',' : '';

    lines.push(`  ${field.name}: ${typeExpr}${nullableSuffix}${comma}`);
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Generate type expression for a field (duplicated from codegen for local use)
 */
function generateFieldTypeExpr(field: InferredField): string {
  // Generator function
  if (field.generator) {
    return `= ${field.generator}`;
  }

  // Superposition
  if (
    field.isSuperposition &&
    field.superpositionOptions &&
    field.superpositionOptions.length > 0
  ) {
    const options = field.superpositionOptions;
    const includeWeights = !field.hasEqualWeights && options.length > 1;

    const parts = options.map((opt) => {
      const valueStr = valueToVagueStr(opt.value);
      if (includeWeights) {
        const weight = Math.round(opt.weight * 100) / 100;
        return `${weight}: ${valueStr}`;
      }
      return valueStr;
    });

    return parts.join(' | ');
  }

  // Date
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

  // Numeric with range
  if ((field.type === 'int' || field.type === 'decimal') && field.numericRange) {
    const { min, max, allInteger } = field.numericRange;
    const typeStr = allInteger ? 'int' : 'decimal';

    if (min === max) {
      return String(min);
    }

    const uniquePrefix = field.unique ? 'unique ' : '';
    return `${uniquePrefix}${typeStr} in ${min}..${max}`;
  }

  // Array
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

  // Nested object
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

function valueToVagueStr(value: unknown): string {
  if (typeof value === 'string') {
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
