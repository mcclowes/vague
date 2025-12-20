/**
 * Data Validator - validates external data against Vague schema constraints
 *
 * This module allows validating real-world data against Vague schemas,
 * checking that the data satisfies all `assume` constraints defined in the schema.
 */

import { Lexer } from '../lexer/index.js';
import { Parser } from '../parser/index.js';
import {
  Expression,
  AssumeClause,
  SchemaDefinition,
  DatasetDefinition,
  BinaryExpression,
  UnaryExpression,
  CallExpression,
  Literal,
} from '../ast/nodes.js';
import { createContext } from '../interpreter/context.js';
import { Generator } from '../interpreter/generator.js';

export interface ValidationError {
  record: number;
  field?: string;
  constraint: string;
  message: string;
  value?: unknown;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors: ValidationError[];
  recordsValidated: number;
  recordsFailed: number;
}

export interface DatasetValidationResult {
  valid: boolean;
  collections: Map<string, SchemaValidationResult>;
  totalRecords: number;
  totalFailed: number;
}

export interface DatasetLevelError {
  constraint: string;
  message: string;
}

export interface DatasetLevelValidationResult {
  valid: boolean;
  errors: DatasetLevelError[];
}

export interface FullDatasetValidationResult extends DatasetValidationResult {
  datasetLevelValidation?: DatasetLevelValidationResult;
}

/**
 * Validates data against Vague schema constraints
 */
export class DataValidator {
  private schemas: Map<string, SchemaDefinition> = new Map();
  private datasets: Map<string, DatasetDefinition> = new Map();

  /**
   * Load and parse a Vague schema file
   */
  loadSchema(source: string): string[] {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();

    for (const def of ast.statements) {
      if (def.type === 'SchemaDefinition') {
        this.schemas.set(def.name, def);
      } else if (def.type === 'DatasetDefinition') {
        this.datasets.set(def.name, def);
      }
    }

    return Array.from(this.schemas.keys());
  }

