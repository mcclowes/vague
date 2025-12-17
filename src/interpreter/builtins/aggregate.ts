import type { GeneratorContext } from '../context.js';

/**
 * Aggregate function handlers for sum, count, min, max, avg
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
};
