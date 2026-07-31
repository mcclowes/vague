/**
 * Derived field detection.
 * Detects relationships like: total = price * quantity, tax = subtotal * 0.2
 */

import { DerivedConstraint, CorrelationOptions, DEFAULT_CORRELATION_OPTIONS } from './types.js';
import { formatMultiplier } from './utils.js';

/**
 * Detect derived fields: total = a * b, tax = total * 0.2, etc.
 * Returns non-conflicting derived fields (no circular dependencies)
 */
export function detectDerivedFields(
  records: Record<string, unknown>[],
  fieldNames: string[],
  options: CorrelationOptions = {}
): DerivedConstraint[] {
  const opts = { ...DEFAULT_CORRELATION_OPTIONS, ...options };
  const allCandidates: DerivedConstraint[] = [];

  // Get numeric fields only
  const numericFields = fieldNames.filter((name) => {
    const sample = records.find((r) => r[name] !== null && r[name] !== undefined);
    return sample && typeof sample[name] === 'number';
  });

  // Check for multiplication relationships: C = A * B (highest priority)
  for (const targetField of numericFields) {
    for (let i = 0; i < numericFields.length; i++) {
      if (numericFields[i] === targetField) continue;

      for (let j = i + 1; j < numericFields.length; j++) {
        if (numericFields[j] === targetField) continue;

        const fieldA = numericFields[i];
        const fieldB = numericFields[j];

        const result = checkMultiplication(records, targetField, fieldA, fieldB, opts.tolerance);
        if (result.confidence >= opts.minConfidence) {
          allCandidates.push({
            type: 'derived',
            targetField,
            expression: `${fieldA} * ${fieldB}`,
            sourceFields: [fieldA, fieldB],
            confidence: result.confidence + 0.1, // Boost multiplication (most common pattern)
          });
        }
      }
    }

    // Check for addition: C = A + B
    for (let i = 0; i < numericFields.length; i++) {
      if (numericFields[i] === targetField) continue;

      for (let j = i + 1; j < numericFields.length; j++) {
        if (numericFields[j] === targetField) continue;

        const fieldA = numericFields[i];
        const fieldB = numericFields[j];

        const result = checkAddition(records, targetField, fieldA, fieldB, opts.tolerance);
        if (result.confidence >= opts.minConfidence) {
          allCandidates.push({
            type: 'derived',
            targetField,
            expression: `${fieldA} + ${fieldB}`,
            sourceFields: [fieldA, fieldB],
            confidence: result.confidence + 0.05, // Slight boost for addition
          });
        }
      }
    }

    // Check for division: C = A / B (e.g., rate = amount / quantity)
    for (let i = 0; i < numericFields.length; i++) {
      if (numericFields[i] === targetField) continue;

      for (let j = 0; j < numericFields.length; j++) {
        if (numericFields[j] === targetField || i === j) continue;

        const fieldA = numericFields[i];
        const fieldB = numericFields[j];

        const result = checkDivision(records, targetField, fieldA, fieldB, opts.tolerance);
        if (result.confidence >= opts.minConfidence) {
          allCandidates.push({
            type: 'derived',
            targetField,
            expression: `${fieldA} / ${fieldB}`,
            sourceFields: [fieldA, fieldB],
            confidence: result.confidence + 0.08, // Boost for division (common pattern like unit price)
          });
        }
      }
    }

    // Check for subtraction: C = A - B (e.g., balance = total - paid)
    for (let i = 0; i < numericFields.length; i++) {
      if (numericFields[i] === targetField) continue;

      for (let j = 0; j < numericFields.length; j++) {
        if (numericFields[j] === targetField || i === j) continue;

        const fieldA = numericFields[i];
        const fieldB = numericFields[j];

        const result = checkSubtraction(records, targetField, fieldA, fieldB, opts.tolerance);
        if (result.confidence >= opts.minConfidence) {
          allCandidates.push({
            type: 'derived',
            targetField,
            expression: `${fieldA} - ${fieldB}`,
            sourceFields: [fieldA, fieldB],
            confidence: result.confidence + 0.04, // Lower boost than addition (0.05) since A+B=C is more common than C-B=A
          });
        }
      }
    }

    // Check for constant multiplier: B = A * constant (lower priority - often redundant)
    for (const sourceField of numericFields) {
      if (sourceField === targetField) continue;

      const result = checkConstantMultiplier(records, targetField, sourceField, opts.tolerance);
      if (result.confidence >= opts.minConfidence && result.multiplier !== null) {
        // Format multiplier nicely
        const mult = formatMultiplier(result.multiplier);
        allCandidates.push({
          type: 'derived',
          targetField,
          expression: `${sourceField} * ${mult}`,
          sourceFields: [sourceField],
          confidence: result.confidence, // No boost - lower priority
        });
      }
    }

    // Check for 3-term addition: D = A + B + C (e.g., grand_total = subtotal + tax + shipping)
    // Only check if we haven't found a pairwise relationship for this target
    const hasPairwise = allCandidates.some((c) => c.targetField === targetField);
    if (!hasPairwise && numericFields.length >= 4) {
      for (let i = 0; i < numericFields.length; i++) {
        if (numericFields[i] === targetField) continue;
        for (let j = i + 1; j < numericFields.length; j++) {
          if (numericFields[j] === targetField) continue;
          for (let k = j + 1; k < numericFields.length; k++) {
            if (numericFields[k] === targetField) continue;

            const fieldA = numericFields[i];
            const fieldB = numericFields[j];
            const fieldC = numericFields[k];

            const result = checkThreeTermAddition(
              records,
              targetField,
              fieldA,
              fieldB,
              fieldC,
              opts.tolerance
            );
            if (result.confidence >= opts.minConfidence) {
              allCandidates.push({
                type: 'derived',
                targetField,
                expression: `${fieldA} + ${fieldB} + ${fieldC}`,
                sourceFields: [fieldA, fieldB, fieldC],
                confidence: result.confidence + 0.03, // Small boost for 3-term
              });
            }
          }
        }
      }
    }
  }

  // Resolve conflicts: pick best non-conflicting set of derived fields
  return resolveDerivationConflicts(allCandidates);
}

