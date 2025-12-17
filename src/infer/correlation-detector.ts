/**
 * Correlation detection for schema inference.
 * Detects relationships between fields: ordering constraints, derived fields, and conditional relationships.
 */

import { toValidIdentifier } from './codegen.js';

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

const DEFAULT_OPTIONS: Required<CorrelationOptions> = {
  minConfidence: 0.95, // 95% of records must satisfy the constraint
  tolerance: 0.0001, // For floating point comparisons
  maxConstraints: 20,
};

/**
 * Detect all correlations/constraints between fields in records
 */
export function detectCorrelations(
  records: Record<string, unknown>[],
  options: CorrelationOptions = {}
): InferredConstraint[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
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
 * Detect ordering constraints: fieldA <= fieldB, fieldA < fieldB, etc.
 * Only compares fields of the same type (dates with dates, amounts with amounts)
 */
function detectOrderingConstraints(
  records: Record<string, unknown>[],
  fieldNames: string[],
  opts: Required<CorrelationOptions>
): OrderingConstraint[] {
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
function checkOrdering(
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

/**
 * Detect derived fields: total = a * b, tax = total * 0.2, etc.
 * Returns non-conflicting derived fields (no circular dependencies)
 */
function detectDerivedFields(
  records: Record<string, unknown>[],
  fieldNames: string[],
  opts: Required<CorrelationOptions>
): DerivedConstraint[] {
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
 * Detect conditional relationships
 */
function detectConditionalRelationships(
  records: Record<string, unknown>[],
  fieldNames: string[],
  opts: Required<CorrelationOptions>
): ConditionalConstraint[] {
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
 * Check if two field names are semantically similar (likely related data)
 */
function isSemanticallySimilar(field1: string, field2: string): boolean {
  const f1 = field1.toLowerCase();
  const f2 = field2.toLowerCase();

  // Same field
  if (f1 === f2) return true;

  // Related terms
  const relatedGroups = [
    ['amount', 'total', 'price', 'cost', 'paid', 'due', 'grand'],
    ['start', 'end', 'begin', 'finish', 'from', 'to'],
    ['min', 'max', 'low', 'high'],
    ['date', 'time', 'day', 'month', 'year'],
    ['quantity', 'count', 'num', 'number'],
  ];

  for (const group of relatedGroups) {
    const f1Matches = group.some((term) => f1.includes(term));
    const f2Matches = group.some((term) => f2.includes(term));
    if (f1Matches && f2Matches) return true;
  }

  return false;
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

// Helper functions

function isDateString(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

function toComparableNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  }
  return null;
}

function formatCondition(field: string, value: unknown): string {
  if (typeof value === 'string') {
    return `${field} == "${value}"`;
  }
  return `${field} == ${value}`;
}

function formatMultiplier(n: number): string {
  // Check for common fractions
  const commonFractions: [number, string][] = [
    [0.25, '0.25'],
    [0.5, '0.5'],
    [0.75, '0.75'],
    [0.1, '0.1'],
    [0.2, '0.2'],
    [0.15, '0.15'],
    [1.5, '1.5'],
    [2, '2'],
    [0.05, '0.05'],
  ];

  for (const [val, str] of commonFractions) {
    if (Math.abs(n - val) < 0.0001) {
      return str;
    }
  }

  // Round to reasonable precision
  if (Math.abs(n) < 1) {
    return n.toFixed(4).replace(/\.?0+$/, '');
  }
  return n.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Sanitize a string containing field names, converting them to valid identifiers
 */
function sanitizeFieldNames(str: string, originalFieldNames: string[]): string {
  let result = str;
  // Sort by length descending to match longer field names first
  const sortedNames = [...originalFieldNames].sort((a, b) => b.length - a.length);
  for (const name of sortedNames) {
    const sanitized = toValidIdentifier(name);
    if (name !== sanitized) {
      // Use word boundary-aware replacement
      result = result.split(name).join(sanitized);
    }
  }
  return result;
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

function flipOperator(op: '<=' | '>=' | '<' | '>'): string {
  switch (op) {
    case '<=':
      return '>=';
    case '>=':
      return '<=';
    case '<':
      return '>';
    case '>':
      return '<';
  }
}

/**
 * Detect aggregation relationships between parent fields and nested array fields
 * E.g., subtotal = sum(line_items.amount)
 */
export function detectAggregations(
  records: Record<string, unknown>[],
  options: CorrelationOptions = {}
): AggregationConstraint[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
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
