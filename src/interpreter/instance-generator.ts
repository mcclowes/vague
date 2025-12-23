/**
 * Instance Generator - Handles generation of schema instances with constraints
 */
import {
  Expression,
  SchemaDefinition,
  FieldDefinition,
  AssumeClause,
  RefineBlock,
  ThenBlock,
  Mutation,
  BinaryExpression,
  QualifiedName,
  TernaryExpression,
  LogicalExpression,
  NotExpression,
  UnaryExpression,
  CallExpression,
} from '../ast/index.js';
import {
  warningCollector,
  createConstraintRetryWarning,
  createMutationTargetNotFoundWarning,
} from '../warnings.js';
import { random } from './random.js';
import { isRecord, isFiniteNumber, getProperty, setProperty } from '../utils/type-guards.js';
import { GeneratorContext } from './context.js';

export interface InstanceGeneratorDeps {
  evaluateExpression: (expr: Expression) => unknown;
  evaluateCondition: (condition: Expression, instance: Record<string, unknown>) => boolean;
  generateField: (field: FieldDefinition, baseField?: unknown) => unknown;
  generateFromFieldType: (fieldType: FieldDefinition['fieldType'], fieldName?: string) => unknown;
  getBaseFields: (schema: SchemaDefinition) => Map<string, unknown>;
  generateFromImportedField: (field: unknown, fieldName?: string) => unknown;
}

export class InstanceGenerator {
  private ctx: GeneratorContext;
  private deps: InstanceGeneratorDeps;

  constructor(ctx: GeneratorContext, deps: InstanceGeneratorDeps) {
    this.ctx = ctx;
    this.deps = deps;
  }

  /**
   * Generate an instance of a schema, respecting constraints
   */
  generate(schema: SchemaDefinition, overrides?: FieldDefinition[]): Record<string, unknown> {
    const maxAttempts = this.ctx.retryLimits.instance;
    const privateFields = this.getPrivateFieldNames(schema, overrides);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const instance = this.generateAttempt(schema, overrides);

      // If no constraints, execute then block and return
      if (!schema.assumes || schema.assumes.length === 0) {
        this.executeThenBlock(schema.thenBlock, instance);
        return this.stripPrivateFields(instance, privateFields);
      }

      // Check all constraints
      const constraintsPass = this.validateConstraints(schema.assumes, instance);
      if (this.ctx.violating ? !constraintsPass : constraintsPass) {
        this.executeThenBlock(schema.thenBlock, instance);
        return this.stripPrivateFields(instance, privateFields);
      }
    }

