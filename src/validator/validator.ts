/* eslint-disable @typescript-eslint/no-explicit-any */
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import SwaggerParser from '@apidevtools/swagger-parser';
import { readFileSync } from 'node:fs';
import type { OpenAPIV3 } from 'openapi-types';

export interface ValidationError {
  path: string;
  message: string;
  keyword: string;
  params: Record<string, unknown>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  itemsValidated: number;
  itemsFailed: number;
}

export interface CollectionValidationResult {
  collection: string;
  schema: string;
  result: ValidationResult;
}

interface ErrorObject {
  instancePath: string;
  message?: string;
  keyword: string;
  params: Record<string, unknown>;
}

export class SchemaValidator {
  private ajv: any;
  private schemas: Map<string, object> = new Map();
  private openApiDoc: OpenAPIV3.Document | null = null;

  constructor() {
    // Handle default export variations
    const AjvConstructor = (Ajv as any).default || Ajv;
    this.ajv = new AjvConstructor({
      allErrors: true,
      strict: false,
      validateFormats: true,
    });
    const addFormatsFunc = (addFormats as any).default || addFormats;
    addFormatsFunc(this.ajv);
  }

  /**
   * Load schemas from an OpenAPI spec file
   * Supports OpenAPI 3.0.x via swagger-parser and 3.1.x via direct JSON parsing
   */
  async loadOpenAPISchemas(specPath: string): Promise<string[]> {
    let api: OpenAPIV3.Document;

    try {
      // Try swagger-parser first (works for 3.0.x)
      api = (await SwaggerParser.dereference(specPath)) as OpenAPIV3.Document;
    } catch (err) {
      // Fall back to direct JSON parsing for 3.1.x
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes('Unsupported OpenAPI version')) {
        api = JSON.parse(readFileSync(specPath, 'utf-8')) as OpenAPIV3.Document;
      } else {
        throw err;
      }
    }

    this.openApiDoc = api;

    const loadedSchemas: string[] = [];

    if (!api.components?.schemas) {
      return loadedSchemas;
    }

    // For 3.1.x, we need to resolve $ref manually
    const allSchemas = api.components.schemas;

    for (const [name, schema] of Object.entries(allSchemas)) {
      if (!('$ref' in schema)) {
        // Convert OpenAPI schema to JSON Schema, resolving refs
        const jsonSchema = this.openApiToJsonSchema(this.resolveRefs(schema, allSchemas), name);
        this.schemas.set(name, jsonSchema);
        loadedSchemas.push(name);
      }
    }

