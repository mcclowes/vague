/**
 * Schema Diff - Detect behavioral changes between Vague schemas
 *
 * Analyzes schema definitions to identify breaking changes,
 * constraint modifications, and structural differences.
 */

import type {
  Program,
  SchemaDefinition,
  FieldDefinition,
  AssumeClause,
  InvariantClause,
  ContractDefinition,
  Expression,
} from '../ast/index.js';
import { Lexer } from '../lexer/index.js';
import { Parser } from '../parser/index.js';

export type ChangeType =
  | 'breaking' // Will cause existing data to fail validation
  | 'compatible' // New data will be different but compatible
  | 'cosmetic'; // No behavioral impact

export interface FieldChange {
  field: string;
  changeType: ChangeType;
  description: string;
  oldValue?: unknown;
  newValue?: unknown;
}

export interface ConstraintChange {
  changeType: ChangeType;
  description: string;
  constraint: string;
  action: 'added' | 'removed' | 'modified';
}

export interface InvariantChange {
  changeType: ChangeType;
  description: string;
  invariant: string;
  action: 'added' | 'removed' | 'modified';
}

export interface ContractChange {
  contract: string;
  action: 'added' | 'removed';
  changeType: ChangeType;
  invariantCount: number;
}

export interface SchemaDiff {
  schemaName: string;
  hasBreakingChanges: boolean;
  fieldChanges: FieldChange[];
  constraintChanges: ConstraintChange[];
  invariantChanges: InvariantChange[];
  contractChanges: ContractChange[];
}

export interface DiffResult {
  hasBreakingChanges: boolean;
  summary: {
    schemasAdded: string[];
    schemasRemoved: string[];
    schemasModified: string[];
    contractsAdded: string[];
    contractsRemoved: string[];
  };
  schemaDiffs: SchemaDiff[];
  contractDiffs: {
    name: string;
    action: 'added' | 'removed' | 'modified';
    invariantChanges: InvariantChange[];
  }[];
}

/**
 * Compare two Vague schema files and identify differences
 */
export function diffSchemas(oldSource: string, newSource: string): DiffResult {
  const oldAst = parseSource(oldSource);
  const newAst = parseSource(newSource);

  return diffPrograms(oldAst, newAst);
}

/**
 * Compare two parsed ASTs
 */
export function diffPrograms(oldProgram: Program, newProgram: Program): DiffResult {
  const oldSchemas = extractSchemas(oldProgram);
  const newSchemas = extractSchemas(newProgram);
  const oldContracts = extractContracts(oldProgram);
  const newContracts = extractContracts(newProgram);

  const schemasAdded: string[] = [];
  const schemasRemoved: string[] = [];
  const schemasModified: string[] = [];
  const contractsAdded: string[] = [];
  const contractsRemoved: string[] = [];
  const schemaDiffs: SchemaDiff[] = [];
  const contractDiffs: DiffResult['contractDiffs'] = [];

  // Find added schemas
  for (const name of newSchemas.keys()) {
    if (!oldSchemas.has(name)) {
      schemasAdded.push(name);
    }
  }

  // Find removed schemas
  for (const name of oldSchemas.keys()) {
    if (!newSchemas.has(name)) {
      schemasRemoved.push(name);
    }
  }

  // Find modified schemas
  for (const [name, newSchema] of newSchemas) {
    const oldSchema = oldSchemas.get(name);
    if (oldSchema) {
      const diff = diffSchema(name, oldSchema, newSchema);
      if (
        diff.fieldChanges.length > 0 ||
        diff.constraintChanges.length > 0 ||
        diff.invariantChanges.length > 0 ||
        diff.contractChanges.length > 0
      ) {
        schemasModified.push(name);
        schemaDiffs.push(diff);
      }
    }
  }

  // Find added/removed contracts
  for (const name of newContracts.keys()) {
    if (!oldContracts.has(name)) {
      contractsAdded.push(name);
      const contract = newContracts.get(name)!;
      contractDiffs.push({
        name,
        action: 'added',
        invariantChanges: contract.invariants.map((inv) => ({
          changeType: 'compatible' as ChangeType,
          description: `Invariant added: ${expressionToString(inv.constraints[0])}`,
          invariant: expressionToString(inv.constraints[0]),
          action: 'added' as const,
        })),
      });
    }
  }

  for (const name of oldContracts.keys()) {
    if (!newContracts.has(name)) {
      contractsRemoved.push(name);
      const contract = oldContracts.get(name)!;
      contractDiffs.push({
        name,
        action: 'removed',
        invariantChanges: contract.invariants.map((inv) => ({
          changeType: 'breaking' as ChangeType,
          description: `Invariant removed: ${expressionToString(inv.constraints[0])}`,
          invariant: expressionToString(inv.constraints[0]),
          action: 'removed' as const,
        })),
      });
    }
  }

  // Compare modified contracts
  for (const [name, newContract] of newContracts) {
    const oldContract = oldContracts.get(name);
    if (oldContract) {
      const invariantChanges = diffInvariants(oldContract.invariants, newContract.invariants);
      if (invariantChanges.length > 0) {
        contractDiffs.push({
          name,
          action: 'modified',
          invariantChanges,
        });
      }
    }
  }

  const hasBreakingChanges =
    schemasRemoved.length > 0 ||
    contractsRemoved.length > 0 ||
    schemaDiffs.some((d) => d.hasBreakingChanges) ||
    contractDiffs.some((d) => d.invariantChanges.some((ic) => ic.changeType === 'breaking'));

  return {
    hasBreakingChanges,
    summary: {
      schemasAdded,
      schemasRemoved,
      schemasModified,
      contractsAdded,
      contractsRemoved,
    },
    schemaDiffs,
    contractDiffs,
  };
}