/**
 * Resolve conflicts between derived field candidates
 * Avoid circular dependencies and prefer simpler expressions
 */
function resolveDerivationConflicts(candidates: DerivedConstraint[]): DerivedConstraint[] {
  // Sort by confidence (descending), then by number of source fields (ascending)
  const sorted = [...candidates].sort((a, b) => {
    const confDiff = b.confidence - a.confidence;
    if (Math.abs(confDiff) > 0.01) return confDiff;
    return a.sourceFields.length - b.sourceFields.length;
  });

  const selected: DerivedConstraint[] = [];
  const derivedTargets = new Set<string>(); // Fields that are computed
  const usedAsSources = new Set<string>(); // Fields used as sources in selected derivations

  for (const candidate of sorted) {
    // Check if any source field is already a derived target (would create circular dep)
    const hasCircularDep = candidate.sourceFields.some((sf) => derivedTargets.has(sf));
    if (hasCircularDep) continue;

    // Check if this target is already used as a source in another derivation
    // This prevents: c = a + b being selected, then a = b * 5 (which would make c indirectly depend on derived a)
    if (usedAsSources.has(candidate.targetField)) continue;

    // Check if this target already has a derivation
    if (derivedTargets.has(candidate.targetField)) continue;

    // Accept this derivation
    selected.push(candidate);
    derivedTargets.add(candidate.targetField);

    // Mark source fields as used
    for (const source of candidate.sourceFields) {
      usedAsSources.add(source);
    }
  }

  return selected;
}

/**
 * Check if target = fieldA * fieldB
 */
function checkMultiplication(
  records: Record<string, unknown>[],
  target: string,
  fieldA: string,
  fieldB: string,
  tolerance: number
): { confidence: number } {
  let validCount = 0;
  let totalCount = 0;

  for (const record of records) {
    const t = record[target];
    const a = record[fieldA];
    const b = record[fieldB];

    if (typeof t !== 'number' || typeof a !== 'number' || typeof b !== 'number') {
      continue;
    }

    totalCount++;

    const expected = a * b;
    // Use relative tolerance for larger numbers, absolute for small ones
    const absError = Math.abs(t - expected);
    const relError = expected !== 0 ? absError / Math.abs(expected) : absError;
    if (absError <= 0.01 || relError <= tolerance) {
      validCount++;
    }
  }

  return { confidence: totalCount > 0 ? validCount / totalCount : 0 };
}

/**
 * Check if target = source * constant
 */
