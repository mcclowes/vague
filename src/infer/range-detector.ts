/**
 * Range detection for schema inference.
 * Finds min/max values for numeric and date fields.
 */

import { InferredType } from './type-detector.js';

export interface NumericRange {
  min: number;
  max: number;
  allInteger: boolean;
  decimalPlaces: number;
}

export interface DateRange {
  minDate: string;
  maxDate: string;
  minYear: number;
  maxYear: number;
  hasTime: boolean;
}

/**
 * Detect the range of numeric values
 */
export function detectNumericRange(values: unknown[]): NumericRange | null {
  const numbers = values.filter((v): v is number => typeof v === 'number' && !isNaN(v));

  if (numbers.length === 0) {
    return null;
  }

  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const allInteger = numbers.every((n) => Number.isInteger(n));

  // Determine decimal places - prefer bounds, but cap at 4 to filter floating point noise
  let decimalPlaces = 0;
  if (!allInteger) {
    // First, check bounds precision
    for (const n of [min, max]) {
      const str = n.toString();
      const dotIndex = str.indexOf('.');
      if (dotIndex !== -1) {
        const places = str.length - dotIndex - 1;
        decimalPlaces = Math.max(decimalPlaces, places);
      }
    }

    // If bounds are integers (0 precision), scan values but cap at 4
    // to filter floating point noise like 10.0333333333
    if (decimalPlaces === 0) {
      for (const n of numbers) {
        const str = n.toString();
        const dotIndex = str.indexOf('.');
        if (dotIndex !== -1) {
          const places = Math.min(str.length - dotIndex - 1, 4);
          decimalPlaces = Math.max(decimalPlaces, places);
        }
      }
    }
  }

  return { min, max, allInteger, decimalPlaces };
}

/**
 * Detect the range of date values
 */
export function detectDateRange(values: unknown[]): DateRange | null {
  const dates: { date: Date; str: string; hasTime: boolean }[] = [];

  for (const v of values) {
    if (typeof v === 'string') {
      const parsed = new Date(v);
      if (!isNaN(parsed.getTime())) {
        const hasTime = v.includes('T');
        dates.push({ date: parsed, str: v, hasTime });
      }
    }
  }

  if (dates.length === 0) {
    return null;
  }

  // Sort by date
  dates.sort((a, b) => a.date.getTime() - b.date.getTime());

  const minDate = dates[0];
  const maxDate = dates[dates.length - 1];
  const hasTime = dates.some((d) => d.hasTime);

  return {
    minDate: minDate.str,
    maxDate: maxDate.str,
    minYear: minDate.date.getFullYear(),
    maxYear: maxDate.date.getFullYear(),
    hasTime,
  };
}

/**
 * Detect array length range (cardinality)
 */
export function detectArrayCardinality(values: unknown[]): { min: number; max: number } | null {
  const arrays = values.filter((v): v is unknown[] => Array.isArray(v));

  if (arrays.length === 0) {
    return null;
  }

  const lengths = arrays.map((arr) => arr.length);
  return {
    min: Math.min(...lengths),
    max: Math.max(...lengths),
  };
}

/**
 * Detect if all values are unique
 */
export function detectUniqueness(values: unknown[], type: InferredType): boolean {
  // Filter out null/undefined
  const nonNullValues = values.filter((v) => v !== null && v !== undefined);

  if (nonNullValues.length <= 1) {
    return false; // Not meaningful to say 1 value is "unique"
  }

  // For objects/arrays, we can't easily check uniqueness
  if (type === 'object' || type === 'array') {
    return false;
  }

  const uniqueSet = new Set(
    nonNullValues.map((v) => (typeof v === 'object' ? JSON.stringify(v) : v))
  );

  // All values are unique
  return uniqueSet.size === nonNullValues.length;
}

/**
 * String length range for constraint inference
 */
export interface StringLengthRange {
  minLength: number;
  maxLength: number;
  avgLength: number;
  isFixedLength: boolean;
}

/**
 * Detect the length range of string values
 * Useful for inferring string length constraints
 */
