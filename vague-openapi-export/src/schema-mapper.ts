/**
 * Maps Vague AST types to JSON Schema types
 */

import type {
  FieldType,
  FieldDefinition,
  PrimitiveType,
  RangeType,
  CollectionType,
  SuperpositionType,
  ReferenceType,
  GeneratorType,
  ExpressionType,
  Expression,
  WeightedOption,
} from 'vague-lang';
import type { JSONSchema, ExportOptions } from './types.js';

/**
 * Map a Vague primitive type to JSON Schema type
 */
function mapPrimitiveType(primitive: PrimitiveType): JSONSchema {
  switch (primitive.name) {
    case 'int':
      return { type: 'integer' };
    case 'decimal':
      return { type: 'number' };
    case 'string':
      return { type: 'string' };
    case 'boolean':
      return { type: 'boolean' };
    case 'date':
      return { type: 'string', format: 'date' };
    default:
      return { type: 'string' };
  }
}

/**
 * Map a Vague range type to JSON Schema with min/max
 */
function mapRangeType(range: RangeType): JSONSchema {
  const schema = mapPrimitiveType(range.baseType);

  if (range.min && range.min.type === 'Literal' && typeof range.min.value === 'number') {
    schema.minimum = range.min.value;
  }
  if (range.max && range.max.type === 'Literal' && typeof range.max.value === 'number') {
    schema.maximum = range.max.value;
  }

  // For date ranges, we can't express year ranges in JSON Schema directly
  // but we keep the format
  if (range.baseType.name === 'date') {
    schema.format = 'date';
  }

  return schema;
}

/**
 * Map a collection type to JSON Schema array
 */
function mapCollectionType(
  collection: CollectionType,
  schemaRefs: Set<string>,
  options: ExportOptions
): JSONSchema {
  const schema: JSONSchema = {
    type: 'array',
    items: mapFieldType(collection.elementType, schemaRefs, options),
  };

  // Add cardinality constraints if static
  if (collection.cardinality.type === 'Cardinality') {
    schema.minItems = collection.cardinality.min;
    schema.maxItems = collection.cardinality.max;
  }
  // Dynamic cardinality can't be expressed in JSON Schema

  return schema;
}

/**
 * Extract literal value from an expression if possible
 */
function extractLiteralValue(expr: Expression): string | number | boolean | null | undefined {
  if (expr.type === 'Literal') {
    return expr.value;
  }
  return undefined;
}

/**
 * Check if all superposition options are literals of the same type
 */
function areSuperpositionOptionsEnumerable(options: WeightedOption[]): boolean {
  return options.every((opt) => {
    const val = extractLiteralValue(opt.value);
    return val !== undefined && val !== null;
  });
}

/**
 * Check if a superposition represents a nullable type (e.g., string | null)
 * Returns the non-null type if it is nullable, undefined otherwise
 */
function isNullableSuperposition(superposition: SuperpositionType): Expression | undefined {
  const options = superposition.options;
  if (options.length !== 2) return undefined;

  // Find null option and non-null option
  const nullOption = options.find(
    (opt) => opt.value.type === 'Literal' && opt.value.value === null
  );
  const nonNullOption = options.find(
    (opt) => !(opt.value.type === 'Literal' && opt.value.value === null)
  );

  if (nullOption && nonNullOption) {
    return nonNullOption.value;
  }
  return undefined;
}

/**
 * Map an identifier that represents a type name to JSON Schema
 */
function mapTypeIdentifier(name: string): JSONSchema {
  switch (name) {
    case 'int':
      return { type: 'integer' };
    case 'decimal':
      return { type: 'number' };
    case 'string':
      return { type: 'string' };
    case 'boolean':
      return { type: 'boolean' };
    case 'date':
      return { type: 'string', format: 'date' };
    default:
      // Could be a reference to another schema
      return { $ref: `#/components/schemas/${name}` };
  }
}

/**
 * Map a superposition type to JSON Schema enum or oneOf
 */
