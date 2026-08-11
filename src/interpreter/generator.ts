/**
 * Generator - Main entry point for data generation
 *
 * This module orchestrates the generation process by coordinating:
 * - ExpressionEvaluator: Evaluates AST expressions to runtime values
 * - FieldGenerator: Generates individual field values
 * - InstanceGenerator: Generates schema instances with constraints
 * - DatasetGenerator: Generates datasets and collections
 */
import { Program, SchemaDefinition, Expression } from '../ast/index.js';
import RandExp from 'randexp';
import { OpenAPILoader, type ImportedFieldType } from '../openapi/index.js';
import { warningCollector, createUnknownFieldWarning } from '../warnings.js';
import { isRecord, getProperty } from '../utils/type-guards.js';

// Import refactored modules
import { GeneratorContext, createContext } from './context.js';
import { setSeed } from './random.js';
import {
  registerPlugin,
  unregisterPlugin,
  getRegisteredPlugins,
  type VaguePlugin,
  type GeneratorFunction,
  type ParserContext,
  type StatementParserFunction,
  type PluginKeyword,
} from './plugin.js';
import { ExpressionEvaluator } from './expression-evaluator.js';
import { FieldGenerator } from './field-generator.js';
import { InstanceGenerator } from './instance-generator.js';
import { DatasetGenerator } from './dataset-generator.js';
import { createLogger } from '../logging/index.js';

const generatorLog = createLogger('generator');

// Re-export for external use
export { setSeed, getSeed } from './random.js';
export { registerPlugin, unregisterPlugin, getRegisteredPlugins };
export type {
  VaguePlugin,
  GeneratorFunction,
  ParserContext,
  StatementParserFunction,
  PluginKeyword,
};
export type { GeneratorContext };

/**
 * Main Generator class - orchestrates data generation from AST
 */
export class Generator {
  private ctx: GeneratorContext;
  private openApiLoader: OpenAPILoader;

  // Sub-generators (lazily initialized)
  private expressionEvaluator!: ExpressionEvaluator;
  private fieldGenerator!: FieldGenerator;
  private instanceGenerator!: InstanceGenerator;
  private datasetGenerator!: DatasetGenerator;

  constructor(ctxOrRetryLimits?: GeneratorContext | import('../config/index.js').RetryLimits) {
    // Support both GeneratorContext and RetryLimits for backwards compatibility
    if (ctxOrRetryLimits && 'schemas' in ctxOrRetryLimits) {
      this.ctx = ctxOrRetryLimits;
    } else {
      this.ctx = createContext(ctxOrRetryLimits);
    }
    this.openApiLoader = new OpenAPILoader();

    // Initialize sub-generators with their dependencies
    this.initializeSubGenerators();
  }

  private initializeSubGenerators(): void {
    // ExpressionEvaluator needs generatePrimitive and resolveFromObject
    this.expressionEvaluator = new ExpressionEvaluator(this.ctx, {
      generatePrimitive: (type, fieldName, precision) => {
        return this.fieldGenerator.generatePrimitive(type, fieldName, precision);
      },
      resolveFromObject: (obj, parts) => this.resolveFromObject(obj, parts),
    });

    // FieldGenerator needs evaluateExpression, generateInstance, and getSchema
    this.fieldGenerator = new FieldGenerator(this.ctx, {
      evaluateExpression: (expr) => this.expressionEvaluator.evaluate(expr),
      generateInstance: (schema, overrides) =>
        this.instanceGenerator.generate(schema as SchemaDefinition, overrides),
      getSchema: (name) => this.ctx.schemas.get(name),
    });

    // InstanceGenerator needs various field/expression methods
    this.instanceGenerator = new InstanceGenerator(this.ctx, {
      evaluateExpression: (expr) => this.expressionEvaluator.evaluate(expr),
      evaluateCondition: (cond, inst) => this.expressionEvaluator.evaluateCondition(cond, inst),
      generateField: (field, baseField) => this.fieldGenerator.generate(field, baseField),
      generateFromFieldType: (ft, fn) => this.fieldGenerator.generateFromFieldType(ft, fn),
      getBaseFields: (schema) => this.getBaseFields(schema),
      generateFromImportedField: (field, name) => this.generateFromImportedField(field, name),
    });

    // DatasetGenerator needs expression evaluation and instance generation
    this.datasetGenerator = new DatasetGenerator(this.ctx, {
      evaluateExpression: (expr) => this.expressionEvaluator.evaluate(expr),
      generateInstance: (schema, overrides) => this.instanceGenerator.generate(schema, overrides),
      getSchema: (name) => this.ctx.schemas.get(name),
      resolveCardinality: (card) => this.fieldGenerator.resolveCardinality(card),
    });
  }

