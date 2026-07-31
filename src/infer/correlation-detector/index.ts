/**
 * Correlation detection module.
 * Detects relationships between fields: ordering constraints, derived fields, and conditional relationships.
 */

// Export types
export type {
  ConstraintType,
  BaseConstraint,
  OrderingConstraint,
  DerivedConstraint,
  ConditionalConstraint,
  InferredConstraint,
  AggregationType,
  AggregationConstraint,
  CorrelationOptions,
} from './types.js';

export { DEFAULT_CORRELATION_OPTIONS } from './types.js';

// Export detection functions
export { detectOrderingConstraints, checkOrdering } from './ordering.js';
export { detectDerivedFields } from './derived.js';
export { detectConditionalRelationships } from './conditional.js';
export { detectAggregations } from './aggregation.js';

// Export utilities
export {
  isDateString,
  toComparableNumber,
  formatCondition,
  formatMultiplier,
  sanitizeFieldNames,
  isSemanticallySimilar,
  flipOperator,
} from './utils.js';

// Import for main detection function
import { DEFAULT_CORRELATION_OPTIONS, InferredConstraint, CorrelationOptions } from './types.js';
import { detectOrderingConstraints } from './ordering.js';
import { detectDerivedFields } from './derived.js';
import { detectConditionalRelationships } from './conditional.js';
import { toValidIdentifier } from '../codegen.js';
import { sanitizeFieldNames, flipOperator } from './utils.js';

/**
 * Detect all correlations/constraints between fields in records
 */
export function detectCorrelations(
  records: Record<string, unknown>[],
  options: CorrelationOptions = {}
): InferredConstraint[] {
  const opts = { ...DEFAULT_CORRELATION_OPTIONS, ...options };
  const constraints: InferredConstraint[] = [];

  if (records.length < 2) {
    return constraints;
  }

  // Get all field names
  const fieldNames = Object.keys(records[0] || {});

  // Detect ordering constraints
  const orderingConstraints = detectOrderingConstraints(records, fieldNames, opts);
  constraints.push(...orderingConstraints);

  // Detect derived fields (multiplication, addition, etc.)
  const derivedConstraints = detectDerivedFields(records, fieldNames, opts);
  constraints.push(...derivedConstraints);

  // Detect conditional relationships
  const conditionalConstraints = detectConditionalRelationships(records, fieldNames, opts);
  constraints.push(...conditionalConstraints);

  // Sort by confidence and limit
  return constraints
    .filter((c) => c.confidence >= opts.minConfidence)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, opts.maxConstraints);
}

/**
 * Convert constraints to Vague code
 */
export function constraintsToVague(
  constraints: InferredConstraint[],
  fieldNames?: string[]
): string[] {
  const lines: string[] = [];
  const names = fieldNames || [];

  for (const constraint of constraints) {
    switch (constraint.type) {
      case 'ordering': {
        const fieldA = toValidIdentifier(constraint.fieldA);
        const fieldB = toValidIdentifier(constraint.fieldB);
        lines.push(`assume ${fieldB} ${flipOperator(constraint.operator)} ${fieldA}`);
        break;
      }
      case 'derived':
        // Derived fields become computed fields, not constraints
        // These should be handled separately in schema generation
        break;
      case 'conditional': {
        const condition = sanitizeFieldNames(constraint.condition, names);
        const assertion = sanitizeFieldNames(constraint.assertion, names);
        lines.push(`assume if ${condition} { ${assertion} }`);
        break;
      }
    }
  }

  return lines;
}