export function detectStringLengthRange(values: unknown[]): StringLengthRange | null {
  const strings = values.filter((v): v is string => typeof v === 'string');

  if (strings.length === 0) {
    return null;
  }

  const lengths = strings.map((s) => s.length);
  const minLength = Math.min(...lengths);
  const maxLength = Math.max(...lengths);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const isFixedLength = minLength === maxLength;

  return { minLength, maxLength, avgLength, isFixedLength };
}

/**
 * Percentage/ratio detection result
 */
export interface PercentageInfo {
  isPercentage: boolean;
  scale: 'decimal' | 'percent'; // 0-1 vs 0-100
  confidence: number;
}

/**
 * Detect if numeric values represent percentages or ratios
 * Looks for values in 0-1 range (decimal) or 0-100 range (percent)
 */
export function detectPercentage(values: unknown[]): PercentageInfo | null {
  const numbers = values.filter((v): v is number => typeof v === 'number' && !isNaN(v));

  if (numbers.length < 2) {
    return null;
  }

  const min = Math.min(...numbers);
  const max = Math.max(...numbers);

  // Check for 0-1 decimal percentage (most common in programmatic data)
  if (min >= 0 && max <= 1) {
    // Additional check: values should have some distribution, not just 0 and 1
    const hasMiddleValues = numbers.some((n) => n > 0.01 && n < 0.99);
    const allZeroOrOne = numbers.every((n) => Math.abs(n) < 0.001 || Math.abs(n - 1) < 0.001);

    if (hasMiddleValues && !allZeroOrOne) {
      // High confidence: values span the 0-1 range
      const range = max - min;
      const confidence = Math.min(range * 2, 0.95); // More spread = higher confidence
      return { isPercentage: true, scale: 'decimal', confidence };
    }
  }

  // Check for 0-100 percentage (common in spreadsheets/reports)
  if (min >= 0 && max <= 100) {
    // Additional check: values should look like percentages, not just small integers
    const hasDecimalValues = numbers.some((n) => !Number.isInteger(n));
    const looksLikePercent =
      max > 10 && // At least some values over 10%
      (hasDecimalValues || numbers.some((n) => n % 10 !== 0)); // Not all multiples of 10

    if (looksLikePercent) {
      const range = max - min;
      const confidence = Math.min(range / 100, 0.85); // More spread = higher confidence
      return { isPercentage: true, scale: 'percent', confidence };
    }
  }

  return { isPercentage: false, scale: 'decimal', confidence: 0 };
}

/**
 * Distribution type for numeric values
 */
export type DistributionType = 'uniform' | 'gaussian' | 'exponential' | 'bimodal' | 'unknown';

/**
 * Distribution analysis result
 */
export interface DistributionInfo {
  type: DistributionType;
  confidence: number;
  // Parameters for specific distributions
  mean?: number;
  stddev?: number;
  skewness?: number;
}

/**
 * Detect the statistical distribution of numeric values
 * Uses simple heuristics to identify common distributions
 */
