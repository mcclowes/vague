/**
 * Metrics Collector
 *
 * Collects statistics during generation for enterprise reporting.
 */

import { createHash, randomUUID } from 'node:crypto';
import { hostname, userInfo } from 'node:os';
import type { VagueWarning } from '../warnings.js';
import type {
  GenerationReport,
  CollectionStatistics,
  FieldStatistics,
  PerformanceMetrics,
  SyntheticDataAttestation,
  AuditLogEntry,
  ReportOptions,
  DistributionComparison,
} from './types.js';

// Package version - will be set from package.json
const GENERATOR_VERSION = '0.1.0';

/**
 * Calculate SHA-256 hash of a string
 */
export function hashString(content: string): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Calculate statistics for a numeric array
 */
function calcNumericStats(values: number[]): {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
} {
  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

  const squaredDiffs = values.map((v) => Math.pow(v - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return { min, max, mean, median, stdDev };
}

/**
 * Calculate value distribution (top N values by frequency)
 */
function calcDistribution(
  values: unknown[],
  topN: number = 10
): Array<{ value: unknown; count: number; percentage: number }> {
  const counts = new Map<string, { value: unknown; count: number }>();

  for (const value of values) {
    const key = JSON.stringify(value);
    const existing = counts.get(key);
    if (existing) {
      existing.count++;
    } else {
      counts.set(key, { value, count: 1 });
    }
  }

  const total = values.length;
  const sorted = Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);

  return sorted.map(({ value, count }) => ({
    value,
    count,
    percentage: Math.round((count / total) * 10000) / 100,
  }));
}

/**
 * Calculate statistics for a single field
 */
export function calcFieldStatistics(
  name: string,
  values: unknown[],
  includeDistribution: boolean = true,
  distributionTopN: number = 10
): FieldStatistics {
  const nonNullValues = values.filter((v) => v !== null && v !== undefined);
  const nullCount = values.length - nonNullValues.length;

  // Determine type from first non-null value
  let type = 'unknown';
  if (nonNullValues.length > 0) {
    const sample = nonNullValues[0];
    if (typeof sample === 'number') type = 'number';
    else if (typeof sample === 'string') type = 'string';
    else if (typeof sample === 'boolean') type = 'boolean';
    else if (Array.isArray(sample)) type = 'array';
    else if (typeof sample === 'object') type = 'object';
  }

  // Calculate unique values
  const uniqueValues = new Set(nonNullValues.map((v) => JSON.stringify(v)));

  const stats: FieldStatistics = {
    name,
    type,
    count: nonNullValues.length,
    nullCount,
    nullPercentage: values.length > 0 ? Math.round((nullCount / values.length) * 10000) / 100 : 0,
    uniqueCount: uniqueValues.size,
    cardinality:
      nonNullValues.length > 0
        ? Math.round((uniqueValues.size / nonNullValues.length) * 10000) / 100
        : 0,
  };

  // Numeric statistics
  if (type === 'number') {
    const numericValues = nonNullValues as number[];
    stats.numeric = calcNumericStats(numericValues);
  }

  // String statistics
  if (type === 'string') {
    const stringValues = nonNullValues as string[];
    const lengths = stringValues.map((s) => s.length);
    if (lengths.length > 0) {
      stats.string = {
        minLength: Math.min(...lengths),
        maxLength: Math.max(...lengths),
        avgLength: Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length),
      };
    }
  }

  // Value distribution
  if (includeDistribution && nonNullValues.length > 0) {
    stats.distribution = calcDistribution(nonNullValues, distributionTopN);
  }

  return stats;
}

/**
 * Calculate statistics for a collection
 */
export function calcCollectionStatistics(
  name: string,
  schemaName: string,
  records: unknown[],
  options: ReportOptions = {}
): CollectionStatistics {
  const { includeFieldStats = true, includeDistributions = true, distributionTopN = 10 } = options;

  // Extract field names from records
  const fieldNames = new Set<string>();
  for (const record of records) {
    if (record && typeof record === 'object') {
      for (const key of Object.keys(record as Record<string, unknown>)) {
        fieldNames.add(key);
      }
    }
  }

  // Calculate field statistics
  const fields: FieldStatistics[] = [];
  if (includeFieldStats) {
    for (const fieldName of fieldNames) {
      const values = records.map((r) =>
        r && typeof r === 'object' ? (r as Record<string, unknown>)[fieldName] : undefined
      );
      fields.push(calcFieldStatistics(fieldName, values, includeDistributions, distributionTopN));
    }
  }

  return {
    name,
    schemaName,
    recordCount: records.length,
    fields,
    constraints: {
      total: 0,
      satisfied: 0,
      details: [],
    },
  };
}

