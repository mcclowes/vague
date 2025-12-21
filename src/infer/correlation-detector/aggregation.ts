/**
 * Aggregation detection.
 * Detects relationships like: subtotal = sum(line_items.amount)
 */

import {
  AggregationConstraint,
  AggregationType,
  CorrelationOptions,
  DEFAULT_CORRELATION_OPTIONS,
} from './types.js';

/**
 * Detect aggregation relationships between parent fields and nested array fields
 * E.g., subtotal = sum(line_items.amount)
 */
export function detectAggregations(
  records: Record<string, unknown>[],
  options: CorrelationOptions = {}
): AggregationConstraint[] {
  const opts = { ...DEFAULT_CORRELATION_OPTIONS, ...options };
  const constraints: AggregationConstraint[] = [];

  if (records.length < 2) {
    return constraints;
  }

  const firstRecord = records[0];
  if (!firstRecord || typeof firstRecord !== 'object') {
    return constraints;
  }

  // Find numeric fields and array fields
  const numericFields: string[] = [];
  const arrayFields: string[] = [];

  for (const [key, value] of Object.entries(firstRecord)) {
    if (typeof value === 'number') {
      numericFields.push(key);
    } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      arrayFields.push(key);
    }
  }

  // For each numeric field, check if it's an aggregate of an array field
  for (const targetField of numericFields) {
    for (const arrayField of arrayFields) {
      // Get nested numeric fields from the first array
      const firstArray = firstRecord[arrayField] as Record<string, unknown>[];
      if (!firstArray || firstArray.length === 0) continue;

      const nestedNumericFields = Object.entries(firstArray[0])
        .filter(([_, v]) => typeof v === 'number')
        .map(([k]) => k);

      for (const nestedField of nestedNumericFields) {
        // Check each aggregation type
        const aggregations: { type: AggregationType; check: () => { confidence: number } }[] = [
          {
            type: 'sum',
            check: () =>
              checkSumAggregation(records, targetField, arrayField, nestedField, opts.tolerance),
          },
          {
            type: 'count',
            check: () => checkCountAggregation(records, targetField, arrayField, opts.tolerance),
          },
          {
            type: 'min',
            check: () =>
              checkMinAggregation(records, targetField, arrayField, nestedField, opts.tolerance),
          },
          {
            type: 'max',
            check: () =>
              checkMaxAggregation(records, targetField, arrayField, nestedField, opts.tolerance),
          },
          {
            type: 'avg',
            check: () =>
              checkAvgAggregation(records, targetField, arrayField, nestedField, opts.tolerance),
          },
        ];

        for (const { type, check } of aggregations) {
          const result = check();
          if (result.confidence >= opts.minConfidence) {
            const expression =
              type === 'count' ? `count(${arrayField})` : `${type}(${arrayField}.${nestedField})`;

            constraints.push({
              type: 'derived',
              targetField,
              expression,
              sourceFields: [arrayField],
              confidence: result.confidence + 0.1, // Boost for aggregations
              aggregationType: type,
              arrayField,
              nestedField,
            });
          }
        }
      }

      // Also check count without nested field (just count the array)
      const countResult = checkCountAggregation(records, targetField, arrayField, opts.tolerance);
      if (countResult.confidence >= opts.minConfidence) {
        // Check we haven't already added a count constraint
        const existing = constraints.find(
          (c) =>
            c.targetField === targetField &&
            c.aggregationType === 'count' &&
            c.arrayField === arrayField
        );
        if (!existing) {
          constraints.push({
            type: 'derived',
            targetField,
            expression: `count(${arrayField})`,
            sourceFields: [arrayField],
            confidence: countResult.confidence + 0.1,
            aggregationType: 'count',
            arrayField,
            nestedField: '',
          });
        }
      }
    }
  }

  // Sort by confidence and return best matches (avoid duplicates for same target)
  const seen = new Set<string>();
  return constraints
    .sort((a, b) => b.confidence - a.confidence)
    .filter((c) => {
      if (seen.has(c.targetField)) return false;
      seen.add(c.targetField);
      return true;
    });
}

/**
 * Check if target = sum(array.field)
 */