function mapSuperpositionType(
  superposition: SuperpositionType,
  schemaRefs: Set<string>,
  options: ExportOptions,
  isNullable: boolean = false
): JSONSchema {
  const vagueOptions = superposition.options;

  // Check if this is a nullable type (e.g., string | null, string?)
  const nonNullType = isNullableSuperposition(superposition);
  if (nonNullType) {
    // This is a nullable type - extract the non-null type and mark as nullable
    let baseSchema: JSONSchema;

    if (nonNullType.type === 'Identifier') {
      baseSchema = mapTypeIdentifier(nonNullType.name);
    } else {
      // For other expressions, try to infer the schema
      baseSchema = inferExpressionSchema(nonNullType, schemaRefs, options);
    }

    // Apply nullable based on OpenAPI version
    if (options.version === '3.1') {
      if (baseSchema.type && !Array.isArray(baseSchema.type)) {
        baseSchema.type = [baseSchema.type, 'null'];
      } else if (!baseSchema.type) {
        baseSchema.type = ['null'];
      }
    } else {
      baseSchema.nullable = true;
    }

    return baseSchema;
  }

  // Check if all options are simple literals - use enum
  if (areSuperpositionOptionsEnumerable(vagueOptions)) {
    const enumValues = vagueOptions
      .map((opt: WeightedOption) => extractLiteralValue(opt.value))
      .filter((v: string | number | boolean | null | undefined): v is string | number | boolean => v !== undefined && v !== null);

    const schema: JSONSchema = { enum: enumValues };

    // Include weights as extension if requested
    if (options.includeExtensions) {
      const weights = vagueOptions.map((opt: WeightedOption) => opt.weight ?? 1 / vagueOptions.length);
      const hasNonUniformWeights = weights.some((w: number, _: number, arr: number[]) => w !== arr[0]);
      if (hasNonUniformWeights) {
        schema['x-vague-weights'] = weights;
      }
    }

    return schema;
  }

  // Mixed types or complex options - use oneOf
  const oneOf = vagueOptions.map((opt: WeightedOption) => {
    if (opt.value.type === 'Literal') {
      const val = opt.value.value;
      if (typeof val === 'string') return { type: 'string' as const, enum: [val] };
      if (typeof val === 'number')
        return { type: Number.isInteger(val) ? ('integer' as const) : ('number' as const), enum: [val] };
      if (typeof val === 'boolean') return { type: 'boolean' as const, enum: [val] };
      if (val === null) return { type: 'null' as const };
    }
    // For complex expressions, try to infer the type
    return inferExpressionSchema(opt.value, schemaRefs, options);
  });

  return { oneOf };
}

/**
 * Map a reference type to a JSON Schema $ref
 */
function mapReferenceType(ref: ReferenceType, schemaRefs: Set<string>): JSONSchema {
  const schemaName = ref.path.parts[ref.path.parts.length - 1];
  schemaRefs.add(schemaName);
  return { $ref: `#/components/schemas/${schemaName}` };
}

/**
 * Map common generator names to OpenAPI formats
 */
const GENERATOR_FORMAT_MAP: Record<string, { type: JSONSchema['type']; format?: string }> = {
  uuid: { type: 'string', format: 'uuid' },
  email: { type: 'string', format: 'email' },
  phone: { type: 'string', format: 'phone' },
  url: { type: 'string', format: 'uri' },
  'faker.string.uuid': { type: 'string', format: 'uuid' },
  'faker.internet.email': { type: 'string', format: 'email' },
  'faker.internet.url': { type: 'string', format: 'uri' },
  'faker.phone.number': { type: 'string', format: 'phone' },
  'faker.date.past': { type: 'string', format: 'date-time' },
  'faker.date.future': { type: 'string', format: 'date-time' },
  'faker.date.recent': { type: 'string', format: 'date-time' },
  'faker.date.birthdate': { type: 'string', format: 'date' },
  'faker.finance.iban': { type: 'string', format: 'iban' },
  'faker.location.latitude': { type: 'number' },
  'faker.location.longitude': { type: 'number' },
  pastDate: { type: 'string', format: 'date-time' },
  futureDate: { type: 'string', format: 'date-time' },
  recentDate: { type: 'string', format: 'date-time' },
  iban: { type: 'string', format: 'iban' },
  firstName: { type: 'string' },
  lastName: { type: 'string' },
  fullName: { type: 'string' },
  companyName: { type: 'string' },
  city: { type: 'string' },
  country: { type: 'string' },
  countryCode: { type: 'string' },
  streetAddress: { type: 'string' },
  zipCode: { type: 'string' },
  avatar: { type: 'string', format: 'uri' },
  sentence: { type: 'string' },
  paragraph: { type: 'string' },
};

/**
 * Map a generator type to JSON Schema
 */
function mapGeneratorType(generator: GeneratorType, options: ExportOptions): JSONSchema {
  const mapping = GENERATOR_FORMAT_MAP[generator.name];

  const schema: JSONSchema = mapping ? { ...mapping } : { type: 'string' };

  if (options.includeExtensions) {
    schema['x-vague-generator'] = generator.name;
  }

  return schema;
}

/**
 * Infer schema from an expression (for computed fields)
 */
