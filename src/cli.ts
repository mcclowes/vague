#!/usr/bin/env node

import { readFileSync, writeFileSync, watch as fsWatch } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { compile, registerPlugin, setSeed } from './index.js';
import { SchemaValidator } from './validator/index.js';
import {
  fakerPlugin,
  fakerShorthandPlugin,
  datePlugin,
  dateShorthandPlugin,
  issuerPlugin,
  issuerShorthandPlugin,
  regexPlugin,
  regexShorthandPlugin,
  graphqlPlugin,
  graphqlShorthandPlugin,
  discoverPlugins,
} from './plugins/index.js';
import { OpenAPIExamplePopulator } from './openapi/example-populator.js';
import { inferSchema, inferSchemaWithTypeScript } from './infer/index.js';
import {
  datasetToCSV,
  datasetToSingleCSV,
  parseCSVToDataset,
  type CsvOptions,
} from './csv/index.js';
import { DataValidator } from './validator/data-validator.js';
import { loadConfig, loadConfigFrom, type ResolvedConfig, type LogLevel } from './config/index.js';
import {
  createLogger,
  configureLogging,
  setLogLevel,
  enableDebug,
  setTimestamps,
} from './logging/index.js';
import { lintOpenAPISpec, formatLintResults } from './spectral/index.js';

// Create CLI logger
const log = createLogger('cli');

// Built-in plugins (registered after config plugins to allow overrides)
const builtinPlugins = [
  fakerPlugin,
  fakerShorthandPlugin,
  datePlugin,
  dateShorthandPlugin,
  issuerPlugin,
  issuerShorthandPlugin,
  regexPlugin,
  regexShorthandPlugin,
  graphqlPlugin,
  graphqlShorthandPlugin,
];