function checkSumAggregation(
  records: Record<string, unknown>[],
  target: string,
  arrayField: string,
  nestedField: string,
  tolerance: number
): { confidence: number } {
  let validCount = 0;
  let totalCount = 0;

  for (const record of records) {
    const targetValue = record[target];
    const array = record[arrayField];

    if (typeof targetValue !== 'number' || !Array.isArray(array)) {
      continue;
    }

    totalCount++;

    const sum = array.reduce((acc: number, item: unknown) => {
      if (typeof item === 'object' && item !== null) {
        const val = (item as Record<string, unknown>)[nestedField];
        if (typeof val === 'number') {
          return acc + val;
        }
      }
      return acc;
    }, 0);

    const absError = Math.abs(targetValue - sum);
    const relError = sum !== 0 ? absError / Math.abs(sum) : absError;
    if (absError <= 0.01 || relError <= tolerance) {
      validCount++;
    }
  }

  return { confidence: totalCount > 0 ? validCount / totalCount : 0 };
}

/**
 * Check if target = count(array)
 */
function checkCountAggregation(
  records: Record<string, unknown>[],
  target: string,
  arrayField: string,
  tolerance: number
): { confidence: number } {
  let validCount = 0;
  let totalCount = 0;

  for (const record of records) {
    const targetValue = record[target];
    const array = record[arrayField];

    if (typeof targetValue !== 'number' || !Array.isArray(array)) {
      continue;
    }

    totalCount++;

    const count = array.length;
    if (Math.abs(targetValue - count) <= tolerance) {
      validCount++;
    }
  }

  return { confidence: totalCount > 0 ? validCount / totalCount : 0 };
}

/**
 * Check if target = min(array.field)
 */
function checkMinAggregation(
  records: Record<string, unknown>[],
  target: string,
  arrayField: string,
  nestedField: string,
  tolerance: number
): { confidence: number } {
  let validCount = 0;
  let totalCount = 0;

  for (const record of records) {
    const targetValue = record[target];
    const array = record[arrayField];

    if (typeof targetValue !== 'number' || !Array.isArray(array) || array.length === 0) {
      continue;
    }

    totalCount++;

    const values = array
      .map((item: unknown) => {
        if (typeof item === 'object' && item !== null) {
          return (item as Record<string, unknown>)[nestedField];
        }
        return undefined;
      })
      .filter((v): v is number => typeof v === 'number');

    if (values.length === 0) continue;

    const min = Math.min(...values);
    const absError = Math.abs(targetValue - min);
    const relError = min !== 0 ? absError / Math.abs(min) : absError;
    if (absError <= 0.01 || relError <= tolerance) {
      validCount++;
    }
  }

  return { confidence: totalCount > 0 ? validCount / totalCount : 0 };
}

/**
 * Check if target = max(array.field)
 */
function checkMaxAggregation(
  records: Record<string, unknown>[],
  target: string,
  arrayField: string,
  nestedField: string,
  tolerance: number
): { confidence: number } {
  let validCount = 0;
  let totalCount = 0;

  for (const record of records) {
    const targetValue = record[target];
    const array = record[arrayField];

    if (typeof targetValue !== 'number' || !Array.isArray(array) || array.length === 0) {
      continue;
    }

    totalCount++;

    const values = array
      .map((item: unknown) => {
        if (typeof item === 'object' && item !== null) {
          return (item as Record<string, unknown>)[nestedField];
        }
        return undefined;
      })
      .filter((v): v is number => typeof v === 'number');

    if (values.length === 0) continue;

    const max = Math.max(...values);
    const absError = Math.abs(targetValue - max);
    const relError = max !== 0 ? absError / Math.abs(max) : absError;
    if (absError <= 0.01 || relError <= tolerance) {
      validCount++;
    }
  }

  return { confidence: totalCount > 0 ? validCount / totalCount : 0 };
}

/**
 * Check if target = avg(array.field)
 */
function checkAvgAggregation(
  records: Record<string, unknown>[],
  target: string,
  arrayField: string,
  nestedField: string,
  tolerance: number
): { confidence: number } {
  let validCount = 0;
  let totalCount = 0;

  for (const record of records) {
    const targetValue = record[target];
    const array = record[arrayField];

    if (typeof targetValue !== 'number' || !Array.isArray(array) || array.length === 0) {
      continue;
    }

    totalCount++;

    const values = array
      .map((item: unknown) => {
        if (typeof item === 'object' && item !== null) {
          return (item as Record<string, unknown>)[nestedField];
        }
        return undefined;
      })
      .filter((v): v is number => typeof v === 'number');

    if (values.length === 0) continue;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const absError = Math.abs(targetValue - avg);
    const relError = avg !== 0 ? absError / Math.abs(avg) : absError;
    if (absError <= 0.01 || relError <= tolerance) {
      validCount++;
    }
  }

  return { confidence: totalCount > 0 ? validCount / totalCount : 0 };
}