/**
 * Calculate distribution divergence between two distributions
 * Uses Jensen-Shannon divergence (symmetric, bounded 0-1)
 */
function calcDivergence(
  baseline: Array<{ value: unknown; percentage: number }>,
  current: Array<{ value: unknown; percentage: number }>
): number {
  // Build probability maps
  const baseMap = new Map<string, number>();
  const currMap = new Map<string, number>();
  const allKeys = new Set<string>();

  for (const { value, percentage } of baseline) {
    const key = JSON.stringify(value);
    baseMap.set(key, percentage / 100);
    allKeys.add(key);
  }

  for (const { value, percentage } of current) {
    const key = JSON.stringify(value);
    currMap.set(key, percentage / 100);
    allKeys.add(key);
  }

  // Calculate JS divergence
  let divergence = 0;
  for (const key of allKeys) {
    const p = baseMap.get(key) || 0.0001; // Small epsilon to avoid log(0)
    const q = currMap.get(key) || 0.0001;
    const m = (p + q) / 2;

    if (p > 0 && m > 0) divergence += (p * Math.log2(p / m)) / 2;
    if (q > 0 && m > 0) divergence += (q * Math.log2(q / m)) / 2;
  }

  return Math.min(1, Math.max(0, divergence));
}

/**
 * Compare two generation reports
 */
export function compareReports(
  baseline: GenerationReport,
  current: GenerationReport
): DistributionComparison[] {
  const comparisons: DistributionComparison[] = [];

  for (const currColl of current.collections) {
    const baseColl = baseline.collections.find((c) => c.name === currColl.name);
    if (!baseColl) continue;

    for (const currField of currColl.fields) {
      const baseField = baseColl.fields.find((f) => f.name === currField.name);
      if (!baseField) continue;

      const comparison: DistributionComparison = {
        field: `${currColl.name}.${currField.name}`,
        divergence: 0,
        significant: false,
        baseline: {},
        current: {},
      };

      // Compare numeric stats
      if (baseField.numeric && currField.numeric) {
        comparison.baseline = {
          min: baseField.numeric.min,
          max: baseField.numeric.max,
          mean: baseField.numeric.mean,
        };
        comparison.current = {
          min: currField.numeric.min,
          max: currField.numeric.max,
          mean: currField.numeric.mean,
        };

        // Simple divergence based on mean difference relative to std dev
        const baseStd = baseField.numeric.stdDev || 1;
        const meanDiff = Math.abs(baseField.numeric.mean - currField.numeric.mean);
        comparison.divergence = Math.min(1, meanDiff / (2 * baseStd));
        comparison.significant = comparison.divergence > 0.2;
      }

      // Compare distributions
      if (baseField.distribution && currField.distribution) {
        comparison.baseline.distribution = baseField.distribution.map(({ value, percentage }) => ({
          value,
          percentage,
        }));
        comparison.current.distribution = currField.distribution.map(({ value, percentage }) => ({
          value,
          percentage,
        }));

        const distDivergence = calcDivergence(
          comparison.baseline.distribution,
          comparison.current.distribution
        );

        // Use max of numeric and distribution divergence
        comparison.divergence = Math.max(comparison.divergence, distDivergence);
        comparison.significant = comparison.divergence > 0.15;
      }

      if (comparison.divergence > 0) {
        comparisons.push(comparison);
      }
    }
  }

  return comparisons.sort((a, b) => b.divergence - a.divergence);
}

/**
 * Generate a complete generation report
 */
