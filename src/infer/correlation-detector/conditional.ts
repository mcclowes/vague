/**
 * Conditional constraint detection.
 * Detects relationships like: if status == "paid" then amount_paid >= total
 */

import { ConditionalConstraint, CorrelationOptions, DEFAULT_CORRELATION_OPTIONS } from './types.js';
import { formatCondition, isSemanticallySimilar } from './utils.js';
import { checkOrdering } from './ordering.js';

/**
 * Detect conditional relationships
 */
export function detectConditionalRelationships(
  records: Record<string, unknown>[],
  fieldNames: string[],
  options: CorrelationOptions = {}
): ConditionalConstraint[] {
  const opts = { ...DEFAULT_CORRELATION_OPTIONS, ...options };
  const constraints: ConditionalConstraint[] = [];

  // Find enum-like fields (string fields with few unique values)
  const enumFields: { name: string; values: unknown[] }[] = [];
  for (const field of fieldNames) {
    const uniqueValues = new Set<unknown>();
    for (const record of records) {
      const v = record[field];
      if (v !== null && v !== undefined) {
        uniqueValues.add(v);
      }
    }
    // Only consider fields with 2-10 unique values
    if (uniqueValues.size >= 2 && uniqueValues.size <= 10) {
      enumFields.push({ name: field, values: Array.from(uniqueValues) });
    }
  }

  // Get numeric fields
  const numericFields = fieldNames.filter((name) => {
    const sample = records.find((r) => r[name] !== null && r[name] !== undefined);
    return sample && typeof sample[name] === 'number';
  });

  // For each enum field and value, check for numeric relationships
  for (const enumField of enumFields) {
    for (const condValue of enumField.values) {
      // Filter records where this condition holds
      const matchingRecords = records.filter((r) => r[enumField.name] === condValue);

      if (matchingRecords.length < 2) continue;

      // Check for equality relationships between numeric fields
      for (let i = 0; i < numericFields.length; i++) {
        for (let j = i + 1; j < numericFields.length; j++) {
          const fieldA = numericFields[i];
          const fieldB = numericFields[j];

          // Check if fieldA >= fieldB when condition holds
          const gteResult = checkConditionalOrdering(
            matchingRecords,
            fieldA,
            fieldB,
            '>=',
            opts.tolerance
          );
          if (gteResult.confidence >= opts.minConfidence) {
            // Also check that this doesn't hold globally
            const globalResult = checkOrdering(records, fieldA, fieldB, '>=', opts.tolerance);
            if (globalResult.confidence < opts.minConfidence) {
              constraints.push({
                type: 'conditional',
                condition: formatCondition(enumField.name, condValue),
                assertion: `${fieldA} >= ${fieldB}`,
                conditionField: enumField.name,
                conditionValue: condValue,
                confidence: gteResult.confidence,
              });
            }
          }

          // Check if fieldA == fieldB when condition holds
          const eqResult = checkConditionalEquality(
            matchingRecords,
            fieldA,
            fieldB,
            opts.tolerance
          );
          if (eqResult.confidence >= opts.minConfidence) {
            // Also check that this doesn't hold globally
            const globalEqResult = checkConditionalEquality(
              records,
              fieldA,
              fieldB,
              opts.tolerance
            );
            if (globalEqResult.confidence < opts.minConfidence) {
              constraints.push({
                type: 'conditional',
                condition: formatCondition(enumField.name, condValue),
                assertion: `${fieldA} == ${fieldB}`,
                conditionField: enumField.name,
                conditionValue: condValue,
                confidence: eqResult.confidence,
              });
            }
          }
        }

        // Check if fieldA > 0 when condition holds
        const posResult = checkPositive(matchingRecords, numericFields[i], opts.tolerance);
        if (posResult.confidence >= opts.minConfidence) {
          const globalPosResult = checkPositive(records, numericFields[i], opts.tolerance);
          if (globalPosResult.confidence < opts.minConfidence) {
            constraints.push({
              type: 'conditional',
              condition: formatCondition(enumField.name, condValue),
              assertion: `${numericFields[i]} > 0`,
              conditionField: enumField.name,
              conditionValue: condValue,
              confidence: posResult.confidence,
            });
          }
        }
      }
    }
  }

  // Filter out trivial/uninteresting constraints
  return filterTrivialConstraints(constraints);
}

