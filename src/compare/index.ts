/**
 * Golden Dataset Comparison
 *
 * Provides utilities for comparing generated data against golden snapshots
 * to detect behavioral changes and ensure consistency.
 */

export interface FieldDiff {
  path: string;
  expected: unknown;
  actual: unknown;
  type: 'value_mismatch' | 'type_mismatch' | 'missing_field' | 'extra_field';
}

export interface RecordDiff {
  index: number;
  collectionName: string;
  differences: FieldDiff[];
}

export interface CollectionDiff {
  name: string;
  expectedCount: number;
  actualCount: number;
  recordDiffs: RecordDiff[];
  missingRecords: number;
  extraRecords: number;
}

export interface DatasetComparisonResult {
  identical: boolean;
  summary: {
    totalCollections: number;
    matchingCollections: number;
    totalRecords: number;
    matchingRecords: number;
    totalDifferences: number;
  };
  collectionDiffs: CollectionDiff[];
}

/**
 * Compare two datasets for equality, producing a detailed diff.
 *
 * @param expected The golden/expected dataset
 * @param actual The actual/generated dataset
 * @param options Comparison options
 * @returns Detailed comparison result
 */
export function compareDatasets(
  expected: Record<string, unknown[]>,
  actual: Record<string, unknown[]>,
  options: CompareOptions = {}
): DatasetComparisonResult {
  const collectionDiffs: CollectionDiff[] = [];
  let totalRecords = 0;
  let matchingRecords = 0;
  let totalDifferences = 0;

  const allCollectionNames = new Set([...Object.keys(expected), ...Object.keys(actual)]);

  for (const name of allCollectionNames) {
    const expectedCollection = expected[name] ?? [];
    const actualCollection = actual[name] ?? [];

    const collectionDiff = compareCollections(name, expectedCollection, actualCollection, options);

    collectionDiffs.push(collectionDiff);
    totalRecords += collectionDiff.expectedCount;
    matchingRecords +=
      collectionDiff.expectedCount -
      collectionDiff.recordDiffs.length -
      collectionDiff.missingRecords;
    totalDifferences +=
      collectionDiff.recordDiffs.reduce((sum, rd) => sum + rd.differences.length, 0) +
      collectionDiff.missingRecords +
      collectionDiff.extraRecords;
  }

  const identical = totalDifferences === 0;

  return {
    identical,
    summary: {
      totalCollections: allCollectionNames.size,
      matchingCollections: collectionDiffs.filter(
        (cd) => cd.recordDiffs.length === 0 && cd.missingRecords === 0 && cd.extraRecords === 0
      ).length,
      totalRecords,
      matchingRecords,
      totalDifferences,
    },
    collectionDiffs,
  };
}

export interface CompareOptions {
  /**
   * Tolerance for numeric comparisons (for floating point)
   */
  numericTolerance?: number;

  /**
   * Fields to ignore during comparison
   */
  ignoreFields?: string[];

  /**
   * If true, order of records matters. If false, finds best match.
   */
  orderSensitive?: boolean;

  /**
   * Maximum number of differences to report per collection
   */
  maxDiffsPerCollection?: number;
}

function compareCollections(
  name: string,
  expected: unknown[],
  actual: unknown[],
  options: CompareOptions
): CollectionDiff {
  const recordDiffs: RecordDiff[] = [];
  const maxDiffs = options.maxDiffsPerCollection ?? 100;

  const expectedCount = expected.length;
  const actualCount = actual.length;

  // Compare records at each index
  const minLength = Math.min(expectedCount, actualCount);

  for (let i = 0; i < minLength && recordDiffs.length < maxDiffs; i++) {
    const differences = compareRecords(
      expected[i] as Record<string, unknown>,
      actual[i] as Record<string, unknown>,
      '',
      options
    );

    if (differences.length > 0) {
      recordDiffs.push({
        index: i,
        collectionName: name,
        differences,
      });
    }
  }

  return {
    name,
    expectedCount,
    actualCount,
    recordDiffs,
    missingRecords: Math.max(0, expectedCount - actualCount),
    extraRecords: Math.max(0, actualCount - expectedCount),
  };
}

function compareRecords(
  expected: Record<string, unknown>,
  actual: Record<string, unknown>,
  prefix: string,
  options: CompareOptions
): FieldDiff[] {
  const differences: FieldDiff[] = [];
  const ignoreFields = new Set(options.ignoreFields ?? []);

  // Check all expected fields
  for (const [key, expectedValue] of Object.entries(expected)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (ignoreFields.has(key) || ignoreFields.has(path)) {
      continue;
    }

    if (!(key in actual)) {
      differences.push({
        path,
        expected: expectedValue,
        actual: undefined,
        type: 'missing_field',
      });
      continue;
    }

    const actualValue = actual[key];
    const diff = compareValues(expectedValue, actualValue, path, options);
    if (diff) {
      differences.push(diff);
    }
  }

  // Check for extra fields in actual
  for (const key of Object.keys(actual)) {
    const path = prefix ? `${prefix}.${key}` : key;

    if (ignoreFields.has(key) || ignoreFields.has(path)) {
      continue;
    }

    if (!(key in expected)) {
      differences.push({
        path,
        expected: undefined,
        actual: actual[key],
        type: 'extra_field',
      });
    }
  }

  return differences;
}

