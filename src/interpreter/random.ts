/**
 * Seeded random number generator using a Linear Congruential Generator (LCG).
 * This provides deterministic "random" numbers when given a seed.
 *
 * ## Thread Safety
 *
 * The SeededRandom class is instance-based and thread-safe when each thread
 * uses its own instance. The global functions (random, setSeed, etc.) use a
 * shared global instance for backward compatibility but are NOT thread-safe.
 *
 * For concurrent generation, create separate SeededRandom instances:
 * ```typescript
 * const rng1 = new SeededRandom(42);
 * const rng2 = new SeededRandom(123);
 * // Use rng1.random() and rng2.random() independently
 * ```
 */

// LCG constants (same as glibc for cross-platform reproducibility)
const LCG_A = 1103515245;
const LCG_C = 12345;
const LCG_M = 2 ** 31;

/**
 * Instance-based seeded random number generator.
 * Use this class for thread-safe random number generation.
 */
export class SeededRandom {
  private seed: number | null;
  private state: number;

  /**
   * Create a new random number generator.
   * @param seed - Optional seed for deterministic output. If null/undefined, uses Math.random().
   */
  constructor(seed?: number | null) {
    this.seed = seed ?? null;
    this.state = seed ?? 0;
  }

  /**
   * Set or reset the seed.
   * @param seed - The seed value, or null for true randomness.
   */
  setSeed(seed: number | null): void {
    this.seed = seed;
    if (seed !== null) {
      this.state = seed;
    }
  }

  /**
   * Get the current seed (null if using true randomness).
   */
  getSeed(): number | null {
    return this.seed;
  }

  /**
   * Generate a random number between 0 (inclusive) and 1 (exclusive).
   */
  random(): number {
    if (this.seed === null) {
      return Math.random();
    }

    // LCG algorithm
    this.state = (LCG_A * this.state + LCG_C) % LCG_M;
    return this.state / LCG_M;
  }

  /**
   * Generate a random integer between min (inclusive) and max (inclusive).
   */
  randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Generate a random float between min and max.
   */
  randomFloat(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }

  /**
   * Pick a random element from an array.
   */
  randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(this.random() * arr.length)];
  }

  /**
   * Return true with the given probability (0-1).
   */
  randomBool(probability = 0.5): boolean {
    return this.random() < probability;
  }

  // ============================================
  // Distribution functions
  // ============================================

  /**
   * Generate a random number from a Gaussian (normal) distribution.
   * Uses Box-Muller transform.
   */
  gaussian(mean: number, stddev: number, min?: number, max?: number): number {
    let u1 = this.random();
    const u2 = this.random();

    // Avoid log(0)
    while (u1 === 0) u1 = this.random();

    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    let result = mean + z * stddev;

    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);

    return result;
  }

  /**
   * Generate a random number from an exponential distribution.
   */
  exponential(rate: number, min = 0, max?: number): number {
    let u = this.random();
    while (u === 0) u = this.random();

    let result = min - Math.log(u) / rate;
    if (max !== undefined) result = Math.min(max, result);

    return result;
  }

  /**
   * Generate a random number from a log-normal distribution.
   */
  lognormal(mu: number, sigma: number, min?: number, max?: number): number {
    const normal = this.gaussian(mu, sigma);
    let result = Math.exp(normal);

    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);

    return result;
  }

  /**
   * Generate a random number from a Poisson distribution.
   */
  poisson(lambda: number): number {
    if (lambda < 30) {
      const L = Math.exp(-lambda);
      let k = 0;
      let p = 1;

      do {
        k++;
        p *= this.random();
      } while (p > L);

      return k - 1;
    }

    return Math.max(0, Math.round(this.gaussian(lambda, Math.sqrt(lambda))));
  }

  /**
   * Generate a random number from a beta distribution.
   */
  beta(alpha: number, betaParam: number): number {
    const gammaA = this.gammaVariate(alpha);
    const gammaB = this.gammaVariate(betaParam);
    return gammaA / (gammaA + gammaB);
  }

  /**
   * Generate a gamma-distributed random variable.
   */
  private gammaVariate(shape: number): number {
    if (shape < 1) {
      return this.gammaVariate(1 + shape) * Math.pow(this.random(), 1 / shape);
    }

    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);

    while (true) {
      let x: number, v: number;
      do {
        x = this.gaussian(0, 1);
        v = 1 + c * x;
      } while (v <= 0);

      v = v * v * v;
      const u = this.random();

      if (u < 1 - 0.0331 * (x * x) * (x * x)) {
        return d * v;
      }

      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
        return d * v;
      }
    }
  }

  /**
   * Create a copy of this random generator with the same state.
   * Useful for branching random sequences.
   */
  clone(): SeededRandom {
    const copy = new SeededRandom(this.seed);
    copy.state = this.state;
    return copy;
  }
}

// ============================================
// Global instance for backward compatibility
// ============================================

/**
 * Global random instance used by the module-level functions.
 * For thread-safe usage, create your own SeededRandom instance instead.
 */
const globalRandom = new SeededRandom();

/**
 * Set the seed for the global random generator.
 * @deprecated For thread-safe usage, create a SeededRandom instance instead.
 */
export function setSeed(seed: number | null): void {
  globalRandom.setSeed(seed);
}

/**
 * Get the current seed from the global random generator.
 * @deprecated For thread-safe usage, create a SeededRandom instance instead.
 */
export function getSeed(): number | null {
  return globalRandom.getSeed();
}

/**
 * Generate a random number using the global generator.
 * @deprecated For thread-safe usage, create a SeededRandom instance instead.
 */
export function random(): number {
  return globalRandom.random();
}

/**
 * Generate a random integer using the global generator.
 */
export function randomInt(min: number, max: number): number {
  return globalRandom.randomInt(min, max);
}

/**
 * Generate a random float using the global generator.
 */
export function randomFloat(min: number, max: number): number {
  return globalRandom.randomFloat(min, max);
}

/**
 * Pick a random element from an array using the global generator.
 */
export function randomChoice<T>(arr: T[]): T {
  return globalRandom.randomChoice(arr);
}

/**
 * Return true with the given probability using the global generator.
 */
export function randomBool(probability = 0.5): boolean {
  return globalRandom.randomBool(probability);
}

/**
 * Generate a Gaussian random number using the global generator.
 */
export function gaussian(mean: number, stddev: number, min?: number, max?: number): number {
  return globalRandom.gaussian(mean, stddev, min, max);
}

/**
 * Generate an exponential random number using the global generator.
 */
export function exponential(rate: number, min = 0, max?: number): number {
  return globalRandom.exponential(rate, min, max);
}

/**
 * Generate a log-normal random number using the global generator.
 */
export function lognormal(mu: number, sigma: number, min?: number, max?: number): number {
  return globalRandom.lognormal(mu, sigma, min, max);
}

/**
 * Generate a Poisson random number using the global generator.
 */
export function poisson(lambda: number): number {
  return globalRandom.poisson(lambda);
}

/**
 * Generate a beta random number using the global generator.
 */
export function beta(alpha: number, betaParam: number): number {
  return globalRandom.beta(alpha, betaParam);
}

/**
 * Get the global random instance.
 * Useful for passing to functions that need a SeededRandom.
 */
export function getGlobalRandom(): SeededRandom {
  return globalRandom;
}