/**
 * Filter out trivial or uninteresting constraints
 */
function filterTrivialConstraints(constraints: ConditionalConstraint[]): ConditionalConstraint[] {
  return constraints.filter((c) => {
    // Skip constraints where the condition field value is 0 and we're comparing other fields to it
    // e.g., "if amount_paid == 0 { id >= amount_paid }" is trivially true
    if (c.conditionValue === 0) {
      // Check if assertion compares to the condition field
      if (
        c.assertion.includes(`>= ${c.conditionField}`) ||
        c.assertion.includes(`<= ${c.conditionField}`)
      ) {
        // Only keep if the compared field is semantically related (e.g., same domain)
        const assertionField = c.assertion.split(/\s+/)[0];
        if (!isSemanticallySimilar(assertionField, c.conditionField)) {
          return false;
        }
      }
    }

    // Skip constraints like "if status == 'draft' { id >= amount_paid }" - not meaningful
    if (typeof c.conditionValue === 'string') {
      // For string conditions (status checks), only keep equality assertions or positivity checks
      const isEqualityCheck = c.assertion.includes('==');
      const isPositivityCheck = c.assertion.includes('> 0');
      const isSameFieldComparison = c.assertion.includes(c.conditionField);

      // Also keep comparisons between semantically similar fields
      const parts = c.assertion.split(/\s+/);
      const field1 = parts[0];
      const field2 = parts[parts.length - 1];
      const isMeaningfulComparison = isSemanticallySimilar(field1, field2);

      if (
        !isEqualityCheck &&
        !isPositivityCheck &&
        !isSameFieldComparison &&
        !isMeaningfulComparison
      ) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Check ordering on a subset of records
 */
function checkConditionalOrdering(
  records: Record<string, unknown>[],
  fieldA: string,
  fieldB: string,
  operator: '>=' | '<=',
  tolerance: number
): { confidence: number } {
  let validCount = 0;
  let totalCount = 0;

  for (const record of records) {
    const a = record[fieldA];
    const b = record[fieldB];

    if (typeof a !== 'number' || typeof b !== 'number') continue;

    totalCount++;

    if (operator === '>=' && a >= b - tolerance) {
      validCount++;
    } else if (operator === '<=' && a <= b + tolerance) {
      validCount++;
    }
  }

  return { confidence: totalCount > 0 ? validCount / totalCount : 0 };
}

/**
 * Check if two fields are equal
 */
function checkConditionalEquality(
  records: Record<string, unknown>[],
  fieldA: string,
  fieldB: string,
  tolerance: number
): { confidence: number } {
  let validCount = 0;
  let totalCount = 0;

  for (const record of records) {
    const a = record[fieldA];
    const b = record[fieldB];

    if (typeof a !== 'number' || typeof b !== 'number') continue;

    totalCount++;

    if (Math.abs(a - b) <= tolerance * Math.max(Math.abs(a), Math.abs(b), 1)) {
      validCount++;
    }
  }

  return { confidence: totalCount > 0 ? validCount / totalCount : 0 };
}

/**
 * Check if a field is positive
 */
function checkPositive(
  records: Record<string, unknown>[],
  field: string,
  tolerance: number
): { confidence: number } {
  let validCount = 0;
  let totalCount = 0;

  for (const record of records) {
    const v = record[field];

    if (typeof v !== 'number') continue;

    totalCount++;

    if (v > -tolerance) {
      validCount++;
    }
  }

  return { confidence: totalCount > 0 ? validCount / totalCount : 0 };
}
