/**
 * CLI type definitions and shared utilities.
 */

import type { CsvOptions } from '../csv/index.js';
import type { LogLevel } from '../config/index.js';

export interface ValidationMapping {
  [collection: string]: string;
}

export interface CliOptions {
  // Input/output
  inputFile: string | null;
  outputFile: string | null;
  outputFormat: 'json' | 'csv' | 'ndjson';
  pretty: boolean;
  seed: number | null;
  watchMode: boolean;

  // Validation
  validateSpec: string | null;
  schemaMapping: ValidationMapping | null;
  validateOnly: boolean;

  // OpenAPI example population
  oasOutput: string | null;
  oasSource: string | null;
  oasExternal: boolean;
  oasExampleCount: number;

  // CSV options
  csvOptions: CsvOptions;

  // Inference options
  inferFile: string | null;
  datasetName: string;
  collectionName: string | null;
  inferDelimiter: string;
  detectFormats: boolean;
  weightedSuperpositions: boolean;
  maxEnumValues: number;
  generateTypescript: boolean;
  typescriptOnly: boolean;

  // Data validation options
  validateDataFile: string | null;
  schemaFile: string | null;
  validationDatasetName: string | null;

  // Config options
  configFile: string | null;
  noConfig: boolean;

  // Logging options
  debugMode: boolean;
  logLevelArg: LogLevel | null;

  // Plugin options
  pluginDirs: string[];
  autoPlugins: boolean;
  verbose: boolean;

  // Spectral linting options
  lintSpecFile: string | null;
  lintVerbose: boolean;

  // Mock server options
  servePort: number | null;
}

export function createDefaultOptions(): CliOptions {
  return {
    inputFile: null,
    outputFile: null,
    outputFormat: 'json',
    pretty: false,
    seed: null,
    watchMode: false,
    validateSpec: null,
    schemaMapping: null,
    validateOnly: false,
    oasOutput: null,
    oasSource: null,
    oasExternal: false,
    oasExampleCount: 1,
    csvOptions: {},
    inferFile: null,
    datasetName: 'Generated',
    collectionName: null,
    inferDelimiter: ',',
    detectFormats: true,
    weightedSuperpositions: true,
    maxEnumValues: 10,
    generateTypescript: false,
    typescriptOnly: false,
    validateDataFile: null,
    schemaFile: null,
    validationDatasetName: null,
    configFile: null,
    noConfig: false,
    debugMode: false,
    logLevelArg: null,
    pluginDirs: [],
    autoPlugins: true,
    verbose: false,
    lintSpecFile: null,
    lintVerbose: false,
    servePort: null,
  };
}
