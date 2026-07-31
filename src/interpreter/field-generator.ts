/**
 * Field Generator - Handles generation of individual field values
 */
import {
  Expression,
  FieldDefinition,
  FieldType,
  GeneratorType,
  OrderedSequenceType,
  Cardinality,
  DynamicCardinality,
} from '../ast/index.js';
import { warningCollector, createUniqueExhaustionWarning } from '../warnings.js';
import {
  generateCompanyName,
  generatePersonName,
  generateProductName,
  generateText,
} from './markov.js';
import { GeneratorContext } from './context.js';
import { callGenerator, getGenerator, tryPluginGenerator } from './plugin.js';
import {
  isKnownFormat,
  getPluginGeneratorForFormat,
  getFallbackForFormat,
} from '../format-registry.js';
import { asNumber, isRecord, getProperty } from '../utils/type-guards.js';

export interface FieldGeneratorDeps {
  evaluateExpression: (expr: Expression) => unknown;
  generateInstance: (
    schema: { name: string },
    overrides?: FieldDefinition[]
  ) => Record<string, unknown>;
  getSchema: (name: string) => { name: string } | undefined;
}

export class FieldGenerator {
  private ctx: GeneratorContext;
  private deps: FieldGeneratorDeps;

  constructor(ctx: GeneratorContext, deps: FieldGeneratorDeps) {
    this.ctx = ctx;
    this.deps = deps;
  }

  /**
   * Generate a value for a field definition
   */
  generate(field: FieldDefinition, _baseField?: unknown): unknown {
    // Computed fields - expression is stored in distribution
    if (field.computed && field.distribution) {
      return this.deps.evaluateExpression(field.distribution);
    }

    // Unique fields - retry until we get a unique value
    if (field.unique) {
      return this.generateUniqueField(field);
    }

    return this.generateFromFieldType(field.fieldType, field.name);
  }

