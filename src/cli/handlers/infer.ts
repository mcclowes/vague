/**
 * Schema inference handler.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { inferSchema, inferSchemaWithTypeScript } from '../../infer/index.js';
import { parseCSVToDataset } from '../../csv/index.js';
import type { CliOptions } from '../types.js';

export async function handleInfer(options: CliOptions): Promise<void> {
  if (!options.inferFile) {
    throw new Error('No infer file specified');
  }

  const fileContent = readFileSync(resolve(options.inferFile), 'utf-8');
  let data: Record<string, unknown[]>;

  // Determine if input is CSV or JSON based on file extension
  const isCSV = options.inferFile.toLowerCase().endsWith('.csv');

  if (isCSV) {
    // Parse CSV input
    // Derive collection name from filename if not specified
    const derivedCollectionName =
      options.collectionName ?? options.inferFile.replace(/^.*[\\/]/, '').replace(/\.csv$/i, '');
    data = parseCSVToDataset(fileContent, {
      delimiter: options.inferDelimiter,
      collectionName: derivedCollectionName,
    });
  } else {
    // Parse JSON input
    try {
      data = JSON.parse(fileContent) as Record<string, unknown[]>;
    } catch {
      console.error('Error: Invalid JSON in input file');
      process.exit(1);
      return; // TypeScript flow analysis hint
    }
  }

  const inferOptions = {
    datasetName: options.datasetName,
    detectFormats: options.detectFormats,
    weightedSuperpositions: options.weightedSuperpositions,
    maxEnumValues: options.maxEnumValues,
  };

  if (options.generateTypescript) {
    // Generate both Vague and TypeScript
    const result = inferSchemaWithTypeScript(data, inferOptions);

    if (options.outputFile) {
      // Determine output file names
      const vagueFile = options.typescriptOnly
        ? null
        : options.outputFile.endsWith('.d.ts')
          ? options.outputFile.replace(/\.d\.ts$/, '.vague')
          : options.outputFile;
      const tsFile = options.outputFile.endsWith('.vague')
        ? options.outputFile.replace(/\.vague$/, '.d.ts')
        : options.outputFile.endsWith('.d.ts')
          ? options.outputFile
          : options.outputFile + '.d.ts';

      // Write Vague file (unless ts-only)
      if (!options.typescriptOnly && vagueFile) {
        writeFileSync(resolve(vagueFile), result.vague);
        console.error(`Vague schema written to ${vagueFile}`);
      }

      // Write TypeScript file
      writeFileSync(resolve(tsFile), result.typescript);
      console.error(`TypeScript definitions written to ${tsFile}`);
    } else {
      // Output to stdout
      if (!options.typescriptOnly) {
        console.log('// === Vague Schema ===');
        console.log(result.vague);
        console.log('\n// === TypeScript Definitions ===');
      }
      console.log(result.typescript);
    }
  } else {
    // Generate only Vague code
    const vagueCode = inferSchema(data, inferOptions);

    if (options.outputFile) {
      writeFileSync(resolve(options.outputFile), vagueCode);
      console.error(`Vague schema written to ${options.outputFile}`);
    } else {
      console.log(vagueCode);
    }
  }

  process.exit(0);
}
