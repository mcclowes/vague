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
  DynamicCardinality,
  GeneratorType,
  ValidationBlock,
  ThenBlock,
  Mutation,
  QualifiedName,
  TernaryExpression,
  OrderedSequenceType,
} from '../ast/index.js';
import { OpenAPILoader } from '../openapi/index.js';
import {
  warningCollector,
  createUniqueExhaustionWarning,
  createConstraintRetryWarning,
  createConstraintEvaluationErrorWarning,
  createMutationTargetNotFoundWarning,
} from '../warnings.js';
import {
  isDuration,
  addDurationToDate,
  subtractDurationFromDate,
  type Duration,
} from '../plugins/date.js';
import {
  generateCompanyName,
  generatePersonName,
  generateProductName,
  generateText,
} from './markov.js';
import { random, randomInt } from './random.js';
import { randomUUID } from 'node:crypto';

// Import refactored modules
import { GeneratorContext, createContext } from './context.js';
import {
  registerPlugin,
  getRegisteredPlugins,
  getPluginRegistry,
  tryPluginGenerator,
  type VaguePlugin,
  type GeneratorFunction,
} from './plugin.js';
import {
  aggregateFunctions,
  createPredicateFunctions,
  mathFunctions,
  createUniqueFn,
  distributionFunctions,
  dateFunctions,
  stringFunctions,
  sequenceFunctions,
} from './builtins/index.js';
import { createLogger } from '../logging/index.js';

// Create loggers for different components
const generatorLog = createLogger('generator');
const constraintLog = createLogger('constraint');

// Re-export for external use
export { setSeed, getSeed } from './random.js';
export { registerPlugin, getRegisteredPlugins };
export type { VaguePlugin, GeneratorFunction };
export type { GeneratorContext };

export class Generator {
  private ctx: GeneratorContext;
  private openApiLoader: OpenAPILoader;
  private predicateFunctions: ReturnType<typeof createPredicateFunctions>;
  private uniqueFn: ReturnType<typeof createUniqueFn>;

  constructor(ctx?: GeneratorContext) {
    this.ctx = ctx ?? createContext();
    this.openApiLoader = new OpenAPILoader();
    // Initialize functions that need expression evaluator
    this.predicateFunctions = createPredicateFunctions(this.evaluateExpression.bind(this));
    this.uniqueFn = createUniqueFn(this.evaluateExpression.bind(this));
  }

