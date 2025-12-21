/**
 * Correlation detection for schema inference.
 * Re-exports from the modular implementation in ./correlation-detector/
 */

// Re-export all types
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
} from './correlation-detector/index.js';

// Re-export all functions
export {
  DEFAULT_CORRELATION_OPTIONS,
  detectOrderingConstraints,
  checkOrdering,
  detectDerivedFields,
  detectConditionalRelationships,
  detectAggregations,
  detectCorrelations,
  constraintsToVague,
  isDateString,
  toComparableNumber,
  formatCondition,
  formatMultiplier,
  sanitizeFieldNames,
  isSemanticallySimilar,
  flipOperator,
} from './correlation-detector/index.js';
