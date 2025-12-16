export type ASTNode =
  | Program
  | ImportStatement
  | LetStatement
  | SchemaDefinition
  | ContextDefinition
  | DistributionDefinition
  | DatasetDefinition
  | FieldDefinition
  | Expression;

export interface Program {
  type: "Program";
  statements: Statement[];
}

export type Statement =
  | ImportStatement
  | LetStatement
  | SchemaDefinition
  | ContextDefinition
  | DistributionDefinition
  | DatasetDefinition;

// import codat from "codat-openapi.json"
export interface ImportStatement {
  type: "ImportStatement";
  name: string;
  path: string;
}

// let x = 5
export interface LetStatement {
  type: "LetStatement";
  name: string;
  value: Expression;
}

// schema Invoice from codat.Invoice { ... }
export interface SchemaDefinition {
  type: "SchemaDefinition";
  name: string;
  base?: QualifiedName; // from codat.Invoice
  contexts?: ContextApplication[];
  fields: FieldDefinition[];
  constraints?: ConstraintBlock;
  assumes?: AssumeClause[];
  thenBlock?: ThenBlock; // then { invoice.status = "paid" }
}

// then { invoice.status = "paid", invoice.amount_paid += amount }
export interface ThenBlock {
  type: "ThenBlock";
  mutations: Mutation[];
}

// invoice.status = "paid" or invoice.amount_paid += amount
export interface Mutation {
  type: "Mutation";
  target: Expression; // invoice.status
  operator: "=" | "+="; // assignment or compound
  value: Expression; // "paid" or amount
}

// assume due_date >= issued_date
export interface AssumeClause {
  type: "AssumeClause";
  condition?: Expression; // if condition (for assume if)
  constraints: Expression[]; // the constraints to enforce
}

// context Geography { ... }
export interface ContextDefinition {
  type: "ContextDefinition";
  name: string;
  parameters?: ParameterDefinition[];
  fields: FieldDefinition[];
  affects: AffectsClause[];
}

// distribution AgeStructure { ... }
export interface DistributionDefinition {
  type: "DistributionDefinition";
  name: string;
  buckets: DistributionBucket[];
}

// dataset TestData with Geography("en_GB") { ... }
// dataset Invalid violating { ... }  -- generates constraint-violating data
export interface DatasetDefinition {
  type: "DatasetDefinition";
  name: string;
  violating?: boolean; // If true, generate data that violates schema constraints
  contexts?: ContextApplication[];
  collections: CollectionDefinition[];
  validation?: ValidationBlock;
}

// Field definitions
export interface FieldDefinition {
  type: "FieldDefinition";
  name: string;
  fieldType: FieldType;
  optional?: boolean; // ?
  computed?: boolean; // = prefix
  unique?: boolean; // unique - ensure no duplicates
  condition?: Expression; // when clause
  distribution?: Expression; // ~ clause
  constraints?: Expression; // where clause
}

export type FieldType =
  | PrimitiveType
  | ReferenceType
  | SuperpositionType
  | RangeType
  | CollectionType
  | ExpressionType
  | GeneratorType;

export interface ExpressionType {
  type: "ExpressionType";
  expression: Expression;
}

export interface PrimitiveType {
  type: "PrimitiveType";
  name: "int" | "decimal" | "string" | "date" | "boolean";
}

// Plugin-provided generator: uuid, email, faker.company(), etc.
export interface GeneratorType {
  type: "GeneratorType";
  name: string; // Full name including namespace: "uuid", "faker.company"
  arguments: Expression[]; // Optional arguments: phone("US")
}

export interface ReferenceType {
  type: "ReferenceType";
  path: QualifiedName;
}

export interface SuperpositionType {
  type: "SuperpositionType";
  options: WeightedOption[];
}

export interface WeightedOption {
  weight?: number; // if omitted, equal weight
  value: Expression;
}

export interface RangeType {
  type: "RangeType";
  baseType: PrimitiveType;
  min?: Expression;
  max?: Expression;
}