function diffSchema(
  name: string,
  oldSchema: SchemaDefinition,
  newSchema: SchemaDefinition
): SchemaDiff {
  const fieldChanges = diffFields(oldSchema.fields, newSchema.fields);
  const constraintChanges = diffConstraints(oldSchema.assumes, newSchema.assumes);
  const invariantChanges = diffInvariants(oldSchema.invariants, newSchema.invariants);
  const contractChanges = diffAppliedContracts(oldSchema.contracts, newSchema.contracts);

  const hasBreakingChanges =
    fieldChanges.some((fc) => fc.changeType === 'breaking') ||
    constraintChanges.some((cc) => cc.changeType === 'breaking') ||
    invariantChanges.some((ic) => ic.changeType === 'breaking') ||
    contractChanges.some((cc) => cc.changeType === 'breaking');

  return {
    schemaName: name,
    hasBreakingChanges,
    fieldChanges,
    constraintChanges,
    invariantChanges,
    contractChanges,
  };
}

function diffFields(oldFields: FieldDefinition[], newFields: FieldDefinition[]): FieldChange[] {
  const changes: FieldChange[] = [];
  const oldFieldMap = new Map(oldFields.map((f) => [f.name, f]));
  const newFieldMap = new Map(newFields.map((f) => [f.name, f]));

  // Check for removed fields (breaking)
  for (const [name, oldField] of oldFieldMap) {
    if (!newFieldMap.has(name)) {
      changes.push({
        field: name,
        changeType: 'breaking',
        description: `Field "${name}" removed`,
        oldValue: fieldTypeToString(oldField),
      });
    }
  }

  // Check for added fields (compatible)
  for (const [name, newField] of newFieldMap) {
    if (!oldFieldMap.has(name)) {
      changes.push({
        field: name,
        changeType: 'compatible',
        description: `Field "${name}" added`,
        newValue: fieldTypeToString(newField),
      });
    }
  }

  // Check for modified fields
  for (const [name, newField] of newFieldMap) {
    const oldField = oldFieldMap.get(name);
    if (oldField) {
      const fieldDiffs = compareFieldDefinitions(name, oldField, newField);
      changes.push(...fieldDiffs);
    }
  }

  return changes;
}

function compareFieldDefinitions(
  name: string,
  oldField: FieldDefinition,
  newField: FieldDefinition
): FieldChange[] {
  const changes: FieldChange[] = [];

  // Type changes
  const oldType = fieldTypeToString(oldField);
  const newType = fieldTypeToString(newField);
  if (oldType !== newType) {
    changes.push({
      field: name,
      changeType: 'breaking',
      description: `Field "${name}" type changed`,
      oldValue: oldType,
      newValue: newType,
    });
  }

  // Optional changes
  if (oldField.optional !== newField.optional) {
    const changeType = newField.optional ? 'compatible' : 'breaking';
    changes.push({
      field: name,
      changeType,
      description: `Field "${name}" ${newField.optional ? 'made optional' : 'made required'}`,
    });
  }

  // Unique changes
  if (oldField.unique !== newField.unique) {
    const changeType = newField.unique ? 'compatible' : 'breaking';
    changes.push({
      field: name,
      changeType,
      description: `Field "${name}" ${newField.unique ? 'made unique' : 'uniqueness removed'}`,
    });
  }

  return changes;
}

