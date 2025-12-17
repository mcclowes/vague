/**
 * vague-openapi-export
 *
 * Export Vague schemas to OpenAPI specifications
 *
 * @example
 * ```typescript
 * import { parse } from 'vague';
 * import { toOpenAPI } from 'vague-openapi-export';
 *
 * const ast = parse(`
 *   schema User {
 *     id: int,
 *     name: string,
 *     email: email()
 *   }
 * `);
 *
 * const spec = toOpenAPI(ast, { version: '3.1', title: 'My API' });
 * console.log(JSON.stringify(spec, null, 2));
 * ```
 */

import type { Program } from 'vague-lang';
import { buildOpenAPISpec, getSchemaNames } from './spec-builder.js';
import type { OpenAPISpec, ExportOptions, JSONSchema } from './types.js';

export type { OpenAPISpec, ExportOptions, JSONSchema } from './types.js';

/**
 * Convert a Vague AST to an OpenAPI specification
 *
 * @param ast - The parsed Vague AST (from `parse()`)
 * @param options - Export options
 * @returns An OpenAPI 3.0 or 3.1 specification object
 *
 * @example
 * ```typescript
 * import { parse } from 'vague';
 * import { toOpenAPI } from 'vague-openapi-export';
 *
 * const ast = parse(vagueSource);
 * const spec = toOpenAPI(ast, {
 *   version: '3.1',
 *   title: 'My API',
 *   includeExtensions: true
 * });
 * ```
 */
export function toOpenAPI(ast: Program, options: ExportOptions = {}): OpenAPISpec {
  return buildOpenAPISpec(ast, options);
}

/**
 * Convert a Vague AST to an OpenAPI specification and return as JSON string
 *
 * @param ast - The parsed Vague AST
 * @param options - Export options
 * @param indent - JSON indentation (default: 2)
 * @returns JSON string of the OpenAPI specification
 */
export function toOpenAPIString(ast: Program, options: ExportOptions = {}, indent = 2): string {
  const spec = toOpenAPI(ast, options);
  return JSON.stringify(spec, null, indent);
}

/**
 * List all schema names defined in a Vague AST
 *
 * @param ast - The parsed Vague AST
 * @returns Array of schema names
 */
export function listSchemas(ast: Program): string[] {
  return getSchemaNames(ast);
}

/**
 * Export only specific schemas from a Vague AST
 *
 * @param ast - The parsed Vague AST
 * @param schemaNames - Names of schemas to export
 * @param options - Export options
 * @returns OpenAPI specification containing only the specified schemas
 */
export function toOpenAPIPartial(
  ast: Program,
  schemaNames: string[],
  options: ExportOptions = {}
): OpenAPISpec {
  return buildOpenAPISpec(ast, { ...options, schemas: schemaNames });
}
