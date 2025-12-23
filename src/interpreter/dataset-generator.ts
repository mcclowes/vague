/**
 * Dataset Generator - Handles generation of datasets and collections
 */
import {
  Expression,
  DatasetDefinition,
  CollectionDefinition,
  SchemaDefinition,
  FieldDefinition,
  ValidationBlock,
  Cardinality,
  DynamicCardinality,
} from '../ast/index.js';
import {
  warningCollector,
  createConstraintRetryWarning,
  createConstraintEvaluationErrorWarning,
} from '../warnings.js';
import { GeneratorContext } from './context.js';
import { createLogger } from '../logging/index.js';

const generatorLog = createLogger('generator');
const constraintLog = createLogger('constraint');

export interface DatasetGeneratorDeps {
  evaluateExpression: (expr: Expression) => unknown;
  generateInstance: (
    schema: SchemaDefinition,
    overrides?: FieldDefinition[]
  ) => Record<string, unknown>;
  getSchema: (name: string) => SchemaDefinition | undefined;
  resolveCardinality: (cardinality: Cardinality | DynamicCardinality) => number;
}

export class DatasetGenerator {
  private ctx: GeneratorContext;
  private deps: DatasetGeneratorDeps;

  constructor(ctx: GeneratorContext, deps: DatasetGeneratorDeps) {
    this.ctx = ctx;
    this.deps = deps;
  }

  /**
   * Generate a dataset with all its collections
   */
  generate(dataset: DatasetDefinition): Record<string, unknown[]> {
    const maxAttempts = this.ctx.retryLimits.dataset;
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
      const constraintsPass =
        !dataset.validation || this.validateConstraints(dataset.validation, result);
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

  /**
   * Generate a single collection
   */
  generateCollection(collection: CollectionDefinition): unknown[] {
    const count = this.deps.resolveCardinality(collection.cardinality);
    const items: unknown[] = [];

    const schema = this.deps.getSchema(collection.schemaRef);
    if (!schema) {
      throw new Error(`Unknown schema: ${collection.schemaRef}`);
    }

    // Clear previous for new collection
    this.ctx.previous = undefined;

    for (let i = 0; i < count; i++) {
      const item = this.deps.generateInstance(schema, collection.overrides);
      items.push(item);
      // Track previous for sequential coherence
      this.ctx.previous = item;
    }

    return items;
  }

  /**
   * Validate dataset-level constraints
   */
  private validateConstraints(
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
        const result = this.deps.evaluateExpression(constraint);
        if (!result) {
          return false;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warningCollector.add(createConstraintEvaluationErrorWarning(message));
        return false;
      }
    }

    return true;
  }
}