function diffConstraints(
  oldAssumes: AssumeClause[] | undefined,
  newAssumes: AssumeClause[] | undefined
): ConstraintChange[] {
  const changes: ConstraintChange[] = [];
  const oldConstraints = (oldAssumes ?? []).flatMap((a) => a.constraints);
  const newConstraints = (newAssumes ?? []).flatMap((a) => a.constraints);

  const oldSet = new Set(oldConstraints.map(expressionToString));
  const newSet = new Set(newConstraints.map(expressionToString));

  // Removed constraints (possibly breaking - loosened validation)
  for (const old of oldSet) {
    if (!newSet.has(old)) {
      changes.push({
        changeType: 'compatible',
        description: `Constraint removed (validation loosened)`,
        constraint: old,
        action: 'removed',
      });
    }
  }

  // Added constraints (possibly breaking - tightened validation)
  for (const newC of newSet) {
    if (!oldSet.has(newC)) {
      changes.push({
        changeType: 'breaking',
        description: `Constraint added (validation tightened)`,
        constraint: newC,
        action: 'added',
      });
    }
  }

  return changes;
}

function diffInvariants(
  oldInvariants: InvariantClause[] | undefined,
  newInvariants: InvariantClause[] | undefined
): InvariantChange[] {
  const changes: InvariantChange[] = [];
  const oldConstraints = (oldInvariants ?? []).flatMap((i) => i.constraints);
  const newConstraints = (newInvariants ?? []).flatMap((i) => i.constraints);

  const oldSet = new Set(oldConstraints.map(expressionToString));
  const newSet = new Set(newConstraints.map(expressionToString));

  // Removed invariants (breaking - contract violation)
  for (const old of oldSet) {
    if (!newSet.has(old)) {
      changes.push({
        changeType: 'breaking',
        description: `Invariant removed (contract broken)`,
        invariant: old,
        action: 'removed',
      });
    }
  }

  // Added invariants (breaking - existing data may violate)
  for (const newI of newSet) {
    if (!oldSet.has(newI)) {
      changes.push({
        changeType: 'breaking',
        description: `Invariant added (existing data may violate)`,
        invariant: newI,
        action: 'added',
      });
    }
  }

  return changes;
}

function diffAppliedContracts(
  oldContracts: string[] | undefined,
  newContracts: string[] | undefined
): ContractChange[] {
  const changes: ContractChange[] = [];
  const oldSet = new Set(oldContracts ?? []);
  const newSet = new Set(newContracts ?? []);

  // Removed contracts
  for (const old of oldSet) {
    if (!newSet.has(old)) {
      changes.push({
        contract: old,
        action: 'removed',
        changeType: 'breaking',
        invariantCount: 0, // Unknown without context
      });
    }
  }

  // Added contracts
  for (const newC of newSet) {
    if (!oldSet.has(newC)) {
      changes.push({
        contract: newC,
        action: 'added',
        changeType: 'breaking', // May break existing data
        invariantCount: 0,
      });
    }
  }

  return changes;
}

