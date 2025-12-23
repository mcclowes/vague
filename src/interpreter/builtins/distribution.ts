import type { GeneratorContext } from '../context.js';
import {
  gaussian as gaussianRng,
  exponential as exponentialRng,
  lognormal as lognormalRng,
  poisson as poissonRng,
  beta as betaRng,
  randomFloat,
} from '../random.js';
import { toNumber, toNumberOrUndefined } from '../../utils/type-guards.js';

/**
 * Statistical distribution function handlers
 */
export const distributionFunctions = {
  /**
   * gaussian(mean, stddev, min?, max?) - normal distribution
   */
  gaussian(args: unknown[], _context: GeneratorContext): number {
    const mean = toNumber(args[0], 0);
    const stddev = toNumber(args[1], 1);
    const min = toNumberOrUndefined(args[2]);
    const max = toNumberOrUndefined(args[3]);
    return gaussianRng(mean, stddev, min, max);
  },

  /**
   * normal() is an alias for gaussian()
   */
  normal(args: unknown[], _context: GeneratorContext): number {
    const mean = toNumber(args[0], 0);
    const stddev = toNumber(args[1], 1);
    const min = toNumberOrUndefined(args[2]);
    const max = toNumberOrUndefined(args[3]);
    return gaussianRng(mean, stddev, min, max);
  },

  /**
   * exponential(rate, min?, max?) - exponential distribution
   */
  exponential(args: unknown[], _context: GeneratorContext): number {
    const rate = toNumber(args[0], 1);
    const min = toNumber(args[1], 0);
    const max = toNumberOrUndefined(args[2]);
    return exponentialRng(rate, min, max);
  },

  /**
   * lognormal(mu, sigma, min?, max?) - log-normal distribution
   */
  lognormal(args: unknown[], _context: GeneratorContext): number {
    const mu = toNumber(args[0], 0);
    const sigma = toNumber(args[1], 1);
    const min = toNumberOrUndefined(args[2]);
    const max = toNumberOrUndefined(args[3]);
    return lognormalRng(mu, sigma, min, max);
  },

  /**
   * poisson(lambda) - Poisson distribution for count data
   */
  poisson(args: unknown[], _context: GeneratorContext): number {
    const lambda = toNumber(args[0], 1);
    return poissonRng(lambda);
  },

  /**
   * beta(alpha, beta) - beta distribution (0-1 range)
   */
  beta(args: unknown[], _context: GeneratorContext): number {
    const alpha = toNumber(args[0], 1);
    const betaParam = toNumber(args[1], 1);
    return betaRng(alpha, betaParam);
  },

  /**
   * uniform(min, max) - uniform distribution (explicit)
   */
  uniform(args: unknown[], _context: GeneratorContext): number {
    const min = toNumber(args[0], 0);
    const max = toNumber(args[1], 1);
    return randomFloat(min, max);
  },
};