interface ValidationMapping {
  [collection: string]: string;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    console.log(`
vague - Declarative test data generator

Usage:
  vague <input.vague> [options]
  vague --infer <data.json|data.csv> [options]
  vague --validate-data <data.json> --schema <schema.vague> [options]

Options:
  -o, --output <file>      Write output to file (default: stdout)
  -f, --format <fmt>       Output format: json (default), csv
  -p, --pretty             Pretty-print JSON output
  -s, --seed <number>      Seed for reproducible random generation
  -w, --watch              Watch input file and regenerate on changes
  -v, --validate <spec>    Validate output against OpenAPI spec
  -m, --mapping <json>     Schema mapping for validation (JSON: {"collection": "SchemaName"})
  --validate-only          Only validate, don't output data
  -c, --config <file>      Use specific config file (default: auto-detect vague.config.js)
  --no-config              Skip loading config file
  -d, --debug              Enable debug logging (shows generation details)
  --log-level <level>      Set log level: none, error, warn, info, debug (default: warn)
  --plugins <dir>          Load plugins from directory (can be used multiple times)
  --no-auto-plugins        Disable automatic plugin discovery
  --verbose                Show verbose output (e.g., discovered plugins)
  -h, --help               Show this help message

CSV Options (when --format csv):
  --csv-delimiter <char>   Field delimiter (default: ',')
  --csv-no-header          Omit header row
  --csv-arrays <mode>      Array handling: json, first, count (default: json)
  --csv-nested <mode>      Nested object handling: flatten, json (default: flatten)

Schema Inference:
  --infer <file>           Infer Vague schema from JSON or CSV data
  --dataset-name <name>    Name for generated dataset (default: "Generated")
  --collection-name <name> Collection name for CSV input (default: derived from filename)
  --infer-delimiter <char> CSV delimiter for inference (default: ',')
  --no-formats             Disable format detection (uuid, email, etc.)
  --no-weights             Disable weighted superpositions
  --max-enum <n>           Maximum unique values for enum detection (default: 10)
  --typescript             Also generate TypeScript definitions (.d.ts file)
  --ts-only                Generate only TypeScript definitions (no .vague file)

Data Validation:
  --validate-data <file>   Validate JSON data against a Vague schema
  --schema <file>          Vague schema file for validation

OpenAPI Example Population:
  --oas-output <file>      Write OpenAPI spec with examples to file
  --oas-source <spec>      Source OpenAPI spec to populate (auto-detected if using import)
  --oas-external           Use external file references instead of inline examples
  --oas-example-count <n>  Number of examples per schema (default: 1)

OpenAPI Linting (Spectral):
  --lint-spec <file>       Lint an OpenAPI spec file with Spectral rules
  --lint-verbose           Show detailed lint results including hints

Examples:
  vague schema.vague -o output.json -p
  vague schema.vague -s 12345                 # Reproducible output
  vague schema.vague -f csv -o data.csv       # CSV output
  vague schema.vague -f csv --csv-delimiter ";" -o data.csv  # Semicolon-delimited
  vague schema.vague -v openapi.json -m '{"invoices": "AccountingInvoice"}'
  vague schema.vague -v openapi.json -m '{"invoices": "AccountingInvoice"}' --validate-only

  # Infer schema from JSON or CSV data
  vague --infer data.json -o schema.vague
  vague --infer data.csv -o schema.vague
  vague --infer data.csv --collection-name users -o schema.vague
  vague --infer data.json --dataset-name TestFixtures

  # Infer schema with TypeScript definitions
  vague --infer data.json -o schema.vague --typescript     # Outputs schema.vague and schema.vague.d.ts
  vague --infer data.json -o types.d.ts --ts-only          # Only outputs TypeScript definitions

  # Populate OpenAPI spec with examples
  vague schema.vague --oas-output api-with-examples.json --oas-source api.json
  vague schema.vague --oas-output api.json --oas-source api.json --oas-example-count 3
  vague schema.vague --oas-output api.json --oas-source api.json --oas-external

  # Validate data against Vague schema
  vague --validate-data data.json --schema schema.vague -m '{"invoices": "Invoice"}'

  # Lint an OpenAPI spec with Spectral
  vague --lint-spec openapi.json
  vague --lint-spec openapi.yaml --lint-verbose

  # Use custom config file
  vague schema.vague -c ./custom-config.js
  vague schema.vague --no-config  # Skip config file

Configuration File (vague.config.js):
  // vague.config.js
  export default {
    plugins: [
      './my-plugin.js',           // Local plugin file
      'vague-plugin-stripe',      // npm package
    ],
    seed: 42,                     // Default seed
    format: 'json',               // Default format
    pretty: true,                 // Pretty-print by default
    logging: {
      level: 'debug',             // Log level: none, error, warn, info, debug
      components: ['generator'],  // Filter to specific components
      timestamps: true            // Include timestamps
    }
  };
`);
    process.exit(0);
  }

  let inputFile: string | null = null;
  let outputFile: string | null = null;
  let outputFormat: 'json' | 'csv' = 'json';
  let pretty = false;
  let seed: number | null = null;
  let validateSpec: string | null = null;
  let schemaMapping: ValidationMapping | null = null;
  let validateOnly = false;
  let oasOutput: string | null = null;
  let oasSource: string | null = null;
  let oasExternal = false;
  let oasExampleCount = 1;
  let watchMode = false;

  // CSV options
  const csvOptions: CsvOptions = {};

  // Inference options
  let inferFile: string | null = null;
  let datasetName = 'Generated';
  let collectionName: string | null = null;
  let inferDelimiter = ',';
  let detectFormats = true;
  let weightedSuperpositions = true;
  let maxEnumValues = 10;
  let generateTypescript = false;
  let typescriptOnly = false;

  // Data validation options
  let validateDataFile: string | null = null;
  let schemaFile: string | null = null;

  // Config options
  let configFile: string | null = null;
  let noConfig = false;

  // Logging options
  let debugMode = false;
  let logLevelArg: LogLevel | null = null;

  // Plugin options
  const pluginDirs: string[] = [];
  let autoPlugins = true;
  let verbose = false;

  // Spectral linting options
  let lintSpecFile: string | null = null;
  let lintVerbose = false;

  for (let i = 0; i < args.length; i++) {
    // Handle --infer flag first
    if (args[i] === '--infer') {
      inferFile = args[++i];
      continue;
    }

    // First positional argument is input file (if not using --infer)
    if (!args[i].startsWith('-') && inputFile === null && inferFile === null) {
      inputFile = args[i];
      continue;
    }
    if (args[i] === '-o' || args[i] === '--output') {
      outputFile = args[++i];
    } else if (args[i] === '-f' || args[i] === '--format') {
      const fmt = args[++i];
      if (fmt !== 'json' && fmt !== 'csv') {
        console.error('Error: Format must be "json" or "csv"');
        process.exit(1);
      }
      outputFormat = fmt;
    } else if (args[i] === '-p' || args[i] === '--pretty') {
      pretty = true;
    } else if (args[i] === '--csv-delimiter') {
      csvOptions.delimiter = args[++i];
    } else if (args[i] === '--csv-no-header') {
      csvOptions.header = false;
    } else if (args[i] === '--csv-arrays') {
      const mode = args[++i];
      if (mode !== 'json' && mode !== 'first' && mode !== 'count') {
        console.error('Error: --csv-arrays must be "json", "first", or "count"');
        process.exit(1);
      }
      csvOptions.arrayHandling = mode;
    } else if (args[i] === '--csv-nested') {
      const mode = args[++i];
      if (mode !== 'flatten' && mode !== 'json') {
        console.error('Error: --csv-nested must be "flatten" or "json"');
        process.exit(1);
      }
      csvOptions.nestedHandling = mode;
    } else if (args[i] === '-s' || args[i] === '--seed') {
      seed = parseInt(args[++i], 10);
      if (isNaN(seed)) {
        console.error('Error: Seed must be a valid integer');
        process.exit(1);
      }
    } else if (args[i] === '-w' || args[i] === '--watch') {
      watchMode = true;
    } else if (args[i] === '-v' || args[i] === '--validate') {
      validateSpec = args[++i];
    } else if (args[i] === '-m' || args[i] === '--mapping') {
      try {
        schemaMapping = JSON.parse(args[++i]) as ValidationMapping;
      } catch {
        console.error('Error: Invalid JSON for schema mapping');
        process.exit(1);
      }
    } else if (args[i] === '--validate-only') {
      validateOnly = true;
    } else if (args[i] === '--oas-output') {
      oasOutput = args[++i];
    } else if (args[i] === '--oas-source') {
      oasSource = args[++i];
    } else if (args[i] === '--oas-external') {
      oasExternal = true;
    } else if (args[i] === '--oas-example-count') {
      oasExampleCount = parseInt(args[++i], 10);
      if (isNaN(oasExampleCount) || oasExampleCount < 1) {
        console.error('Error: --oas-example-count must be a positive integer');
        process.exit(1);
      }
    } else if (args[i] === '--dataset-name') {
      datasetName = args[++i];
    } else if (args[i] === '--collection-name') {
      collectionName = args[++i];
    } else if (args[i] === '--infer-delimiter') {
      inferDelimiter = args[++i];
    } else if (args[i] === '--no-formats') {
      detectFormats = false;
    } else if (args[i] === '--no-weights') {
      weightedSuperpositions = false;
    } else if (args[i] === '--max-enum') {
      maxEnumValues = parseInt(args[++i], 10);
      if (isNaN(maxEnumValues) || maxEnumValues < 1) {
        console.error('Error: --max-enum must be a positive integer');
        process.exit(1);
      }
    } else if (args[i] === '--typescript') {
      generateTypescript = true;
    } else if (args[i] === '--ts-only') {
      typescriptOnly = true;
      generateTypescript = true; // ts-only implies typescript generation
    } else if (args[i] === '--validate-data') {
      validateDataFile = args[++i];
    } else if (args[i] === '--schema') {
      schemaFile = args[++i];
    } else if (args[i] === '-c' || args[i] === '--config') {
      configFile = args[++i];
    } else if (args[i] === '--no-config') {
      noConfig = true;
    } else if (args[i] === '-d' || args[i] === '--debug') {
      debugMode = true;
    } else if (args[i] === '--log-level') {
      const level = args[++i] as LogLevel;
      if (!['none', 'error', 'warn', 'info', 'debug'].includes(level)) {
        console.error(
          `Error: Invalid log level '${level}'. Must be: none, error, warn, info, debug`
        );
        process.exit(1);
      }
      logLevelArg = level;
    } else if (args[i] === '--plugins') {
      pluginDirs.push(args[++i]);
    } else if (args[i] === '--no-auto-plugins') {
      autoPlugins = false;
    } else if (args[i] === '--verbose') {
      verbose = true;
    } else if (args[i] === '--lint-spec') {
      lintSpecFile = args[++i];
    } else if (args[i] === '--lint-verbose') {
      lintVerbose = true;
    }
  }

  // Discover and register external plugins
  if (autoPlugins || pluginDirs.length > 0) {
    const discovered = await discoverPlugins({
      pluginDirs,
      searchNodeModules: autoPlugins,
      verbose,
    });
    for (const { plugin } of discovered) {
      registerPlugin(plugin);
    }
  }

  // Load config file (unless disabled)
  let config: ResolvedConfig | null = null;
  if (!noConfig) {
    try {
      config = configFile ? await loadConfigFrom(configFile) : await loadConfig();
      if (config) {
        // Register plugins from config first (they can be overridden by built-ins)
        for (const plugin of config.plugins) {
          registerPlugin(plugin);
        }
        if (config.configPath) {
          console.error(`Loaded config from ${config.configPath}`);
        }
      }
    } catch (err) {
      console.error(`Error loading config: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  }

  // Register built-in plugins (after config plugins so they take precedence)
  for (const plugin of builtinPlugins) {
    registerPlugin(plugin);
  }

  // Configure logging (config first, then CLI overrides)
  if (config?.logging) {
    configureLogging(config.logging);
    log.debug('Applied logging config from file', { configPath: config.configPath });
  }

  // CLI logging flags take precedence over config
  if (debugMode) {
    enableDebug();
    log.info('Debug logging enabled via --debug flag');
  } else if (logLevelArg) {
    setLogLevel(logLevelArg);
    if (logLevelArg === 'info' || logLevelArg === 'debug') {
      setTimestamps(true);
    }
    log.debug('Log level set via --log-level flag', { level: logLevelArg });
  }

  // Apply config defaults (CLI flags take precedence)
  if (config) {
    if (seed === null && config.seed !== undefined) {
      seed = config.seed;
    }
    if (outputFormat === 'json' && config.format !== undefined) {
      outputFormat = config.format;
    }
    if (!pretty && config.pretty !== undefined) {
      pretty = config.pretty;
    }
  }

  try {
    // Handle Spectral linting mode
    if (lintSpecFile) {
      console.error(`Linting OpenAPI spec: ${lintSpecFile}`);
      const lintResult = await lintOpenAPISpec(resolve(lintSpecFile));

      console.error(formatLintResults(lintResult, lintVerbose));

      if (!lintResult.valid) {
        console.error('\nSpec has linting errors.');
        process.exit(1);
      } else if (lintResult.warningCount > 0) {
        console.error('\nSpec passed with warnings.');
        process.exit(0);
      } else {
        console.error('\nSpec passed linting.');
        process.exit(0);
      }
    }

    // Handle schema inference mode
    if (inferFile) {
      const fileContent = readFileSync(resolve(inferFile), 'utf-8');
      let data: Record<string, unknown[]>;

      // Determine if input is CSV or JSON based on file extension
      const isCSV = inferFile.toLowerCase().endsWith('.csv');

      if (isCSV) {
        // Parse CSV input
        // Derive collection name from filename if not specified
        const derivedCollectionName =
          collectionName ?? inferFile.replace(/^.*[\\/]/, '').replace(/\.csv$/i, '');
        data = parseCSVToDataset(fileContent, {
          delimiter: inferDelimiter,
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
        datasetName,
        detectFormats,
        weightedSuperpositions,
        maxEnumValues,
      };

      if (generateTypescript) {
        // Generate both Vague and TypeScript
        const result = inferSchemaWithTypeScript(data, inferOptions);

        if (outputFile) {
          // Determine output file names
          const vagueFile = typescriptOnly
            ? null
            : outputFile.endsWith('.d.ts')
              ? outputFile.replace(/\.d\.ts$/, '.vague')
              : outputFile;
          const tsFile = outputFile.endsWith('.vague')
            ? outputFile.replace(/\.vague$/, '.d.ts')
            : outputFile.endsWith('.d.ts')
              ? outputFile
              : outputFile + '.d.ts';

          // Write Vague file (unless ts-only)
          if (!typescriptOnly && vagueFile) {
            writeFileSync(resolve(vagueFile), result.vague);
            console.error(`Vague schema written to ${vagueFile}`);
          }

          // Write TypeScript file
          writeFileSync(resolve(tsFile), result.typescript);
          console.error(`TypeScript definitions written to ${tsFile}`);
        } else {
          // Output to stdout
          if (!typescriptOnly) {
            console.log('// === Vague Schema ===');
            console.log(result.vague);
            console.log('\n// === TypeScript Definitions ===');
          }
          console.log(result.typescript);
        }
      } else {
        // Generate only Vague code
        const vagueCode = inferSchema(data, inferOptions);

        if (outputFile) {
          writeFileSync(resolve(outputFile), vagueCode);
          console.error(`Vague schema written to ${outputFile}`);
        } else {
          console.log(vagueCode);
        }
      }

      process.exit(0);
    }

    // Handle data validation mode
    if (validateDataFile) {
      if (!schemaFile) {
        console.error('Error: --schema is required when using --validate-data');
        process.exit(1);
      }

      // Load the data
      const dataContent = readFileSync(resolve(validateDataFile), 'utf-8');
      let data: Record<string, unknown[]>;
      try {
        data = JSON.parse(dataContent) as Record<string, unknown[]>;
      } catch {
        console.error('Error: Invalid JSON in data file');
        process.exit(1);
        return;
      }

      // Load the schema
      const schemaContent = readFileSync(resolve(schemaFile), 'utf-8');
      const validator = new DataValidator();
      const schemas = validator.loadSchema(schemaContent);

      console.error(`Loaded schemas: ${schemas.join(', ')}`);

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

      const result = validator.validateDataset(data, schemaMapping);

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

      console.error(
        `\nValidation summary: ${result.totalRecords - result.totalFailed}/${result.totalRecords} records valid`
      );

      process.exit(hasErrors ? 1 : 0);
    }

    // Normal compilation mode
    if (!inputFile) {
      console.error('Error: No input file specified');
      process.exit(1);
    }

    // Watch mode validation - requires output file
    if (watchMode && !outputFile) {
      console.error('Error: Watch mode requires -o/--output to be specified');
      process.exit(1);
    }

    // Define compilation function for reuse in watch mode
    async function runCompilation(): Promise<boolean> {
      // Set seed if provided for reproducible generation
      if (seed !== null) {
        setSeed(seed);
      }

      const source = readFileSync(resolve(inputFile!), 'utf-8');
      const result = await compile(source);

      // Validate if spec provided
      if (validateSpec) {
        const validator = new SchemaValidator();
        const loadedSchemas = await validator.loadOpenAPISchemas(resolve(validateSpec));

        console.error(`Loaded ${loadedSchemas.length} schemas from ${validateSpec}`);

        if (schemaMapping) {
          const validationResults = validator.validateDataset(
            result as Record<string, unknown[]>,
            schemaMapping
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

          if (hasErrors && validateOnly) {
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
      if (oasOutput) {
        if (!oasSource) {
          console.error('Error: --oas-source is required when using --oas-output');
          return false;
        }

        const populator = new OpenAPIExamplePopulator();
        const oasDoc = await populator.loadDocument(resolve(oasSource));

        const outputDir = dirname(resolve(oasOutput));
        const { document: populatedDoc, externalFiles } = populator.populate(
          oasDoc,
          result as Record<string, unknown[]>,
          {
            externalRefs: oasExternal,
            exampleCount: oasExampleCount,
            outputDir,
            mapping: schemaMapping ?? undefined,
          }
        );

        // Write external files if using external refs
        if (externalFiles && externalFiles.size > 0) {
          populator.writeExternalFiles(externalFiles);
          console.error(`Written ${externalFiles.size} external example files`);
        }

        // Write the populated OpenAPI spec
        const oasJson = JSON.stringify(populatedDoc, null, 2);
        writeFileSync(resolve(oasOutput), oasJson);
        console.error(`OpenAPI spec with examples written to ${oasOutput}`);
      }

      // Output data unless validate-only
      if (!validateOnly) {
        if (outputFormat === 'csv') {
          // CSV output
          const csvCollections = datasetToCSV(result as Record<string, unknown[]>, csvOptions);

          if (outputFile) {
            // If output file specified with multiple collections, write separate files
            if (csvCollections.size === 1) {
              // Single collection: write directly to output file
              const csv = Array.from(csvCollections.values())[0];
              writeFileSync(resolve(outputFile), csv ?? '');
              console.error(`CSV output written to ${outputFile}`);
            } else {
              // Multiple collections: write separate files with collection name suffix
              const baseName = outputFile.replace(/\.csv$/i, '');
              for (const [collectionName, csv] of csvCollections) {
                const fileName = `${baseName}_${collectionName}.csv`;
                writeFileSync(resolve(fileName), csv ?? '');
                console.error(`CSV output written to ${fileName}`);
              }
            }
          } else {
            // stdout: use single CSV format with section markers
            console.log(datasetToSingleCSV(result as Record<string, unknown[]>, csvOptions));
          }
        } else {
          // JSON output
          const json = pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result);

          if (outputFile) {
            writeFileSync(resolve(outputFile), json);
            console.error(`Output written to ${outputFile}`);
          } else {
            console.log(json);
          }
        }
      }

      return true;
    }

    // Run initial compilation
    const success = await runCompilation();
    if (!success && !watchMode) {
      process.exit(1);
    }

    // Set up watch mode if enabled
    if (watchMode) {
      const resolvedInput = resolve(inputFile);
      console.error(`\nWatching ${inputFile} for changes... (Ctrl+C to exit)`);

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
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
