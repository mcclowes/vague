import SwaggerParser from "@apidevtools/swagger-parser";
import { readFileSync } from "node:fs";
import type { OpenAPIV3 } from "openapi-types";

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
}

export type ImportedFieldType =
  | { kind: "primitive"; type: "string" | "number" | "integer" | "boolean" }
  | { kind: "array"; items: ImportedFieldType }
  | { kind: "object"; schema: string }
  | { kind: "ref"; ref: string };

export class OpenAPILoader {
  private schemas: Map<string, ImportedSchema> = new Map();

  async load(path: string): Promise<Map<string, ImportedSchema>> {
    let api: OpenAPIV3.Document;

    try {
      // Try swagger-parser first (works for 3.0.x)
      api = (await SwaggerParser.dereference(path)) as OpenAPIV3.Document;
    } catch (err) {
      // Fall back to direct JSON parsing for 3.1.x
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("Unsupported OpenAPI version")) {
        api = JSON.parse(readFileSync(path, "utf-8")) as OpenAPIV3.Document;
      } else {
        throw err;
      }
    }

    if (!api.components?.schemas) {
      return this.schemas;
    }

    for (const [name, schema] of Object.entries(api.components.schemas)) {
      if (this.isSchemaObject(schema)) {
        this.schemas.set(name, this.parseSchema(name, schema));
      }
    }

    return this.schemas;
  }

  private parseSchema(name: string, schema: OpenAPIV3.SchemaObject): ImportedSchema {
    const required = schema.required ?? [];
    const fields: ImportedField[] = [];

    if (schema.properties) {
      for (const [fieldName, fieldSchema] of Object.entries(schema.properties)) {
        if (this.isSchemaObject(fieldSchema)) {
          fields.push({
            name: fieldName,
            type: this.parseFieldType(fieldSchema),
            required: required.includes(fieldName),
            enum: fieldSchema.enum as (string | number)[] | undefined,
            description: fieldSchema.description,
          });
        }
      }
    }

    return { name, fields, required };
  }

  private parseFieldType(schema: OpenAPIV3.SchemaObject): ImportedFieldType {
    if (schema.type === "array" && schema.items) {
      const items = this.isSchemaObject(schema.items)
        ? this.parseFieldType(schema.items)
        : { kind: "primitive" as const, type: "string" as const };
      return { kind: "array", items };
    }

    if (schema.type === "object") {
      // Inline object - we'd need to handle this specially
      return { kind: "primitive", type: "string" };
    }

    if (schema.type === "string") {
      return { kind: "primitive", type: "string" };
    }

    if (schema.type === "integer") {
      return { kind: "primitive", type: "integer" };
    }

    if (schema.type === "number") {
      return { kind: "primitive", type: "number" };
    }

    if (schema.type === "boolean") {
      return { kind: "primitive", type: "boolean" };
    }

    // Default fallback
    return { kind: "primitive", type: "string" };
  }

  private isSchemaObject(
    schema: OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject
  ): schema is OpenAPIV3.SchemaObject {
    return !("$ref" in schema);
  }

  getSchema(name: string): ImportedSchema | undefined {
    return this.schemas.get(name);
  }

  getAllSchemas(): Map<string, ImportedSchema> {
    return this.schemas;
  }
}
