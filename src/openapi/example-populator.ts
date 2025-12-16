import SwaggerParser from "@apidevtools/swagger-parser";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import type { OpenAPIV3 } from "openapi-types";

export interface PopulatorOptions {
  externalRefs: boolean;
  exampleCount: number;
  outputDir?: string;
  mapping?: Record<string, string>;
}

export interface PopulatorResult {
  document: OpenAPIV3.Document;
  externalFiles?: Map<string, string>;
}

type SchemaObject = OpenAPIV3.SchemaObject;
type MediaTypeObject = OpenAPIV3.MediaTypeObject;
type OperationObject = OpenAPIV3.OperationObject;
type ResponseObject = OpenAPIV3.ResponseObject;
type RequestBodyObject = OpenAPIV3.RequestBodyObject;
type ReferenceObject = OpenAPIV3.ReferenceObject;

export class OpenAPIExamplePopulator {
  private mapping: Record<string, string> = {};
  private reverseMapping: Record<string, string> = {};

  async loadDocument(path: string): Promise<OpenAPIV3.Document> {
    try {
      // Try swagger-parser first (works for 3.0.x)
      return (await SwaggerParser.parse(path)) as OpenAPIV3.Document;
    } catch (err) {
      // Fall back to direct JSON parsing for 3.1.x
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.includes("Unsupported OpenAPI version")) {
        return JSON.parse(readFileSync(path, "utf-8")) as OpenAPIV3.Document;
      }
      throw err;
    }
  }

  detectMapping(
    collections: string[],
    schemaNames: string[]
  ): Record<string, string> {
    const mapping: Record<string, string> = {};
    const schemaLookup = new Map<string, string>();

    // Build lookup with various normalizations
    for (const name of schemaNames) {
      schemaLookup.set(name.toLowerCase(), name);
      schemaLookup.set(this.singularize(name.toLowerCase()), name);
      schemaLookup.set(this.pluralize(name.toLowerCase()), name);
      // snake_case to PascalCase variants
      schemaLookup.set(this.snakeToPascal(name).toLowerCase(), name);
    }

    for (const collection of collections) {
      const normalized = collection.toLowerCase();

      // Try exact match
      if (schemaLookup.has(normalized)) {
        mapping[collection] = schemaLookup.get(normalized)!;
        continue;
      }

      // Try singular form
      const singular = this.singularize(normalized);
      if (schemaLookup.has(singular)) {
        mapping[collection] = schemaLookup.get(singular)!;
        continue;
      }

      // Try snake_case to PascalCase
      const pascal = this.snakeToPascal(collection).toLowerCase();
      if (schemaLookup.has(pascal)) {
        mapping[collection] = schemaLookup.get(pascal)!;
        continue;
      }

      // Try singular of snake_case
      const singularPascal = this.singularize(pascal);
      if (schemaLookup.has(singularPascal)) {
        mapping[collection] = schemaLookup.get(singularPascal)!;
      }
    }

    return mapping;
  }

  private singularize(word: string): string {
    if (word.endsWith("ies")) {
      return word.slice(0, -3) + "y";
    }
    if (word.endsWith("es") && !word.endsWith("ses")) {
      return word.slice(0, -2);
    }
    if (word.endsWith("s") && !word.endsWith("ss")) {
      return word.slice(0, -1);
    }
    return word;
  }

  private pluralize(word: string): string {
    if (word.endsWith("y")) {
      return word.slice(0, -1) + "ies";
    }
    if (
      word.endsWith("s") ||
      word.endsWith("x") ||
      word.endsWith("ch") ||
      word.endsWith("sh")
    ) {
      return word + "es";
    }
    return word + "s";
  }

  private snakeToPascal(str: string): string {
    return str
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");
  }

  populate(
    doc: OpenAPIV3.Document,
    data: Record<string, unknown[]>,
    options: PopulatorOptions
  ): PopulatorResult {
    const collections = Object.keys(data);
    const schemaNames = Object.keys(doc.components?.schemas ?? {});

    // Build mapping
    const autoMapping = this.detectMapping(collections, schemaNames);
    this.mapping = { ...autoMapping, ...options.mapping };

    // Build reverse mapping (schema -> collection)
    this.reverseMapping = {};
    for (const [collection, schema] of Object.entries(this.mapping)) {
      this.reverseMapping[schema] = collection;
    }

    // Clone document to avoid mutating original
    const result = JSON.parse(JSON.stringify(doc)) as OpenAPIV3.Document;

    let externalFiles: Map<string, string> | undefined;

    if (options.externalRefs) {
      externalFiles = new Map();
      this.populateSchemaExamplesExternal(
        result,
        data,
        options.exampleCount,
        options.outputDir ?? ".",
        externalFiles
      );
      this.populatePathExamplesExternal(
        result,
        data,
        options.exampleCount,
        options.outputDir ?? ".",
        externalFiles
      );
    } else {
      this.populateSchemaExamples(result, data, options.exampleCount);
      this.populatePathExamples(result, data, options.exampleCount);
    }

    return { document: result, externalFiles };
  }

  private populateSchemaExamples(
    doc: OpenAPIV3.Document,
    data: Record<string, unknown[]>,
    exampleCount: number
  ): void {
    if (!doc.components?.schemas) return;

    for (const [schemaName, schema] of Object.entries(doc.components.schemas)) {
      if (this.isReferenceObject(schema)) continue;

      const collection = this.reverseMapping[schemaName];
      if (!collection || !data[collection]?.length) continue;

      const items = data[collection];

      if (exampleCount === 1) {
        // Use single 'example' field
        (schema as SchemaObject).example = items[0];
      } else {
        // Use 'examples' map with named examples
        const examples: Record<string, { value: unknown }> = {};
        const count = Math.min(exampleCount, items.length);

        for (let i = 0; i < count; i++) {
          examples[`example${i + 1}`] = { value: items[i] };
        }

        (schema as SchemaObject & { examples?: unknown }).examples = examples;
      }
    }
  }

  private populateSchemaExamplesExternal(
    doc: OpenAPIV3.Document,
    data: Record<string, unknown[]>,
    exampleCount: number,
    outputDir: string,
    externalFiles: Map<string, string>
  ): void {
    if (!doc.components?.schemas) return;

    const examplesDir = join(outputDir, "examples");

    for (const [schemaName, schema] of Object.entries(doc.components.schemas)) {
      if (this.isReferenceObject(schema)) continue;

      const collection = this.reverseMapping[schemaName];
      if (!collection || !data[collection]?.length) continue;

      const items = data[collection];
      const count = Math.min(exampleCount, items.length);

      if (count === 1) {
        const filename = `${schemaName}.json`;
        const filepath = join(examplesDir, filename);
        externalFiles.set(filepath, JSON.stringify(items[0], null, 2));

        (schema as SchemaObject & { externalValue?: string }).externalValue =
          `./examples/${filename}`;
      } else {
        const examples: Record<string, { externalValue: string }> = {};

        for (let i = 0; i < count; i++) {
          const filename = `${schemaName}-${i + 1}.json`;
          const filepath = join(examplesDir, filename);
          externalFiles.set(filepath, JSON.stringify(items[i], null, 2));
          examples[`example${i + 1}`] = {
            externalValue: `./examples/${filename}`,
          };
        }

        (schema as SchemaObject & { examples?: unknown }).examples = examples;
      }
    }
  }

  private populatePathExamples(
    doc: OpenAPIV3.Document,
    data: Record<string, unknown[]>,
    exampleCount: number
  ): void {
    if (!doc.paths) return;

    for (const pathItem of Object.values(doc.paths)) {
      if (!pathItem) continue;

      const operations: (OperationObject | undefined)[] = [
        pathItem.get,
        pathItem.post,
        pathItem.put,
        pathItem.patch,
        pathItem.delete,
      ];

      for (const operation of operations) {
        if (!operation) continue;

        // Handle responses
        if (operation.responses) {
          for (const response of Object.values(operation.responses)) {
            if (!response || this.isReferenceObject(response)) continue;

            this.populateMediaTypeExamples(
              (response as ResponseObject).content,
              data,
              exampleCount
            );
          }
        }

        // Handle request body
        if (operation.requestBody && !this.isReferenceObject(operation.requestBody)) {
          this.populateMediaTypeExamples(
            (operation.requestBody as RequestBodyObject).content,
            data,
            exampleCount
          );
        }
      }
    }
  }

  private populatePathExamplesExternal(
    doc: OpenAPIV3.Document,
    data: Record<string, unknown[]>,
    exampleCount: number,
    outputDir: string,
    externalFiles: Map<string, string>
  ): void {
    if (!doc.paths) return;

    let pathIndex = 0;
    for (const [path, pathItem] of Object.entries(doc.paths)) {
      if (!pathItem) continue;
      pathIndex++;

      const operations: [string, OperationObject | undefined][] = [
        ["get", pathItem.get],
        ["post", pathItem.post],
        ["put", pathItem.put],
        ["patch", pathItem.patch],
        ["delete", pathItem.delete],
      ];

      for (const [method, operation] of operations) {
        if (!operation) continue;

        const opId = operation.operationId ?? `${method}-${pathIndex}`;

        // Handle responses
        if (operation.responses) {
          for (const [statusCode, response] of Object.entries(operation.responses)) {
            if (!response || this.isReferenceObject(response)) continue;

            this.populateMediaTypeExamplesExternal(
              (response as ResponseObject).content,
              data,
              exampleCount,
              outputDir,
              `${opId}-response-${statusCode}`,
              externalFiles
            );
          }
        }

        // Handle request body
        if (operation.requestBody && !this.isReferenceObject(operation.requestBody)) {
          this.populateMediaTypeExamplesExternal(
            (operation.requestBody as RequestBodyObject).content,
            data,
            exampleCount,
            outputDir,
            `${opId}-request`,
            externalFiles
          );
        }
      }
    }
  }

  private populateMediaTypeExamples(
    content: Record<string, MediaTypeObject> | undefined,
    data: Record<string, unknown[]>,
    exampleCount: number
  ): void {
    if (!content) return;

    for (const mediaType of Object.values(content)) {
      const schemaName = this.extractSchemaName(mediaType.schema);
      if (!schemaName) continue;

      const collection = this.reverseMapping[schemaName];
      if (!collection || !data[collection]?.length) continue;

      const items = data[collection];
      const isArray = this.isArraySchema(mediaType.schema);

      if (exampleCount === 1) {
        mediaType.example = isArray ? items.slice(0, 5) : items[0];
      } else {
        const examples: Record<string, { value: unknown }> = {};
        const count = Math.min(exampleCount, items.length);

        for (let i = 0; i < count; i++) {
          examples[`example${i + 1}`] = {
            value: isArray ? items.slice(i, i + 5) : items[i],
          };
        }

        mediaType.examples = examples;
      }
    }
  }

  private populateMediaTypeExamplesExternal(
    content: Record<string, MediaTypeObject> | undefined,
    data: Record<string, unknown[]>,
    exampleCount: number,
    outputDir: string,
    prefix: string,
    externalFiles: Map<string, string>
  ): void {
    if (!content) return;

    const examplesDir = join(outputDir, "examples");

    for (const [mimeType, mediaType] of Object.entries(content)) {
      const schemaName = this.extractSchemaName(mediaType.schema);
      if (!schemaName) continue;

      const collection = this.reverseMapping[schemaName];
      if (!collection || !data[collection]?.length) continue;

      const items = data[collection];
      const isArray = this.isArraySchema(mediaType.schema);
      const count = Math.min(exampleCount, items.length);

      // Sanitize mime type for filename
      const mimeSlug = mimeType.replace(/[^a-z0-9]/gi, "-");

      if (count === 1) {
        const filename = `${prefix}-${mimeSlug}.json`;
        const filepath = join(examplesDir, filename);
        const value = isArray ? items.slice(0, 5) : items[0];
        externalFiles.set(filepath, JSON.stringify(value, null, 2));

        mediaType.examples = {
          example1: { externalValue: `./examples/${filename}` },
        };
      } else {
        const examples: Record<string, { externalValue: string }> = {};

        for (let i = 0; i < count; i++) {
          const filename = `${prefix}-${mimeSlug}-${i + 1}.json`;
          const filepath = join(examplesDir, filename);
          const value = isArray ? items.slice(i, i + 5) : items[i];
          externalFiles.set(filepath, JSON.stringify(value, null, 2));
          examples[`example${i + 1}`] = {
            externalValue: `./examples/${filename}`,
          };
        }

        mediaType.examples = examples;
      }
    }
  }

  private extractSchemaName(
    schema: SchemaObject | ReferenceObject | undefined
  ): string | null {
    if (!schema) return null;

    if (this.isReferenceObject(schema)) {
      // Extract name from $ref like "#/components/schemas/Pet"
      const ref = schema.$ref;
      const match = ref.match(/#\/components\/schemas\/(\w+)/);
      return match?.[1] ?? null;
    }

    // Check for array with ref items
    if (schema.type === "array" && schema.items) {
      return this.extractSchemaName(schema.items as SchemaObject | ReferenceObject);
    }

    return null;
  }

  private isArraySchema(
    schema: SchemaObject | ReferenceObject | undefined
  ): boolean {
    if (!schema) return false;
    if (this.isReferenceObject(schema)) return false;
    return schema.type === "array";
  }

  private isReferenceObject(obj: unknown): obj is ReferenceObject {
    return typeof obj === "object" && obj !== null && "$ref" in obj;
  }

  writeExternalFiles(files: Map<string, string>): void {
    for (const [filepath, content] of files) {
      mkdirSync(dirname(filepath), { recursive: true });
      writeFileSync(filepath, content);
    }
  }
}
