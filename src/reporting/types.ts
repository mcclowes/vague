/**
 * Enterprise Reporting Types
 *
 * Provides structured output for audit trails, compliance documentation,
 * and organizational risk management.
 */

import type { VagueWarning } from '../warnings.js';

/**
 * Attestation that data is synthetically generated
 * Answers: "Can legal sign off on this?"
 */
export interface SyntheticDataAttestation {
  /** ISO 8601 timestamp of generation */
  generatedAt: string;
  /** Tool name and version */
  generator: string;
  /** Seed used for reproducibility (null if random) */
  seed: number | null;
  /** SHA-256 hash of the schema source */
  schemaHash: string;
  /** Attestation statement */
  statement: string;
}

/**
 * Statistics for a single field
 */
export interface FieldStatistics {
  name: string;
  type: string;
  /** Count of non-null values */
  count: number;
  /** Count of null values */
  nullCount: number;
  /** Null percentage */
  nullPercentage: number;
  /** Number of unique values */
  uniqueCount: number;
  /** Cardinality ratio (unique/total) */
  cardinality: number;
  /** For numeric fields */
  numeric?: {
    min: number;
    max: number;
    mean: number;
    median: number;
    stdDev: number;
  };
  /** For string fields */
  string?: {
    minLength: number;
    maxLength: number;
    avgLength: number;
  };
  /** Value distribution (top N values with counts) */
  distribution?: Array<{ value: unknown; count: number; percentage: number }>;
}

/**
 * Statistics for a collection/schema
 */
export interface CollectionStatistics {
  name: string;
  schemaName: string;
  recordCount: number;
  fields: FieldStatistics[];
  /** Constraint satisfaction metrics */
  constraints: {
    total: number;
    satisfied: number;
    /** Individual constraint results */
    details: Array<{
      constraint: string;
      satisfied: boolean;
      retries: number;
    }>;
  };
}

/**
 * Distribution comparison between two generation runs
 * Answers: "How do we compare distributions release-to-release?"
 */
export interface DistributionComparison {
  field: string;
  /** Statistical divergence metric (0 = identical, 1 = completely different) */
  divergence: number;
  /** Whether the difference is statistically significant */
  significant: boolean;
  baseline: {
    min?: number;
    max?: number;
    mean?: number;
    distribution?: Array<{ value: unknown; percentage: number }>;
  };
  current: {
    min?: number;
    max?: number;
    mean?: number;
    distribution?: Array<{ value: unknown; percentage: number }>;
  };
}

/**
 * Generation performance metrics
 */
export interface PerformanceMetrics {
  /** Total generation time in milliseconds */
  totalDurationMs: number;
  /** Records per second */
  recordsPerSecond: number;
  /** Time spent on constraint solving */
  constraintSolvingMs: number;
  /** Percentage of time spent on constraints */
  constraintSolvingPercentage: number;
  /** Memory usage if available */
  peakMemoryMb?: number;
}

/**
 * Complete generation report
 * Answers: "How do we prove this data is safe?"
 */
export interface GenerationReport {
  /** Report format version */
  version: '1.0';

  /** Report metadata */
  metadata: {
    reportId: string;
    generatedAt: string;
    generatorVersion: string;
    hostname?: string;
    username?: string;
  };

  /** Input information */
  input: {
    schemaFile?: string;
    schemaHash: string;
    configFile?: string;
    configHash?: string;
  };

  /** Synthetic data attestation */
  attestation: SyntheticDataAttestation;

  /** Generation summary */
  summary: {
    totalRecords: number;
    totalCollections: number;
    seed: number | null;
    constraintsSatisfied: number;
    constraintsTotal: number;
    constraintSatisfactionRate: number;
    warningsCount: number;
  };

  /** Per-collection statistics */
  collections: CollectionStatistics[];

  /** All warnings emitted during generation */
  warnings: VagueWarning[];

  /** Performance metrics */
  performance: PerformanceMetrics;

  /** Distribution comparisons (if baseline provided) */
  comparisons?: DistributionComparison[];
}

/**
 * Audit log entry for a single generation operation
 * Answers: "Who do we call when it breaks at 2am?" (via traceable logs)
 */
export interface AuditLogEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Operation type */
  operation: 'generate' | 'validate' | 'infer';
  /** Operation status */
  status: 'success' | 'warning' | 'error';
  /** Input file or source identifier */
  source: string;
  /** Schema hash for traceability */
  schemaHash: string;
  /** Seed used */
  seed: number | null;
  /** Record counts per collection */
  recordCounts: Record<string, number>;
  /** Constraint satisfaction summary */
  constraints: {
    satisfied: number;
    total: number;
  };
  /** Warning count by type */
  warningCounts: Record<string, number>;
  /** Duration in milliseconds */
  durationMs: number;
  /** Error message if status is 'error' */
  error?: string;
}

/**
 * Report format options
 */
export type ReportFormat = 'json' | 'html' | 'markdown';

/**
 * Report generation options
 */
export interface ReportOptions {
  /** Output formats to generate */
  formats?: ReportFormat[];
  /** Include field-level statistics */
  includeFieldStats?: boolean;
  /** Include value distributions (top N) */
  includeDistributions?: boolean;
  /** Number of top values to include in distributions */
  distributionTopN?: number;
  /** Baseline report for comparison */
  baseline?: GenerationReport;
  /** Include charts in HTML report */
  includeCharts?: boolean;
}

/**
 * Configuration for audit logging
 */
export interface AuditLogConfig {
  /** Path to audit log file (JSONL format) */
  path: string;
  /** Log level: 'operation' logs per generation, 'detail' logs per record */
  level: 'operation' | 'detail';
  /** Whether to include actual generated values (security consideration) */
  includeValues: boolean;
}
