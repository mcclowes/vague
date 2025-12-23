/**
 * Normal compilation handler.
 */

import { readFileSync, writeFileSync, watch as fsWatch } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { compile } from '../../index.js';
import { SchemaValidator } from '../../validator/index.js';
import { OpenAPIExamplePopulator } from '../../openapi/example-populator.js';
import { datasetToCSV, datasetToSingleCSV } from '../../csv/index.js';
import { datasetToNdjson } from '../../ndjson/index.js';
import type { CliOptions } from '../types.js';

export async function handleCompile(options: CliOptions): Promise<void> {
  if (!options.inputFile) {
    console.error('Error: No input file specified');
    process.exit(1);
  }

  // Watch mode validation - requires output file
  if (options.watchMode && !options.outputFile) {
    console.error('Error: Watch mode requires -o/--output to be specified');
    process.exit(1);
  }

  // Define compilation function for reuse in watch mode
  async function runCompilation(): Promise<boolean> {
    const source = readFileSync(resolve(options.inputFile!), 'utf-8');

    // Pass seed through compile options (context-based, not global)
    const result = await compile(source, {
      seed: options.seed ?? undefined,
    });

    // Validate if spec provided
    if (options.validateSpec) {
      const validator = new SchemaValidator();
      const loadedSchemas = await validator.loadOpenAPISchemas(resolve(options.validateSpec));

      console.error(`Loaded ${loadedSchemas.length} schemas from ${options.validateSpec}`);

      if (options.schemaMapping) {
        const validationResults = validator.validateDataset(
          result as Record<string, unknown[]>,
          options.schemaMapping
        );

        let totalValidated = 0;
        let totalFailed = 0;
        let hasErrors = false;

        for (const { collection, schema, result: collResult } of validationResults) {
          totalValidated += collResult.itemsValidated;
          totalFailed += collResult.itemsFailed;

          if (collResult.valid) {
            console.error(
              `✓ ${collection} (${collResult.itemsValidated} items) - valid against ${schema}`
            );
          } else {
            hasErrors = true;
            console.error(
              `✗ ${collection} (${collResult.itemsFailed}/${collResult.itemsValidated} failed) - invalid against ${schema}`
            );

            // Show first few errors
            const errorsToShow = collResult.errors.slice(0, 5);
            for (const err of errorsToShow) {
              console.error(`  ${err.path}: ${err.message}`);
            }
            if (collResult.errors.length > 5) {
              console.error(`  ... and ${collResult.errors.length - 5} more errors`);
            }
          }
        }

        console.error(
          `\nValidation summary: ${totalValidated - totalFailed}/${totalValidated} items valid`
        );

        if (hasErrors && options.validateOnly) {
          return false;
        }
      } else {
        console.error('Available schemas:', loadedSchemas.slice(0, 20).join(', '));
        if (loadedSchemas.length > 20) {
          console.error(`  ... and ${loadedSchemas.length - 20} more`);
        }
        console.error(
          '\nUse -m/--mapping to specify which collections to validate against which schemas'
        );
      }
    }

    // Populate OpenAPI spec with examples if requested
    if (options.oasOutput) {
      if (!options.oasSource) {
        console.error('Error: --oas-source is required when using --oas-output');
        return false;
      }

      const populator = new OpenAPIExamplePopulator();
      const oasDoc = await populator.loadDocument(resolve(options.oasSource));

      const outputDir = dirname(resolve(options.oasOutput));
      const { document: populatedDoc, externalFiles } = populator.populate(
        oasDoc,
        result as Record<string, unknown[]>,
        {
          externalRefs: options.oasExternal,
          exampleCount: options.oasExampleCount,
          outputDir,
          mapping: options.schemaMapping ?? undefined,
        }
      );

      // Write external files if using external refs
      if (externalFiles && externalFiles.size > 0) {
        populator.writeExternalFiles(externalFiles);
        console.error(`Written ${externalFiles.size} external example files`);
      }

      // Write the populated OpenAPI spec
      const oasJson = JSON.stringify(populatedDoc, null, 2);
      writeFileSync(resolve(options.oasOutput), oasJson);
      console.error(`OpenAPI spec with examples written to ${options.oasOutput}`);
    }

    // Output data unless validate-only
    if (!options.validateOnly) {
      if (options.outputFormat === 'csv') {
        // CSV output
        const csvCollections = datasetToCSV(
          result as Record<string, unknown[]>,
          options.csvOptions
        );

        if (options.outputFile) {
          // If output file specified with multiple collections, write separate files
          if (csvCollections.size === 1) {
            // Single collection: write directly to output file
            const csv = Array.from(csvCollections.values())[0];
            writeFileSync(resolve(options.outputFile), csv ?? '');
            console.error(`CSV output written to ${options.outputFile}`);
          } else {
            // Multiple collections: write separate files with collection name suffix
            const baseName = options.outputFile.replace(/\.csv$/i, '');
            for (const [collectionName, csv] of csvCollections) {
              const fileName = `${baseName}_${collectionName}.csv`;
              writeFileSync(resolve(fileName), csv ?? '');
              console.error(`CSV output written to ${fileName}`);
            }
          }
        } else {
          // stdout: use single CSV format with section markers
          console.log(datasetToSingleCSV(result as Record<string, unknown[]>, options.csvOptions));
        }
      } else if (options.outputFormat === 'ndjson') {
        // NDJSON output
        const ndjson = datasetToNdjson(result as Record<string, unknown[]>);

        if (options.outputFile) {
          writeFileSync(resolve(options.outputFile), ndjson);
          console.error(`NDJSON output written to ${options.outputFile}`);
        } else {
          console.log(ndjson);
        }
      } else {
        // JSON output
        const json = options.pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result);

        if (options.outputFile) {
          writeFileSync(resolve(options.outputFile), json);
          console.error(`Output written to ${options.outputFile}`);
        } else {
          console.log(json);
        }
      }
    }

    return true;
  }

  // Run initial compilation
  const success = await runCompilation();
  if (!success && !options.watchMode) {
    process.exit(1);
  }

  // Set up watch mode if enabled
  if (options.watchMode) {
    const resolvedInput = resolve(options.inputFile);
    console.error(`\nWatching ${options.inputFile} for changes... (Ctrl+C to exit)`);

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    fsWatch(resolvedInput, (eventType) => {
      if (eventType === 'change') {
        // Debounce rapid changes
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(async () => {
          const timestamp = new Date().toLocaleTimeString();
          console.error(`\n[${timestamp}] File changed, regenerating...`);
          try {
            await runCompilation();
          } catch (err) {
            console.error('Error:', err instanceof Error ? err.message : err);
          }
        }, 100);
      }
    });

    // Keep process alive
    process.stdin.resume();
  }
}