  /**
   * Generate data from a parsed AST program
   */
  async generate(program: Program): Promise<Record<string, unknown[]>> {
    // Clear warnings from any previous compilation
    warningCollector.clear();

    // Sync global random with context's RNG for backward compatibility
    // This ensures markov.ts and other code using global random stays in sync
    // TODO: Eventually refactor markov.ts to accept RNG as parameter
    const contextSeed = this.ctx.rng.getSeed();
    if (contextSeed !== null) {
      setSeed(contextSeed);
    }

    generatorLog.debug('Starting generation', { statements: program.statements.length });

    // First pass: collect schemas, contracts, imports, and let bindings
    for (const stmt of program.statements) {
      if (stmt.type === 'ImportStatement') {
        generatorLog.debug('Loading OpenAPI import', { name: stmt.name, path: stmt.path });
        const schemas = await this.openApiLoader.load(stmt.path);
        this.ctx.importedSchemas.set(stmt.name, schemas);
        generatorLog.info('Loaded OpenAPI schemas', { name: stmt.name, count: schemas.size });
      } else if (stmt.type === 'SchemaDefinition') {
        this.ctx.schemas.set(stmt.name, stmt);
        generatorLog.debug('Registered schema', {
          name: stmt.name,
          fields: stmt.fields.length,
          constraints: stmt.assumes?.length ?? 0,
          invariants: stmt.invariants?.length ?? 0,
          contracts: stmt.contracts?.length ?? 0,
        });
      } else if (stmt.type === 'ContractDefinition') {
        this.ctx.contracts.set(stmt.name, stmt);
        generatorLog.debug('Registered contract', {
          name: stmt.name,
          invariants: stmt.invariants.length,
        });
      } else if (stmt.type === 'LetStatement') {
        this.ctx.bindings.set(stmt.name, stmt.value);
        generatorLog.debug('Registered let binding', { name: stmt.name });
      }
    }

    generatorLog.info('Schema registration complete', {
      schemas: this.ctx.schemas.size,
      contracts: this.ctx.contracts.size,
      imports: this.ctx.importedSchemas.size,
      bindings: this.ctx.bindings.size,
    });

    // Validate schemas that extend imported schemas
    this.validateSchemaFields();

    // Second pass: generate datasets
    const result: Record<string, unknown[]> = {};

    for (const stmt of program.statements) {
      if (stmt.type === 'DatasetDefinition') {
        generatorLog.debug('Generating dataset', {
          name: stmt.name,
          collections: stmt.collections.length,
          violating: stmt.violating ?? false,
        });
        const data = this.datasetGenerator.generate(stmt);
        Object.assign(result, data);
      }
    }

    return result;
  }

  /**
   * Evaluate an expression (public API for plugins/tests)
   */
  public evaluateExpression(expr: Expression): unknown {
    return this.expressionEvaluator.evaluate(expr);
  }

  /**
   * Get base fields from an imported schema
   */
  private getBaseFields(schema: SchemaDefinition): Map<string, unknown> {
    const fields = new Map();

    if (schema.base) {
      const [namespace, schemaName] = schema.base.parts;
      const importedSchemas = this.ctx.importedSchemas.get(namespace);
      if (importedSchemas) {
        const imported = importedSchemas.get(schemaName);
        if (imported) {
          const importedFields = imported.variants
            ? imported.variants[Math.floor(this.ctx.rng.random() * imported.variants.length)]
            : imported.fields;
          for (const field of importedFields) {
            fields.set(field.name, field);
          }
        }
      }
    }

    return fields;
  }