    // Fallback with warning
    const mode = this.ctx.violating ? 'violating' : 'satisfying';
    warningCollector.add(createConstraintRetryWarning(maxAttempts, mode, schema.name));
    const instance = this.generateAttempt(schema, overrides);
    this.executeThenBlock(schema.thenBlock, instance);
    return this.stripPrivateFields(instance, privateFields);
  }

  /**
   * Generate a single attempt at an instance (without constraint checking)
   */
  generateAttempt(
    schema: SchemaDefinition,
    overrides?: FieldDefinition[]
  ): Record<string, unknown> {
    const instance: Record<string, unknown> = {};
    this.ctx.current = instance;
    this.ctx.currentSchemaName = schema.name;

    const baseFields = this.deps.getBaseFields(schema);

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

    const allFieldNames = new Set(fields.keys());

    // Categorize fields by generation order
    const collectionFields: [string, FieldDefinition][] = [];
    const computedFields: [string, FieldDefinition][] = [];

    for (const [name, field] of fields) {
      // Skip conditional fields if condition not met
      if (field.condition && !this.deps.evaluateCondition(field.condition, instance)) {
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

      instance[name] = this.deps.generateField(field, baseFields.get(name));
    }

    // Generate collection fields
    for (const [name, field] of collectionFields) {
      instance[name] = this.deps.generateField(field, baseFields.get(name));
    }

    // Sort and generate computed fields
    const sortedComputedFields = this.sortComputedFields(computedFields, allFieldNames);
    for (const [name, field] of sortedComputedFields) {
      instance[name] = this.deps.generateField(field, baseFields.get(name));
    }

    // Apply refine block
    if (schema.refineBlock) {
      this.applyRefineBlock(schema.refineBlock, instance);
    }

    // Fill in base fields we haven't covered
    for (const [name, baseField] of baseFields) {
      if (!(name in instance)) {
        instance[name] = this.deps.generateFromImportedField(baseField, name);
      }
    }

    return instance;
  }

  /**
   * Validate all constraints against an instance
   */
  validateConstraints(assumes: AssumeClause[], instance: Record<string, unknown>): boolean {
    const oldCurrent = this.ctx.current;
    this.ctx.current = instance;

    try {
      for (const assume of assumes) {
        // Check if conditional constraint applies
        if (assume.condition) {
          const conditionMet = Boolean(this.deps.evaluateExpression(assume.condition));
          if (!conditionMet) {
            continue;
          }
        }

        // All constraints in the clause must be true
        for (const constraint of assume.constraints) {
          const result = this.deps.evaluateExpression(constraint);
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

  private applyRefineBlock(refineBlock: RefineBlock, instance: Record<string, unknown>): void {
    const oldCurrent = this.ctx.current;
    this.ctx.current = instance;

    try {
      for (const refinement of refineBlock.refinements) {
        const conditionMet = Boolean(this.deps.evaluateExpression(refinement.condition));
        if (!conditionMet) {
          continue;
        }

        for (const field of refinement.fields) {
          // Handle unique fields
          if (field.unique) {
            const key = `${this.ctx.currentSchemaName}.${field.name}`;
            const usedValues = this.ctx.uniqueValues.get(key);
            if (usedValues && field.name in instance) {
              usedValues.delete(instance[field.name]);
            }
          }

          instance[field.name] = this.deps.generateField(field, undefined);
        }
      }
    } finally {
      this.ctx.current = oldCurrent;
    }
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

    const value = this.deps.evaluateExpression(mutation.value);

    if (!isRecord(targetObj)) {
      warningCollector.add(
        createMutationTargetNotFoundWarning(this.ctx.currentSchemaName || 'unknown')
      );
      return;
    }

    if (mutation.operator === '+=') {
      const current = getProperty(targetObj, fieldName);
      if (isFiniteNumber(current) && isFiniteNumber(value)) {
        setProperty(targetObj, fieldName, current + value);
      } else {
        setProperty(targetObj, fieldName, value);
      }
    } else {
      setProperty(targetObj, fieldName, value);
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

      let target: unknown = getProperty(instance, parts[0]);

      for (let i = 1; i < parts.length - 1; i++) {
        if (isRecord(target)) {
          target = getProperty(target, parts[i]);
        } else {
          return { target: null, field: null };
        }
      }

      return { target, field: parts[parts.length - 1] };
    }

    // Handle binary expression with dot operator
    if (expr.type === 'BinaryExpression' && (expr as BinaryExpression).operator === '.') {
      const binExpr = expr as BinaryExpression;

      let target: unknown;
      if (binExpr.left.type === 'Identifier') {
        target = getProperty(instance, (binExpr.left as { name: string }).name);
      } else if (binExpr.left.type === 'BinaryExpression') {
        const nested = this.resolveMutationTarget(binExpr.left, instance);
        if (isRecord(nested.target) && nested.field) {
          target = getProperty(nested.target, nested.field);
        }
      }

      if (binExpr.right.type === 'Identifier') {
        return { target, field: (binExpr.right as { name: string }).name };
      }
    }

    return { target: null, field: null };
  }

  /**
   * Extract field names referenced in an expression
   */
  private extractFieldDependencies(expr: Expression, allFieldNames: Set<string>): Set<string> {
    const deps = new Set<string>();

    const visit = (e: Expression): void => {
      switch (e.type) {
        case 'Identifier': {
          const name = (e as { name: string }).name;
          if (allFieldNames.has(name)) {
            deps.add(name);
          }
          break;
        }
        case 'QualifiedName': {
          const parts = (e as QualifiedName).parts;
          if (parts.length > 0 && allFieldNames.has(parts[0])) {
            deps.add(parts[0]);
          }
          break;
        }
        case 'BinaryExpression': {
          const bin = e as BinaryExpression;
          visit(bin.left);
          visit(bin.right);
          break;
        }
        case 'UnaryExpression': {
          visit((e as UnaryExpression).operand);
          break;
        }
        case 'CallExpression': {
          for (const arg of (e as CallExpression).arguments) {
            visit(arg);
          }
          break;
        }
        case 'TernaryExpression': {
          const tern = e as TernaryExpression;
          visit(tern.condition);
          visit(tern.consequent);
          visit(tern.alternate);
          break;
        }
        case 'LogicalExpression': {
          const log = e as LogicalExpression;
          visit(log.left);
          visit(log.right);
          break;
        }
        case 'NotExpression': {
          visit((e as NotExpression).operand);
          break;
        }
      }
    };

    visit(expr);
    return deps;
  }

  /**
   * Topologically sort computed fields based on their dependencies
   */
  private sortComputedFields(
    computedFields: [string, FieldDefinition][],
    allFieldNames: Set<string>
  ): [string, FieldDefinition][] {
    const deps = new Map<string, Set<string>>();
    const fieldMap = new Map<string, FieldDefinition>();

    for (const [name, field] of computedFields) {
      fieldMap.set(name, field);
      if (field.distribution) {
        deps.set(name, this.extractFieldDependencies(field.distribution, allFieldNames));
      } else {
        deps.set(name, new Set());
      }
    }

    // Kahn's algorithm
    const sorted: [string, FieldDefinition][] = [];
    const inDegree = new Map<string, number>();
    const computedNames = new Set(computedFields.map(([n]) => n));

    for (const [name] of computedFields) {
      let count = 0;
      for (const dep of deps.get(name)!) {
        if (computedNames.has(dep)) {
          count++;
        }
      }
      inDegree.set(name, count);
    }

    const queue: string[] = [];
    for (const [name, degree] of inDegree) {
      if (degree === 0) {
        queue.push(name);
      }
    }

    while (queue.length > 0) {
      const name = queue.shift()!;
      sorted.push([name, fieldMap.get(name)!]);

      for (const [other, otherDeps] of deps) {
        if (otherDeps.has(name) && computedNames.has(other)) {
          const newDegree = inDegree.get(other)! - 1;
          inDegree.set(other, newDegree);
          if (newDegree === 0) {
            queue.push(other);
          }
        }
      }
    }

    if (sorted.length !== computedFields.length) {
      const remaining = computedFields
        .filter(([n]) => !sorted.some(([s]) => s === n))
        .map(([n]) => n);
      throw new Error(
        `Circular dependency detected among computed fields: ${remaining.join(', ')}. ` +
          `Check that computed fields don't reference each other in a cycle.`
      );
    }

    return sorted;
  }
}