  /**
   * Generate a value from a field type definition
   */
  generateFromFieldType(fieldType: FieldType, fieldName?: string): unknown {
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
        return this.deps.evaluateExpression(fieldType.expression);

      case 'GeneratorType':
        return this.generateFromPlugin(fieldType);

      case 'OrderedSequenceType':
        return this.generateFromOrderedSequence(fieldType, fieldName);

      default: {
        // Exhaustiveness check: if we get here, we have an unhandled field type
        const _exhaustiveCheck: never = fieldType;
        throw new Error(
          `Unhandled field type: ${(fieldType as { type: string }).type}. ` +
            `This is a bug in Vague - please report it.`
        );
      }
    }
  }

  /**
   * Generate a primitive value
   */
  /**
   * Default upper bound for primitive int/decimal generation
   */
  private static readonly DEFAULT_PRIMITIVE_MAX = 1000;
  private static readonly DEFAULT_DECIMAL_PRECISION = 2;

  generatePrimitive(
    type: 'int' | 'decimal' | 'string' | 'date' | 'boolean',
    fieldName?: string,
    precision?: number
  ): unknown {
    switch (type) {
      case 'int':
        return Math.floor(this.ctx.rng.random() * FieldGenerator.DEFAULT_PRIMITIVE_MAX);
      case 'decimal': {
        const value = this.ctx.rng.random() * FieldGenerator.DEFAULT_PRIMITIVE_MAX;
        if (precision !== undefined) {
          const factor = Math.pow(10, precision);
          return Math.round(value * factor) / factor;
        }
        const defaultFactor = Math.pow(10, FieldGenerator.DEFAULT_DECIMAL_PRECISION);
        return Math.round(value * defaultFactor) / defaultFactor;
      }
      case 'string':
        return this.randomString(fieldName);
      case 'date':
        return this.randomDate();
      case 'boolean':
        return this.ctx.rng.random() > 0.5;
    }
  }

  /**
   * Generate a value within a range
   */
  generateInRange(type: string, min?: Expression, max?: Expression, precision?: number): unknown {
    const minVal = min ? asNumber(this.deps.evaluateExpression(min)) : 0;
    const maxVal = max
      ? asNumber(this.deps.evaluateExpression(max))
      : FieldGenerator.DEFAULT_PRIMITIVE_MAX;

    if (type === 'int') {
      return Math.floor(this.ctx.rng.random() * (maxVal - minVal + 1)) + minVal;
    }

    if (type === 'date') {
      const minDate = new Date(minVal, 0, 1);
      const maxDate = new Date(maxVal, 11, 31);
      const diff = maxDate.getTime() - minDate.getTime();
      return new Date(minDate.getTime() + this.ctx.rng.random() * diff).toISOString().split('T')[0];
    }

    // Decimal with optional precision
    const value = this.ctx.rng.random() * (maxVal - minVal) + minVal;
    if (precision !== undefined) {
      const factor = Math.pow(10, precision);
      return Math.round(value * factor) / factor;
    }
    return value;
  }

  /**
   * Resolve cardinality (static or dynamic) to a number
   */
  resolveCardinality(cardinality: Cardinality | DynamicCardinality): number {
    let count: number;

    if (cardinality.type === 'DynamicCardinality') {
      const result = this.deps.evaluateExpression(cardinality.expression);

      if (typeof result === 'number') {
        count = Math.floor(result);
      } else if (result && typeof result === 'object' && 'min' in result && 'max' in result) {
        const min = asNumber((result as { min: unknown }).min);
        const max = asNumber((result as { max: unknown }).max);
        count = Math.floor(this.ctx.rng.random() * (max - min + 1)) + min;
      } else {
        throw new Error(
          `Dynamic cardinality expression must evaluate to a number or range, got: ${typeof result}`
        );
      }
    } else {
      if (cardinality.min === cardinality.max) {
        count = cardinality.min;
      } else {
        count =
          Math.floor(this.ctx.rng.random() * (cardinality.max - cardinality.min + 1)) +
          cardinality.min;
      }
    }

    if (count < 0) {
      throw new Error(`Cardinality must be non-negative, got ${count}. Check your range bounds.`);
    }

    return count;
  }

  /**
   * Generate a string value based on OpenAPI format hint
   */
  generateStringFromFormat(format: string | undefined, fieldName?: string): unknown {
    if (format) {
      // Look for a plugin generator that matches the format directly
      const formatGenerator = getGenerator(format);
      if (formatGenerator) {
        return formatGenerator([], this.ctx);
      }

      // Handle date formats specially
      switch (format) {
        case 'date':
          return this.generateRandomDate();
        case 'date-time':
          return this.generateRandomDateTime();
      }

      // Use the unified format registry
      if (isKnownFormat(format)) {
        const pluginName = getPluginGeneratorForFormat(format);
        if (pluginName) {
          const result = tryPluginGenerator(pluginName, this.ctx);
          if (result !== undefined) {
            return result;
          }
        }

        const fallback = getFallbackForFormat(format);
        if (fallback) {
          return fallback();
        }
      }
    }

    // Fallback to context-aware string generation
    return this.randomString(fieldName);
  }

  private generateUniqueField(field: FieldDefinition): unknown {
    const key = `${this.ctx.currentSchemaName}.${field.name}`;

    if (!this.ctx.uniqueValues.has(key)) {
      this.ctx.uniqueValues.set(key, new Set());
    }
    const usedValues = this.ctx.uniqueValues.get(key)!;

    const maxAttempts = this.ctx.retryLimits.unique;
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

  private pickWeighted(options: { weight?: number; value: Expression }[]): unknown {
    const hasWeights = options.some((o) => o.weight !== undefined);

    let result: unknown;
    if (!hasWeights) {
      const idx = Math.floor(this.ctx.rng.random() * options.length);
      result = this.deps.evaluateExpression(options[idx].value);
    } else {
      const explicitWeights = options.filter((o) => o.weight !== undefined);
      const unweightedOptions = options.filter((o) => o.weight === undefined);
      const totalExplicitWeight = explicitWeights.reduce((sum, o) => sum + o.weight!, 0);

      let implicitWeight = 0;
      if (unweightedOptions.length > 0) {
        const remainingWeight = Math.max(0, 1 - totalExplicitWeight);
        implicitWeight = remainingWeight / unweightedOptions.length;
      }

      const totalWeight = totalExplicitWeight + implicitWeight * unweightedOptions.length;
      let r = this.ctx.rng.random() * totalWeight;

      for (const option of options) {
        const optionWeight = option.weight ?? implicitWeight;
        r -= optionWeight;
        if (r <= 0) {
          result = this.deps.evaluateExpression(option.value);
          break;
        }
      }

      if (result === undefined) {
        result = this.deps.evaluateExpression(options[options.length - 1].value);
      }
    }

    // If result is a range object, pick a random value from it
    if (result && typeof result === 'object' && 'min' in result && 'max' in result) {
      const min = asNumber((result as { min: unknown }).min);
      const max = asNumber((result as { max: unknown }).max);
      return this.ctx.rng.randomInt(min, max);
    }

    return result;
  }

  private generateCollectionField(fieldType: {
    cardinality: Cardinality | DynamicCardinality;
    elementType: FieldType;
  }): unknown[] {
    const count = this.resolveCardinality(fieldType.cardinality);
    const items: unknown[] = [];

    const parentInstance = this.ctx.current;

    for (let i = 0; i < count; i++) {
      if (fieldType.elementType.type === 'ReferenceType') {
        const schemaName = fieldType.elementType.path.parts[0];
        const schema = this.deps.getSchema(schemaName);
        if (schema) {
          this.ctx.parent = parentInstance;
          items.push(this.deps.generateInstance(schema));
          continue;
        }
      }
      items.push(this.generateFromFieldType(fieldType.elementType));
    }

    this.ctx.current = parentInstance;
    this.ctx.parent = undefined;

    return items;
  }

  private resolveReference(parts: string[]): unknown {
    const [first, ...rest] = parts;

    // Check let bindings first (e.g., let teamNames = "A" | "B")
    if (this.ctx.bindings.has(first) && rest.length === 0) {
      const binding = this.ctx.bindings.get(first);
      return binding !== undefined ? this.deps.evaluateExpression(binding) : null;
    }

    // Check collections
    if (this.ctx.collections.has(first)) {
      let value: unknown = this.ctx.collections.get(first);
      if (rest.length === 0) return value;
      for (const part of rest) {
        const prop = isRecord(value) ? getProperty(value, part) : undefined;
        if (prop !== undefined) {
          value = prop;
        } else {
          return null;
        }
      }
      return value;
    }

    // Check current context
    if (this.ctx.current && first in this.ctx.current) {
      let value: unknown = this.ctx.current;
      for (const part of parts) {
        const prop = isRecord(value) ? getProperty(value, part) : undefined;
        if (prop !== undefined) {
          value = prop;
        } else {
          return null;
        }
      }
      return value;
    }

    return null;
  }

  private generateFromPlugin(genType: GeneratorType): unknown {
    const { name, arguments: args } = genType;
    const evaluatedArgs = args.map((arg) => this.deps.evaluateExpression(arg));
    return callGenerator(name, evaluatedArgs, this.ctx);
  }

  private generateFromOrderedSequence(seqType: OrderedSequenceType, fieldName?: string): unknown {
    const key = `${this.ctx.currentSchemaName ?? 'anonymous'}.${fieldName ?? 'field'}`;
    const index = this.ctx.orderedSequenceIndices.get(key) ?? 0;
    const element = seqType.elements[index % seqType.elements.length];
    const value = this.deps.evaluateExpression(element);
    this.ctx.orderedSequenceIndices.set(key, index + 1);
    return value;
  }

  private generateRandomDate(): string {
    const year = this.ctx.rng.randomInt(2020, 2024);
    const month = this.ctx.rng.randomInt(1, 12);
    const day = this.ctx.rng.randomInt(1, 28);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  private generateRandomDateTime(): string {
    const date = this.generateRandomDate();
    const hours = this.ctx.rng.randomInt(0, 23);
    const minutes = this.ctx.rng.randomInt(0, 59);
    const seconds = this.ctx.rng.randomInt(0, 59);
    return `${date}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.000Z`;
  }

  private randomString(fieldName?: string): string {
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
    const date = new Date(
      start.getTime() + this.ctx.rng.random() * (end.getTime() - start.getTime())
    );
    return date.toISOString().split('T')[0];
  }
}
