/**
 * Schema inference module.
 * Reverse-engineers Vague schemas from JSON data.
 */

// Type detection
export { detectValueType, detectFieldType, aggregateTypes } from './type-detector.js';
export type { InferredType } from './type-detector.js';

// Range detection
export {
  detectNumericRange,
  detectDateRange,
  detectArrayCardinality,
  detectUniqueness,
  detectStringLengthRange,
  detectPercentage,
  detectDistribution,
} from './range-detector.js';
export type {
  NumericRange,
  DateRange,
  StringLengthRange,
  PercentageInfo,
  DistributionType,
  DistributionInfo,
} from './range-detector.js';

// Enum/superposition detection
export { detectSuperposition, formatWeight, shouldIncludeWeights } from './enum-detector.js';
export type {
  SuperpositionOption,
  SuperpositionResult,
  EnumDetectorConfig,
} from './enum-detector.js';

// Format detection
export { detectFormat, getGeneratorForFormat, detectFieldNamePattern } from './format-detector.js';
export type { DetectedFormat } from './format-detector.js';

// Code generation
export {
  generateSchema,
  generateDataset,
  toPascalCase,
  singularize,
  toValidIdentifier,
} from './codegen.js';
export type { InferredField, InferredSchema } from './codegen.js';

// Correlation detection
export {
  detectCorrelations,
  constraintsToVague,
  detectAggregations,
} from './correlation-detector.js';
export type {
  InferredConstraint,
  OrderingConstraint,
  DerivedConstraint,
  ConditionalConstraint,
  CorrelationOptions,
  AggregationType,
  AggregationConstraint,
} from './correlation-detector.js';

// TypeScript generation
export { generateTypeScript } from './typescript-generator.js';
export type { TypeScriptGeneratorOptions } from './typescript-generator.js';

// Main inference API
export { inferSchema, inferSchemaOnly, inferSchemaWithTypeScript } from './inference.js';
export type { InferOptions, InferResult } from './inference.js';