  async generate(program: Program): Promise<Record<string, unknown[]>> {
    generatorLog.debug('Starting generation', { statements: program.statements.length });

    // First pass: collect schemas and process imports
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
        });
      }
    }

    generatorLog.info('Schema registration complete', {
      schemas: this.ctx.schemas.size,
      imports: this.ctx.importedSchemas.size,
    });

    // Second pass: generate datasets
    const result: Record<string, unknown[]> = {};

    for (const stmt of program.statements) {
      if (stmt.type === 'DatasetDefinition') {
        generatorLog.debug('Generating dataset', {
          name: stmt.name,
          collections: stmt.collections.length,
          violating: stmt.violating ?? false,
        });
        const data = this.generateDataset(stmt);
        Object.assign(result, data);
      }
    }

    return result;
  }

  private generateDataset(dataset: DatasetDefinition): Record<string, unknown[]> {
    const maxAttempts = 20;
    const mode = dataset.violating ? 'violating' : 'satisfying';

    // Set violating mode in context
    this.ctx.violating = dataset.violating;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        constraintLog.debug('Retrying dataset generation', {
          dataset: dataset.name,
          attempt: attempt + 1,
          maxAttempts,
          mode,
        });
      }

      const result: Record<string, unknown[]> = {};

      // Generate all collections
      for (const collection of dataset.collections) {
        const items = this.generateCollection(collection);
        result[collection.name] = items;
        this.ctx.collections.set(collection.name, items);
      }

      // Check dataset-level constraints
      // In violating mode, we want constraints to FAIL (inverted logic)
      const constraintsPass =
        !dataset.validation || this.validateDatasetConstraints(dataset.validation, result);
      if (dataset.violating ? !constraintsPass : constraintsPass) {
        generatorLog.debug('Dataset generated successfully', {
          dataset: dataset.name,
          attempts: attempt + 1,
          collections: Object.keys(result).length,
        });
        return result;
      }

      constraintLog.debug('Dataset constraints not satisfied', {
        dataset: dataset.name,
        attempt: attempt + 1,
        constraintsPass,
        violatingMode: dataset.violating,
      });

      // Clear collections for retry
      for (const collection of dataset.collections) {
        this.ctx.collections.delete(collection.name);
      }
    }

    // Fallback: return last attempt with warning
    constraintLog.warn(`Could not generate ${mode} data for dataset`, {
      dataset: dataset.name,
      maxAttempts,
      mode,
    });
    warningCollector.add(createConstraintRetryWarning(maxAttempts, mode, undefined, dataset.name));
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
        if (!result) {
          return false;
        }
      } catch (error) {
        // Log constraint evaluation failures for debugging
        const message = error instanceof Error ? error.message : String(error);
        warningCollector.add(createConstraintEvaluationErrorWarning(message));
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

    // Clear previous for new collection
    this.ctx.previous = undefined;

    for (let i = 0; i < count; i++) {
      const item = this.generateInstance(schema, collection.overrides);
      items.push(item);
      // Track previous for sequential coherence
      this.ctx.previous = item;
    }

    return items;
  }

  private generateInstance(
    schema: SchemaDefinition,
    overrides?: FieldDefinition[]
  ): Record<string, unknown> {
    const maxAttempts = 100;

    // Collect private field names for filtering
    const privateFields = this.getPrivateFieldNames(schema, overrides);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const instance = this.generateInstanceAttempt(schema, overrides);

      // If no constraints, execute then block and return
      if (!schema.assumes || schema.assumes.length === 0) {
        this.executeThenBlock(schema.thenBlock, instance);
        return this.stripPrivateFields(instance, privateFields);
      }

      // Check all constraints
      // In violating mode, we want constraints to FAIL (inverted logic)
      const constraintsPass = this.validateConstraints(schema.assumes, instance);
      if (this.ctx.violating ? !constraintsPass : constraintsPass) {
        this.executeThenBlock(schema.thenBlock, instance);
        return this.stripPrivateFields(instance, privateFields);
      }
    }

    // If we couldn't generate desired data, return last attempt with warning
    const mode = this.ctx.violating ? 'violating' : 'satisfying';
    warningCollector.add(createConstraintRetryWarning(maxAttempts, mode, schema.name));
    const instance = this.generateInstanceAttempt(schema, overrides);
    this.executeThenBlock(schema.thenBlock, instance);
    return this.stripPrivateFields(instance, privateFields);
  }

  private getPrivateFieldNames(
    schema: SchemaDefinition,
    overrides?: FieldDefinition[]
  ): Set<string> {
    const privateFields = new Set<string>();

    for (const field of schema.fields) {
      if (field.private) {
        privateFields.add(field.name);
      }
    }

    if (overrides) {
      for (const field of overrides) {
        if (field.private) {
          privateFields.add(field.name);
        }
      }
    }

    return privateFields;
  }

  private stripPrivateFields(
    instance: Record<string, unknown>,
    privateFields: Set<string>
  ): Record<string, unknown> {
    if (privateFields.size === 0) {
      return instance;
    }

    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(instance)) {
      if (!privateFields.has(key)) {
        result[key] = value;
      }
    }
    return result;
  }

  private executeThenBlock(
    thenBlock: ThenBlock | undefined,
    instance: Record<string, unknown>
  ): void {
    if (!thenBlock) return;

    const oldCurrent = this.ctx.current;
    this.ctx.current = instance;

    try {
      for (const mutation of thenBlock.mutations) {
        this.executeMutation(mutation, instance);
      }
    } finally {
      this.ctx.current = oldCurrent;
    }
  }

  private executeMutation(mutation: Mutation, instance: Record<string, unknown>): void {
    // Resolve the target path to get the object and final field name
    const { target: targetObj, field: fieldName } = this.resolveMutationTarget(
      mutation.target,
      instance
    );

    if (!targetObj || !fieldName) {
      warningCollector.add(
        createMutationTargetNotFoundWarning(this.ctx.currentSchemaName || 'unknown')
      );
      return;
    }

    // Evaluate the value expression
    const value = this.evaluateExpression(mutation.value);

    // Apply the mutation
    if (mutation.operator === '+=') {
      const current = (targetObj as Record<string, unknown>)[fieldName];
      (targetObj as Record<string, unknown>)[fieldName] = (current as number) + (value as number);
    } else {
      (targetObj as Record<string, unknown>)[fieldName] = value;
    }
  }

  private resolveMutationTarget(
    expr: Expression,
    instance: Record<string, unknown>
  ): { target: unknown; field: string | null } {
    // Handle qualified names like invoice.status
    if (expr.type === 'QualifiedName') {
      const parts = (expr as QualifiedName).parts;
      if (parts.length < 2) {
        return { target: null, field: null };
      }

      // First part is a field on the instance (e.g., "invoice")
      let target: unknown = instance[parts[0]];

      // Navigate through intermediate parts
      for (let i = 1; i < parts.length - 1; i++) {
        if (target && typeof target === 'object') {
          target = (target as Record<string, unknown>)[parts[i]];
        } else {
          return { target: null, field: null };
        }
      }

      return { target, field: parts[parts.length - 1] };
    }

    // Handle binary expression with dot operator: invoice.status
    if (expr.type === 'BinaryExpression' && (expr as BinaryExpression).operator === '.') {
      const binExpr = expr as BinaryExpression;

      // Get the base object
      let target: unknown;
      if (binExpr.left.type === 'Identifier') {
        target = instance[(binExpr.left as { name: string }).name];
      } else if (binExpr.left.type === 'BinaryExpression') {
        // Nested: invoice.customer.name - resolve left side first
        const nested = this.resolveMutationTarget(binExpr.left, instance);
        if (nested.target && nested.field) {
          target = (nested.target as Record<string, unknown>)[nested.field];
        }
      }

      // Get the field name
      if (binExpr.right.type === 'Identifier') {
        return { target, field: (binExpr.right as { name: string }).name };
      }
    }

    return { target: null, field: null };
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
      if (field.optional && random() > 0.7) {
        continue;
      }

      // Defer computed fields until after collections
      if (field.computed) {
        computedFields.push([name, field]);
        continue;
      }

      // Defer collection fields
      if (field.fieldType.type === 'CollectionType') {
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

  private validateConstraints(assumes: AssumeClause[], instance: Record<string, unknown>): boolean {
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
          if (!result) {
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
    const f = field as {
      type: { kind: string; type?: string };
      enum?: unknown[];
      name?: string;
      format?: string;
    };
    if (f.enum && f.enum.length > 0) {
      return f.enum[Math.floor(random() * f.enum.length)];
    }

    switch (f.type.kind) {
      case 'primitive':
        switch (f.type.type) {
          case 'string':
            return this.generateStringFromFormat(f.format, fieldName ?? f.name);
          case 'integer':
            return Math.floor(random() * 1000);
          case 'number':
            return random() * 1000;
          case 'boolean':
            return random() > 0.5;
          default:
            return null;
        }
      case 'array':
        return [];
      default:
        return null;
    }
  }

  /**
   * Generate a string value based on OpenAPI format hint
   */
  private generateStringFromFormat(format: string | undefined, fieldName?: string): unknown {
    // Try format-based generation first
    if (format) {
      const pluginRegistry = getPluginRegistry();
      // Look for a plugin generator that matches the format
      for (const plugin of pluginRegistry.values()) {
        // Try direct format match (e.g., "uuid" -> uuid generator)
        if (plugin.generators[format]) {
          return plugin.generators[format]([], this.ctx);
        }
      }

      // Handle common OpenAPI/JSON Schema formats
      switch (format) {
        case 'uuid':
          return tryPluginGenerator('uuid', this.ctx) ?? randomUUID();
        case 'email':
          return tryPluginGenerator('email', this.ctx) ?? `user${randomInt(1, 9999)}@example.com`;
        case 'phone':
        case 'phone-number':
          return (
            tryPluginGenerator('phone', this.ctx) ??
            `+1${randomInt(200, 999)}${randomInt(100, 999)}${randomInt(1000, 9999)}`
          );
        case 'uri':
        case 'url':
          return tryPluginGenerator('url', this.ctx) ?? `https://example.com/${randomInt(1, 9999)}`;
        case 'hostname':
          return `host${randomInt(1, 999)}.example.com`;
        case 'ipv4':
          return `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
        case 'ipv6':
          return (
            tryPluginGenerator('internet.ipv6', this.ctx) ??
            Array.from({ length: 8 }, () => randomInt(0, 65535).toString(16).padStart(4, '0')).join(
              ':'
            )
          );
        case 'date':
          // YYYY-MM-DD format
          return this.generateRandomDate();
        case 'date-time':
          // ISO 8601 format
          return this.generateRandomDateTime();
        case 'time':
          // HH:MM:SS format
          return `${String(randomInt(0, 23)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}`;
        case 'byte':
          // Base64 encoded string
          return Buffer.from(Array.from({ length: 16 }, () => randomInt(0, 255))).toString(
            'base64'
          );
        case 'binary':
          return Array.from({ length: 16 }, () =>
            randomInt(0, 255).toString(16).padStart(2, '0')
          ).join('');
        case 'password':
          return (
            tryPluginGenerator('internet.password', this.ctx) ?? `Pass${randomInt(1000, 9999)}!`
          );
        case 'iban':
          return (
            tryPluginGenerator('iban', this.ctx) ??
            `GB${randomInt(10, 99)}MOCK${randomInt(10000000, 99999999)}`
          );
      }
    }

    // Fallback to context-aware string generation
    return this.randomString(fieldName);
  }

  private generateRandomDate(): string {
    const year = randomInt(2020, 2024);
    const month = randomInt(1, 12);
    const day = randomInt(1, 28);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  private generateRandomDateTime(): string {
    const date = this.generateRandomDate();
    const hours = randomInt(0, 23);
    const minutes = randomInt(0, 59);
    const seconds = randomInt(0, 59);
    return `${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.000Z`;
  }

  private generateField(field: FieldDefinition, _baseField?: unknown): unknown {
    // Computed fields - expression is stored in distribution
    if (field.computed && field.distribution) {
      return this.evaluateExpression(field.distribution);
    }

    // Unique fields - retry until we get a unique value
    if (field.unique) {
      return this.generateUniqueField(field);
    }

    return this.generateFromFieldType(field.fieldType, field.name);
  }

  private generateUniqueField(field: FieldDefinition): unknown {
    const key = `${this.ctx.currentSchemaName}.${field.name}`;

    if (!this.ctx.uniqueValues.has(key)) {
      this.ctx.uniqueValues.set(key, new Set());
    }
    const usedValues = this.ctx.uniqueValues.get(key)!;

    const maxAttempts = 1000;
    for (let i = 0; i < maxAttempts; i++) {
      const value = this.generateFromFieldType(field.fieldType, field.name);
      if (!usedValues.has(value)) {
        usedValues.add(value);
        return value;
      }
    }

    // Fallback: return last generated value with warning
    const [schemaName, fieldName] = key.split('.');
    warningCollector.add(createUniqueExhaustionWarning(schemaName, fieldName, maxAttempts));
    return this.generateFromFieldType(field.fieldType, field.name);
  }

  private generateFromFieldType(fieldType: FieldType, fieldName?: string): unknown {
    switch (fieldType.type) {
      case 'PrimitiveType':
        return this.generatePrimitive(fieldType.name, fieldName, fieldType.precision);

      case 'RangeType':
        return this.generateInRange(
          fieldType.baseType.name,
          fieldType.min,
          fieldType.max,
          fieldType.baseType.precision
        );

      case 'SuperpositionType':
        return this.pickWeighted(fieldType.options);

      case 'CollectionType':
        return this.generateCollectionField(fieldType);

      case 'ReferenceType':
        return this.resolveReference(fieldType.path.parts);

      case 'ExpressionType':
        return this.evaluateExpression(fieldType.expression);

      case 'GeneratorType':
        return this.generateFromPlugin(fieldType);

      case 'OrderedSequenceType':
        return this.generateFromOrderedSequence(fieldType, fieldName);

      default:
        return null;
    }
  }

  private generateFromOrderedSequence(seqType: OrderedSequenceType, fieldName?: string): unknown {
    // Create a unique key for this sequence based on schema and field
    const key = `${this.ctx.currentSchemaName ?? 'anonymous'}.${fieldName ?? 'field'}`;

    // Get current index (or start at 0)
    const index = this.ctx.orderedSequenceIndices.get(key) ?? 0;

    // Get element at current index (cycling)
    const element = seqType.elements[index % seqType.elements.length];
    const value = this.evaluateExpression(element);

    // Increment index for next call
    this.ctx.orderedSequenceIndices.set(key, index + 1);

    return value;
  }

  private generateFromPlugin(genType: GeneratorType): unknown {
    const { name, arguments: args } = genType;

    // Evaluate arguments
    const evaluatedArgs = args.map((arg) => this.evaluateExpression(arg));

    // Try to find generator: "faker.person.firstName" -> plugin "faker", generator "person.firstName"
    // Or simple: "uuid" -> any plugin with generator "uuid"
    const parts = name.split('.');
    const pluginRegistry = getPluginRegistry();

    if (parts.length > 1) {
      // Qualified name: faker.person.firstName
      const pluginName = parts[0];
      const generatorPath = parts.slice(1).join('.');

      const plugin = pluginRegistry.get(pluginName);
      if (plugin) {
        const generator = plugin.generators[generatorPath];
        if (generator) {
          return generator(evaluatedArgs, this.ctx);
        }
        throw new Error(`Generator '${generatorPath}' not found in plugin '${pluginName}'`);
      }
      throw new Error(
        `Plugin '${pluginName}' not registered. Use registerPlugin() to register it.`
      );
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
    type: 'int' | 'decimal' | 'string' | 'date' | 'boolean',
    fieldName?: string,
    precision?: number
  ): unknown {
    switch (type) {
      case 'int':
        return Math.floor(random() * 1000);
      case 'decimal': {
        const value = random() * 1000;
        if (precision !== undefined) {
          const factor = Math.pow(10, precision);
          return Math.round(value * factor) / factor;
        }
        return Math.round(value * 100) / 100; // Default 2 decimal places
      }
      case 'string':
        return this.randomString(fieldName);
      case 'date':
        return this.randomDate();
      case 'boolean':
        return random() > 0.5;
    }
  }

  private generateInRange(
    type: string,
    min?: Expression,
    max?: Expression,
    precision?: number
  ): unknown {
    const minVal = min ? (this.evaluateExpression(min) as number) : 0;
    const maxVal = max ? (this.evaluateExpression(max) as number) : 1000;

    if (type === 'int') {
      return Math.floor(random() * (maxVal - minVal + 1)) + minVal;
    }

    if (type === 'date') {
      const minDate = new Date(minVal, 0, 1);
      const maxDate = new Date(maxVal, 11, 31);
      const diff = maxDate.getTime() - minDate.getTime();
      return new Date(minDate.getTime() + random() * diff).toISOString().split('T')[0];
    }

    // Decimal with optional precision
    const value = random() * (maxVal - minVal) + minVal;
    if (precision !== undefined) {
      const factor = Math.pow(10, precision);
      return Math.round(value * factor) / factor;
    }
    return value;
  }

  private pickWeighted(options: { weight?: number; value: Expression }[]): unknown {
    // If no weights, equal probability
    const hasWeights = options.some((o) => o.weight !== undefined);

    let result: unknown;
    if (!hasWeights) {
      const idx = Math.floor(random() * options.length);
      result = this.evaluateExpression(options[idx].value);
    } else {
      // Weighted selection with support for mixed weighted/unweighted options
      // Unweighted options share the remaining probability after explicit weights
      const explicitWeights = options.filter((o) => o.weight !== undefined);
      const unweightedOptions = options.filter((o) => o.weight === undefined);
      const totalExplicitWeight = explicitWeights.reduce((sum, o) => sum + o.weight!, 0);

      // Calculate weight for unweighted options
      let implicitWeight = 0;
      if (unweightedOptions.length > 0) {
        const remainingWeight = Math.max(0, 1 - totalExplicitWeight);
        implicitWeight = remainingWeight / unweightedOptions.length;
      }

      // Total weight is explicit weights + implicit weights for unweighted options
      const totalWeight = totalExplicitWeight + implicitWeight * unweightedOptions.length;
      let r = random() * totalWeight;

      for (const option of options) {
        const optionWeight = option.weight ?? implicitWeight;
        r -= optionWeight;
        if (r <= 0) {
          result = this.evaluateExpression(option.value);
          break;
        }
      }

      if (result === undefined) {
        result = this.evaluateExpression(options[options.length - 1].value);
      }
    }

    // If result is a range object, pick a random value from it
    if (result && typeof result === 'object' && 'min' in result && 'max' in result) {
      const min = result.min as number;
      const max = result.max as number;
      return randomInt(min, max);
    }

    return result;
  }

  private generateCollectionField(fieldType: {
    cardinality: Cardinality | DynamicCardinality;
    elementType: FieldType;
  }): unknown[] {
    const count = this.resolveCardinality(fieldType.cardinality);
    const items: unknown[] = [];

    // Save current instance as parent for nested generation
    const parentInstance = this.ctx.current;

    for (let i = 0; i < count; i++) {
      // If element type is a reference to a schema, generate an instance
      if (fieldType.elementType.type === 'ReferenceType') {
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
          value = value
            .map((item) => {
              if (item && typeof item === 'object' && part in item) {
                return (item as Record<string, unknown>)[part];
              }
              return null;
            })
            .filter((v) => v !== null);
        } else if (value && typeof value === 'object' && part in value) {
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
        value = value
          .map((item) => {
            if (item && typeof item === 'object' && part in item) {
              return (item as Record<string, unknown>)[part];
            }
            return null;
          })
          .filter((v) => v !== null);
      } else if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return null;
      }
    }

    return value;
  }

  public evaluateExpression(expr: Expression): unknown {
    switch (expr.type) {
      case 'Literal':
        return (expr as Literal).value;

      case 'Identifier': {
        const name = (expr as { name: string }).name;
        // Check if it's a primitive type name (for superposition like "string | null")
        if (['string', 'int', 'decimal', 'boolean', 'date'].includes(name)) {
          return this.generatePrimitive(name as 'string' | 'int' | 'decimal' | 'boolean' | 'date');
        }
        // Check collections first (for dataset-level validation)
        if (this.ctx.collections.has(name)) {
          return this.ctx.collections.get(name);
        }
        // Then check current instance context
        return this.ctx.current?.[name] ?? null;
      }

      case 'QualifiedName': {
        const parts = (expr as { parts: string[] }).parts;
        return this.resolveReference(parts);
      }

      case 'SuperpositionExpression':
        return this.pickWeighted((expr as SuperpositionExpression).options);

      case 'RangeExpression': {
        const range = expr as RangeExpression;
        const min = range.min ? (this.evaluateExpression(range.min) as number) : 0;
        const max = range.max ? (this.evaluateExpression(range.max) as number) : 100;
        // Return range object - caller can use it as bounds or pick a random value
        return { min, max };
      }

      case 'CallExpression':
        return this.evaluateCall(expr as CallExpression);

      case 'BinaryExpression':
        return this.evaluateBinary(expr as BinaryExpression);

      case 'ParentReference': {
        const ref = expr as ParentReference;
        if (this.ctx.parent) {
          return this.resolveFromObject(this.ctx.parent, ref.path.parts);
        }
        return null;
      }

      case 'AnyOfExpression': {
        const anyOf = expr as AnyOfExpression;
        const collectionName =
          anyOf.collection.type === 'Identifier'
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
              return items[Math.floor(random() * items.length)];
            }
          }
        }
        return null;
      }

      case 'LogicalExpression': {
        const logical = expr as LogicalExpression;
        const left = Boolean(this.evaluateExpression(logical.left));
        if (logical.operator === 'and') {
          // Short-circuit: if left is false, return false
          if (!left) return false;
          return Boolean(this.evaluateExpression(logical.right));
        } else {
          // or: short-circuit: if left is true, return true
          if (left) return true;
          return Boolean(this.evaluateExpression(logical.right));
        }
      }

      case 'NotExpression': {
        const not = expr as NotExpression;
        return !this.evaluateExpression(not.operand);
      }

      case 'TernaryExpression': {
        const ternary = expr as TernaryExpression;
        const condition = Boolean(this.evaluateExpression(ternary.condition));
        return condition
          ? this.evaluateExpression(ternary.consequent)
          : this.evaluateExpression(ternary.alternate);
      }

      default:
        return null;
    }
  }

  private evaluateCall(call: CallExpression): unknown {
    const args = call.arguments.map((a) => this.evaluateExpression(a));

    // Check aggregate functions
    if (call.callee in aggregateFunctions) {
      return aggregateFunctions[call.callee as keyof typeof aggregateFunctions](args, this.ctx);
    }

    // Check math functions
    if (call.callee in mathFunctions) {
      return mathFunctions[call.callee as keyof typeof mathFunctions](args, this.ctx);
    }

    // Check distribution functions
    if (call.callee in distributionFunctions) {
      return distributionFunctions[call.callee as keyof typeof distributionFunctions](
        args,
        this.ctx
      );
    }

    // Check date functions
    if (call.callee in dateFunctions) {
      return dateFunctions[call.callee as keyof typeof dateFunctions](args, this.ctx);
    }

    // Check string functions
    if (call.callee in stringFunctions) {
      return stringFunctions[call.callee as keyof typeof stringFunctions](args, this.ctx);
    }

    // Check sequence functions
    if (call.callee in sequenceFunctions) {
      return sequenceFunctions[call.callee as keyof typeof sequenceFunctions](args, this.ctx);
    }

    // Check predicate functions (need special handling with raw AST)
    if (call.callee in this.predicateFunctions) {
      return this.predicateFunctions[call.callee as keyof typeof this.predicateFunctions](
        args,
        this.ctx,
        call
      );
    }

    // Check unique function
    if (call.callee === 'unique') {
      return this.uniqueFn(args, this.ctx, call);
    }

    // Check plugin calls (callee contains a dot like "dates.weekday")
    const parts = call.callee.split('.');
    if (parts.length > 1) {
      const pluginName = parts[0];
      const generatorPath = parts.slice(1).join('.');
      const pluginRegistry = getPluginRegistry();

      const plugin = pluginRegistry.get(pluginName);
      if (plugin) {
        const generator = plugin.generators[generatorPath];
        if (generator) {
          return generator(args, this.ctx);
        }
      }
    }

    // Try shorthand generators (no namespace prefix)
    const pluginRegistry = getPluginRegistry();
    for (const plugin of pluginRegistry.values()) {
      const generator = plugin.generators[call.callee];
      if (generator) {
        return generator(args, this.ctx);
      }
    }

    return null;
  }

  private evaluateBinary(expr: BinaryExpression): unknown {
    const left = this.evaluateExpression(expr.left);
    const right = this.evaluateExpression(expr.right);

    switch (expr.operator) {
      case '+':
        // Date arithmetic: date string + Duration = new date string
        if (typeof left === 'string' && isDuration(right)) {
          return addDurationToDate(left, right as Duration);
        }
        // Duration + date string (commutative)
        if (isDuration(left) && typeof right === 'string') {
          return addDurationToDate(right, left as Duration);
        }
        return (left as number) + (right as number);
      case '-':
        // Date arithmetic: date string - Duration = new date string
        if (typeof left === 'string' && isDuration(right)) {
          return subtractDurationFromDate(left, right as Duration);
        }
        return (left as number) - (right as number);
      case '*':
        return (left as number) * (right as number);
      case '/':
        return (left as number) / (right as number);
      case '==':
        return left === right;
      case '<':
        return (left as number) < (right as number);
      case '>':
        return (left as number) > (right as number);
      case '<=':
        return (left as number) <= (right as number);
      case '>=':
        return (left as number) >= (right as number);
      default:
        return null;
    }
  }

  private evaluateCondition(condition: Expression, instance: Record<string, unknown>): boolean {
    const oldCurrent = this.ctx.current;
    this.ctx.current = instance;
    const result = this.evaluateExpression(condition);
    this.ctx.current = oldCurrent;
    return Boolean(result);
  }

  private resolveFromObject(obj: Record<string, unknown>, parts: string[]): unknown {
    let value: unknown = obj;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return null;
      }
    }
    return value;
  }

  private resolveCardinality(cardinality: Cardinality | DynamicCardinality): number {
    if (cardinality.type === 'DynamicCardinality') {
      // Evaluate the expression - should return a number or RangeExpression
      const result = this.evaluateExpression(cardinality.expression);

      if (typeof result === 'number') {
        return Math.floor(result);
      }

      // If result is an object with min/max (from RangeExpression evaluation)
      if (result && typeof result === 'object' && 'min' in result && 'max' in result) {
        const min = result.min as number;
        const max = result.max as number;
        return Math.floor(random() * (max - min + 1)) + min;
      }

      throw new Error(
        `Dynamic cardinality expression must evaluate to a number or range, got: ${typeof result}`
      );
    }

    // Static cardinality
    if (cardinality.min === cardinality.max) {
      return cardinality.min;
    }
    return Math.floor(random() * (cardinality.max - cardinality.min + 1)) + cardinality.min;
  }

  private randomString(fieldName?: string): string {
    // Use field name and schema context to pick appropriate generator
    const field = fieldName?.toLowerCase() ?? '';
    const schema = this.ctx.currentSchemaName?.toLowerCase() ?? '';

    // Check schema context first
    if (
      schema.includes('company') ||
      schema.includes('business') ||
      schema.includes('organization')
    ) {
      if (field === 'name' || field.includes('company')) {
        return generateCompanyName();
      }
    }

    // Then field name heuristics
    if (field.includes('company') || field.includes('business') || field.includes('organization')) {
      return generateCompanyName();
    }
    if (
      field === 'name' ||
      field.includes('person') ||
      field.includes('customer') ||
      field.includes('contact')
    ) {
      return generatePersonName();
    }
    if (field.includes('product') || field.includes('item') || field.includes('description')) {
      return generateProductName();
    }

    return generateText('word');
  }

  private randomDate(): string {
    const start = new Date(2020, 0, 1);
    const end = new Date();
    const date = new Date(start.getTime() + random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
  }
}
