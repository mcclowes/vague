/**
 * Enum/Superposition detection for schema inference.
 * Detects categorical fields with limited distinct values.
 */

export interface SuperpositionOption {
  value: unknown;
  count: number;
  weight: number;
}

export interface SuperpositionResult {
  isSuperposition: boolean;
  options: SuperpositionOption[];
  hasEqualWeights: boolean;
}

/**
 * Configuration for enum detection
 */
export interface EnumDetectorConfig {
  /** Maximum number of unique values to consider as an enum (default: 10) */
  maxUniqueValues: number;
  /** Minimum ratio of unique values to total values (default: 0.1) */
  minUniquenessRatio: number;
  /** Minimum number of samples required (default: 3) */
  minSamples: number;
}

const DEFAULT_CONFIG: EnumDetectorConfig = {
  maxUniqueValues: 10,
  minUniquenessRatio: 0.1,
  minSamples: 3,
};

/**
 * Detect if a field should be represented as a superposition (enum-like)
 */
export function detectSuperposition(
  values: unknown[],
  config: Partial<EnumDetectorConfig> = {}
): SuperpositionResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Filter out null/undefined
  const nonNullValues = values.filter((v) => v !== null && v !== undefined);

  // Not enough samples
  if (nonNullValues.length < cfg.minSamples) {
    return { isSuperposition: false, options: [], hasEqualWeights: true };
  }

  // Count occurrences of each value
  const counts = new Map<string, { value: unknown; count: number }>();

  for (const value of nonNullValues) {
    // Use JSON.stringify for objects, otherwise use the value directly
    const key = typeof value === 'object' ? JSON.stringify(value) : String(value);

    if (counts.has(key)) {
      counts.get(key)!.count++;
    } else {
      counts.set(key, { value, count: 1 });
    }
  }

  const uniqueCount = counts.size;
  const totalCount = nonNullValues.length;

  // Too many unique values - not an enum
  if (uniqueCount > cfg.maxUniqueValues) {
    return { isSuperposition: false, options: [], hasEqualWeights: true };
  }

  // If uniqueness ratio is too high (almost all unique), not an enum
  const uniquenessRatio = uniqueCount / totalCount;
  if (uniquenessRatio > 1 - cfg.minUniquenessRatio) {
    return { isSuperposition: false, options: [], hasEqualWeights: true };
  }

  // Build options with weights
  const options: SuperpositionOption[] = [];
  for (const { value, count } of counts.values()) {
    options.push({
      value,
      count,
      weight: count / totalCount,
    });
  }

  // Sort by count (descending) for consistent output
  options.sort((a, b) => b.count - a.count);

  // Check if weights are approximately equal
  const avgWeight = 1 / options.length;
  const hasEqualWeights = options.every((opt) => Math.abs(opt.weight - avgWeight) < 0.05);

  return {
    isSuperposition: true,
    options,
    hasEqualWeights,
  };
}

/**
 * Format a weight as a Vague weight expression
 * Rounds to 2 decimal places and removes trailing zeros
 */
export function formatWeight(weight: number): string {
  // Round to 2 decimal places
  const rounded = Math.round(weight * 100) / 100;
  return rounded.toString();
}

/**
 * Determine if weights should be included in output
 * Returns true if weights vary significantly from equal distribution
 */
export function shouldIncludeWeights(options: SuperpositionOption[]): boolean {
  if (options.length <= 1) {
    return false;
  }

  const avgWeight = 1 / options.length;
  const threshold = 0.1; // 10% deviation threshold

  return options.some((opt) => Math.abs(opt.weight - avgWeight) > threshold);
}
