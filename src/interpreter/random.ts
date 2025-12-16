/**
 * Seeded random number generator using a Linear Congruential Generator (LCG).
 * This provides deterministic "random" numbers when given a seed.
 *
 * When no seed is provided, uses Math.random() for true randomness.
 */

// Global state for the seeded RNG
let currentSeed: number | null = null;
let state: number = 0;

// LCG constants (same as glibc)
const a = 1103515245;
const c = 12345;
const m = 2 ** 31;

/**
 * Set the seed for reproducible random number generation.
 * Pass null to reset to true randomness.
 */
export function setSeed(seed: number | null): void {
  currentSeed = seed;
  if (seed !== null) {
    state = seed;
  }
}

/**
 * Get the current seed (null if using true randomness).
 */
export function getSeed(): number | null {
  return currentSeed;
}

/**
 * Generate a random number between 0 (inclusive) and 1 (exclusive).
 * If a seed is set, this will be deterministic.
 */
export function random(): number {
  if (currentSeed === null) {
    return Math.random();
  }

  // LCG algorithm
  state = (a * state + c) % m;
  return state / m;
}

/**
 * Generate a random integer between min (inclusive) and max (inclusive).
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * Generate a random float between min and max.
 */
export function randomFloat(min: number, max: number): number {
  return random() * (max - min) + min;
}

/**
 * Pick a random element from an array.
 */
export function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(random() * arr.length)];
}

/**
 * Return true with the given probability (0-1).
 */
export function randomBool(probability = 0.5): boolean {
  return random() < probability;
}

// ============================================
// Distribution functions
// ============================================

/**
 * Generate a random number from a Gaussian (normal) distribution.
 * Uses Box-Muller transform.
 * @param mean - The mean of the distribution
 * @param stddev - The standard deviation
 * @param min - Optional minimum value (clamps result)
 * @param max - Optional maximum value (clamps result)
 */
export function gaussian(mean: number, stddev: number, min?: number, max?: number): number {
  // Box-Muller transform
  let u1 = random();
  const u2 = random();

  // Avoid log(0)
  while (u1 === 0) u1 = random();

  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  let result = mean + z * stddev;

  // Clamp to bounds if specified
  if (min !== undefined) result = Math.max(min, result);
  if (max !== undefined) result = Math.min(max, result);

  return result;
}

/**
 * Generate a random number from an exponential distribution.
 * @param rate - The rate parameter (lambda). Higher = more concentrated near 0.
 * @param min - Minimum value (shifts distribution)
 * @param max - Maximum value (clamps result)
 */
export function exponential(rate: number, min = 0, max?: number): number {
  let u = random();
  while (u === 0) u = random(); // Avoid log(0)

  let result = min - Math.log(u) / rate;

  if (max !== undefined) result = Math.min(max, result);

  return result;
}

/**
 * Generate a random number from a log-normal distribution.
 * @param mu - The mean of the underlying normal distribution
 * @param sigma - The standard deviation of the underlying normal distribution
 * @param min - Optional minimum value
 * @param max - Optional maximum value
 */
export function lognormal(mu: number, sigma: number, min?: number, max?: number): number {
  const normal = gaussian(mu, sigma);
  let result = Math.exp(normal);

  if (min !== undefined) result = Math.max(min, result);
  if (max !== undefined) result = Math.min(max, result);

  return result;
}

/**
 * Generate a random number from a Poisson distribution.
 * @param lambda - The expected number of events (mean)
 */
export function poisson(lambda: number): number {
  // Knuth algorithm for small lambda
  if (lambda < 30) {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;

    do {
      k++;
      p *= random();
    } while (p > L);

    return k - 1;
  }

  // For large lambda, use normal approximation
  return Math.max(0, Math.round(gaussian(lambda, Math.sqrt(lambda))));
}

/**
 * Generate a random number from a beta distribution.
 * Useful for probabilities and proportions.
 * @param alpha - Shape parameter alpha (> 0)
 * @param beta - Shape parameter beta (> 0)
 */
export function beta(alpha: number, beta: number): number {
  // Using the gamma distribution method
  const gammaA = gammaVariate(alpha);
  const gammaB = gammaVariate(beta);
  return gammaA / (gammaA + gammaB);
}

/**
 * Generate a gamma-distributed random variable.
 * Helper for beta distribution.
 */
function gammaVariate(shape: number): number {
  if (shape < 1) {
    // Ahrens-Dieter method for shape < 1
    return gammaVariate(1 + shape) * Math.pow(random(), 1 / shape);
  }

  // Marsaglia and Tsang's method for shape >= 1
  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x: number, v: number;
    do {
      x = gaussian(0, 1);
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = random();

    if (u < 1 - 0.0331 * (x * x) * (x * x)) {
      return d * v;
    }

    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}
