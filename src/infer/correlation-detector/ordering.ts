/**
 * Ordering constraint detection.
 * Detects relationships like: fieldA <= fieldB, start_date < end_date
 */

import { OrderingConstraint, CorrelationOptions, DEFAULT_CORRELATION_OPTIONS } from './types.js';
import { isDateString, toComparableNumber } from './utils.js';

/**
 * Detect ordering constraints: fieldA <= fieldB, fieldA < fieldB, etc.
 * Only compares fields of the same type (dates with dates, amounts with amounts)
 */
export function detectOrderingConstraints(
  records: Record<string, unknown>[],
  fieldNames: string[],
  options: CorrelationOptions = {}
): OrderingConstraint[] {
  const opts = { ...DEFAULT_CORRELATION_OPTIONS, ...options };
  const constraints: OrderingConstraint[] = [];

  // Separate numeric fields and date fields
  const numericFields: string[] = [];
  const dateFields: string[] = [];

  for (const name of fieldNames) {
    const sample = records.find((r) => r[name] !== null && r[name] !== undefined);
    if (!sample) continue;
    const value = sample[name];

    if (typeof value === 'number') {
      numericFields.push(name);
    } else if (isDateString(value)) {
      dateFields.push(name);
    }
  }

  // Only compare dates with dates (most meaningful ordering constraints)
  for (let i = 0; i < dateFields.length; i++) {
    for (let j = i + 1; j < dateFields.length; j++) {
      const fieldA = dateFields[i];
      const fieldB = dateFields[j];

      // Check if fieldA <= fieldB always holds
      const lteResult = checkOrdering(records, fieldA, fieldB, '<=', opts.tolerance);
      if (lteResult.confidence >= opts.minConfidence) {
        constraints.push({
          type: 'ordering',
          fieldA,
          fieldB,
          operator: '<=',
          confidence: lteResult.confidence,
        });
      }

      // Check if fieldA >= fieldB always holds
      const gteResult = checkOrdering(records, fieldA, fieldB, '>=', opts.tolerance);
      if (gteResult.confidence >= opts.minConfidence) {
        constraints.push({
          type: 'ordering',
          fieldA,
          fieldB,
          operator: '>=',
          confidence: gteResult.confidence,
        });
      }
    }
  }

  // For numeric fields, only compare semantically related ones
  // Use heuristics: fields with similar names, or specific patterns
  const semanticPairs = findSemanticNumericPairs(numericFields);

  for (const [fieldA, fieldB] of semanticPairs) {
    const lteResult = checkOrdering(records, fieldA, fieldB, '<=', opts.tolerance);
    if (lteResult.confidence >= opts.minConfidence) {
      constraints.push({
        type: 'ordering',
        fieldA,
        fieldB,
        operator: '<=',
        confidence: lteResult.confidence,
      });
    }

    const gteResult = checkOrdering(records, fieldA, fieldB, '>=', opts.tolerance);
    if (gteResult.confidence >= opts.minConfidence) {
      constraints.push({
        type: 'ordering',
        fieldA,
        fieldB,
        operator: '>=',
        confidence: gteResult.confidence,
      });
    }
  }

  return constraints;
}

/**
 * Find semantically related numeric field pairs for ordering comparison
 */
function findSemanticNumericPairs(fields: string[]): [string, string][] {
  const pairs: [string, string][] = [];

  // Patterns that suggest ordering relationships
  const orderingPatterns = [
    [/min/i, /max/i],
    [/start/i, /end/i],
    [/begin/i, /end/i],
    [/from/i, /to/i],
    [/low/i, /high/i],
    [/amount_paid/i, /total/i],
    [/amount_paid/i, /grand_total/i],
    [/paid/i, /total/i],
    [/paid/i, /due/i],
    [/subtotal/i, /total/i],
    [/subtotal/i, /grand_total/i],
    [/tax/i, /total/i],
    [/discount/i, /total/i],
  ];

  for (let i = 0; i < fields.length; i++) {
    for (let j = i + 1; j < fields.length; j++) {
      const a = fields[i];
      const b = fields[j];

      // Check if this pair matches any ordering pattern
      for (const [pattern1, pattern2] of orderingPatterns) {
        if ((pattern1.test(a) && pattern2.test(b)) || (pattern2.test(a) && pattern1.test(b))) {
          pairs.push([a, b]);
          break;
        }
      }
    }
  }

  return pairs;
}

/**
 * Check if an ordering relationship holds
 */
export function checkOrdering(
  records: Record<string, unknown>[],
  fieldA: string,
  fieldB: string,
  operator: '<=' | '>=' | '<' | '>',
  tolerance: number
): { confidence: number; violations: number } {
  let validCount = 0;
  let totalCount = 0;

  for (const record of records) {
    const a = record[fieldA];
    const b = record[fieldB];

    // Skip if either is null/undefined
    if (a === null || a === undefined || b === null || b === undefined) {
      continue;
    }

    const numA = toComparableNumber(a);
    const numB = toComparableNumber(b);

    if (numA === null || numB === null) {
      continue;
    }

    totalCount++;

    let satisfies = false;
    switch (operator) {
      case '<=':
        satisfies = numA <= numB + tolerance;
        break;
      case '>=':
        satisfies = numA >= numB - tolerance;
        break;
      case '<':
        satisfies = numA < numB - tolerance;
        break;
      case '>':
        satisfies = numA > numB + tolerance;
        break;
    }

    if (satisfies) {
      validCount++;
    }
  }

  return {
    confidence: totalCount > 0 ? validCount / totalCount : 0,
    violations: totalCount - validCount,
  };
}
