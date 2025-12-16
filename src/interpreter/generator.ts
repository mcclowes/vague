import {
  Program,
  SchemaDefinition,
  DatasetDefinition,
  CollectionDefinition,
  FieldDefinition,
  Expression,
  Literal,
  SuperpositionExpression,
  RangeExpression,
  CallExpression,
  BinaryExpression,
  ParentReference,
  AnyOfExpression,
  LogicalExpression,
  NotExpression,
  AssumeClause,
  FieldType,
  Cardinality,
  GeneratorType,
  ValidationBlock,
} from "../ast/index.js";
import { OpenAPILoader, ImportedSchema } from "../openapi/index.js";
import { generateCompanyName, generatePersonName, generateProductName, generateText } from "./markov.js";

// Plugin system types
export type GeneratorFunction = (args: unknown[], context: GeneratorContext) => unknown;

export interface VaguePlugin {
  name: string;
  generators: Record<string, GeneratorFunction>;
}

// Global plugin registry
const pluginRegistry: Map<string, VaguePlugin> = new Map();

/**
 * Register a plugin with the generator
 */
export function registerPlugin(plugin: VaguePlugin): void {
  pluginRegistry.set(plugin.name, plugin);
}

/**
 * Get all registered plugins
 */
export function getRegisteredPlugins(): string[] {
  return Array.from(pluginRegistry.keys());
}

export interface GeneratorContext {
  schemas: Map<string, SchemaDefinition>;
  importedSchemas: Map<string, Map<string, ImportedSchema>>;
  collections: Map<string, unknown[]>;
  parent?: Record<string, unknown>;
  current?: Record<string, unknown>;
  currentSchemaName?: string;
}

export class Generator {
  private ctx: GeneratorContext;
  private openApiLoader: OpenAPILoader;

  constructor() {
    this.ctx = {
      schemas: new Map(),
      importedSchemas: new Map(),
      collections: new Map(),
    };
    this.openApiLoader = new OpenAPILoader();
  }

  async generate(program: Program): Promise<Record<string, unknown[]>> {
    // First pass: collect schemas and process imports
    for (const stmt of program.statements) {
      if (stmt.type === "ImportStatement") {
        const schemas = await this.openApiLoader.load(stmt.path);
        this.ctx.importedSchemas.set(stmt.name, schemas);
      } else if (stmt.type === "SchemaDefinition") {
        this.ctx.schemas.set(stmt.name, stmt);
      }
    }

    // Second pass: generate datasets
    const result: Record<string, unknown[]> = {};

    for (const stmt of program.statements) {
      if (stmt.type === "DatasetDefinition") {
        const data = this.generateDataset(stmt);
        Object.assign(result, data);
      }
    }

    return result;
  }

  private generateDataset(dataset: DatasetDefinition): Record<string, unknown[]> {
    const maxAttempts = 20;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result: Record<string, unknown[]> = {};

      // Generate all collections
      for (const collection of dataset.collections) {
        const items = this.generateCollection(collection);
        result[collection.name] = items;
        this.ctx.collections.set(collection.name, items);
      }

      // Check dataset-level constraints
      if (!dataset.validation || this.validateDatasetConstraints(dataset.validation, result)) {
        return result;
      }

      // Clear collections for retry
      for (const collection of dataset.collections) {
        this.ctx.collections.delete(collection.name);
      }
    }