function inferExpressionSchema(
  expr: Expression,
  schemaRefs: Set<string>,
  options: ExportOptions
): JSONSchema {
  switch (expr.type) {
    case 'Literal':
      if (typeof expr.value === 'string') return { type: 'string' };
      if (typeof expr.value === 'number')
        return { type: Number.isInteger(expr.value) ? 'integer' : 'number' };
      if (typeof expr.value === 'boolean') return { type: 'boolean' };
      if (expr.value === null) return { type: 'null' };
      return {};

    case 'CallExpression':
      // Aggregate functions return numbers
      if (['sum', 'count', 'avg', 'min', 'max'].includes(expr.callee)) {
        return { type: 'number' };
      }
      // Rounding functions
      if (['round', 'floor', 'ceil'].includes(expr.callee)) {
        return { type: 'number' };
      }
      // Date functions
      if (['now', 'today', 'daysAgo', 'daysFromNow', 'datetime', 'dateBetween'].includes(expr.callee)) {
        return { type: 'string', format: 'date-time' };
      }
      if (expr.callee === 'formatDate') {
        return { type: 'string' };
      }
      // String functions
      if (
        [
          'uppercase',
          'lowercase',
          'capitalize',
          'kebabCase',
          'snakeCase',
          'camelCase',
          'trim',
          'concat',
          'substring',
          'replace',
        ].includes(expr.callee)
      ) {
        return { type: 'string' };
      }
      if (expr.callee === 'length') {
        return { type: 'integer' };
      }
      // Sequence functions
      if (expr.callee === 'sequence') {
        return { type: 'string' };
      }
      if (expr.callee === 'sequenceInt') {
        return { type: 'integer' };
      }
      // Statistical distributions
      if (['gaussian', 'lognormal', 'exponential', 'uniform', 'beta'].includes(expr.callee)) {
        return { type: 'number' };
      }
      if (expr.callee === 'poisson') {
        return { type: 'integer' };
      }
      return { type: 'string' };

    case 'BinaryExpression':
      // Arithmetic operations return numbers
      if (['+', '-', '*', '/', '%'].includes(expr.operator)) {
        return { type: 'number' };
      }
      // Comparison operations return booleans
      if (['==', '!=', '<', '>', '<=', '>='].includes(expr.operator)) {
        return { type: 'boolean' };
      }
      return {};

    case 'TernaryExpression':
      // Try to infer from consequent
      return inferExpressionSchema(expr.consequent, schemaRefs, options);

    case 'QualifiedName':
    case 'Identifier':
      // Field references - can't determine type without context
      return {};

    default:
      return {};
  }
}

/**
 * Map an expression type (computed field) to JSON Schema
 */
function mapExpressionType(
  exprType: ExpressionType,
  schemaRefs: Set<string>,
  options: ExportOptions
): JSONSchema {
  return inferExpressionSchema(exprType.expression, schemaRefs, options);
}

/**
 * Map any Vague field type to JSON Schema
 */
export function mapFieldType(
  fieldType: FieldType,
  schemaRefs: Set<string>,
  options: ExportOptions
): JSONSchema {
  switch (fieldType.type) {
    case 'PrimitiveType':
      return mapPrimitiveType(fieldType);

    case 'RangeType':
      return mapRangeType(fieldType);

    case 'CollectionType':
      return mapCollectionType(fieldType, schemaRefs, options);

    case 'SuperpositionType':
      return mapSuperpositionType(fieldType, schemaRefs, options);

    case 'ReferenceType':
      return mapReferenceType(fieldType, schemaRefs);

    case 'GeneratorType':
      return mapGeneratorType(fieldType, options);

    case 'ExpressionType':
      return mapExpressionType(fieldType, schemaRefs, options);

    default:
      return { type: 'string' };
  }
}

/**
 * Map a Vague field definition to JSON Schema property
 */
export function mapFieldDefinition(
  field: FieldDefinition,
  schemaRefs: Set<string>,
  options: ExportOptions
): JSONSchema {
  let schema: JSONSchema;

  // For computed fields, the expression is in `distribution`, not `fieldType`
  if (field.computed && field.distribution) {
    schema = inferExpressionSchema(field.distribution, schemaRefs, options);
  } else {
    schema = mapFieldType(field.fieldType, schemaRefs, options);
  }

  // Handle nullable fields (using the optional flag)
  if (field.optional) {
    if (options.version === '3.1') {
      // OpenAPI 3.1 uses JSON Schema style
      if (schema.type && !Array.isArray(schema.type)) {
        schema.type = [schema.type, 'null'];
      } else if (!schema.type) {
        schema.type = ['null'];
      }
    } else {
      // OpenAPI 3.0 uses nullable
      schema.nullable = true;
    }
  }

  // Add extensions for computed/unique fields
  if (options.includeExtensions) {
    if (field.computed) {
      schema['x-vague-computed'] = true;
      schema.readOnly = true;
    }
    if (field.unique) {
      schema['x-vague-unique'] = true;
    }
  } else {
    // Even without extensions, mark computed as readOnly
    if (field.computed) {
      schema.readOnly = true;
    }
  }

  return schema;
}
