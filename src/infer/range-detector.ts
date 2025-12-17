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
