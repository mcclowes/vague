/**
 * CSV formatter for Vague output
 *
 * Converts generated JSON data to CSV format.
 * Handles nested objects by flattening with dot notation.
 */

export interface CsvOptions {
  /** Delimiter character (default: ',') */
  delimiter?: string;
  /** Include header row (default: true) */
  header?: boolean;
  /** How to handle arrays: 'json' serializes as JSON, 'first' takes first element, 'count' outputs length */
  arrayHandling?: 'json' | 'first' | 'count';
  /** How to handle nested objects: 'flatten' uses dot notation, 'json' serializes as JSON */
  nestedHandling?: 'flatten' | 'json';
  /** Null value representation (default: '') */
  nullValue?: string;
}

const DEFAULT_OPTIONS: Required<CsvOptions> = {
  delimiter: ',',
  header: true,
  arrayHandling: 'json',
  nestedHandling: 'flatten',
  nullValue: '',
};

/**
 * Escape a CSV field value
 */
function escapeField(value: string, delimiter: string): string {
  // If value contains delimiter, quotes, or newlines, wrap in quotes and escape internal quotes
  if (
    value.includes(delimiter) ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

/**
 * Flatten a nested object into dot-notation keys
 */
function flattenObject(
  obj: Record<string, unknown>,
  prefix = '',
  result: Record<string, unknown> = {}
): Record<string, unknown> {
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      flattenObject(value as Record<string, unknown>, newKey, result);
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

/**
 * Get all unique column headers from an array of objects
 */
function getHeaders(rows: Record<string, unknown>[], options: Required<CsvOptions>): string[] {
  const headerSet = new Set<string>();

  for (const row of rows) {
    const processed = options.nestedHandling === 'flatten' ? flattenObject(row) : row;
    for (const key of Object.keys(processed)) {
      headerSet.add(key);
    }
  }

  // Sort headers for consistent output
  return Array.from(headerSet).sort();
}

/**
 * Convert a value to a CSV-safe string
 */
function valueToString(value: unknown, options: Required<CsvOptions>): string {
  if (value === null || value === undefined) {
    return options.nullValue;
  }

  if (Array.isArray(value)) {
    switch (options.arrayHandling) {
      case 'first':
        return value.length > 0 ? valueToString(value[0], options) : options.nullValue;
      case 'count':
        return String(value.length);
      case 'json':
      default:
        return JSON.stringify(value);
    }
  }

  if (typeof value === 'object') {
    // For nested objects when not flattening
    return JSON.stringify(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  return String(value);
}

/**
 * Convert an array of objects to CSV format
 */
export function toCSV(data: Record<string, unknown>[], options: CsvOptions = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (data.length === 0) {
    return '';
  }

  const headers = getHeaders(data, opts);
  const lines: string[] = [];

  // Add header row
  if (opts.header) {
    lines.push(headers.map((h) => escapeField(h, opts.delimiter)).join(opts.delimiter));
  }

  // Add data rows
  for (const row of data) {
    const processedRow = opts.nestedHandling === 'flatten' ? flattenObject(row) : row;
    const values = headers.map((header) => {
      const value = processedRow[header];
      const stringValue = valueToString(value, opts);
      return escapeField(stringValue, opts.delimiter);
    });
    lines.push(values.join(opts.delimiter));
  }

  return lines.join('\n');
}

/**
 * Convert a Vague dataset (multiple collections) to CSV format
 * Returns a map of collection names to CSV strings
 */
export function datasetToCSV(
  dataset: Record<string, unknown[]>,
  options: CsvOptions = {}
): Map<string, string> {
  const result = new Map<string, string>();

  for (const [collectionName, data] of Object.entries(dataset)) {
    if (Array.isArray(data)) {
      result.set(collectionName, toCSV(data as Record<string, unknown>[], options));
    }
  }

  return result;
}

/**
 * Convert a Vague dataset to a single CSV string
 * Each collection is separated by a blank line and prefixed with collection name
 */
export function datasetToSingleCSV(
  dataset: Record<string, unknown[]>,
  options: CsvOptions = {}
): string {
  const collections = datasetToCSV(dataset, options);
  const sections: string[] = [];

  for (const [name, csv] of collections) {
    if (csv) {
      sections.push(`# ${name}\n${csv}`);
    }
  }

  return sections.join('\n\n');
}
