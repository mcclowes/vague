/**
 * Data validation handler.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DataValidator } from '../../validator/data-validator.js';
import type { CliOptions } from '../types.js';

export async function handleValidate(options: CliOptions): Promise<void> {
  if (!options.validateDataFile) {
    throw new Error('No validate data file specified');
  }

  if (!options.schemaFile) {
    console.error('Error: --schema is required when using --validate-data');
    process.exit(1);
  }

  // Load the data
  const dataContent = readFileSync(resolve(options.validateDataFile), 'utf-8');
  let data: Record<string, unknown[]>;
  try {
    data = JSON.parse(dataContent) as Record<string, unknown[]>;
  } catch {
    console.error('Error: Invalid JSON in data file');
    process.exit(1);
    return;
  }

  // Load the schema
  const schemaContent = readFileSync(resolve(options.schemaFile), 'utf-8');
  const validator = new DataValidator();
  const schemas = validator.loadSchema(schemaContent);

  console.error(`Loaded schemas: ${schemas.join(', ')}`);

  let schemaMapping = options.schemaMapping;

  if (!schemaMapping) {
    // Auto-detect mapping if not provided
    const autoMapping: Record<string, string> = {};
    for (const collectionName of Object.keys(data)) {
      // Try to match collection name to schema name
      const normalizedCollection = collectionName.toLowerCase().replace(/_/g, '');
      for (const schemaName of schemas) {
        const normalizedSchema = schemaName.toLowerCase();
        // Match plural to singular, case insensitive
        if (
          normalizedCollection === normalizedSchema ||
          normalizedCollection === normalizedSchema + 's' ||
          normalizedCollection.replace(/s$/, '') === normalizedSchema ||
          normalizedCollection.replace(/ies$/, 'y') === normalizedSchema
        ) {
          autoMapping[collectionName] = schemaName;
          break;
        }
      }
    }
    if (Object.keys(autoMapping).length > 0) {
      schemaMapping = autoMapping;
      console.error(`Auto-detected mapping: ${JSON.stringify(schemaMapping)}`);
    } else {
      console.error('Error: No mapping provided and could not auto-detect. Use -m/--mapping');
      console.error('Available schemas:', schemas.join(', '));
      console.error('Data collections:', Object.keys(data).join(', '));
      process.exit(1);
    }
  }

  // Auto-detect dataset name if not provided and only one exists
  let validationDatasetName = options.validationDatasetName;
  const datasets = validator.getDatasetNames();
  if (!validationDatasetName && datasets.length === 1) {
    validationDatasetName = datasets[0];
    console.error(`Auto-detected dataset: ${validationDatasetName}`);
  } else if (!validationDatasetName && datasets.length > 1) {
    console.error(`Available datasets: ${datasets.join(', ')}`);
    console.error(`Use --dataset to specify which dataset's validate {} block to check`);
  }

  const result = validator.validateFull(data, schemaMapping!, validationDatasetName ?? undefined);

  // Output results
  let hasErrors = false;
  for (const [collectionName, collResult] of result.collections) {
    if (collResult.valid) {
      console.error(
        `✓ ${collectionName} (${collResult.recordsValidated} records) - all constraints satisfied`
      );
    } else {
      hasErrors = true;
      console.error(
        `✗ ${collectionName} (${collResult.recordsFailed}/${collResult.recordsValidated} failed)`
      );

      // Show first few errors
      const errorsToShow = collResult.errors.slice(0, 5);
      for (const err of errorsToShow) {
        const recordInfo = err.record >= 0 ? `[${err.record}]` : '';
        console.error(`  ${recordInfo} ${err.message}`);
        if (err.value && Object.keys(err.value).length > 0) {
          console.error(`    Values: ${JSON.stringify(err.value)}`);
        }
      }
      if (collResult.errors.length > 5) {
        console.error(`  ... and ${collResult.errors.length - 5} more errors`);
      }
    }
  }

  // Output dataset-level validation results
  if (result.datasetLevelValidation) {
    if (result.datasetLevelValidation.valid) {
      console.error(`✓ Dataset constraints (validate {} block) - all satisfied`);
    } else {
      hasErrors = true;
      console.error(`✗ Dataset constraints (validate {} block) - failed`);
      for (const err of result.datasetLevelValidation.errors) {
        console.error(`  ${err.message}`);
      }
    }
  }

  console.error(
    `\nValidation summary: ${result.totalRecords - result.totalFailed}/${result.totalRecords} records valid`
  );

  process.exit(hasErrors ? 1 : 0);
}
