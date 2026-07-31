/**
 * CSV parser for Vague input
 *
 * Parses CSV data into the format expected by the schema inference system.
 */

export interface CsvParseOptions {
  /** Field delimiter (default: ',') */
  delimiter?: string;
  /** Whether the first row contains headers (default: true) */
  hasHeader?: boolean;
  /** Collection name to use (default: 'data') */
  collectionName?: string;
  /** Try to infer types from values (default: true) */
  inferTypes?: boolean;
}

const DEFAULT_OPTIONS: Required<CsvParseOptions> = {
  delimiter: ',',
  hasHeader: true,
  collectionName: 'data',
  inferTypes: true,
};

/**
 * Parse a CSV field value, handling quoted fields
 */
function parseField(field: string): string {
  field = field.trim();

  // Handle quoted fields
  if (field.startsWith('"') && field.endsWith('"')) {
    // Remove quotes and unescape doubled quotes
    return field.slice(1, -1).replace(/""/g, '"');
  }

  return field;
}

/**
 * Split a CSV line into fields, respecting quoted fields
 */
function splitCsvLine(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // End of quoted field
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        fields.push(parseField(current));
        current = '';
      } else {
        current += char;
      }
    }
  }

  // Don't forget the last field
  fields.push(parseField(current));

  return fields;
}

/**
 * Infer the type of a string value and convert it
 */
function inferValue(value: string): unknown {
  // Empty or null
  if (value === '' || value.toLowerCase() === 'null') {
    return null;
  }

  // Boolean
  const lower = value.toLowerCase();
  if (lower === 'true' || lower === 'yes') {
    return true;
  }
  if (lower === 'false' || lower === 'no') {
    return false;
  }

  // Integer
  if (/^-?\d+$/.test(value)) {
    const num = parseInt(value, 10);
    if (num >= Number.MIN_SAFE_INTEGER && num <= Number.MAX_SAFE_INTEGER) {
      return num;
    }
  }

  // Decimal
  if (/^-?\d+\.\d+$/.test(value)) {
    return parseFloat(value);
  }

  // Date (ISO format)
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value; // Keep as string, but type detection will recognize it
  }

  // DateTime (ISO format)
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return value;
  }

  // Default to string
  return value;
}

/**
 * Split CSV content into logical lines, respecting quoted fields that may contain newlines
 */
function splitCsvIntoLines(content: string): string[] {
  const lines: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote
          current += '""';
          i++; // Skip next quote
        } else {
          // End of quoted field
          inQuotes = false;
          current += char;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        current += char;
      } else if (char === '\r' && nextChar === '\n') {
        // Windows line ending
        if (current.trim() !== '') {
          lines.push(current);
        }
        current = '';
        i++; // Skip \n
      } else if (char === '\n') {
        // Unix line ending
        if (current.trim() !== '') {
          lines.push(current);
        }
        current = '';
      } else {
        current += char;
      }
    }
  }

  // Don't forget the last line
  if (current.trim() !== '') {
    lines.push(current);
  }

  return lines;
}

/**
 * Parse CSV content into an array of records
 */
export function parseCSV(
  content: string,
  options: CsvParseOptions = {}
): Record<string, unknown>[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Split into logical lines, respecting quoted fields with newlines
  const lines = splitCsvIntoLines(content);

  if (lines.length === 0) {
    return [];
  }

  let headers: string[];
  let dataLines: string[];

  if (opts.hasHeader) {
    headers = splitCsvLine(lines[0], opts.delimiter);
    dataLines = lines.slice(1);
  } else {
    // Generate column names if no header
    const firstLine = splitCsvLine(lines[0], opts.delimiter);
    headers = firstLine.map((_, i) => `column_${i + 1}`);
    dataLines = lines;
  }

  const records: Record<string, unknown>[] = [];

  for (const line of dataLines) {
    const values = splitCsvLine(line, opts.delimiter);
    const record: Record<string, unknown> = {};

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const rawValue = values[i] ?? '';

      record[header] = opts.inferTypes ? inferValue(rawValue) : rawValue;
    }

    records.push(record);
  }

  return records;
}

/**
 * Parse CSV content into the dataset format expected by inferSchema
 */
export function parseCSVToDataset(
  content: string,
  options: CsvParseOptions = {}
): Record<string, unknown[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const records = parseCSV(content, opts);

  return {
    [opts.collectionName]: records,
  };
}

/**
 * Parse multiple CSV files/contents into a single dataset
 * Each entry should have a name (collection name) and content
 */
export function parseMultipleCSVToDataset(
  files: Array<{ name: string; content: string }>,
  options: Omit<CsvParseOptions, 'collectionName'> = {}
): Record<string, unknown[]> {
  const dataset: Record<string, unknown[]> = {};

  for (const file of files) {
    const records = parseCSV(file.content, options);
    dataset[file.name] = records;
  }

  return dataset;
}