    return loadedSchemas;
  }

  /**
   * Resolve $ref references in a schema (with cycle detection)
   * Uses a depth limit to prevent stack overflow on deep/circular refs
   */
  private resolveRefs(
    schema: any,
    allSchemas: Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>,
    depth: number = 0
  ): OpenAPIV3.SchemaObject {
    // Limit recursion depth to prevent stack overflow
    if (depth > 10 || !schema || typeof schema !== 'object') {
      return schema;
    }

    if ('$ref' in schema) {
      const refPath = schema.$ref as string;

      // Extract schema name from #/components/schemas/Name
      const match = refPath.match(/#\/components\/schemas\/(.+)/);
      if (match) {
        const refName = match[1];
        const refSchema = allSchemas[refName];
        if (refSchema && !('$ref' in refSchema)) {
          return this.resolveRefs(refSchema, allSchemas, depth + 1);
        }
      }
      // Can't resolve, return empty object
      return {};
    }

    const resolved: any = Array.isArray(schema) ? [] : {};

    for (const [key, value] of Object.entries(schema)) {
      if (typeof value === 'object' && value !== null) {
        resolved[key] = this.resolveRefs(value, allSchemas, depth + 1);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Load a JSON Schema directly
   */
  loadSchema(name: string, schema: object): void {
    this.schemas.set(name, schema);
  }

  /**
   * Get list of loaded schema names
   */
  getLoadedSchemas(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Validate a single item against a schema
   */
  validateItem(item: unknown, schemaName: string): ValidationResult {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      return {
        valid: false,
        errors: [
          {
            path: '',
            message: `Schema '${schemaName}' not found`,
            keyword: 'schema',
            params: { schemaName },
          },
        ],
        itemsValidated: 1,
        itemsFailed: 1,
      };
    }

    const validate = this.ajv.compile(schema);
    const valid = validate(item);

    return {
      valid: !!valid,
      errors: valid ? [] : this.formatErrors(validate.errors || []),
      itemsValidated: 1,
      itemsFailed: valid ? 0 : 1,
    };
  }

  /**
   * Validate an array of items against a schema
   */
  validateCollection(items: unknown[], schemaName: string): ValidationResult {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      return {
        valid: false,
        errors: [
          {
            path: '',
            message: `Schema '${schemaName}' not found`,
            keyword: 'schema',
            params: { schemaName },
          },
        ],
        itemsValidated: items.length,
        itemsFailed: items.length,
      };
    }

    const validate = this.ajv.compile(schema);
    const allErrors: ValidationError[] = [];
    let failedCount = 0;

    for (let i = 0; i < items.length; i++) {
      const valid = validate(items[i]);
      if (!valid && validate.errors) {
        failedCount++;
        const errors = this.formatErrors(validate.errors, `[${i}]`);
        allErrors.push(...errors);
      }
    }

    return {
      valid: failedCount === 0,
      errors: allErrors,
      itemsValidated: items.length,
      itemsFailed: failedCount,
    };
  }

  /**
   * Validate generated dataset output against schemas
   * Maps collection names to schema names for validation
   */
  validateDataset(
    data: Record<string, unknown[]>,
    schemaMapping: Record<string, string>
  ): CollectionValidationResult[] {
    const results: CollectionValidationResult[] = [];

    for (const [collectionName, schemaName] of Object.entries(schemaMapping)) {
      const items = data[collectionName];
      if (!items) {
        results.push({
          collection: collectionName,
          schema: schemaName,
          result: {
            valid: false,
            errors: [
              {
                path: '',
                message: `Collection '${collectionName}' not found in data`,
                keyword: 'collection',
                params: { collectionName },
              },
            ],
            itemsValidated: 0,
            itemsFailed: 0,
          },
        });
        continue;
      }

      results.push({
        collection: collectionName,
        schema: schemaName,
        result: this.validateCollection(items, schemaName),
      });
    }

    return results;
  }

  /**
   * Convert OpenAPI schema to JSON Schema format
   */
  private openApiToJsonSchema(schema: OpenAPIV3.SchemaObject, name: string): object {
    const jsonSchema: Record<string, unknown> = {
      $id: `#/schemas/${name}`,
      type: schema.type || 'object',
    };

    if (schema.properties) {
      jsonSchema.properties = {};
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        if (!('$ref' in propSchema)) {
          (jsonSchema.properties as Record<string, unknown>)[propName] =
            this.convertProperty(propSchema);
        }
      }
    }

    if (schema.required) {
      jsonSchema.required = schema.required;
    }

    if (schema.enum) {
      jsonSchema.enum = schema.enum;
    }

    if (schema.description) {
      jsonSchema.description = schema.description;
    }

    // Allow additional properties by default (OpenAPI is often lenient)
    jsonSchema.additionalProperties = true;

    return jsonSchema;
  }

  private convertProperty(schema: OpenAPIV3.SchemaObject): object {
    const prop: Record<string, unknown> = {};

    if (schema.type) {
      prop.type = schema.type;
    }

    if (schema.format) {
      prop.format = schema.format;
    }

    if (schema.enum) {
      prop.enum = schema.enum;
    }

    if (schema.minimum !== undefined) {
      prop.minimum = schema.minimum;
    }

    if (schema.maximum !== undefined) {
      prop.maximum = schema.maximum;
    }

    if (schema.minLength !== undefined) {
      prop.minLength = schema.minLength;
    }

    if (schema.maxLength !== undefined) {
      prop.maxLength = schema.maxLength;
    }

    if (schema.pattern) {
      prop.pattern = schema.pattern;
    }

    if (schema.nullable) {
      // JSON Schema handles nullable differently
      if (prop.type) {
        prop.type = [prop.type, 'null'];
      }
    }

    if (schema.type === 'array' && schema.items) {
      if (!('$ref' in schema.items)) {
        prop.items = this.convertProperty(schema.items);
      }
    }

    if (schema.type === 'object' && schema.properties) {
      prop.properties = {};
      for (const [name, subSchema] of Object.entries(schema.properties)) {
        if (!('$ref' in subSchema)) {
          (prop.properties as Record<string, unknown>)[name] = this.convertProperty(subSchema);
        }
      }
      prop.additionalProperties = true;
    }

    return prop;
  }

  private formatErrors(errors: ErrorObject[], prefix = ''): ValidationError[] {
    return errors.map((err) => ({
      path: prefix + (err.instancePath || ''),
      message: err.message || 'Validation failed',
      keyword: err.keyword,
      params: err.params as Record<string, unknown>,
    }));
  }
}
