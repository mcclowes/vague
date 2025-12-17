import type { GeneratorContext } from '../context.js';
import {
  gaussian as gaussianRng,
  exponential as exponentialRng,
  lognormal as lognormalRng,
  poisson as poissonRng,
  beta as betaRng,
  randomFloat,
} from '../random.js';

/**
 * Statistical distribution function handlers
 */
export const distributionFunctions = {
  /**
   * gaussian(mean, stddev, min?, max?) - normal distribution
   */
  gaussian(args: unknown[], _context: GeneratorContext): number {
    const mean = (args[0] as number) ?? 0;
    const stddev = (args[1] as number) ?? 1;
    const min = args[2] as number | undefined;
    const max = args[3] as number | undefined;
    return gaussianRng(mean, stddev, min, max);
  },

  /**
   * normal() is an alias for gaussian()
   */
  normal(args: unknown[], _context: GeneratorContext): number {
    const mean = (args[0] as number) ?? 0;
    const stddev = (args[1] as number) ?? 1;
    const min = args[2] as number | undefined;
    const max = args[3] as number | undefined;
    return gaussianRng(mean, stddev, min, max);
  },

  /**
   * exponential(rate, min?, max?) - exponential distribution
   */
  exponential(args: unknown[], _context: GeneratorContext): number {
    const rate = (args[0] as number) ?? 1;
    const min = (args[1] as number) ?? 0;
    const max = args[2] as number | undefined;
    return exponentialRng(rate, min, max);
  },

  /**
   * lognormal(mu, sigma, min?, max?) - log-normal distribution
   */
  lognormal(args: unknown[], _context: GeneratorContext): number {
    const mu = (args[0] as number) ?? 0;
    const sigma = (args[1] as number) ?? 1;
    const min = args[2] as number | undefined;
    const max = args[3] as number | undefined;
    return lognormalRng(mu, sigma, min, max);
  },

  /**
   * poisson(lambda) - Poisson distribution for count data
   */
  poisson(args: unknown[], _context: GeneratorContext): number {
    const lambda = (args[0] as number) ?? 1;
    return poissonRng(lambda);
  },

  /**
   * beta(alpha, beta) - beta distribution (0-1 range)
   */
  beta(args: unknown[], _context: GeneratorContext): number {
    const alpha = (args[0] as number) ?? 1;
    const betaParam = (args[1] as number) ?? 1;
    return betaRng(alpha, betaParam);
  },

  /**
   * uniform(min, max) - uniform distribution (explicit)
   */
  uniform(args: unknown[], _context: GeneratorContext): number {
    const min = (args[0] as number) ?? 0;
    const max = (args[1] as number) ?? 1;
    return randomFloat(min, max);
  },
};