function compareValues(
  expected: unknown,
  actual: unknown,
  path: string,
  options: CompareOptions
): FieldDiff | null {
  // Handle null/undefined
  if (expected === null || expected === undefined) {
    if (actual === null || actual === undefined) {
      return null; // Both null/undefined, equal
    }
    return { path, expected, actual, type: 'value_mismatch' };
  }

  if (actual === null || actual === undefined) {
    return { path, expected, actual, type: 'value_mismatch' };
  }

  // Type check
  const expectedType = typeof expected;
  const actualType = typeof actual;

  if (expectedType !== actualType) {
    return { path, expected, actual, type: 'type_mismatch' };
  }

  // Array comparison
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      return { path, expected, actual, type: 'type_mismatch' };
    }

    if (expected.length !== actual.length) {
      return { path, expected, actual, type: 'value_mismatch' };
    }

    for (let i = 0; i < expected.length; i++) {
      const diff = compareValues(expected[i], actual[i], `${path}[${i}]`, options);
      if (diff) {
        return diff;
      }
    }

    return null;
  }

  // Object comparison
  if (expectedType === 'object') {
    const nestedDiffs = compareRecords(
      expected as Record<string, unknown>,
      actual as Record<string, unknown>,
      path,
      options
    );
    if (nestedDiffs.length > 0) {
      return nestedDiffs[0]; // Return first nested diff
    }
    return null;
  }

  // Numeric comparison with tolerance
  if (expectedType === 'number' && options.numericTolerance !== undefined) {
    const diff = Math.abs((expected as number) - (actual as number));
    if (diff <= options.numericTolerance) {
      return null;
    }
    return { path, expected, actual, type: 'value_mismatch' };
  }

  // Direct comparison
  if (expected !== actual) {
    return { path, expected, actual, type: 'value_mismatch' };
  }

  return null;
}

/**
 * Format a comparison result as a human-readable string
 */
export function formatComparisonResult(result: DatasetComparisonResult): string {
  const lines: string[] = [];

  if (result.identical) {
    lines.push('✓ Datasets are identical');
    lines.push(
      `  ${result.summary.totalCollections} collections, ${result.summary.totalRecords} records`
    );
    return lines.join('\n');
  }

  lines.push('✗ Datasets differ');
  lines.push('');
  lines.push('Summary:');
  lines.push(
    `  Collections: ${result.summary.matchingCollections}/${result.summary.totalCollections} matching`
  );
  lines.push(
    `  Records: ${result.summary.matchingRecords}/${result.summary.totalRecords} matching`
  );
  lines.push(`  Total differences: ${result.summary.totalDifferences}`);
  lines.push('');

  for (const collectionDiff of result.collectionDiffs) {
    if (
      collectionDiff.recordDiffs.length === 0 &&
      collectionDiff.missingRecords === 0 &&
      collectionDiff.extraRecords === 0
    ) {
      continue;
    }

    lines.push(`Collection: ${collectionDiff.name}`);

    if (collectionDiff.expectedCount !== collectionDiff.actualCount) {
      lines.push(
        `  Count mismatch: expected ${collectionDiff.expectedCount}, got ${collectionDiff.actualCount}`
      );
    }

    for (const recordDiff of collectionDiff.recordDiffs.slice(0, 10)) {
      lines.push(`  Record ${recordDiff.index}:`);
      for (const diff of recordDiff.differences.slice(0, 5)) {
        const expectedStr = formatValue(diff.expected);
        const actualStr = formatValue(diff.actual);
        lines.push(`    ${diff.path}: ${expectedStr} → ${actualStr} (${diff.type})`);
      }
      if (recordDiff.differences.length > 5) {
        lines.push(`    ... and ${recordDiff.differences.length - 5} more differences`);
      }
    }

    if (collectionDiff.recordDiffs.length > 10) {
      lines.push(
        `  ... and ${collectionDiff.recordDiffs.length - 10} more records with differences`
      );
    }

    lines.push('');
  }

  return lines.join('\n');
}

function formatValue(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Check if two datasets are equivalent (ignoring order)
 */
export function datasetsEqual(
  expected: Record<string, unknown[]>,
  actual: Record<string, unknown[]>,
  options?: CompareOptions
): boolean {
  return compareDatasets(expected, actual, options).identical;
}