function parseSource(source: string): Program {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

function extractSchemas(program: Program): Map<string, SchemaDefinition> {
  const schemas = new Map<string, SchemaDefinition>();
  for (const stmt of program.statements) {
    if (stmt.type === 'SchemaDefinition') {
      schemas.set(stmt.name, stmt);
    }
  }
  return schemas;
}

function extractContracts(program: Program): Map<string, ContractDefinition> {
  const contracts = new Map<string, ContractDefinition>();
  for (const stmt of program.statements) {
    if (stmt.type === 'ContractDefinition') {
      contracts.set(stmt.name, stmt);
    }
  }
  return contracts;
}

function fieldTypeToString(field: FieldDefinition): string {
  const type = field.fieldType;
  switch (type.type) {
    case 'PrimitiveType':
      return type.name + (type.precision !== undefined ? `(${type.precision})` : '');
    case 'ReferenceType':
      return type.path.parts.join('.');
    case 'SuperpositionType':
      return type.options.map((o) => expressionToString(o.value)).join(' | ');
    case 'RangeType':
      return `${type.baseType.name} in ${expressionToString(type.min ?? { type: 'Literal', value: 0, dataType: 'number' })}..${expressionToString(type.max ?? { type: 'Literal', value: 0, dataType: 'number' })}`;
    case 'CollectionType':
      return `collection of ${JSON.stringify(type.elementType)}`;
    case 'GeneratorType':
      return `${type.name}()`;
    default:
      return JSON.stringify(type);
  }
}

function expressionToString(expr: Expression | undefined): string {
  if (!expr) return '';

  switch (expr.type) {
    case 'Literal':
      return JSON.stringify(expr.value);
    case 'Identifier':
      return expr.name;
    case 'QualifiedName':
      return expr.parts.join('.');
    case 'BinaryExpression':
      return `${expressionToString(expr.left)} ${expr.operator} ${expressionToString(expr.right)}`;
    case 'LogicalExpression':
      return `${expressionToString(expr.left)} ${expr.operator} ${expressionToString(expr.right)}`;
    case 'CallExpression':
      return `${expr.callee}(${expr.arguments.map(expressionToString).join(', ')})`;
    default:
      return JSON.stringify(expr);
  }
}

/**
 * Format a diff result as a human-readable report
 */
export function formatDiffResult(result: DiffResult): string {
  const lines: string[] = [];

  if (!result.hasBreakingChanges && result.schemaDiffs.length === 0) {
    lines.push('✓ No changes detected');
    return lines.join('\n');
  }

  if (result.hasBreakingChanges) {
    lines.push('⚠ BREAKING CHANGES DETECTED');
  } else {
    lines.push('○ Compatible changes detected');
  }

  lines.push('');
  lines.push('Summary:');

  if (result.summary.schemasAdded.length > 0) {
    lines.push(`  + Schemas added: ${result.summary.schemasAdded.join(', ')}`);
  }
  if (result.summary.schemasRemoved.length > 0) {
    lines.push(`  - Schemas removed: ${result.summary.schemasRemoved.join(', ')}`);
  }
  if (result.summary.schemasModified.length > 0) {
    lines.push(`  ~ Schemas modified: ${result.summary.schemasModified.join(', ')}`);
  }
  if (result.summary.contractsAdded.length > 0) {
    lines.push(`  + Contracts added: ${result.summary.contractsAdded.join(', ')}`);
  }
  if (result.summary.contractsRemoved.length > 0) {
    lines.push(`  - Contracts removed: ${result.summary.contractsRemoved.join(', ')}`);
  }

  lines.push('');

  for (const diff of result.schemaDiffs) {
    lines.push(`Schema: ${diff.schemaName}${diff.hasBreakingChanges ? ' [BREAKING]' : ''}`);

    for (const fc of diff.fieldChanges) {
      const marker =
        fc.changeType === 'breaking' ? '!' : fc.changeType === 'compatible' ? '+' : '~';
      lines.push(`  ${marker} ${fc.description}`);
      if (fc.oldValue !== undefined) lines.push(`      was: ${fc.oldValue}`);
      if (fc.newValue !== undefined) lines.push(`      now: ${fc.newValue}`);
    }

    for (const cc of diff.constraintChanges) {
      const marker = cc.changeType === 'breaking' ? '!' : '+';
      lines.push(`  ${marker} ${cc.description}: ${cc.constraint}`);
    }

    for (const ic of diff.invariantChanges) {
      const marker = ic.changeType === 'breaking' ? '!' : '+';
      lines.push(`  ${marker} ${ic.description}: ${ic.invariant}`);
    }

    for (const cc of diff.contractChanges) {
      const marker = cc.changeType === 'breaking' ? '!' : '+';
      lines.push(`  ${marker} Contract ${cc.contract} ${cc.action}`);
    }

    lines.push('');
  }

  for (const cd of result.contractDiffs) {
    lines.push(`Contract: ${cd.name} (${cd.action})`);
    for (const ic of cd.invariantChanges) {
      const marker = ic.changeType === 'breaking' ? '!' : '+';
      lines.push(`  ${marker} ${ic.description}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