function checkConstantMultiplier(
  records: Record<string, unknown>[],
  target: string,
  source: string,
  tolerance: number
): { confidence: number; multiplier: number | null } {
  const ratios: number[] = [];

  for (const record of records) {
    const t = record[target];
    const s = record[source];

    if (typeof t !== 'number' || typeof s !== 'number' || s === 0) {
      continue;
    }

    ratios.push(t / s);
  }

  if (ratios.length < 2) {
    return { confidence: 0, multiplier: null };
  }

  // Calculate mean ratio and check consistency
  const meanRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  let validCount = 0;

  for (const ratio of ratios) {
    const absError = Math.abs(ratio - meanRatio);
    const relError = meanRatio !== 0 ? absError / Math.abs(meanRatio) : absError;
    if (absError <= 0.01 || relError <= tolerance) {
      validCount++;
    }
  }

  const confidence = validCount / ratios.length;

  // Only return if it's a meaningful multiplier (not 1 or 0)
  if (confidence >= 0.95 && Math.abs(meanRatio - 1) > 0.01 && Math.abs(meanRatio) > 0.01) {
    return { confidence, multiplier: meanRatio };
  }

  return { confidence: 0, multiplier: null };
}

/**
 * Check if target = fieldA + fieldB
 */
function checkAddition(
  records: Record<string, unknown>[],
  target: string,
  fieldA: string,
  fieldB: string,
  tolerance: number
): { confidence: number } {
  let validCount = 0;
  let totalCount = 0;

  for (const record of records) {
    const t = record[target];
    const a = record[fieldA];
    const b = record[fieldB];

    if (typeof t !== 'number' || typeof a !== 'number' || typeof b !== 'number') {
      continue;
    }

    totalCount++;

    const expected = a + b;
    if (Math.abs(t - expected) <= tolerance * Math.max(Math.abs(expected), 1)) {
      validCount++;
    }
  }

  return { confidence: totalCount > 0 ? validCount / totalCount : 0 };
}

/**
 * Check if target = fieldA / fieldB (division)
 */
function checkDivision(
  records: Record<string, unknown>[],
  target: string,
  fieldA: string,
  fieldB: string,
  tolerance: number
): { confidence: number } {
  let validCount = 0;
  let totalCount = 0;

  for (const record of records) {
    const t = record[target];
    const a = record[fieldA];
    const b = record[fieldB];

    if (typeof t !== 'number' || typeof a !== 'number' || typeof b !== 'number') {
      continue;
    }

    // Skip division by zero or very small numbers
    if (Math.abs(b) < 0.0001) {
      continue;
    }

    totalCount++;

    const expected = a / b;
    // Use relative tolerance for division results
    const absError = Math.abs(t - expected);
    const relError = expected !== 0 ? absError / Math.abs(expected) : absError;
    if (absError <= 0.01 || relError <= tolerance) {
      validCount++;
    }
  }

  return { confidence: totalCount > 0 ? validCount / totalCount : 0 };
}

/**
 * Check if target = fieldA - fieldB (subtraction)
 */
function checkSubtraction(
  records: Record<string, unknown>[],
  target: string,
  fieldA: string,
  fieldB: string,
  tolerance: number
): { confidence: number } {
  let validCount = 0;
  let totalCount = 0;

  for (const record of records) {
    const t = record[target];
    const a = record[fieldA];
    const b = record[fieldB];

    if (typeof t !== 'number' || typeof a !== 'number' || typeof b !== 'number') {
      continue;
    }

    totalCount++;

    const expected = a - b;
    // Use relative tolerance for larger numbers, absolute for small ones
    const absError = Math.abs(t - expected);
    const relError = expected !== 0 ? absError / Math.abs(expected) : absError;
    if (absError <= 0.01 || relError <= tolerance) {
      validCount++;
    }
  }

  return { confidence: totalCount > 0 ? validCount / totalCount : 0 };
}

/**
 * Check if target = fieldA + fieldB + fieldC (3-term addition)
 */
function checkThreeTermAddition(
  records: Record<string, unknown>[],
  target: string,
  fieldA: string,
  fieldB: string,
  fieldC: string,
  tolerance: number
): { confidence: number } {
  let validCount = 0;
  let totalCount = 0;

  for (const record of records) {
    const t = record[target];
    const a = record[fieldA];
    const b = record[fieldB];
    const c = record[fieldC];

    if (
      typeof t !== 'number' ||
      typeof a !== 'number' ||
      typeof b !== 'number' ||
      typeof c !== 'number'
    ) {
      continue;
    }

    totalCount++;

    const expected = a + b + c;
    const absError = Math.abs(t - expected);
    const relError = expected !== 0 ? absError / Math.abs(expected) : absError;
    if (absError <= 0.01 || relError <= tolerance) {
      validCount++;
    }
  }

  return { confidence: totalCount > 0 ? validCount / totalCount : 0 };
}