export function generateReport(
  data: Record<string, unknown[]>,
  schemaSource: string,
  warnings: VagueWarning[],
  options: ReportOptions & {
    seed?: number | null;
    schemaFile?: string;
    configFile?: string;
    configSource?: string;
    startTime?: number;
    endTime?: number;
    constraintStats?: { satisfied: number; total: number };
  } = {}
): GenerationReport {
  const {
    seed = null,
    schemaFile,
    configFile,
    configSource,
    startTime = Date.now(),
    endTime = Date.now(),
    constraintStats = { satisfied: 0, total: 0 },
    baseline,
    includeFieldStats = true,
    includeDistributions = true,
    distributionTopN = 10,
  } = options;

  const schemaHash = hashString(schemaSource);
  const generatedAt = new Date().toISOString();

  // Calculate collection statistics
  const collections: CollectionStatistics[] = [];
  let totalRecords = 0;

  for (const [name, records] of Object.entries(data)) {
    const schemaName = name.charAt(0).toUpperCase() + name.slice(1).replace(/s$/, '');
    collections.push(
      calcCollectionStatistics(name, schemaName, records, {
        includeFieldStats,
        includeDistributions,
        distributionTopN,
      })
    );
    totalRecords += records.length;
  }

  // Build attestation
  const attestation: SyntheticDataAttestation = {
    generatedAt,
    generator: `vague v${GENERATOR_VERSION}`,
    seed,
    schemaHash,
    statement:
      `This data was synthetically generated by Vague on ${generatedAt}. ` +
      `It does not contain real personal information. ` +
      `Schema hash: ${schemaHash}. ` +
      (seed !== null ? `Seed: ${seed} (deterministic/reproducible).` : 'Seed: random.'),
  };

  // Calculate performance metrics
  const durationMs = endTime - startTime;
  const performance: PerformanceMetrics = {
    totalDurationMs: durationMs,
    recordsPerSecond: durationMs > 0 ? Math.round((totalRecords / durationMs) * 1000) : 0,
    constraintSolvingMs: 0, // Would need generator instrumentation
    constraintSolvingPercentage: 0,
  };

  // Build report
  const report: GenerationReport = {
    version: '1.0',
    metadata: {
      reportId: randomUUID(),
      generatedAt,
      generatorVersion: GENERATOR_VERSION,
      hostname: safeHostname(),
      username: safeUsername(),
    },
    input: {
      schemaFile,
      schemaHash,
      configFile,
      configHash: configSource ? hashString(configSource) : undefined,
    },
    attestation,
    summary: {
      totalRecords,
      totalCollections: collections.length,
      seed,
      constraintsSatisfied: constraintStats.satisfied,
      constraintsTotal: constraintStats.total,
      constraintSatisfactionRate:
        constraintStats.total > 0
          ? Math.round((constraintStats.satisfied / constraintStats.total) * 10000) / 100
          : 100,
      warningsCount: warnings.length,
    },
    collections,
    warnings,
    performance,
  };

  // Add comparisons if baseline provided
  if (baseline) {
    report.comparisons = compareReports(baseline, report);
  }

  return report;
}

/**
 * Safe hostname getter (may fail in some environments)
 */
function safeHostname(): string | undefined {
  try {
    return hostname();
  } catch {
    return undefined;
  }
}

/**
 * Safe username getter (may fail in some environments)
 */
function safeUsername(): string | undefined {
  try {
    return userInfo().username;
  } catch {
    return undefined;
  }
}

/**
 * Create an audit log entry
 */
export function createAuditLogEntry(
  operation: AuditLogEntry['operation'],
  status: AuditLogEntry['status'],
  source: string,
  schemaHash: string,
  data: Record<string, unknown[]>,
  warnings: VagueWarning[],
  durationMs: number,
  seed: number | null = null,
  error?: string
): AuditLogEntry {
  const recordCounts: Record<string, number> = {};
  let constraintsSatisfied = 0;
  let constraintsTotal = 0;

  for (const [name, records] of Object.entries(data)) {
    recordCounts[name] = records.length;
  }

  // Count warnings by type
  const warningCounts: Record<string, number> = {};
  for (const warning of warnings) {
    warningCounts[warning.type] = (warningCounts[warning.type] || 0) + 1;

    // Estimate constraint stats from warnings
    if (warning.type === 'ConstraintRetryLimit') {
      constraintsTotal++;
    }
  }

  // If no constraint warnings, assume all satisfied
  if (constraintsTotal === 0 && Object.keys(recordCounts).length > 0) {
    constraintsTotal = Object.values(recordCounts).reduce((a, b) => a + b, 0);
    constraintsSatisfied = constraintsTotal;
  }

  return {
    timestamp: new Date().toISOString(),
    operation,
    status,
    source,
    schemaHash,
    seed,
    recordCounts,
    constraints: {
      satisfied: constraintsSatisfied,
      total: constraintsTotal,
    },
    warningCounts,
    durationMs,
    error,
  };
}

/**
 * Format an audit log entry as JSONL (single line)
 */
export function formatAuditLogEntry(entry: AuditLogEntry): string {
  return JSON.stringify(entry);
}
