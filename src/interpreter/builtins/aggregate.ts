import type { GeneratorContext } from '../context.js';

/**
 * Aggregate function handlers for sum, count, min, max, avg, first, last, median, product
 */
export const aggregateFunctions = {
  sum(args: unknown[], _context: GeneratorContext): number {
    const arr = args[0];
    if (Array.isArray(arr)) {
      return arr.reduce((sum: number, item) => {
        if (typeof item === 'number') return sum + item;
        return sum;
      }, 0);
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
      const nums = arr.filter((x): x is number => typeof x === 'number');
      return nums.length > 0 ? Math.min(...nums) : 0;
    }
    // Fallback for direct number arguments
    const nums = args.filter((x): x is number => typeof x === 'number');
    return nums.length > 0 ? Math.min(...nums) : 0;
  },

  max(args: unknown[], _context: GeneratorContext): number {
    const arr = args[0];
    if (Array.isArray(arr) && arr.length > 0) {
      const nums = arr.filter((x): x is number => typeof x === 'number');
      return nums.length > 0 ? Math.max(...nums) : 0;
    }
    // Fallback for direct number arguments
    const nums = args.filter((x): x is number => typeof x === 'number');
    return nums.length > 0 ? Math.max(...nums) : 0;
  },

  avg(args: unknown[], _context: GeneratorContext): number {
    const arr = args[0];
    if (Array.isArray(arr) && arr.length > 0) {
      const nums = arr.filter((x): x is number => typeof x === 'number');
      if (nums.length === 0) return 0;
      const sum = nums.reduce((s, n) => s + n, 0);
      return sum / nums.length;
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
      const nums = arr.filter((x): x is number => typeof x === 'number');
      if (nums.length === 0) return 0;
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
      }
      return sorted[mid];
    }
    return 0;
  },

  product(args: unknown[], _context: GeneratorContext): number {
    const arr = args[0];
    if (Array.isArray(arr) && arr.length > 0) {
      const nums = arr.filter((x): x is number => typeof x === 'number');
      if (nums.length === 0) return 0;
      return nums.reduce((prod, n) => prod * n, 1);
    }
    return 0;
  },
};
