/**
 * TypeScript definition generator for inferred schemas.
 * Produces .d.ts files from inferred schema information.
 */

import { InferredSchema, InferredField } from './codegen.js';

/**
 * Options for TypeScript generation
 */
export interface TypeScriptGeneratorOptions {
  /** Whether to export interfaces (default: true) */
  exportInterfaces?: boolean;
  /** Whether to generate a root dataset interface (default: true) */
  generateDatasetInterface?: boolean;
  /** Name for the dataset interface (default: from dataset name) */
  datasetInterfaceName?: string;
  /** Whether to use readonly arrays (default: false) */
  readonlyArrays?: boolean;
  /** Whether to add JSDoc comments (default: true) */
  includeComments?: boolean;
}

const DEFAULT_OPTIONS: Required<TypeScriptGeneratorOptions> = {
  exportInterfaces: true,
  generateDatasetInterface: true,
  datasetInterfaceName: '',
  readonlyArrays: false,
  includeComments: true,
};

/**
 * Generate TypeScript interfaces from inferred schemas
 */
export function generateTypeScript(
  schemas: InferredSchema[],
  datasetName: string = 'Generated',
  options: TypeScriptGeneratorOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const lines: string[] = [];

  // Add header comment
  if (opts.includeComments) {
    lines.push('/**');
    lines.push(' * Auto-generated TypeScript definitions from Vague schema inference');
    lines.push(' * Do not edit manually - regenerate from source data');
    lines.push(' */');
    lines.push('');
  }

  // Separate nested schemas from main schemas
  // Main schemas are those that will appear in the dataset
  const mainSchemaNames = new Set(schemas.filter((s) => s.recordCount > 0).map((s) => s.name));
  const nestedSchemas = schemas.filter((s) => !mainSchemaNames.has(s.name) || s.recordCount === 0);
  const mainSchemas = schemas.filter((s) => mainSchemaNames.has(s.name) && s.recordCount > 0);

  // Generate nested schemas first (they need to be defined before being referenced)
  for (const schema of nestedSchemas) {
    lines.push(generateInterface(schema, opts));
    lines.push('');
  }

  // Generate main schemas
  for (const schema of mainSchemas) {
    lines.push(generateInterface(schema, opts));
    lines.push('');
  }

  // Generate dataset interface if requested
  if (opts.generateDatasetInterface && mainSchemas.length > 0) {
    const interfaceName = opts.datasetInterfaceName || datasetName;
    const exportKeyword = opts.exportInterfaces ? 'export ' : '';

    if (opts.includeComments) {
      lines.push('/**');
      lines.push(` * Root dataset interface containing all collections`);
      lines.push(' */');
    }
    lines.push(`${exportKeyword}interface ${interfaceName} {`);

    for (const schema of mainSchemas) {
      const collectionName = toSnakeCase(schema.name) + 's';
      const arrayType = opts.readonlyArrays ? `readonly ${schema.name}[]` : `${schema.name}[]`;
      lines.push(`  ${collectionName}: ${arrayType};`);
    }

    lines.push('}');
  }

  return lines.join('\n');
}

/**
 * Generate a TypeScript interface for a single schema
 */
function generateInterface(
  schema: InferredSchema,
  opts: Required<TypeScriptGeneratorOptions>
): string {
  const lines: string[] = [];
  const exportKeyword = opts.exportInterfaces ? 'export ' : '';

  if (opts.includeComments) {
    lines.push('/**');
    lines.push(` * ${schema.name} interface`);
    if (schema.recordCount > 0) {
      lines.push(` * Inferred from ${schema.recordCount} records`);
    }
    lines.push(' */');
  }

  lines.push(`${exportKeyword}interface ${schema.name} {`);

  for (const field of schema.fields) {
    const fieldName = toValidTsIdentifier(field.name);
    const fieldType = generateFieldType(field, opts);
    const optionalMark = field.nullable ? '?' : '';

    lines.push(`  ${fieldName}${optionalMark}: ${fieldType};`);
  }

  lines.push('}');

  return lines.join('\n');
}

/**
 * Generate TypeScript type for a field
 */
function generateFieldType(
  field: InferredField,
  opts: Required<TypeScriptGeneratorOptions>
): string {
  // Handle arrays
  if (field.isArray) {
    if (field.nestedSchemaName) {
      const elementType = field.nestedSchemaName;
      return opts.readonlyArrays ? `readonly ${elementType}[]` : `${elementType}[]`;
    }
    // Array of primitives
    const primitiveType = getPrimitiveType(field.type);
    return opts.readonlyArrays ? `readonly ${primitiveType}[]` : `${primitiveType}[]`;
  }

  // Handle nested objects
  if (field.type === 'object' && field.nestedSchemaName) {
    return field.nestedSchemaName;
  }

  // Handle superpositions (union types)
  if (
    field.isSuperposition &&
    field.superpositionOptions &&
    field.superpositionOptions.length > 0
  ) {
    const unionTypes = field.superpositionOptions.map((opt) => {
      if (typeof opt.value === 'string') {
        return `'${opt.value.replace(/'/g, "\\'")}'`;
      }
      if (typeof opt.value === 'number' || typeof opt.value === 'boolean') {
        return String(opt.value);
      }
      if (opt.value === null) {
        return 'null';
      }
      return 'unknown';
    });
    return unionTypes.join(' | ');
  }

  // Handle primitive types
  let tsType = getPrimitiveType(field.type);

  // Add null to union if nullable
  if (field.nullable) {
    tsType = `${tsType} | null`;
  }

  return tsType;
}

/**
 * Map Vague types to TypeScript types
 */
function getPrimitiveType(type: string): string {
  switch (type) {
    case 'int':
    case 'decimal':
      return 'number';
    case 'string':
    case 'date':
      return 'string';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'object':
      return 'Record<string, unknown>';
    case 'array':
      return 'unknown[]';
    default:
      return 'unknown';
  }
}

/**
 * Convert a field name to a valid TypeScript identifier
 */
function toValidTsIdentifier(str: string): string {
  // Check if it's already a valid identifier
  if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(str)) {
    return str;
  }

  // If it contains special characters, wrap in quotes
  if (/[^a-zA-Z0-9_$]/.test(str) || /^\d/.test(str)) {
    return `'${str.replace(/'/g, "\\'")}'`;
  }

  return str;
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
 * Generate TypeScript from inferred data (convenience function)
 */
export function inferTypeScript(
  _data: Record<string, unknown[]>,
  _options: TypeScriptGeneratorOptions & { datasetName?: string } = {}
): string {
  // We need to import the inference function here to avoid circular deps
  // This will be called from the main inference flow
  throw new Error('Use inferSchema with TypeScript output option instead');
}
