/**
 * OpenAPI 3.0/3.1 type definitions for the exporter
 */

export interface OpenAPISpec {
  openapi: '3.0.3' | '3.1.0';
  info: OpenAPIInfo;
  paths?: Record<string, unknown>;
  components?: OpenAPIComponents;
}

export interface OpenAPIInfo {
  title: string;
  version: string;
  description?: string;
}

export interface OpenAPIComponents {
  schemas?: Record<string, JSONSchema>;
}

export interface JSONSchema {
  type?: JSONSchemaType | JSONSchemaType[];
  format?: string;
  description?: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: (string | number | boolean | null)[];
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  $ref?: string;
  oneOf?: JSONSchema[];
  anyOf?: JSONSchema[];
  allOf?: JSONSchema[];
  nullable?: boolean; // OpenAPI 3.0 style
  readOnly?: boolean;
  // Extension for Vague-specific metadata
  'x-vague-computed'?: boolean;
  'x-vague-unique'?: boolean;
  'x-vague-constraint'?: string;
  'x-vague-generator'?: string;
  'x-vague-weights'?: number[];
}

export type JSONSchemaType = 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object' | 'null';

export interface ExportOptions {
  /** OpenAPI version: '3.0' or '3.1' (default: '3.0') */
  version?: '3.0' | '3.1';
  /** Title for the OpenAPI info section */
  title?: string;
  /** Version for the OpenAPI info section */
  infoVersion?: string;
  /** Description for the OpenAPI info section */
  description?: string;
  /** Include Vague-specific extensions (x-vague-*) */
  includeExtensions?: boolean;
  /** Only export specific schemas by name */
  schemas?: string[];
}
