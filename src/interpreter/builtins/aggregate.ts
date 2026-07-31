import type { GeneratorContext } from '../context.js';

/**
 * Helper to find min in single pass (avoids filter + spread overhead)
 */
function findMin(arr: unknown[]): number {
  let min = Infinity;
  let hasNumber = false;
  for (const item of arr) {
    if (typeof item === 'number') {
      hasNumber = true;
      if (item < min) min = item;
    }
  }
  return hasNumber ? min : 0;
}

/**
 * Helper to find max in single pass (avoids filter + spread overhead)
 */
function findMax(arr: unknown[]): number {
  let max = -Infinity;
  let hasNumber = false;
  for (const item of arr) {
    if (typeof item === 'number') {
      hasNumber = true;
      if (item > max) max = item;
    }
  }
  return hasNumber ? max : 0;
}

/**
 * Aggregate function handlers for sum, count, min, max, avg, first, last, median, product
 */
export const aggregateFunctions = {
  sum(args: unknown[], _context: GeneratorContext): number {
    const arr = args[0];
    if (Array.isArray(arr)) {
      let sum = 0;
      for (const item of arr) {
        if (typeof item === 'number') sum += item;
      }
      return sum;
    }
    return 0;
  },

  count(args: unknown[], _context: GeneratorContext): number {
    const arr = args[0];
    return Array.isArray(arr) ? arr.length : 0;
  },

  min(args: unknown[], _context: GeneratorContext): number {
    const arr = args[0];
    if (Array.isArray(arr) && arr.length > 0) {
      return findMin(arr);
    }
    // Fallback for direct number arguments
    return findMin(args);
  },

  max(args: unknown[], _context: GeneratorContext): number {
    const arr = args[0];
    if (Array.isArray(arr) && arr.length > 0) {
      return findMax(arr);
    }
    // Fallback for direct number arguments
    return findMax(args);
  },

  avg(args: unknown[], _context: GeneratorContext): number {
    const arr = args[0];
    if (Array.isArray(arr) && arr.length > 0) {
      let sum = 0;
      let count = 0;
      for (const item of arr) {
        if (typeof item === 'number') {
          sum += item;
          count++;
        }
      }
      return count > 0 ? sum / count : 0;
    }
    return 0;
  },

  first(args: unknown[], _context: GeneratorContext): unknown {
    const arr = args[0];
    if (Array.isArray(arr) && arr.length > 0) {
      return arr[0];
    }
    return null;
  },

  last(args: unknown[], _context: GeneratorContext): unknown {
    const arr = args[0];
    if (Array.isArray(arr) && arr.length > 0) {
      return arr[arr.length - 1];
    }
    return null;
  },

  median(args: unknown[], _context: GeneratorContext): number {
    const arr = args[0];
    if (Array.isArray(arr) && arr.length > 0) {
      // Filter numbers in single pass
      const nums: number[] = [];
      for (const item of arr) {
        if (typeof item === 'number') nums.push(item);
      }
      if (nums.length === 0) return 0;
      nums.sort((a, b) => a - b);
      const mid = Math.floor(nums.length / 2);
      if (nums.length % 2 === 0) {
        return (nums[mid - 1] + nums[mid]) / 2;
      }
      return nums[mid];
    }
    return 0;
  },

  product(args: unknown[], _context: GeneratorContext): number {
    const arr = args[0];
    if (Array.isArray(arr) && arr.length > 0) {
      let product = 1;
      let hasNumber = false;
      for (const item of arr) {
        if (typeof item === 'number') {
          hasNumber = true;
          product *= item;
        }
      }
      return hasNumber ? product : 0;
    }
    return 0;
  },
};