export interface CollectionType {
  type: "CollectionType";
  cardinality: Cardinality | DynamicCardinality;
  elementType: FieldType;
  perParent?: QualifiedName;
}

// Cardinality: 100, 1..10, 50..500, or (condition ? 1..5 : 10..20)
export interface Cardinality {
  type: "Cardinality";
  min: number;
  max: number;
}

// Dynamic cardinality: expression that evaluates to a number or range
export interface DynamicCardinality {
  type: "DynamicCardinality";
  expression: Expression;
}

// Expressions
export type Expression =
  | Literal
  | Identifier
  | QualifiedName
  | BinaryExpression
  | UnaryExpression
  | LogicalExpression
  | NotExpression
  | CallExpression
  | SuperpositionExpression
  | RangeExpression
  | ParentReference
  | AnyOfExpression
  | MatchExpression
  | TernaryExpression;

// and, or
export interface LogicalExpression {
  type: "LogicalExpression";
  operator: "and" | "or";
  left: Expression;
  right: Expression;
}

// not
export interface NotExpression {
  type: "NotExpression";
  operand: Expression;
}

export interface Literal {
  type: "Literal";
  value: string | number | boolean | null;
  dataType: "string" | "number" | "boolean" | "null";
}

export interface Identifier {
  type: "Identifier";
  name: string;
}

// codat.Invoice or company.currency
export interface QualifiedName {
  type: "QualifiedName";
  parts: string[];
}

export interface BinaryExpression {
  type: "BinaryExpression";
  operator: string;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression {
  type: "UnaryExpression";
  operator: string;
  operand: Expression;
}

// sum(line_items.amount)
export interface CallExpression {
  type: "CallExpression";
  callee: string;
  arguments: Expression[];
}

// 0.7: "paid" | 0.2: "pending" | 0.1: "overdue"
export interface SuperpositionExpression {
  type: "SuperpositionExpression";
  options: WeightedOption[];
}

// 18..65
export interface RangeExpression {
  type: "RangeExpression";
  min?: Expression;
  max?: Expression;
}

// ^company.currency
export interface ParentReference {
  type: "ParentReference";
  path: QualifiedName;
}

// any of companies
export interface AnyOfExpression {
  type: "AnyOfExpression";
  collection: Expression;
  condition?: Expression; // where clause
}

// match locale { "en_GB" => "GBP", ... }
export interface MatchExpression {
  type: "MatchExpression";
  value: Expression;
  arms: MatchArm[];
}

export interface MatchArm {
  pattern: Expression;
  result: Expression;
}

// condition ? consequent : alternate
export interface TernaryExpression {
  type: "TernaryExpression";
  condition: Expression;
  consequent: Expression;
  alternate: Expression;
}

// Context application: Geography("en_GB")
export interface ContextApplication {
  type: "ContextApplication";
  name: string;
  arguments: Expression[];
}

// affects currency => match locale { ... }
export interface AffectsClause {
  type: "AffectsClause";
  field: string;
  expression: Expression;
}

// Parameter definition: level: 0.0..1.0
export interface ParameterDefinition {
  type: "ParameterDefinition";
  name: string;
  paramType: FieldType;
}

// Distribution bucket: 0..17: 20%
export interface DistributionBucket {
  type: "DistributionBucket";
  range: RangeExpression | Expression;
  weight: number;
}

/// Collection in dataset: companies: 100 * Company
export interface CollectionDefinition {
  type: "CollectionDefinition";
  name: string;
  cardinality: Cardinality | DynamicCardinality;
  perParent?: string;
  schemaRef: string;
  contexts?: ContextApplication[];
  overrides?: FieldDefinition[];
}

// constraints { ... }
export interface ConstraintBlock {
  type: "ConstraintBlock";
  constraints: Expression[];
}

// validate { ... }
export interface ValidationBlock {
  type: "ValidationBlock";
  validations: Expression[];
}
