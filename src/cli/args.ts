/**
 * CLI argument parsing.
 */

import type { LogLevel } from '../config/index.js';
import { type CliOptions, type ValidationMapping, createDefaultOptions } from './types.js';

export function parseArgs(args: string[]): CliOptions {
  const options = createDefaultOptions();

  for (let i = 0; i < args.length; i++) {
    // Handle --infer flag first
    if (args[i] === '--infer') {
      options.inferFile = args[++i];
      continue;
    }

    // First positional argument is input file (if not using --infer)
    if (!args[i].startsWith('-') && options.inputFile === null && options.inferFile === null) {
      options.inputFile = args[i];
      continue;
    }

    if (args[i] === '-o' || args[i] === '--output') {
      options.outputFile = args[++i];
    } else if (args[i] === '-f' || args[i] === '--format') {
      const fmt = args[++i];
      if (fmt !== 'json' && fmt !== 'csv' && fmt !== 'ndjson') {
        console.error('Error: Format must be "json", "csv", or "ndjson"');
        process.exit(1);
      }
      options.outputFormat = fmt as 'json' | 'csv' | 'ndjson';
    } else if (args[i] === '-p' || args[i] === '--pretty') {
      options.pretty = true;
    } else if (args[i] === '--csv-delimiter') {
      options.csvOptions.delimiter = args[++i];
    } else if (args[i] === '--csv-no-header') {
      options.csvOptions.header = false;
    } else if (args[i] === '--csv-arrays') {
      const mode = args[++i];
      if (mode !== 'json' && mode !== 'first' && mode !== 'count') {
        console.error('Error: --csv-arrays must be "json", "first", or "count"');
        process.exit(1);
      }
      options.csvOptions.arrayHandling = mode as 'json' | 'first' | 'count';
    } else if (args[i] === '--csv-nested') {
      const mode = args[++i];
      if (mode !== 'flatten' && mode !== 'json') {
        console.error('Error: --csv-nested must be "flatten" or "json"');
        process.exit(1);
      }
      options.csvOptions.nestedHandling = mode as 'flatten' | 'json';
    } else if (args[i] === '-s' || args[i] === '--seed') {
      options.seed = parseInt(args[++i], 10);
      if (isNaN(options.seed)) {
        console.error('Error: Seed must be a valid integer');
        process.exit(1);
      }
    } else if (args[i] === '-w' || args[i] === '--watch') {
      options.watchMode = true;
    } else if (args[i] === '-v' || args[i] === '--validate') {
      options.validateSpec = args[++i];
    } else if (args[i] === '-m' || args[i] === '--mapping') {
      try {
        options.schemaMapping = JSON.parse(args[++i]) as ValidationMapping;
      } catch {
        console.error('Error: Invalid JSON for schema mapping');
        process.exit(1);
      }
    } else if (args[i] === '--validate-only') {
      options.validateOnly = true;
    } else if (args[i] === '--oas-output') {
      options.oasOutput = args[++i];
    } else if (args[i] === '--oas-source') {
      options.oasSource = args[++i];
    } else if (args[i] === '--oas-external') {
      options.oasExternal = true;
    } else if (args[i] === '--oas-example-count') {
      options.oasExampleCount = parseInt(args[++i], 10);
      if (isNaN(options.oasExampleCount) || options.oasExampleCount < 1) {
        console.error('Error: --oas-example-count must be a positive integer');
        process.exit(1);
      }
    } else if (args[i] === '--dataset-name') {
      options.datasetName = args[++i];
    } else if (args[i] === '--collection-name') {
      options.collectionName = args[++i];
    } else if (args[i] === '--infer-delimiter') {
      options.inferDelimiter = args[++i];
    } else if (args[i] === '--no-formats') {
      options.detectFormats = false;
    } else if (args[i] === '--no-weights') {
      options.weightedSuperpositions = false;
    } else if (args[i] === '--max-enum') {
      options.maxEnumValues = parseInt(args[++i], 10);
      if (isNaN(options.maxEnumValues) || options.maxEnumValues < 1) {
        console.error('Error: --max-enum must be a positive integer');
        process.exit(1);
      }
    } else if (args[i] === '--typescript') {
      options.generateTypescript = true;
    } else if (args[i] === '--ts-only') {
      options.typescriptOnly = true;
      options.generateTypescript = true; // ts-only implies typescript generation
    } else if (args[i] === '--validate-data') {
      options.validateDataFile = args[++i];
    } else if (args[i] === '--schema') {
      options.schemaFile = args[++i];
    } else if (args[i] === '--dataset') {
      options.validationDatasetName = args[++i];
    } else if (args[i] === '-c' || args[i] === '--config') {
      options.configFile = args[++i];
    } else if (args[i] === '--no-config') {
      options.noConfig = true;
    } else if (args[i] === '-d' || args[i] === '--debug') {
      options.debugMode = true;
    } else if (args[i] === '--log-level') {
      const level = args[++i] as LogLevel;
      if (!['none', 'error', 'warn', 'info', 'debug'].includes(level)) {
        console.error(
          `Error: Invalid log level '${level}'. Must be: none, error, warn, info, debug`
        );
        process.exit(1);
      }
      options.logLevelArg = level;
    } else if (args[i] === '--plugins') {
      options.pluginDirs.push(args[++i]);
    } else if (args[i] === '--no-auto-plugins') {
      options.autoPlugins = false;
    } else if (args[i] === '--verbose') {
      options.verbose = true;
    } else if (args[i] === '--lint-spec') {
      options.lintSpecFile = args[++i];
    } else if (args[i] === '--lint-verbose') {
      options.lintVerbose = true;
    } else if (args[i] === '--serve') {
      // Check if next arg is a port number
      const nextArg = args[i + 1];
      if (nextArg && !nextArg.startsWith('-') && !isNaN(parseInt(nextArg, 10))) {
        options.servePort = parseInt(args[++i], 10);
      } else {
        options.servePort = 3000; // default port
      }
    }
  }

  return options;
}