export function detectDistribution(values: unknown[]): DistributionInfo | null {
  const numbers = values.filter((v): v is number => typeof v === 'number' && !isNaN(v));

  if (numbers.length < 10) {
    // Need at least 10 samples for meaningful distribution detection
    return null;
  }

  // Calculate basic statistics
  const n = numbers.length;
  const mean = numbers.reduce((a, b) => a + b, 0) / n;
  const variance = numbers.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n;
  const stddev = Math.sqrt(variance);
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const range = max - min;

  // Protect against zero range
  if (range === 0 || stddev === 0) {
    return { type: 'unknown', confidence: 0 };
  }

  // Calculate skewness (third moment)
  const skewness = numbers.reduce((sum, x) => sum + Math.pow((x - mean) / stddev, 3), 0) / n;

  // Calculate kurtosis (fourth moment) - excess kurtosis (normal = 0)
  const kurtosis = numbers.reduce((sum, x) => sum + Math.pow((x - mean) / stddev, 4), 0) / n - 3;

  // Analyze distribution using histogram approach
  const numBins = Math.min(20, Math.ceil(Math.sqrt(n)));
  const binWidth = range / numBins;
  const histogram = new Array(numBins).fill(0);

  for (const num of numbers) {
    const binIndex = Math.min(numBins - 1, Math.floor((num - min) / binWidth));
    histogram[binIndex]++;
  }

  // Normalize histogram
  const normalizedHist = histogram.map((count) => count / n);

  // Test for uniform distribution
  // Uniform distribution should have roughly equal bin counts
  const expectedUniform = 1 / numBins;
  const uniformDeviation = normalizedHist.reduce(
    (sum, p) => sum + Math.pow(p - expectedUniform, 2),
    0
  );
  const uniformScore = 1 - Math.min(uniformDeviation * numBins * 4, 1);

  // Test for Gaussian distribution
  // Use Anderson-Darling-like test: compare histogram to expected normal
  let gaussianScore = 0;
  for (let i = 0; i < numBins; i++) {
    const binCenter = min + (i + 0.5) * binWidth;
    const z = (binCenter - mean) / stddev;
    // Expected probability from normal distribution
    const expectedNormal = ((binWidth / stddev) * Math.exp(-0.5 * z * z)) / Math.sqrt(2 * Math.PI);
    const diff = Math.abs(normalizedHist[i] - expectedNormal);
    gaussianScore += 1 - Math.min(diff * 5, 1);
  }
  gaussianScore /= numBins;

  // Adjust Gaussian score based on skewness and kurtosis
  // Normal distribution has skewness ≈ 0 and excess kurtosis ≈ 0
  if (Math.abs(skewness) < 0.5 && Math.abs(kurtosis) < 1) {
    gaussianScore *= 1.1; // Boost if moments look normal
  } else if (Math.abs(skewness) > 1 || Math.abs(kurtosis) > 2) {
    gaussianScore *= 0.8; // Penalize if moments look non-normal
  }

  // Test for exponential distribution (positive skewness, min near 0)
  const exponentialScore =
    min >= 0 && skewness > 0.8 && kurtosis > 1 ? 0.7 + Math.min(skewness / 5, 0.2) : 0;

  // Test for bimodal distribution (look for two peaks in histogram)
  let bimodalScore = 0;
  const smoothedHist = normalizedHist.map((_, i) => {
    const neighbors = [normalizedHist[i - 1] ?? 0, normalizedHist[i], normalizedHist[i + 1] ?? 0];
    return neighbors.reduce((a, b) => a + b, 0) / 3;
  });

  let peakCount = 0;
  for (let i = 1; i < smoothedHist.length - 1; i++) {
    if (smoothedHist[i] > smoothedHist[i - 1] && smoothedHist[i] > smoothedHist[i + 1]) {
      peakCount++;
    }
  }
  if (peakCount >= 2 && kurtosis < -0.5) {
    bimodalScore = 0.6 + Math.min(peakCount * 0.1, 0.3);
  }

  // Determine best fit
  const scores = [
    { type: 'uniform' as DistributionType, score: uniformScore },
    { type: 'gaussian' as DistributionType, score: gaussianScore },
    { type: 'exponential' as DistributionType, score: exponentialScore },
    { type: 'bimodal' as DistributionType, score: bimodalScore },
  ];

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];

  // Require minimum confidence
  if (best.score < 0.5) {
    return { type: 'unknown', confidence: best.score, mean, stddev, skewness };
  }

  return {
    type: best.type,
    confidence: Math.min(best.score, 0.95),
    mean,
    stddev,
    skewness,
  };
}

/**
 * Round range values to nice numbers for better readability
 */
export function roundRangeToNice(min: number, max: number): { min: number; max: number } {
  // If already integers, keep them
  if (Number.isInteger(min) && Number.isInteger(max)) {
    return { min, max };
  }

  // For decimals, round to reasonable precision
  const range = max - min;
  if (range === 0) {
    return { min, max };
  }

  // Determine appropriate precision based on range
  const magnitude = Math.floor(Math.log10(range));
  const precision = Math.max(0, -magnitude + 2);

  return {
    min: parseFloat(min.toFixed(precision)),
    max: parseFloat(max.toFixed(precision)),
  };
}
