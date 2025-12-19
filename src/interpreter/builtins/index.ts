/**
 * Built-in functions for the Vague generator.
 * Re-exports all function categories.
 */
export { aggregateFunctions } from './aggregate.js';
export { createPredicateFunctions, type ExpressionEvaluator } from './predicate.js';
export { mathFunctions, createUniqueFn } from './math.js';
export { distributionFunctions } from './distribution.js';
export { dateFunctions } from './date.js';
export { stringFunctions } from './string.js';
export { sequenceFunctions } from './sequence.js';
export {
  mapWithContext,
  filterWithContext,
  everyWithContext,
  someWithContext,
} from './collection.js';