  /**
   * Validate that schemas extending imported schemas don't add unknown fields
   */
  private validateSchemaFields(): void {
    for (const [schemaName, schema] of this.ctx.schemas) {
      if (!schema.base) continue;

      const [namespace, importedSchemaName] = schema.base.parts;
      const importedSchemas = this.ctx.importedSchemas.get(namespace);
      if (!importedSchemas) continue;

      const imported = importedSchemas.get(importedSchemaName);
      if (!imported) continue;

      const importedFieldNames = new Set(imported.fields.map((f) => f.name));
      const importSource = `${namespace}.${importedSchemaName}`;

      for (const field of schema.fields) {
        if (!importedFieldNames.has(field.name)) {
          warningCollector.add(createUnknownFieldWarning(schemaName, field.name, importSource));
        }
      }
    }
  }

  /**
   * Generate a value for an imported field
   */
  private generateFromImportedField(field: unknown, fieldName?: string): unknown {
    const f = field as {
      type: ImportedFieldType;
      enum?: unknown[];
      name?: string;
      format?: string;
    };

    return this.generateFromImportedType(f.type, fieldName ?? f.name, f.enum, f.format);
  }

  private generateFromImportedType(
    type: ImportedFieldType,
    fieldName?: string,
    fieldEnum?: unknown[],
    fieldFormat?: string
  ): unknown {
    const enumValues = fieldEnum ?? ('enum' in type ? type.enum : undefined);
    if (enumValues && enumValues.length > 0) {
      return enumValues[Math.floor(this.ctx.rng.random() * enumValues.length)];
    }

    switch (type.kind) {
      case 'primitive':
        switch (type.type) {
          case 'string':
            return this.generateImportedString(type, fieldFormat ?? type.format, fieldName);
          case 'integer': {
            const minimum = Math.ceil(type.minimum ?? 0);
            const maximum = Math.floor(type.maximum ?? Math.max(minimum, 999));
            return minimum + Math.floor(this.ctx.rng.random() * (maximum - minimum + 1));
          }
          case 'number':
            return (
              (type.minimum ?? 0) +
              this.ctx.rng.random() *
                ((type.maximum ?? Math.max(type.minimum ?? 0, 1000)) - (type.minimum ?? 0))
            );
          case 'boolean':
            return this.ctx.rng.random() > 0.5;
          default:
            return null;
        }
      case 'array': {
        const minimum = Math.max(0, type.minItems ?? 1);
        const maximum = Math.max(minimum, type.maxItems ?? minimum);
        const length = minimum + Math.floor(this.ctx.rng.random() * (maximum - minimum + 1));
        return Array.from({ length }, () => this.generateFromImportedType(type.items, fieldName));
      }
      case 'object':
        return Object.fromEntries(
          type.fields.map((field) => [
            field.name,
            this.generateFromImportedType(field.type, field.name, field.enum, field.format),
          ])
        );
      case 'union':
        return this.generateFromImportedType(
          type.variants[Math.floor(this.ctx.rng.random() * type.variants.length)],
          fieldName
        );
      default:
        return null;
    }
  }

  private generateImportedString(
    type: Extract<ImportedFieldType, { kind: 'primitive' }>,
    format?: string,
    fieldName?: string
  ): unknown {
    if (format) {
      return this.fieldGenerator.generateStringFromFormat(format, fieldName);
    }

    if (type.pattern) {
      const generator = new RandExp(type.pattern);
      generator.randInt = (from, to) => from + Math.floor(this.ctx.rng.random() * (to - from + 1));
      return generator.gen();
    }

    const minimum = Math.max(0, type.minLength ?? 1);
    const maximum = Math.max(minimum, type.maxLength ?? Math.max(minimum, 12));
    const length = minimum + Math.floor(this.ctx.rng.random() * (maximum - minimum + 1));
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    return Array.from(
      { length },
      () => alphabet[Math.floor(this.ctx.rng.random() * alphabet.length)]
    ).join('');
  }

  /**
   * Resolve a value from an object by path
   */
  private resolveFromObject(obj: Record<string, unknown>, parts: string[]): unknown {
    let value: unknown = obj;
    for (const part of parts) {
      if (isRecord(value)) {
        value = getProperty(value, part);
        if (value === undefined) {
          return null;
        }
      } else {
        return null;
      }
    }
    return value;
  }
}
