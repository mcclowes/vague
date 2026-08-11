import $RefParser from '@apidevtools/json-schema-ref-parser';
import {
  createOpenAPIImportWarning,
  createOpenAPIValidationGapWarning,
  warningCollector,
} from '../warnings.js';

export interface ImportedSchema {
  name: string;
  fields: ImportedField[];
  required: string[];
  variants?: ImportedField[][];
}

export interface ImportedField {
  name: string;
  type: ImportedFieldType;
  required: boolean;
  enum?: (string | number)[];
  description?: string;
  format?: string;
  constraints?: ImportedFieldConstraints;
  sourcePath?: string;
}

export interface ImportedFieldConstraints {
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
}

interface ImportedValueConstraints extends ImportedFieldConstraints {
  format?: string;
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
  not?: SchemaObject;
  if?: SchemaObject;
  then?: SchemaObject;
  else?: SchemaObject;
  additionalProperties?: boolean | SchemaObject;
  prefixItems?: SchemaObject[];
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
    const path = `components.schemas.${name}`;
    this.warnForUnsupportedKeywords(schema, path);

    if (schema.oneOf || schema.anyOf) {
      const variants = schema.oneOf ?? schema.anyOf ?? [];
      if (variants.length === 0) {
        throw new Error(`OpenAPI schema '${name}' composition must contain at least one variant`);
      }

      const parsedVariants = variants.map((variant, index) =>
        this.parseObjectFields(variant, `${path}.${schema.oneOf ? 'oneOf' : 'anyOf'}[${index}]`)
      );
      if (parsedVariants.some((fields) => fields.length === 0)) {
        throw new Error(`OpenAPI schema '${name}' has a non-object composition variant`);
      }

      return {
        name,
        fields: this.mergeVariantFields(parsedVariants),
        required: [],
        variants: parsedVariants,
      };
    }

    const normalized = this.mergeAllOf(schema);
    const required = normalized.required ?? [];
    return {
      name,
      fields: this.parseObjectFields(normalized, path),
      required,
    };
  }

  private mergeVariantFields(variants: ImportedField[][]): ImportedField[] {
    const fields = new Map<string, ImportedField>();
    for (const variant of variants) {
      for (const field of variant) {
        fields.set(field.name, field);
      }
    }
    return [...fields.values()];
  }

  private parseObjectFields(schema: SchemaObject, path = 'schema'): ImportedField[] {
    const normalized = this.mergeAllOf(schema);
    const required = normalized.required ?? [];

    return Object.entries(normalized.properties ?? {}).map(([name, fieldSchema]) => {
      const sourcePath = `${path}.properties.${name}`;
      this.warnForDescriptionValidation(fieldSchema, sourcePath);
      const constraints = this.extractConstraints(fieldSchema);
      return {
        name,
        type: this.parseFieldType(fieldSchema, sourcePath),
        required: required.includes(name),
        ...(fieldSchema.enum ? { enum: fieldSchema.enum as (string | number)[] } : {}),
        ...(fieldSchema.description ? { description: fieldSchema.description } : {}),
        ...(fieldSchema.format ? { format: fieldSchema.format } : {}),
        ...(Object.keys(constraints).length > 0 ? { constraints } : {}),
        sourcePath,
      };
    });
  }

  private parseFieldType(schema: SchemaObject, path = 'schema'): ImportedFieldType {
    this.warnForUnsupportedKeywords(schema, path);

    if (schema.oneOf || schema.anyOf) {
      const variants = schema.oneOf ?? schema.anyOf ?? [];
      if (variants.length === 0) {
        throw new Error('OpenAPI composition must contain at least one schema');
      }
      return {
        kind: 'union',
        variants: variants.map((variant, index) =>
          this.parseFieldType(variant, `${path}.${schema.oneOf ? 'oneOf' : 'anyOf'}[${index}]`)
        ),
      };
    }

    const normalized = this.mergeAllOf(schema);

    if (normalized.type === 'array' || normalized.items || normalized.prefixItems) {
      const items =
        normalized.items ??
        (normalized.prefixItems?.length ? { oneOf: normalized.prefixItems } : undefined);
      if (!items) {
        throw new Error('OpenAPI array schema is missing items');
      }
      return {
        kind: 'array',
        items: this.parseFieldType(items, `${path}.items`),
        ...(normalized.minItems !== undefined ? { minItems: normalized.minItems } : {}),
        ...(normalized.maxItems !== undefined ? { maxItems: normalized.maxItems } : {}),
      };
    }

    if (normalized.type === 'object' || normalized.properties) {
      return { kind: 'object', fields: this.parseObjectFields(normalized, path) };
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

  private warnForUnsupportedKeywords(schema: SchemaObject, path: string): void {
    const unsupported = [
      schema.not ? 'not' : undefined,
      schema.if ? 'if/then/else' : undefined,
      schema.additionalProperties !== undefined && schema.additionalProperties !== false
        ? 'additionalProperties'
        : undefined,
      schema.prefixItems ? 'prefixItems' : undefined,
    ].filter((keyword): keyword is string => keyword !== undefined);

    if (unsupported.length > 0) {
      warningCollector.add(createOpenAPIImportWarning(path, unsupported));
    }
  }

  private extractConstraints(schema: SchemaObject): ImportedFieldConstraints {
    return {
      ...(schema.enum ? { enum: schema.enum } : {}),
      ...(schema.minimum !== undefined ? { minimum: schema.minimum } : {}),
      ...(schema.maximum !== undefined ? { maximum: schema.maximum } : {}),
      ...(schema.minLength !== undefined ? { minLength: schema.minLength } : {}),
      ...(schema.maxLength !== undefined ? { maxLength: schema.maxLength } : {}),
      ...(schema.pattern ? { pattern: schema.pattern } : {}),
      ...(schema.minItems !== undefined ? { minItems: schema.minItems } : {}),
      ...(schema.maxItems !== undefined ? { maxItems: schema.maxItems } : {}),
    };
  }

  private warnForDescriptionValidation(schema: SchemaObject, path: string): void {
    if (
      schema.description &&
      /\b(must|shall|required to|at least|at most|exactly|cannot|only if)\b/i.test(
        schema.description
      )
    ) {
      warningCollector.add(createOpenAPIValidationGapWarning(path, schema.description));
    }
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
