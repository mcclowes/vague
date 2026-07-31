/**
 * NDJSON (Newline Delimited JSON) formatter for Vague
 *
 * Formats datasets as NDJSON where each record is on a single line.
 * This format is ideal for:
 * - Streaming to HTTP testing tools
 * - Processing large datasets line-by-line
 * - Log aggregation systems
 * - Webhook replay scenarios
 */

export interface NdjsonOptions {
  /**
   * Include collection name as a field in each record.
   * When true, each line includes { _collection: "name", ...record }
   * Default: false
   */
  includeCollection?: boolean;

  /**
   * Prefix each line with collection name (e.g., "invoices: {...}")
   * Default: false
   */
  prefixCollection?: boolean;
}

/**
 * Convert a single record to a JSON line
 */
export function recordToNdjsonLine(record: unknown): string {
  return JSON.stringify(record);
}

/**
 * Convert a dataset to NDJSON format
 *
 * Each record is output on a single line. Records from different collections
 * are interleaved in the order they appear in the dataset.
 *
 * @param dataset - The dataset object with collection names as keys
 * @param options - NDJSON formatting options
 * @returns NDJSON string with one record per line
 */
export function datasetToNdjson(
  dataset: Record<string, unknown[]>,
  options: NdjsonOptions = {}
): string {
  const { includeCollection = false, prefixCollection = false } = options;
  const lines: string[] = [];

  for (const [collectionName, records] of Object.entries(dataset)) {
    if (!Array.isArray(records)) {
      continue;
    }

    for (const record of records) {
      let line: string;

      if (includeCollection && typeof record === 'object' && record !== null) {
        // Add _collection field to each record
        line = JSON.stringify({ _collection: collectionName, ...record });
      } else if (prefixCollection) {
        // Prefix line with collection name
        line = `${collectionName}: ${JSON.stringify(record)}`;
      } else {
        line = JSON.stringify(record);
      }

      lines.push(line);
    }
  }

  return lines.join('\n');
}

/**
 * Convert a dataset to NDJSON format, grouped by collection
 *
 * All records from a collection are output together before moving
 * to the next collection.
 *
 * @param dataset - The dataset object with collection names as keys
 * @param options - NDJSON formatting options
 * @returns Map of collection names to NDJSON strings
 */
export function datasetToNdjsonByCollection(
  dataset: Record<string, unknown[]>,
  options: NdjsonOptions = {}
): Map<string, string> {
  const { includeCollection = false } = options;
  const result = new Map<string, string>();

  for (const [collectionName, records] of Object.entries(dataset)) {
    if (!Array.isArray(records)) {
      continue;
    }

    const lines: string[] = [];
    for (const record of records) {
      if (includeCollection && typeof record === 'object' && record !== null) {
        lines.push(JSON.stringify({ _collection: collectionName, ...record }));
      } else {
        lines.push(JSON.stringify(record));
      }
    }

    result.set(collectionName, lines.join('\n'));
  }

  return result;
}

/**
 * Parse NDJSON string back to array of records
 *
 * @param ndjson - NDJSON string with one JSON object per line
 * @returns Array of parsed records
 */
export function parseNdjson<T = unknown>(ndjson: string): T[] {
  const lines = ndjson.split('\n').filter((line) => line.trim().length > 0);
  return lines.map((line) => JSON.parse(line) as T);
}

/**
 * Parse NDJSON with collection prefixes back to dataset
 *
 * Expects format: "collectionName: {...}"
 *
 * @param ndjson - NDJSON string with collection prefixes
 * @returns Dataset object grouped by collection
 */
export function parseNdjsonWithCollections(ndjson: string): Record<string, unknown[]> {
  const result: Record<string, unknown[]> = {};
  const lines = ndjson.split('\n').filter((line) => line.trim().length > 0);

  for (const line of lines) {
    // Check for collection prefix format: "name: {...}"
    const colonIndex = line.indexOf(': ');
    if (colonIndex > 0 && line[colonIndex + 2] === '{') {
      const collectionName = line.substring(0, colonIndex);
      const json = line.substring(colonIndex + 2);
      if (!result[collectionName]) {
        result[collectionName] = [];
      }
      result[collectionName].push(JSON.parse(json));
    } else {
      // Check for _collection field in the record
      const record = JSON.parse(line);
      if (typeof record === 'object' && record !== null && '_collection' in record) {
        const collectionName = (record as Record<string, unknown>)._collection as string;
        const { _collection: _, ...rest } = record as Record<string, unknown>;
        if (!result[collectionName]) {
          result[collectionName] = [];
        }
        result[collectionName].push(rest);
      } else {
        // No collection info, put in default
        if (!result['default']) {
          result['default'] = [];
        }
        result['default'].push(record);
      }
    }
  }

  return result;
}
