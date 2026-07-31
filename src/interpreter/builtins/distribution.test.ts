import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { distributionFunctions } from './distribution.js';
import { setSeed } from '../random.js';
import type { GeneratorContext } from '../context.js';

// Mock context for testing
const mockContext = {} as GeneratorContext;

// Helper to generate samples for statistical tests
function generateSamples(
  fn: (args: unknown[], ctx: GeneratorContext) => number,
  args: unknown[],
  count: number
): number[] {
  const samples: number[] = [];
  for (let i = 0; i < count; i++) {
    samples.push(fn(args, mockContext));
  }
  return samples;
}

// Helper to calculate mean
function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// Helper to calculate standard deviation
function stddev(values: number[]): number {
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / values.length;
  return Math.sqrt(variance);
}

describe('Distribution Functions', () => {
  beforeEach(() => {
    setSeed(12345); // Use fixed seed for reproducibility
  });

  afterEach(() => {
    setSeed(null);
  });

  describe('gaussian', () => {
    it('generates values with correct mean and stddev', () => {
      const samples = generateSamples(distributionFunctions.gaussian, [100, 15], 1000);
      const sampleMean = mean(samples);
      const sampleStddev = stddev(samples);

      // Allow for statistical variation
      expect(sampleMean).toBeGreaterThan(95);
      expect(sampleMean).toBeLessThan(105);
      expect(sampleStddev).toBeGreaterThan(12);
      expect(sampleStddev).toBeLessThan(18);
    });

    it('uses default mean=0 and stddev=1', () => {
      const samples = generateSamples(distributionFunctions.gaussian, [], 1000);
      const sampleMean = mean(samples);
      const sampleStddev = stddev(samples);

      expect(sampleMean).toBeGreaterThan(-0.2);
      expect(sampleMean).toBeLessThan(0.2);
      expect(sampleStddev).toBeGreaterThan(0.8);
      expect(sampleStddev).toBeLessThan(1.2);
    });

    it('respects min bound', () => {
      const samples = generateSamples(distributionFunctions.gaussian, [0, 1, 0], 100);
      expect(samples.every((s) => s >= 0)).toBe(true);
    });

    it('respects max bound', () => {
      const samples = generateSamples(distributionFunctions.gaussian, [0, 1, undefined, 0], 100);
      expect(samples.every((s) => s <= 0)).toBe(true);
    });

    it('respects both min and max bounds', () => {
      const samples = generateSamples(distributionFunctions.gaussian, [50, 20, 40, 60], 100);
      expect(samples.every((s) => s >= 40 && s <= 60)).toBe(true);
    });

    it('produces deterministic results with seed', () => {
      setSeed(999);
      const samples1 = generateSamples(distributionFunctions.gaussian, [0, 1], 10);

      setSeed(999);
      const samples2 = generateSamples(distributionFunctions.gaussian, [0, 1], 10);

      expect(samples1).toEqual(samples2);
    });
  });

  describe('normal (alias for gaussian)', () => {
    it('behaves the same as gaussian', () => {
      setSeed(555);
      const gaussianSamples = generateSamples(distributionFunctions.gaussian, [50, 10], 10);

      setSeed(555);
      const normalSamples = generateSamples(distributionFunctions.normal, [50, 10], 10);

      expect(normalSamples).toEqual(gaussianSamples);
    });

    it('uses default parameters', () => {
      const samples = generateSamples(distributionFunctions.normal, [], 100);
      expect(samples.every((s) => typeof s === 'number' && !isNaN(s))).toBe(true);
    });
  });

  describe('exponential', () => {
    it('generates positive values by default', () => {
      const samples = generateSamples(distributionFunctions.exponential, [1], 100);
      expect(samples.every((s) => s >= 0)).toBe(true);
    });

    it('rate parameter affects distribution', () => {
      // Higher rate = smaller values on average
      const highRateSamples = generateSamples(distributionFunctions.exponential, [5], 1000);
      const lowRateSamples = generateSamples(distributionFunctions.exponential, [0.5], 1000);

      expect(mean(highRateSamples)).toBeLessThan(mean(lowRateSamples));
    });

    it('uses default rate=1', () => {
      const samples = generateSamples(distributionFunctions.exponential, [], 1000);
      const sampleMean = mean(samples);

      // Mean of exponential(1) is 1
      expect(sampleMean).toBeGreaterThan(0.8);
      expect(sampleMean).toBeLessThan(1.2);
    });

    it('respects min bound', () => {
      const samples = generateSamples(distributionFunctions.exponential, [1, 5], 100);
      expect(samples.every((s) => s >= 5)).toBe(true);
    });

    it('respects max bound', () => {
      const samples = generateSamples(distributionFunctions.exponential, [1, 0, 2], 100);
      expect(samples.every((s) => s <= 2)).toBe(true);
    });

    it('produces deterministic results with seed', () => {
      setSeed(777);
      const samples1 = generateSamples(distributionFunctions.exponential, [2], 10);

      setSeed(777);
      const samples2 = generateSamples(distributionFunctions.exponential, [2], 10);

      expect(samples1).toEqual(samples2);
    });
  });

  describe('lognormal', () => {
    it('generates positive values', () => {
      const samples = generateSamples(distributionFunctions.lognormal, [0, 1], 100);
      expect(samples.every((s) => s > 0)).toBe(true);
    });

    it('uses default mu=0 and sigma=1', () => {
      const samples = generateSamples(distributionFunctions.lognormal, [], 100);
      expect(samples.every((s) => s > 0)).toBe(true);
    });

    it('mu parameter shifts the distribution', () => {
      const lowMuSamples = generateSamples(distributionFunctions.lognormal, [0, 0.5], 1000);
      const highMuSamples = generateSamples(distributionFunctions.lognormal, [2, 0.5], 1000);

      expect(mean(lowMuSamples)).toBeLessThan(mean(highMuSamples));
    });

    it('respects min bound', () => {
      const samples = generateSamples(distributionFunctions.lognormal, [0, 1, 1], 100);
      expect(samples.every((s) => s >= 1)).toBe(true);
    });

    it('respects max bound', () => {
      const samples = generateSamples(distributionFunctions.lognormal, [0, 0.5, undefined, 5], 100);
      expect(samples.every((s) => s <= 5)).toBe(true);
    });

    it('produces deterministic results with seed', () => {
      setSeed(888);
      const samples1 = generateSamples(distributionFunctions.lognormal, [1, 0.5], 10);

      setSeed(888);
      const samples2 = generateSamples(distributionFunctions.lognormal, [1, 0.5], 10);

      expect(samples1).toEqual(samples2);
    });
  });

  describe('poisson', () => {
    it('generates non-negative integers', () => {
      const samples = generateSamples(distributionFunctions.poisson, [5], 100);
      expect(samples.every((s) => s >= 0 && Number.isInteger(s))).toBe(true);
    });

    it('uses default lambda=1', () => {
      const samples = generateSamples(distributionFunctions.poisson, [], 1000);
      const sampleMean = mean(samples);

      // Mean of poisson is lambda
      expect(sampleMean).toBeGreaterThan(0.8);
      expect(sampleMean).toBeLessThan(1.2);
    });

    it('lambda parameter affects mean', () => {
      const samples = generateSamples(distributionFunctions.poisson, [10], 1000);
      const sampleMean = mean(samples);

      // Mean should be close to lambda
      expect(sampleMean).toBeGreaterThan(9);
      expect(sampleMean).toBeLessThan(11);
    });

    it('handles small lambda', () => {
      const samples = generateSamples(distributionFunctions.poisson, [0.5], 100);
      expect(samples.every((s) => s >= 0 && Number.isInteger(s))).toBe(true);
    });

    it('handles large lambda', () => {
      const samples = generateSamples(distributionFunctions.poisson, [100], 100);
      const sampleMean = mean(samples);
      expect(sampleMean).toBeGreaterThan(90);
      expect(sampleMean).toBeLessThan(110);
    });

    it('produces deterministic results with seed', () => {
      setSeed(666);
      const samples1 = generateSamples(distributionFunctions.poisson, [7], 10);

      setSeed(666);
      const samples2 = generateSamples(distributionFunctions.poisson, [7], 10);

      expect(samples1).toEqual(samples2);
    });
  });

  describe('beta', () => {
    it('generates values in 0-1 range', () => {
      const samples = generateSamples(distributionFunctions.beta, [2, 5], 100);
      expect(samples.every((s) => s >= 0 && s <= 1)).toBe(true);
    });

    it('uses default alpha=1 and beta=1 (uniform)', () => {
      const samples = generateSamples(distributionFunctions.beta, [], 1000);
      const sampleMean = mean(samples);

      // Beta(1,1) is uniform on [0,1], mean = 0.5
      expect(sampleMean).toBeGreaterThan(0.4);
      expect(sampleMean).toBeLessThan(0.6);
    });

    it('alpha > beta skews right', () => {
      const samples = generateSamples(distributionFunctions.beta, [5, 2], 1000);
      const sampleMean = mean(samples);

      // Mean = alpha / (alpha + beta) = 5/7 ≈ 0.714
      expect(sampleMean).toBeGreaterThan(0.6);
      expect(sampleMean).toBeLessThan(0.8);
    });

    it('alpha < beta skews left', () => {
      const samples = generateSamples(distributionFunctions.beta, [2, 5], 1000);
      const sampleMean = mean(samples);

      // Mean = 2/7 ≈ 0.286
      expect(sampleMean).toBeGreaterThan(0.2);
      expect(sampleMean).toBeLessThan(0.4);
    });

    it('handles symmetric distribution', () => {
      const samples = generateSamples(distributionFunctions.beta, [5, 5], 1000);
      const sampleMean = mean(samples);

      // Mean = 0.5 for symmetric beta
      expect(sampleMean).toBeGreaterThan(0.45);
      expect(sampleMean).toBeLessThan(0.55);
    });

    it('produces deterministic results with seed', () => {
      setSeed(444);
      const samples1 = generateSamples(distributionFunctions.beta, [3, 3], 10);

      setSeed(444);
      const samples2 = generateSamples(distributionFunctions.beta, [3, 3], 10);

      expect(samples1).toEqual(samples2);
    });
  });

  describe('uniform', () => {
    it('generates values in specified range', () => {
      const samples = generateSamples(distributionFunctions.uniform, [10, 20], 100);
      expect(samples.every((s) => s >= 10 && s <= 20)).toBe(true);
    });

    it('uses default range 0-1', () => {
      const samples = generateSamples(distributionFunctions.uniform, [], 100);
      expect(samples.every((s) => s >= 0 && s <= 1)).toBe(true);
    });

    it('distribution is approximately uniform', () => {
      const samples = generateSamples(distributionFunctions.uniform, [0, 100], 1000);
      const sampleMean = mean(samples);

      // Mean should be close to 50
      expect(sampleMean).toBeGreaterThan(45);
      expect(sampleMean).toBeLessThan(55);
    });

    it('handles negative ranges', () => {
      const samples = generateSamples(distributionFunctions.uniform, [-10, -5], 100);
      expect(samples.every((s) => s >= -10 && s <= -5)).toBe(true);
    });

    it('handles range crossing zero', () => {
      const samples = generateSamples(distributionFunctions.uniform, [-5, 5], 100);
      expect(samples.every((s) => s >= -5 && s <= 5)).toBe(true);
    });

    it('produces deterministic results with seed', () => {
      setSeed(333);
      const samples1 = generateSamples(distributionFunctions.uniform, [1, 10], 10);

      setSeed(333);
      const samples2 = generateSamples(distributionFunctions.uniform, [1, 10], 10);

      expect(samples1).toEqual(samples2);
    });
  });
});