  /**
   * Get all loaded schema names
   */
  getSchemaNames(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Get all loaded dataset names
   */
  getDatasetNames(): string[] {
    return Array.from(this.datasets.keys());
  }

  /**
   * Validate a single record against a schema
   */
  validateRecord(
    schemaName: string,
    record: Record<string, unknown>,
    recordIndex: number
  ): ValidationError[] {
    const schema = this.schemas.get(schemaName);
    if (!schema) {
      return [
        {
          record: recordIndex,
          constraint: 'schema',
          message: `Schema "${schemaName}" not found`,
        },
      ];
    }

    const errors: ValidationError[] = [];

    // Check assume clauses
    if (schema.assumes && schema.assumes.length > 0) {
      const constraintErrors = this.checkConstraints(schema.assumes, record, recordIndex);
      errors.push(...constraintErrors);
    }

    return errors;
  }

  /**
   * Validate an array of records against a schema
   */
  validateCollection(
    schemaName: string,
    records: Record<string, unknown>[]
  ): SchemaValidationResult {
    const errors: ValidationError[] = [];
    let recordsFailed = 0;

    for (let i = 0; i < records.length; i++) {
      const recordErrors = this.validateRecord(schemaName, records[i], i);
      if (recordErrors.length > 0) {
        errors.push(...recordErrors);
        recordsFailed++;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      recordsValidated: records.length,
      recordsFailed,
    };
  }

  /**
   * Validate an entire dataset against schemas
   * Uses mapping to determine which schema validates which collection
   */
  validateDataset(
    data: Record<string, unknown[]>,
    mapping: Record<string, string>
  ): DatasetValidationResult {
    const collections = new Map<string, SchemaValidationResult>();
    let totalRecords = 0;
    let totalFailed = 0;
    let allValid = true;

    for (const [collectionName, schemaName] of Object.entries(mapping)) {
      const records = data[collectionName];
      if (!records || !Array.isArray(records)) {
        collections.set(collectionName, {
          valid: false,
          errors: [
            {
              record: -1,
              constraint: 'collection',
              message: `Collection "${collectionName}" not found in data`,
            },
          ],
          recordsValidated: 0,
          recordsFailed: 0,
        });
        allValid = false;
        continue;
      }

      const result = this.validateCollection(schemaName, records as Record<string, unknown>[]);
      collections.set(collectionName, result);
      totalRecords += result.recordsValidated;
      totalFailed += result.recordsFailed;
      if (!result.valid) {
        allValid = false;
      }
    }

    return {
      valid: allValid,
      collections,
      totalRecords,
      totalFailed,
    };
  }

  /**
   * Validate dataset-level constraints from a validate { } block
   * These are aggregate constraints that apply to the entire dataset, like:
   * - sum(invoices.total) >= 100000
   * - all(invoices, .amount_paid <= .total)
   * - some(invoices, .status == "paid")
   */
  validateDatasetLevelConstraints(
    datasetName: string,
    data: Record<string, unknown[]>
  ): DatasetLevelValidationResult {
    const dataset = this.datasets.get(datasetName);
    if (!dataset) {
      return {
        valid: false,
        errors: [
          {
            constraint: 'dataset',
            message: `Dataset "${datasetName}" not found`,
          },
        ],
      };
    }

    if (!dataset.validation || dataset.validation.validations.length === 0) {
      // No validation block - all data passes
      return { valid: true, errors: [] };
    }

    const errors: DatasetLevelError[] = [];

    // Create a context with all collections
    const ctx = createContext();
    for (const [name, items] of Object.entries(data)) {
      ctx.collections.set(name, items);
    }

    // Create a generator instance for expression evaluation
    const generator = new Generator(ctx);

    // Evaluate each validation expression
    for (const constraint of dataset.validation.validations) {
      try {
        const result = generator.evaluateExpression(constraint);
        if (!result) {
          errors.push({
            constraint: this.expressionToString(constraint),
            message: `Dataset constraint failed: ${this.expressionToString(constraint)}`,
          });
        }
      } catch (err) {
        errors.push({
          constraint: this.expressionToString(constraint),
          message: `Error evaluating dataset constraint: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Full validation: validates records against schema constraints AND
   * validates dataset-level constraints from validate { } blocks
   */
  validateFull(
    data: Record<string, unknown[]>,
    mapping: Record<string, string>,
    datasetName?: string
  ): FullDatasetValidationResult {
    // First validate record-level constraints
    const result = this.validateDataset(data, mapping);

    // Then validate dataset-level constraints if a dataset name is provided
    let datasetLevelValidation: DatasetLevelValidationResult | undefined;
    if (datasetName) {
      datasetLevelValidation = this.validateDatasetLevelConstraints(datasetName, data);
    }

    const allValid = result.valid && (!datasetLevelValidation || datasetLevelValidation.valid);

    return {
      ...result,
      valid: allValid,
      datasetLevelValidation,
    };
  }

  /**
   * Check constraints against a record using the generator's expression evaluator
   */
  private checkConstraints(
    assumes: AssumeClause[],
    record: Record<string, unknown>,
    recordIndex: number
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Create a minimal context for expression evaluation
    const ctx = createContext();
    ctx.current = record;

    // Create a generator instance for expression evaluation
    const generator = new Generator(ctx);

    for (const assume of assumes) {
      // Check if conditional constraint applies
      if (assume.condition) {
        try {
          const conditionMet = Boolean(generator.evaluateExpression(assume.condition));
          if (!conditionMet) {
            // Condition not met, skip these constraints
            continue;
          }
        } catch (err) {
          errors.push({
            record: recordIndex,
            constraint: this.expressionToString(assume.condition),
            message: `Error evaluating condition: ${err instanceof Error ? err.message : String(err)}`,
          });
          continue;
        }
      }

      // Check all constraints in the clause
      for (const constraint of assume.constraints) {
        try {
          const result = generator.evaluateExpression(constraint);
          if (!result) {
            errors.push({
              record: recordIndex,
              constraint: this.expressionToString(constraint),
              message: `Constraint failed: ${this.expressionToString(constraint)}`,
              value: this.getRelevantValues(constraint, record),
            });
          }
        } catch (err) {
          errors.push({
            record: recordIndex,
            constraint: this.expressionToString(constraint),
            message: `Error evaluating constraint: ${err instanceof Error ? err.message : String(err)}`,
          });
        }
      }
    }

    return errors;
  }

  /**
   * Convert an expression to a readable string representation
   */
  private expressionToString(expr: Expression): string {
    switch (expr.type) {
      case 'BinaryExpression': {
        const bin = expr as BinaryExpression;
        return `${this.expressionToString(bin.left)} ${bin.operator} ${this.expressionToString(bin.right)}`;
      }
      case 'UnaryExpression': {
        const unary = expr as UnaryExpression;
        return `${unary.operator}${this.expressionToString(unary.operand)}`;
      }
      case 'Identifier':
        return (expr as { name: string }).name;
      case 'Literal': {
        const lit = expr as Literal;
        if (typeof lit.value === 'string') {
          return `"${lit.value}"`;
        }
        return String(lit.value);
      }
      case 'QualifiedName':
        return (expr as { parts: string[] }).parts.join('.');
      case 'CallExpression': {
        const call = expr as CallExpression;
        return `${call.callee}(${call.arguments.map((a: Expression) => this.expressionToString(a)).join(', ')})`;
      }
      case 'LogicalExpression': {
        const logical = expr as { left: Expression; operator: string; right: Expression };
        return `${this.expressionToString(logical.left)} ${logical.operator} ${this.expressionToString(logical.right)}`;
      }
      case 'NotExpression': {
        const not = expr as { operand: Expression };
        return `not ${this.expressionToString(not.operand)}`;
      }
      default:
        return '[expression]';
    }
  }

  /**
   * Extract relevant field values for error messages
   */
  private getRelevantValues(
    expr: Expression,
    record: Record<string, unknown>
  ): Record<string, unknown> {
    const values: Record<string, unknown> = {};
    this.collectIdentifiers(expr, values, record);
    return values;
  }

  private collectIdentifiers(
    expr: Expression,
    values: Record<string, unknown>,
    record: Record<string, unknown>
  ): void {
    switch (expr.type) {
      case 'Identifier': {
        const name = (expr as { name: string }).name;
        if (name in record) {
          values[name] = record[name];
        }
        break;
      }
      case 'BinaryExpression': {
        const bin = expr as BinaryExpression;
        this.collectIdentifiers(bin.left, values, record);
        this.collectIdentifiers(bin.right, values, record);
        break;
      }
      case 'UnaryExpression': {
        const unary = expr as UnaryExpression;
        this.collectIdentifiers(unary.operand, values, record);
        break;
      }
      case 'QualifiedName': {
        const parts = (expr as { parts: string[] }).parts;
        if (parts.length > 0 && parts[0] in record) {
          values[parts[0]] = record[parts[0]];
        }
        break;
      }
      case 'CallExpression': {
        const call = expr as CallExpression;
        for (const arg of call.arguments) {
          this.collectIdentifiers(arg, values, record);
        }
        break;
      }
      case 'LogicalExpression': {
        const logical = expr as { left: Expression; right: Expression };
        this.collectIdentifiers(logical.left, values, record);
        this.collectIdentifiers(logical.right, values, record);
        break;
      }
      case 'NotExpression': {
        const not = expr as { operand: Expression };
        this.collectIdentifiers(not.operand, values, record);
        break;
      }
    }
  }
}
