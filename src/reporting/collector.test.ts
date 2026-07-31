import { describe, it, expect } from 'vitest';
import {
  hashString,
  calcFieldStatistics,
  calcCollectionStatistics,
  compareReports,
  generateReport,
  createAuditLogEntry,
  formatAuditLogEntry,
} from './collector.js';
import type { GenerationReport } from './types.js';
import type { VagueWarning } from '../warnings.js';

describe('Reporting', () => {
  describe('hashString', () => {
    it('generates consistent hashes', () => {
      const hash1 = hashString('test content');
      const hash2 = hashString('test content');
      expect(hash1).toBe(hash2);
    });

    it('generates different hashes for different content', () => {
      const hash1 = hashString('content a');
      const hash2 = hashString('content b');
      expect(hash1).not.toBe(hash2);
    });

    it('returns a 16-character hex string', () => {
      const hash = hashString('test');
      expect(hash).toMatch(/^[a-f0-9]{16}$/);
    });
  });

  describe('calcFieldStatistics', () => {
    it('calculates basic statistics for numbers', () => {
      const values = [10, 20, 30, 40, 50];
      const stats = calcFieldStatistics('amount', values);

      expect(stats.name).toBe('amount');
      expect(stats.type).toBe('number');
      expect(stats.count).toBe(5);
      expect(stats.nullCount).toBe(0);
      expect(stats.uniqueCount).toBe(5);
      expect(stats.cardinality).toBe(100);
      expect(stats.numeric).toBeDefined();
      expect(stats.numeric!.min).toBe(10);
      expect(stats.numeric!.max).toBe(50);
      expect(stats.numeric!.mean).toBe(30);
    });

    it('calculates statistics for strings', () => {
      const values = ['a', 'bb', 'ccc'];
      const stats = calcFieldStatistics('name', values);

      expect(stats.type).toBe('string');
      expect(stats.string).toBeDefined();
      expect(stats.string!.minLength).toBe(1);
      expect(stats.string!.maxLength).toBe(3);
      expect(stats.string!.avgLength).toBe(2);
    });

    it('handles null values', () => {
      const values = [1, null, 3, null, 5];
      const stats = calcFieldStatistics('value', values);

      expect(stats.count).toBe(3);
      expect(stats.nullCount).toBe(2);
      expect(stats.nullPercentage).toBe(40);
    });

    it('calculates value distribution', () => {
      const values = ['a', 'a', 'b', 'a', 'c'];
      const stats = calcFieldStatistics('category', values);

      expect(stats.distribution).toBeDefined();
      expect(stats.distribution![0]).toEqual({
        value: 'a',
        count: 3,
        percentage: 60,
      });
    });

    it('handles empty arrays', () => {
      const stats = calcFieldStatistics('empty', []);

      expect(stats.count).toBe(0);
      expect(stats.nullCount).toBe(0);
      expect(stats.uniqueCount).toBe(0);
    });
  });

  describe('calcCollectionStatistics', () => {
    it('calculates statistics for a collection of records', () => {
      const records = [
        { id: 1, name: 'Alice', score: 85 },
        { id: 2, name: 'Bob', score: 90 },
        { id: 3, name: 'Charlie', score: 78 },
      ];

      const stats = calcCollectionStatistics('users', 'User', records);

      expect(stats.name).toBe('users');
      expect(stats.schemaName).toBe('User');
      expect(stats.recordCount).toBe(3);
      expect(stats.fields).toHaveLength(3);
      expect(stats.fields.map((f) => f.name)).toContain('id');
      expect(stats.fields.map((f) => f.name)).toContain('name');
      expect(stats.fields.map((f) => f.name)).toContain('score');
    });

    it('respects includeFieldStats option', () => {
      const records = [{ id: 1 }];
      const stats = calcCollectionStatistics('items', 'Item', records, {
        includeFieldStats: false,
      });

      expect(stats.fields).toHaveLength(0);
    });
  });

  describe('generateReport', () => {
    it('generates a complete report', () => {
      const data = {
        invoices: [
          { id: 1, amount: 100, status: 'paid' },
          { id: 2, amount: 200, status: 'draft' },
        ],
      };
      const schema = 'schema Invoice { id: int }';
      const warnings: VagueWarning[] = [];

      const report = generateReport(data, schema, warnings, { seed: 42 });

      expect(report.version).toBe('1.0');
      expect(report.metadata.reportId).toBeDefined();
      expect(report.attestation.generator).toContain('vague');
      expect(report.attestation.seed).toBe(42);
      expect(report.summary.totalRecords).toBe(2);
      expect(report.summary.totalCollections).toBe(1);
      expect(report.collections).toHaveLength(1);
      expect(report.warnings).toHaveLength(0);
    });

    it('includes attestation statement', () => {
      const report = generateReport({ items: [] }, 'test', [], { seed: 123 });

      expect(report.attestation.statement).toContain('synthetically generated');
      expect(report.attestation.statement).toContain('Seed: 123');
    });

    it('includes performance metrics', () => {
      const startTime = Date.now() - 100;
      const report = generateReport({ items: [{}, {}] }, 'test', [], {
        startTime,
        endTime: Date.now(),
      });

      expect(report.performance.totalDurationMs).toBeGreaterThan(0);
      expect(report.performance.recordsPerSecond).toBeGreaterThan(0);
    });
  });

  describe('compareReports', () => {
    const createMockReport = (overrides: Partial<GenerationReport> = {}): GenerationReport => ({
      version: '1.0',
      metadata: {
        reportId: 'test-id',
        generatedAt: new Date().toISOString(),
        generatorVersion: '0.1.0',
      },
      input: {
        schemaHash: 'abc123',
      },
      attestation: {
        generatedAt: new Date().toISOString(),
        generator: 'vague',
        seed: null,
        schemaHash: 'abc123',
        statement: 'test',
      },
      summary: {
        totalRecords: 10,
        totalCollections: 1,
        seed: null,
        constraintsSatisfied: 10,
        constraintsTotal: 10,
        constraintSatisfactionRate: 100,
        warningsCount: 0,
      },
      collections: [
        {
          name: 'items',
          schemaName: 'Item',
          recordCount: 10,
          fields: [
            {
              name: 'status',
              type: 'string',
              count: 10,
              nullCount: 0,
              nullPercentage: 0,
              uniqueCount: 3,
              cardinality: 30,
              distribution: [
                { value: 'active', count: 5, percentage: 50 },
                { value: 'inactive', count: 3, percentage: 30 },
                { value: 'pending', count: 2, percentage: 20 },
              ],
            },
          ],
          constraints: { total: 0, satisfied: 0, details: [] },
        },
      ],
      warnings: [],
      performance: {
        totalDurationMs: 100,
        recordsPerSecond: 100,
        constraintSolvingMs: 0,
        constraintSolvingPercentage: 0,
      },
      ...overrides,
    });

    it('detects distribution changes between reports', () => {
      const baseline = createMockReport();
      const current = createMockReport({
        collections: [
          {
            ...baseline.collections[0],
            fields: [
              {
                ...baseline.collections[0].fields[0],
                distribution: [
                  { value: 'active', count: 2, percentage: 20 },
                  { value: 'inactive', count: 6, percentage: 60 },
                  { value: 'pending', count: 2, percentage: 20 },
                ],
              },
            ],
          },
        ],
      });

      const comparisons = compareReports(baseline, current);

      expect(comparisons).toHaveLength(1);
      expect(comparisons[0].field).toBe('items.status');
      expect(comparisons[0].divergence).toBeGreaterThan(0);
    });

    it('returns empty array for identical reports', () => {
      const report = createMockReport();
      const comparisons = compareReports(report, report);

      // Same distributions should have very low divergence
      expect(comparisons.every((c) => c.divergence === 0 || !c.significant)).toBe(true);
    });
  });

  describe('createAuditLogEntry', () => {
    it('creates a valid audit log entry', () => {
      const data = {
        invoices: [{}, {}, {}],
        payments: [{}, {}],
      };
      const warnings: VagueWarning[] = [];

      const entry = createAuditLogEntry(
        'generate',
        'success',
        'test.vague',
        'abc123',
        data,
        warnings,
        100,
        42
      );

      expect(entry.operation).toBe('generate');
      expect(entry.status).toBe('success');
      expect(entry.source).toBe('test.vague');
      expect(entry.schemaHash).toBe('abc123');
      expect(entry.seed).toBe(42);
      expect(entry.recordCounts).toEqual({ invoices: 3, payments: 2 });
      expect(entry.durationMs).toBe(100);
    });

    it('counts warnings by type', () => {
      const warnings: VagueWarning[] = [
        { type: 'UniqueValueExhaustion', message: 'test' },
        { type: 'UniqueValueExhaustion', message: 'test2' },
        { type: 'ConstraintRetryLimit', message: 'test3' },
      ];

      const entry = createAuditLogEntry(
        'generate',
        'warning',
        'test.vague',
        'abc',
        {},
        warnings,
        50
      );

      expect(entry.warningCounts).toEqual({
        UniqueValueExhaustion: 2,
        ConstraintRetryLimit: 1,
      });
    });

    it('includes error message when status is error', () => {
      const entry = createAuditLogEntry(
        'generate',
        'error',
        'test.vague',
        'abc',
        {},
        [],
        50,
        null,
        'Something went wrong'
      );

      expect(entry.status).toBe('error');
      expect(entry.error).toBe('Something went wrong');
    });
  });

  describe('formatAuditLogEntry', () => {
    it('formats entry as single-line JSON', () => {
      const entry = createAuditLogEntry('generate', 'success', 'test.vague', 'abc', {}, [], 100);

      const formatted = formatAuditLogEntry(entry);

      expect(formatted).not.toContain('\n');
      const parsed = JSON.parse(formatted);
      expect(parsed.operation).toBe('generate');
    });
  });
});
