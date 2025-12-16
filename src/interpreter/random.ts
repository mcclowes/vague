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
