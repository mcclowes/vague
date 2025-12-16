import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  setSeed,
  getSeed,
  random,
  randomInt,
  randomFloat,
  randomChoice,
  randomBool,
  gaussian,
  exponential,
  lognormal,
  poisson,
  beta,
} from './random.js';

describe('Random module', () => {
  beforeEach(() => {
    // Reset to unseeded state before each test
    setSeed(null);
  });

  afterEach(() => {
    // Clean up after each test
    setSeed(null);
  });

  describe('seed management', () => {
    it('returns null seed by default', () => {
      expect(getSeed()).toBe(null);
    });

    it('sets and gets seed correctly', () => {
      setSeed(12345);
      expect(getSeed()).toBe(12345);
    });

    it('resets to null with null seed', () => {
      setSeed(12345);
      setSeed(null);
      expect(getSeed()).toBe(null);
    });

    it('accepts zero as valid seed', () => {
      setSeed(0);
      expect(getSeed()).toBe(0);
    });

    it('accepts negative seed', () => {
      setSeed(-999);
      expect(getSeed()).toBe(-999);
    });
  });

  describe('determinism with seed', () => {
    it('produces same sequence with same seed', () => {
      setSeed(42);
      const seq1 = [random(), random(), random()];

      setSeed(42);
      const seq2 = [random(), random(), random()];

      expect(seq1).toEqual(seq2);
    });

    it('produces different sequence with different seed', () => {
      setSeed(42);
      const seq1 = [random(), random(), random()];

      setSeed(99);
      const seq2 = [random(), random(), random()];

      expect(seq1).not.toEqual(seq2);
    });

    it('randomInt is deterministic with seed', () => {
      setSeed(123);
      const seq1 = [randomInt(1, 100), randomInt(1, 100), randomInt(1, 100)];

      setSeed(123);
      const seq2 = [randomInt(1, 100), randomInt(1, 100), randomInt(1, 100)];

      expect(seq1).toEqual(seq2);
    });

    it('randomFloat is deterministic with seed', () => {
      setSeed(456);
      const seq1 = [randomFloat(0, 10), randomFloat(0, 10)];

      setSeed(456);
      const seq2 = [randomFloat(0, 10), randomFloat(0, 10)];

      expect(seq1).toEqual(seq2);
    });

    it('randomChoice is deterministic with seed', () => {
      const options = ['a', 'b', 'c', 'd', 'e'];

      setSeed(789);
      const seq1 = [
        randomChoice(options),
        randomChoice(options),
        randomChoice(options),
        randomChoice(options),
        randomChoice(options),
      ];

      setSeed(789);
      const seq2 = [
        randomChoice(options),
        randomChoice(options),
        randomChoice(options),
        randomChoice(options),
        randomChoice(options),
      ];

      expect(seq1).toEqual(seq2);
    });

    it('randomBool is deterministic with seed', () => {
      setSeed(111);
      const seq1 = [randomBool(), randomBool(), randomBool(), randomBool(), randomBool()];

      setSeed(111);
      const seq2 = [randomBool(), randomBool(), randomBool(), randomBool(), randomBool()];

      expect(seq1).toEqual(seq2);
    });
  });

  describe('random()', () => {
    it('returns values in [0, 1) range', () => {
      setSeed(42);
      for (let i = 0; i < 100; i++) {
        const val = random();
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      }
    });
  });

  describe('randomInt()', () => {
    it('returns values within specified range (inclusive)', () => {
      setSeed(42);
      for (let i = 0; i < 100; i++) {
        const val = randomInt(10, 20);
        expect(val).toBeGreaterThanOrEqual(10);
        expect(val).toBeLessThanOrEqual(20);
        expect(Number.isInteger(val)).toBe(true);
      }
    });

    it('handles single value range', () => {
      setSeed(42);
      for (let i = 0; i < 10; i++) {
        expect(randomInt(5, 5)).toBe(5);
      }
    });

    it('handles negative range', () => {
      setSeed(42);
      for (let i = 0; i < 100; i++) {
        const val = randomInt(-100, -50);
        expect(val).toBeGreaterThanOrEqual(-100);
        expect(val).toBeLessThanOrEqual(-50);
      }
    });

    it('handles range crossing zero', () => {
      setSeed(42);
      for (let i = 0; i < 100; i++) {
        const val = randomInt(-10, 10);
        expect(val).toBeGreaterThanOrEqual(-10);
        expect(val).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('randomFloat()', () => {
    it('returns values within specified range', () => {
      setSeed(42);
      for (let i = 0; i < 100; i++) {
        const val = randomFloat(5.5, 10.5);
        expect(val).toBeGreaterThanOrEqual(5.5);
        expect(val).toBeLessThanOrEqual(10.5);
      }
    });

    it('handles negative range', () => {
      setSeed(42);
      for (let i = 0; i < 100; i++) {
        const val = randomFloat(-100.5, -50.5);
        expect(val).toBeGreaterThanOrEqual(-100.5);
        expect(val).toBeLessThanOrEqual(-50.5);
      }
    });
  });

  describe('randomChoice()', () => {
    it('returns element from array', () => {
      setSeed(42);
      const options = ['apple', 'banana', 'cherry'];
      for (let i = 0; i < 50; i++) {
        const choice = randomChoice(options);
        expect(options).toContain(choice);
      }
    });

    it('returns single element from single-element array', () => {
      setSeed(42);
      expect(randomChoice(['only'])).toBe('only');
    });

    it('works with numeric arrays', () => {
      setSeed(42);
      const nums = [1, 2, 3, 4, 5];
      for (let i = 0; i < 50; i++) {
        expect(nums).toContain(randomChoice(nums));
      }
    });

    it('eventually selects all options (coverage)', () => {
      setSeed(42);
      const options = ['a', 'b', 'c'];
      const selected = new Set<string>();

      for (let i = 0; i < 100; i++) {
        selected.add(randomChoice(options));
        if (selected.size === options.length) break;
      }

      expect(selected.size).toBe(options.length);
    });
  });

  describe('randomBool()', () => {
    it('returns boolean values', () => {
      setSeed(42);
      for (let i = 0; i < 50; i++) {
        const val = randomBool();
        expect(typeof val).toBe('boolean');
      }
    });

    it('respects probability parameter', () => {
      setSeed(42);
      let trueCount = 0;
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        if (randomBool(0.8)) trueCount++;
      }

      // With p=0.8, expect ~80% true (with some variance)
      const ratio = trueCount / iterations;
      expect(ratio).toBeGreaterThan(0.7);
      expect(ratio).toBeLessThan(0.9);
    });

    it('probability 0 always returns false', () => {
      setSeed(42);
      for (let i = 0; i < 20; i++) {
        expect(randomBool(0)).toBe(false);
      }
    });

    it('probability 1 always returns true', () => {
      setSeed(42);
      for (let i = 0; i < 20; i++) {
        expect(randomBool(1)).toBe(true);
      }
    });
  });

  describe('gaussian()', () => {
    it('generates values around the mean', () => {
      setSeed(42);
      const samples: number[] = [];
      const mean = 50;
      const stddev = 10;

      for (let i = 0; i < 500; i++) {
        samples.push(gaussian(mean, stddev));
      }

      const sampleMean = samples.reduce((a, b) => a + b, 0) / samples.length;
      // Sample mean should be close to population mean
      expect(Math.abs(sampleMean - mean)).toBeLessThan(2);
    });

    it('respects min/max bounds', () => {
      setSeed(42);
      for (let i = 0; i < 200; i++) {
        const val = gaussian(50, 20, 30, 70);
        expect(val).toBeGreaterThanOrEqual(30);
        expect(val).toBeLessThanOrEqual(70);
      }
    });

    it('is deterministic with seed', () => {
      setSeed(123);
      const seq1 = [gaussian(0, 1), gaussian(0, 1), gaussian(0, 1)];

      setSeed(123);
      const seq2 = [gaussian(0, 1), gaussian(0, 1), gaussian(0, 1)];

      expect(seq1).toEqual(seq2);
    });

    it('handles narrow bounds (clamps tightly)', () => {
      setSeed(42);
      for (let i = 0; i < 50; i++) {
        const val = gaussian(50, 100, 49, 51);
        expect(val).toBeGreaterThanOrEqual(49);
        expect(val).toBeLessThanOrEqual(51);
      }
    });
  });

  describe('exponential()', () => {
    it('generates non-negative values by default', () => {
      setSeed(42);
      for (let i = 0; i < 100; i++) {
        const val = exponential(1);
        expect(val).toBeGreaterThanOrEqual(0);
      }
    });

    it('respects min parameter (shift)', () => {
      setSeed(42);
      for (let i = 0; i < 100; i++) {
        const val = exponential(1, 10);
        expect(val).toBeGreaterThanOrEqual(10);
      }
    });

    it('respects max parameter (clamp)', () => {
      setSeed(42);
      for (let i = 0; i < 100; i++) {
        const val = exponential(0.5, 0, 10);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(10);
      }
    });

    it('higher rate concentrates values near min', () => {
      setSeed(42);
      const highRate = [];
      const lowRate = [];

      for (let i = 0; i < 500; i++) {
        highRate.push(exponential(2, 0, 100));
      }

      setSeed(42);
      for (let i = 0; i < 500; i++) {
        lowRate.push(exponential(0.2, 0, 100));
      }

      const highMean = highRate.reduce((a, b) => a + b, 0) / highRate.length;
      const lowMean = lowRate.reduce((a, b) => a + b, 0) / lowRate.length;

      // Higher rate should produce smaller mean
      expect(highMean).toBeLessThan(lowMean);
    });

    it('is deterministic with seed', () => {
      setSeed(999);
      const seq1 = [exponential(1), exponential(1), exponential(1)];

      setSeed(999);
      const seq2 = [exponential(1), exponential(1), exponential(1)];

      expect(seq1).toEqual(seq2);
    });
  });

  describe('lognormal()', () => {
    it('generates positive values', () => {
      setSeed(42);
      for (let i = 0; i < 100; i++) {
        const val = lognormal(0, 1);
        expect(val).toBeGreaterThan(0);
      }
    });

    it('respects min/max bounds', () => {
      setSeed(42);
      for (let i = 0; i < 100; i++) {
        const val = lognormal(2, 0.5, 5, 20);
        expect(val).toBeGreaterThanOrEqual(5);
        expect(val).toBeLessThanOrEqual(20);
      }
    });

    it('is deterministic with seed', () => {
      setSeed(555);
      const seq1 = [lognormal(1, 0.5), lognormal(1, 0.5)];

      setSeed(555);
      const seq2 = [lognormal(1, 0.5), lognormal(1, 0.5)];

      expect(seq1).toEqual(seq2);
    });
  });

  describe('poisson()', () => {
    it('generates non-negative integers', () => {
      setSeed(42);
      for (let i = 0; i < 100; i++) {
        const val = poisson(5);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(val)).toBe(true);
      }
    });

    it('mean is close to lambda (small lambda)', () => {
      setSeed(42);
      const samples: number[] = [];
      const lambda = 5;

      for (let i = 0; i < 1000; i++) {
        samples.push(poisson(lambda));
      }

      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      expect(Math.abs(mean - lambda)).toBeLessThan(0.5);
    });

    it('uses normal approximation for large lambda', () => {
      setSeed(42);
      const samples: number[] = [];
      const lambda = 50; // Large lambda triggers normal approximation

      for (let i = 0; i < 500; i++) {
        samples.push(poisson(lambda));
      }

      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      expect(Math.abs(mean - lambda)).toBeLessThan(3);
    });

    it('is deterministic with seed', () => {
      setSeed(333);
      const seq1 = [poisson(3), poisson(3), poisson(3)];

      setSeed(333);
      const seq2 = [poisson(3), poisson(3), poisson(3)];

      expect(seq1).toEqual(seq2);
    });
  });

  describe('beta()', () => {
    it('generates values in [0, 1] range', () => {
      setSeed(42);
      for (let i = 0; i < 100; i++) {
        const val = beta(2, 5);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });

    it('alpha=1, beta=1 produces uniform-like distribution', () => {
      setSeed(42);
      const samples: number[] = [];

      for (let i = 0; i < 500; i++) {
        samples.push(beta(1, 1));
      }

      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      // For beta(1,1), mean should be ~0.5
      expect(Math.abs(mean - 0.5)).toBeLessThan(0.1);
    });

    it('alpha > beta skews toward 1', () => {
      setSeed(42);
      const samples: number[] = [];

      for (let i = 0; i < 500; i++) {
        samples.push(beta(5, 1));
      }

      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      // For beta(5,1), mean is 5/(5+1) = 0.833
      expect(mean).toBeGreaterThan(0.7);
    });

    it('alpha < beta skews toward 0', () => {
      setSeed(42);
      const samples: number[] = [];

      for (let i = 0; i < 500; i++) {
        samples.push(beta(1, 5));
      }

      const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      // For beta(1,5), mean is 1/(1+5) = 0.167
      expect(mean).toBeLessThan(0.3);
    });

    it('handles shape parameters < 1', () => {
      setSeed(42);
      for (let i = 0; i < 50; i++) {
        const val = beta(0.5, 0.5);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    });

    it('is deterministic with seed', () => {
      setSeed(777);
      const seq1 = [beta(2, 3), beta(2, 3), beta(2, 3)];

      setSeed(777);
      const seq2 = [beta(2, 3), beta(2, 3), beta(2, 3)];

      expect(seq1).toEqual(seq2);
    });
  });
});