    // Fallback: return last attempt with warning
    console.warn(`Warning: Dataset constraints not satisfied after ${maxAttempts} attempts`);
    const result: Record<string, unknown[]> = {};
    for (const collection of dataset.collections) {
      const items = this.generateCollection(collection);
      result[collection.name] = items;
      this.ctx.collections.set(collection.name, items);
    }
    return result;
  }

  private validateDatasetConstraints(
    validation: ValidationBlock,
    data: Record<string, unknown[]>
  ): boolean {
    // Store all collections in context for expression evaluation
    for (const [name, items] of Object.entries(data)) {
      this.ctx.collections.set(name, items);
    }

    // Evaluate each validation expression
    for (const constraint of validation.validations) {
      try {
        const result = this.evaluateExpression(constraint);
        if (!Boolean(result)) {
          return false;
        }
      } catch {
        // Expression evaluation failed, constraint not satisfied
        return false;
      }
    }

    return true;
  }

  private generateCollection(collection: CollectionDefinition): unknown[] {
    const count = this.resolveCardinality(collection.cardinality);
    const items: unknown[] = [];

    const schema = this.ctx.schemas.get(collection.schemaRef);
    if (!schema) {
      throw new Error(`Unknown schema: ${collection.schemaRef}`);
    }

    for (let i = 0; i < count; i++) {
      const item = this.generateInstance(schema, collection.overrides);
      items.push(item);
    }

    return items;
  }

  private generateInstance(
    schema: SchemaDefinition,
    overrides?: FieldDefinition[]
  ): Record<string, unknown> {
    const maxAttempts = 100;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const instance = this.generateInstanceAttempt(schema, overrides);

      // If no constraints, return immediately
      if (!schema.assumes || schema.assumes.length === 0) {
        return instance;
      }

      // Check all constraints
      if (this.validateConstraints(schema.assumes, instance)) {
        return instance;
      }
    }

    // If we couldn't satisfy constraints, return last attempt with warning
    console.warn(`Warning: Could not satisfy constraints for ${schema.name} after ${maxAttempts} attempts`);
    return this.generateInstanceAttempt(schema, overrides);
  }

  private generateInstanceAttempt(
    schema: SchemaDefinition,
    overrides?: FieldDefinition[]
  ): Record<string, unknown> {
    const instance: Record<string, unknown> = {};
    this.ctx.current = instance;
    this.ctx.currentSchemaName = schema.name;

    // Get base schema fields if extending an imported schema
    const baseFields = this.getBaseFields(schema);

    // Merge schema fields with overrides
    const fields = new Map<string, FieldDefinition>();
    for (const field of schema.fields) {
      fields.set(field.name, field);
    }
    if (overrides) {
      for (const field of overrides) {
        fields.set(field.name, field);
      }
    }

    // Categorize fields by generation order:
    // 1. Simple fields (non-collection, non-computed) - generated first
    // 2. Collection fields - generated second (so parent refs work)
    // 3. Computed fields - generated last (may reference collections)
    const collectionFields: [string, FieldDefinition][] = [];
    const computedFields: [string, FieldDefinition][] = [];

    for (const [name, field] of fields) {
      // Skip conditional fields if condition not met
      if (field.condition && !this.evaluateCondition(field.condition, instance)) {
        continue;
      }

      // Skip optional fields sometimes
      if (field.optional && Math.random() > 0.7) {
        continue;
      }

      // Defer computed fields until after collections
      if (field.computed) {
        computedFields.push([name, field]);
        continue;
      }

      // Defer collection fields
      if (field.fieldType.type === "CollectionType") {
        collectionFields.push([name, field]);
        continue;
      }

      instance[name] = this.generateField(field, baseFields.get(name));
    }

    // Generate collection fields (nested schemas can reference parent)
    for (const [name, field] of collectionFields) {
      instance[name] = this.generateField(field, baseFields.get(name));
    }

    // Generate computed fields last (can reference collections)
    for (const [name, field] of computedFields) {
      instance[name] = this.generateField(field, baseFields.get(name));
    }

    // Fill in any base fields we haven't covered
    for (const [name, baseField] of baseFields) {
      if (!(name in instance)) {
        instance[name] = this.generateFromImportedField(baseField, name);
      }
    }

    return instance;
  }

  private validateConstraints(
    assumes: AssumeClause[],
    instance: Record<string, unknown>
  ): boolean {
    const oldCurrent = this.ctx.current;
    this.ctx.current = instance;

    try {
      for (const assume of assumes) {
        // Check if conditional constraint applies
        if (assume.condition) {
          const conditionMet = Boolean(this.evaluateExpression(assume.condition));
          if (!conditionMet) {
            // Condition not met, skip these constraints
            continue;
          }
        }

        // All constraints in the clause must be true
        for (const constraint of assume.constraints) {
          const result = this.evaluateExpression(constraint);
          if (!Boolean(result)) {
            return false;
          }
        }
      }
      return true;
    } finally {
      this.ctx.current = oldCurrent;
    }
  }

  private getBaseFields(schema: SchemaDefinition): Map<string, unknown> {
    const fields = new Map();

    if (schema.base) {
      const [namespace, schemaName] = schema.base.parts;
      const importedSchemas = this.ctx.importedSchemas.get(namespace);
      if (importedSchemas) {
        const imported = importedSchemas.get(schemaName);
        if (imported) {
          for (const field of imported.fields) {
            fields.set(field.name, field);
          }
        }
      }
    }

    return fields;
  }

  private generateFromImportedField(field: unknown, fieldName?: string): unknown {
    // Basic type generation for imported fields
    const f = field as { type: { kind: string; type?: string }; enum?: unknown[]; name?: string };
    if (f.enum && f.enum.length > 0) {
      return f.enum[Math.floor(Math.random() * f.enum.length)];
    }

    switch (f.type.kind) {
      case "primitive":
        switch (f.type.type) {
          case "string":
            return this.randomString(fieldName ?? f.name);
          case "integer":
            return Math.floor(Math.random() * 1000);
          case "number":
            return Math.random() * 1000;
          case "boolean":
            return Math.random() > 0.5;
          default:
            return null;
        }
      case "array":
        return [];
      default:
        return null;
    }
  }

  private generateField(field: FieldDefinition, _baseField?: unknown): unknown {
    // Computed fields - expression is stored in distribution
    if (field.computed && field.distribution) {
      return this.evaluateExpression(field.distribution);
    }

    return this.generateFromFieldType(field.fieldType, field.name);
  }

  private generateFromFieldType(fieldType: FieldType, fieldName?: string): unknown {
    switch (fieldType.type) {
      case "PrimitiveType":
        return this.generatePrimitive(fieldType.name, fieldName);

      case "RangeType":
        return this.generateInRange(
          fieldType.baseType.name,
          fieldType.min,
          fieldType.max
        );

      case "SuperpositionType":
        return this.pickWeighted(fieldType.options);

      case "CollectionType":
        return this.generateCollectionField(fieldType);

      case "ReferenceType":
        return this.resolveReference(fieldType.path.parts);

      case "ExpressionType":
        return this.evaluateExpression(fieldType.expression);

      case "GeneratorType":
        return this.generateFromPlugin(fieldType);

      default:
        return null;
    }
  }

  private generateFromPlugin(genType: GeneratorType): unknown {
    const { name, arguments: args } = genType;

    // Evaluate arguments
    const evaluatedArgs = args.map(arg => this.evaluateExpression(arg));

    // Try to find generator: "faker.person.firstName" -> plugin "faker", generator "person.firstName"
    // Or simple: "uuid" -> any plugin with generator "uuid"
    const parts = name.split(".");

    if (parts.length > 1) {
      // Qualified name: faker.person.firstName
      const pluginName = parts[0];
      const generatorPath = parts.slice(1).join(".");

      const plugin = pluginRegistry.get(pluginName);
      if (plugin) {
        const generator = plugin.generators[generatorPath];
        if (generator) {
          return generator(evaluatedArgs, this.ctx);
        }
        throw new Error(`Generator '${generatorPath}' not found in plugin '${pluginName}'`);
      }
      throw new Error(`Plugin '${pluginName}' not registered. Use registerPlugin() to register it.`);
    }

    // Simple name: uuid - search all plugins
    for (const plugin of pluginRegistry.values()) {
      const generator = plugin.generators[name];
      if (generator) {
        return generator(evaluatedArgs, this.ctx);
      }
    }

    throw new Error(
      `Generator '${name}' not found. Register a plugin that provides it using registerPlugin().`
    );
  }

  private generatePrimitive(
    type: "int" | "decimal" | "string" | "date" | "boolean",
    fieldName?: string
  ): unknown {
    switch (type) {
      case "int":
        return Math.floor(Math.random() * 1000);
      case "decimal":
        return Math.round(Math.random() * 10000) / 100;
      case "string":
        return this.randomString(fieldName);
      case "date":
        return this.randomDate();
      case "boolean":
        return Math.random() > 0.5;
    }
  }

  private generateInRange(
    type: string,
    min?: Expression,
    max?: Expression
  ): unknown {
    const minVal = min ? (this.evaluateExpression(min) as number) : 0;
    const maxVal = max ? (this.evaluateExpression(max) as number) : 1000;

    if (type === "int") {
      return Math.floor(Math.random() * (maxVal - minVal + 1)) + minVal;
    }

    if (type === "date") {
      const minDate = new Date(minVal, 0, 1);
      const maxDate = new Date(maxVal, 11, 31);
      const diff = maxDate.getTime() - minDate.getTime();
      return new Date(minDate.getTime() + Math.random() * diff)
        .toISOString()
        .split("T")[0];
    }

    return Math.random() * (maxVal - minVal) + minVal;
  }

  private pickWeighted(
    options: { weight?: number; value: Expression }[]
  ): unknown {
    // If no weights, equal probability
    const hasWeights = options.some((o) => o.weight !== undefined);

    if (!hasWeights) {
      const idx = Math.floor(Math.random() * options.length);
      return this.evaluateExpression(options[idx].value);
    }

    // Weighted selection
    const totalWeight = options.reduce((sum, o) => sum + (o.weight ?? 0), 0);
    let random = Math.random() * totalWeight;

    for (const option of options) {
      random -= option.weight ?? 0;
      if (random <= 0) {
        return this.evaluateExpression(option.value);
      }
    }

    return this.evaluateExpression(options[options.length - 1].value);
  }

  private generateCollectionField(fieldType: {
    cardinality: Cardinality;
    elementType: FieldType;
  }): unknown[] {
    const count = this.resolveCardinality(fieldType.cardinality);
    const items: unknown[] = [];

    // Save current instance as parent for nested generation
    const parentInstance = this.ctx.current;

    for (let i = 0; i < count; i++) {
      // If element type is a reference to a schema, generate an instance
      if (fieldType.elementType.type === "ReferenceType") {
        const schemaName = fieldType.elementType.path.parts[0];
        const schema = this.ctx.schemas.get(schemaName);
        if (schema) {
          // Set parent context for nested generation
          this.ctx.parent = parentInstance;
          items.push(this.generateInstance(schema));
          continue;
        }
      }
      items.push(this.generateFromFieldType(fieldType.elementType));
    }

    // Restore context
    this.ctx.current = parentInstance;
    this.ctx.parent = undefined;

    return items;
  }

  private resolveReference(parts: string[]): unknown {
    // Handle path expressions like line_items.amount or invoices.total
    // When traversing into an array, map over it to extract values
    let value: unknown = this.ctx.current;

    // First part might be a collection name (for dataset-level validation)
    const [first, ...rest] = parts;
    if (this.ctx.collections.has(first)) {
      value = this.ctx.collections.get(first);
      // If no more parts, return the collection
      if (rest.length === 0) {
        return value;
      }
      // Continue with remaining parts
      for (const part of rest) {
        if (Array.isArray(value)) {
          value = value.map((item) => {
            if (item && typeof item === "object" && part in item) {
              return (item as Record<string, unknown>)[part];
            }
            return null;
          }).filter((v) => v !== null);
        } else if (value && typeof value === "object" && part in value) {
          value = (value as Record<string, unknown>)[part];
        } else {
          return null;
        }
      }
      return value;
    }

    // Otherwise start from current context (schema-level)
    for (const part of parts) {
      if (Array.isArray(value)) {
        // Map over array to extract field from each item
        value = value.map((item) => {
          if (item && typeof item === "object" && part in item) {
            return (item as Record<string, unknown>)[part];
          }
          return null;
        }).filter((v) => v !== null);
      } else if (value && typeof value === "object" && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return null;
      }
    }

    return value;
  }

  private evaluateExpression(expr: Expression): unknown {
    switch (expr.type) {
      case "Literal":
        return (expr as Literal).value;

      case "Identifier": {
        const name = (expr as { name: string }).name;
        // Check collections first (for dataset-level validation)
        if (this.ctx.collections.has(name)) {
          return this.ctx.collections.get(name);
        }
        // Then check current instance context
        return this.ctx.current?.[name] ?? null;
      }

      case "QualifiedName": {
        const parts = (expr as { parts: string[] }).parts;
        return this.resolveReference(parts);
      }

      case "SuperpositionExpression":
        return this.pickWeighted((expr as SuperpositionExpression).options);

      case "RangeExpression": {
        const range = expr as RangeExpression;
        const min = range.min ? (this.evaluateExpression(range.min) as number) : 0;
        const max = range.max ? (this.evaluateExpression(range.max) as number) : 100;
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }

      case "CallExpression":
        return this.evaluateCall(expr as CallExpression);

      case "BinaryExpression":
        return this.evaluateBinary(expr as BinaryExpression);

      case "ParentReference": {
        const ref = expr as ParentReference;
        if (this.ctx.parent) {
          return this.resolveFromObject(this.ctx.parent, ref.path.parts);
        }
        return null;
      }

      case "AnyOfExpression": {
        const anyOf = expr as AnyOfExpression;
        const collectionName =
          anyOf.collection.type === "Identifier"
            ? (anyOf.collection as { name: string }).name
            : null;
        if (collectionName) {
          let items = this.ctx.collections.get(collectionName);
          if (items && items.length > 0) {
            // Apply where clause filter if present
            if (anyOf.condition) {
              items = items.filter((item) => {
                const oldCurrent = this.ctx.current;
                this.ctx.current = item as Record<string, unknown>;
                const result = this.evaluateExpression(anyOf.condition!);
                this.ctx.current = oldCurrent;
                return Boolean(result);
              });
            }
            if (items.length > 0) {
              return items[Math.floor(Math.random() * items.length)];
            }
          }
        }
        return null;
      }

      case "LogicalExpression": {
        const logical = expr as LogicalExpression;
        const left = Boolean(this.evaluateExpression(logical.left));
        if (logical.operator === "and") {
          // Short-circuit: if left is false, return false
          if (!left) return false;
          return Boolean(this.evaluateExpression(logical.right));
        } else {
          // or: short-circuit: if left is true, return true
          if (left) return true;
          return Boolean(this.evaluateExpression(logical.right));
        }
      }

      case "NotExpression": {
        const not = expr as NotExpression;
        return !Boolean(this.evaluateExpression(not.operand));
      }

      default:
        return null;
    }
  }

  private evaluateCall(call: CallExpression): unknown {
    const args = call.arguments.map((a) => this.evaluateExpression(a));

    switch (call.callee) {
      case "sum": {
        const arr = args[0];
        if (Array.isArray(arr)) {
          return arr.reduce((sum: number, item) => {
            if (typeof item === "number") return sum + item;
            return sum;
          }, 0);
        }
        return 0;
      }
      case "count": {
        const arr = args[0];
        return Array.isArray(arr) ? arr.length : 0;
      }
      case "min": {
        const arr = args[0];
        if (Array.isArray(arr) && arr.length > 0) {
          const nums = arr.filter((x): x is number => typeof x === "number");
          return nums.length > 0 ? Math.min(...nums) : 0;
        }
        // Fallback for direct number arguments
        const nums = args.filter((x): x is number => typeof x === "number");
        return nums.length > 0 ? Math.min(...nums) : 0;
      }
      case "max": {
        const arr = args[0];
        if (Array.isArray(arr) && arr.length > 0) {
          const nums = arr.filter((x): x is number => typeof x === "number");
          return nums.length > 0 ? Math.max(...nums) : 0;
        }
        // Fallback for direct number arguments
        const nums = args.filter((x): x is number => typeof x === "number");
        return nums.length > 0 ? Math.max(...nums) : 0;
      }
      case "avg": {
        const arr = args[0];
        if (Array.isArray(arr) && arr.length > 0) {
          const nums = arr.filter((x): x is number => typeof x === "number");
          if (nums.length === 0) return 0;
          const sum = nums.reduce((s, n) => s + n, 0);
          return sum / nums.length;
        }
        return 0;
      }
      default:
        return null;
    }
  }

  private evaluateBinary(expr: BinaryExpression): unknown {
    const left = this.evaluateExpression(expr.left);
    const right = this.evaluateExpression(expr.right);

    switch (expr.operator) {
      case "+":
        return (left as number) + (right as number);
      case "-":
        return (left as number) - (right as number);
      case "*":
        return (left as number) * (right as number);
      case "/":
        return (left as number) / (right as number);
      case "==":
        return left === right;
      case "<":
        return (left as number) < (right as number);
      case ">":
        return (left as number) > (right as number);
      case "<=":
        return (left as number) <= (right as number);
      case ">=":
        return (left as number) >= (right as number);
      default:
        return null;
    }
  }

  private evaluateCondition(
    condition: Expression,
    instance: Record<string, unknown>
  ): boolean {
    const oldCurrent = this.ctx.current;
    this.ctx.current = instance;
    const result = this.evaluateExpression(condition);
    this.ctx.current = oldCurrent;
    return Boolean(result);
  }

  private resolveFromObject(obj: Record<string, unknown>, parts: string[]): unknown {
    let value: unknown = obj;
    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return null;
      }
    }
    return value;
  }

  private resolveCardinality(cardinality: Cardinality): number {
    if (cardinality.min === cardinality.max) {
      return cardinality.min;
    }
    return (
      Math.floor(Math.random() * (cardinality.max - cardinality.min + 1)) +
      cardinality.min
    );
  }

  private randomString(fieldName?: string): string {
    // Use field name and schema context to pick appropriate generator
    const field = fieldName?.toLowerCase() ?? "";
    const schema = this.ctx.currentSchemaName?.toLowerCase() ?? "";

    // Check schema context first
    if (schema.includes("company") || schema.includes("business") || schema.includes("organization")) {
      if (field === "name" || field.includes("company")) {
        return generateCompanyName();
      }
    }

    // Then field name heuristics
    if (field.includes("company") || field.includes("business") || field.includes("organization")) {
      return generateCompanyName();
    }
    if (field === "name" || field.includes("person") || field.includes("customer") || field.includes("contact")) {
      return generatePersonName();
    }
    if (field.includes("product") || field.includes("item") || field.includes("description")) {
      return generateProductName();
    }

    return generateText("word");
  }

  private randomDate(): string {
    const start = new Date(2020, 0, 1);
    const end = new Date();
    const date = new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime())
    );
    return date.toISOString().split("T")[0];
  }
}
