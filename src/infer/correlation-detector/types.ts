/**
 * Type definitions for correlation detection.
 */

/**
 * Detected constraint types
 */
export type ConstraintType = 'ordering' | 'derived' | 'conditional';

/**
 * Base constraint interface
 */
export interface BaseConstraint {
  type: ConstraintType;
  confidence: number; // 0-1, how confident we are in this constraint
}

/**
 * Ordering constraint: fieldA <= fieldB (or >=, <, >)
 */
export interface OrderingConstraint extends BaseConstraint {
  type: 'ordering';
  fieldA: string;
  fieldB: string;
  operator: '<=' | '>=' | '<' | '>';
}

/**
 * Derived field: fieldA = expression involving other fields
 */
export interface DerivedConstraint extends BaseConstraint {
  type: 'derived';
  targetField: string;
  expression: string; // Vague expression (e.g., "fieldB * fieldC", "fieldB * 0.2")
  sourceFields: string[];
}

/**
 * Conditional constraint: if condition then assertion
 */
export interface ConditionalConstraint extends BaseConstraint {
  type: 'conditional';
  condition: string; // Vague condition (e.g., "status == \"paid\"")
  assertion: string; // Vague assertion (e.g., "amount_paid >= total")
  conditionField: string;
  conditionValue: unknown;
}

export type InferredConstraint = OrderingConstraint | DerivedConstraint | ConditionalConstraint;

/**
 * Aggregation type for nested array fields
 */
export type AggregationType = 'sum' | 'count' | 'min' | 'max' | 'avg';

/**
 * Detected aggregation: parent field = aggregate(array.field)
 */
export interface AggregationConstraint extends BaseConstraint {
  type: 'derived';
  targetField: string;
  expression: string; // e.g., "sum(line_items.amount)"
  sourceFields: string[];
  aggregationType: AggregationType;
  arrayField: string;
  nestedField: string;
}

/**
 * Options for correlation detection
 */
export interface CorrelationOptions {
  /** Minimum confidence threshold (0-1) to include a constraint */
  minConfidence?: number;
  /** Tolerance for floating point comparisons */
  tolerance?: number;
  /** Maximum number of constraints to return */
  maxConstraints?: number;
}

export const DEFAULT_CORRELATION_OPTIONS: Required<CorrelationOptions> = {
  minConfidence: 0.95, // 95% of records must satisfy the constraint
  tolerance: 0.0001, // For floating point comparisons
  maxConstraints: 20,
};
