/**
 * Builds OpenAPI specification from Vague AST
 */

import type { Program, SchemaDefinition, AssumeClause, Expression, Statement, FieldDefinition, SuperpositionType } from 'vague-lang';
import type { OpenAPISpec, OpenAPIComponents, JSONSchema, ExportOptions } from './types.js';
import { mapFieldDefinition } from './schema-mapper.js';

/**
 * Check if a field is nullable (either via optional flag or via type | null superposition)
 */
function isFieldNullable(field: FieldDefinition): boolean {
  if (field.optional) return true;

  // Check if fieldType is a superposition with null
  if (field.fieldType.type === 'SuperpositionType') {
    const superposition = field.fieldType as SuperpositionType;
    const options = superposition.options;
    if (options.length === 2) {
      const hasNull = options.some(
        (opt) => opt.value.type === 'Literal' && opt.value.value === null
      );
      if (hasNull) return true;
    }
  }

  return false;
}

/**
 * Convert an expression to a human-readable constraint string
 */
function expressionToString(expr: Expression): string {
  switch (expr.type) {
    case 'Literal':
      if (typeof expr.value === 'string') return `"${expr.value}"`;
      return String(expr.value);

    case 'Identifier':
      return expr.name;

    case 'QualifiedName':
      return expr.parts.join('.');

    case 'BinaryExpression':
      return `${expressionToString(expr.left)} ${expr.operator} ${expressionToString(expr.right)}`;

    case 'LogicalExpression':
      return `${expressionToString(expr.left)} ${expr.operator} ${expressionToString(expr.right)}`;

    case 'NotExpression':
      return `not ${expressionToString(expr.operand)}`;

    case 'UnaryExpression':
      return `${expr.operator}${expressionToString(expr.operand)}`;

    case 'CallExpression':
      const args = expr.arguments.map(expressionToString).join(', ');
      return `${expr.callee}(${args})`;

    case 'TernaryExpression':
      return `${expressionToString(expr.condition)} ? ${expressionToString(expr.consequent)} : ${expressionToString(expr.alternate)}`;

    case 'ParentReference':
      return `^${expr.path.parts.join('.')}`;

    case 'AnyOfExpression':
      const base = `any of ${expressionToString(expr.collection)}`;
      if (expr.condition) {
        return `${base} where ${expressionToString(expr.condition)}`;
      }
      return base;

    default:
      return '<expression>';
  }
}

/**
 * Convert assume clauses to constraint descriptions
 */
function formatConstraints(assumes: AssumeClause[]): string[] {
  const constraints: string[] = [];

  for (const assume of assumes) {
    if (assume.condition) {
      // Conditional constraint: assume if condition { constraints }
      const condition = expressionToString(assume.condition);
      const inner = assume.constraints.map(expressionToString).join(', ');
      constraints.push(`if ${condition} then ${inner}`);
    } else {
      // Simple constraints
      for (const constraint of assume.constraints) {
        constraints.push(expressionToString(constraint));
      }
    }
  }

  return constraints;
}

/**
 * Convert a Vague schema definition to JSON Schema
 */
function schemaDefinitionToJSONSchema(
  schema: SchemaDefinition,
  schemaRefs: Set<string>,
  options: ExportOptions
): JSONSchema {
  const jsonSchema: JSONSchema = {
    type: 'object',
    properties: {},
    required: [],
  };

  for (const field of schema.fields) {
    const fieldSchema = mapFieldDefinition(field, schemaRefs, options);
    jsonSchema.properties![field.name] = fieldSchema;

    // Fields are required unless nullable (via optional flag or type | null)
    if (!isFieldNullable(field)) {
      jsonSchema.required!.push(field.name);
    }
  }

  // Remove empty required array
  if (jsonSchema.required!.length === 0) {
    delete jsonSchema.required;
  }

  // Add constraints as extension if present and requested
  if (options.includeExtensions && schema.assumes && schema.assumes.length > 0) {
    const constraints = formatConstraints(schema.assumes);
    if (constraints.length > 0) {
      jsonSchema['x-vague-constraint'] = constraints.join('; ');
    }
  }

  return jsonSchema;
}

/**
 * Extract all schema definitions from the AST
 */
function extractSchemas(ast: Program): SchemaDefinition[] {
  return ast.statements.filter((s: Statement): s is SchemaDefinition => s.type === 'SchemaDefinition');
}

/**
 * Build OpenAPI components from schema definitions
 */
function buildComponents(
  schemas: SchemaDefinition[],
  options: ExportOptions
): { components: OpenAPIComponents; referencedSchemas: Set<string> } {
  const components: OpenAPIComponents = {
    schemas: {},
  };
  const referencedSchemas = new Set<string>();

  for (const schema of schemas) {
    // Skip if filtering by schema names and this one isn't included
    if (options.schemas && !options.schemas.includes(schema.name)) {
      continue;
    }

    const jsonSchema = schemaDefinitionToJSONSchema(schema, referencedSchemas, options);
    components.schemas![schema.name] = jsonSchema;
  }

  return { components, referencedSchemas };
}

/**
 * Build an OpenAPI specification from a Vague AST
 */
export function buildOpenAPISpec(ast: Program, options: ExportOptions = {}): OpenAPISpec {
  const schemas = extractSchemas(ast);

  const { components } = buildComponents(schemas, options);

  const spec: OpenAPISpec = {
    openapi: options.version === '3.1' ? '3.1.0' : '3.0.3',
    info: {
      title: options.title ?? 'Generated from Vague',
      version: options.infoVersion ?? '1.0.0',
    },
    paths: {},
    components,
  };

  if (options.description) {
    spec.info.description = options.description;
  }

  return spec;
}

/**
 * Get a list of schema names from the AST
 */
export function getSchemaNames(ast: Program): string[] {
  return extractSchemas(ast).map((s: SchemaDefinition) => s.name);
}
