import $RefParser from '@apidevtools/json-schema-ref-parser';

export interface ImportedSchema {
  name: string;
  fields: ImportedField[];
  required: string[];
}

export interface ImportedField {
  name: string;
  type: ImportedFieldType;
  required: boolean;
  enum?: (string | number)[];
  description?: string;
  format?: string;
}

interface ImportedValueConstraints {
  enum?: unknown[];
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

export type ImportedFieldType =
  | (ImportedValueConstraints & {
      kind: 'primitive';
      type: 'string' | 'number' | 'integer' | 'boolean';
    })
  | { kind: 'array'; items: ImportedFieldType; minItems?: number; maxItems?: number }
  | { kind: 'object'; fields: ImportedField[] }
  | { kind: 'union'; variants: ImportedFieldType[] };

interface SchemaObject {
  type?: string | string[];
  properties?: Record<string, SchemaObject>;
  required?: string[];
  items?: SchemaObject;
  allOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  enum?: unknown[];
  description?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  pattern?: string;
}

interface OpenAPIDocument {
  components?: { schemas?: Record<string, SchemaObject> };
}

export class OpenAPILoader {
  private schemas: Map<string, ImportedSchema> = new Map();

  async load(path: string): Promise<Map<string, ImportedSchema>> {
    this.schemas = new Map();

    const api = (await $RefParser.dereference(path, {
      dereference: { circular: false },
    })) as OpenAPIDocument;

    if (!api.components?.schemas) {
      return this.schemas;
    }

    for (const [name, schema] of Object.entries(api.components.schemas)) {
      this.schemas.set(name, this.parseSchema(name, schema));
    }

    return this.schemas;
  }

  private parseSchema(name: string, schema: SchemaObject): ImportedSchema {
    const normalized = this.mergeAllOf(schema);
    const required = normalized.required ?? [];
    return {
      name,
      fields: this.parseObjectFields(normalized),
      required,
    };
  }

  private parseObjectFields(schema: SchemaObject): ImportedField[] {
    const normalized = this.mergeAllOf(schema);
    const required = normalized.required ?? [];

    return Object.entries(normalized.properties ?? {}).map(([name, fieldSchema]) => ({
      name,
      type: this.parseFieldType(fieldSchema),
      required: required.includes(name),
      ...(fieldSchema.enum ? { enum: fieldSchema.enum as (string | number)[] } : {}),
      ...(fieldSchema.description ? { description: fieldSchema.description } : {}),
      ...(fieldSchema.format ? { format: fieldSchema.format } : {}),
    }));
  }

  private parseFieldType(schema: SchemaObject): ImportedFieldType {
    if (schema.oneOf || schema.anyOf) {
      const variants = schema.oneOf ?? schema.anyOf ?? [];
      if (variants.length === 0) {
        throw new Error('OpenAPI composition must contain at least one schema');
      }
      return { kind: 'union', variants: variants.map((variant) => this.parseFieldType(variant)) };
    }

    const normalized = this.mergeAllOf(schema);

    if (normalized.type === 'array' || normalized.items) {
      if (!normalized.items) {
        throw new Error('OpenAPI array schema is missing items');
      }
      return {
        kind: 'array',
        items: this.parseFieldType(normalized.items),
        ...(normalized.minItems !== undefined ? { minItems: normalized.minItems } : {}),
        ...(normalized.maxItems !== undefined ? { maxItems: normalized.maxItems } : {}),
      };
    }

    if (normalized.type === 'object' || normalized.properties) {
      return { kind: 'object', fields: this.parseObjectFields(normalized) };
    }

    const type = Array.isArray(normalized.type)
      ? normalized.type.find((candidate) => candidate !== 'null')
      : normalized.type;
    if (type && !['string', 'number', 'integer', 'boolean', 'null'].includes(type)) {
      throw new Error(`Unsupported OpenAPI schema type: ${type}`);
    }
    const primitiveType =
      type === 'number' || type === 'integer' || type === 'boolean' ? type : 'string';

    return {
      kind: 'primitive',
      type: primitiveType,
      ...(normalized.enum ? { enum: normalized.enum } : {}),
      ...(normalized.format ? { format: normalized.format } : {}),
      ...(normalized.minimum !== undefined ? { minimum: normalized.minimum } : {}),
      ...(normalized.maximum !== undefined ? { maximum: normalized.maximum } : {}),
      ...(normalized.minLength !== undefined ? { minLength: normalized.minLength } : {}),
      ...(normalized.maxLength !== undefined ? { maxLength: normalized.maxLength } : {}),
      ...(normalized.pattern ? { pattern: normalized.pattern } : {}),
    };
  }

  private mergeAllOf(schema: SchemaObject): SchemaObject {
    if (!schema.allOf) {
      return schema;
    }

    return schema.allOf.reduce<SchemaObject>(
      (merged, part) => {
        const normalized = this.mergeAllOf(part);
        return {
          ...merged,
          ...normalized,
          properties: { ...merged.properties, ...normalized.properties },
          required: [...new Set([...(merged.required ?? []), ...(normalized.required ?? [])])],
          allOf: undefined,
        };
      },
      { ...schema, properties: { ...schema.properties }, allOf: undefined }
    );
  }

  getSchema(name: string): ImportedSchema | undefined {
    return this.schemas.get(name);
  }

  getAllSchemas(): Map<string, ImportedSchema> {
    return this.schemas;
  }
}
