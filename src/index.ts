export {
  Lexer,
  Token,
  TokenType,
  registerKeyword,
  unregisterKeyword,
  clearPluginKeywords,
} from './lexer/index.js';
export {
  Parser,
  ParserBase,
  ExpressionParser,
  TypeParser,
  StatementParser,
  registerStatementParser,
  unregisterStatementParser,
  clearStatementParsers,
  ParseError,
} from './parser/index.js';
export * from './ast/index.js';
export {
  Generator,
  registerPlugin,
  unregisterPlugin,
  getRegisteredPlugins,
  setSeed,
  getSeed,
  createContext,
  resetContext,
  resetContextFull,
  clearGeneratorCache,
  getGenerator,
  callGenerator,
  SeededRandom,
  getGlobalRandom,
  ConstraintSatisfactionError,
  DEFAULT_GENERATION_OPTIONS,
  type VaguePlugin,
  type GeneratorFunction,
  type GeneratorContext,
  type ParserContext,
  type StatementParserFunction,
  type PluginKeyword,
  type CreateContextOptions,
  type GenerationOptions,
} from './interpreter/index.js';
export {
  warningCollector,
  type VagueWarning,
  type WarningType,
  type UniqueValueExhaustionWarning,
  type ConstraintRetryLimitWarning,
  type ConstraintEvaluationErrorWarning,
  type MutationTargetNotFoundWarning,
} from './warnings.js';
export { OpenAPILoader, ImportedSchema } from './openapi/index.js';
export {
  fakerPlugin,
  fakerShorthandPlugin,
  setFakerLocale,
  setFakerSeed,
  issuerPlugin,
  issuerShorthandPlugin,
  datePlugin,
  dateShorthandPlugin,
  // Legacy aliases
  datesPlugin,
  datesShorthandPlugin,
  // Duration utilities
  isDuration,
  addDurationToDate,
  subtractDurationFromDate,
  type Duration,
  // Regex plugin
  regexPlugin,
  regexShorthandPlugin,
  // GraphQL plugin
  graphqlPlugin,
  graphqlShorthandPlugin,
  // HTTP plugin
  httpPlugin,
  httpShorthandPlugin,
  // SQL plugin
  sqlPlugin,
  sqlShorthandPlugin,
  // Plugin discovery
  discoverPlugins,
  type DiscoverOptions,
  type DiscoveredPlugin,
} from './plugins/index.js';
export {
  inferSchema,
  inferSchemaOnly,
  type InferOptions,
  type InferredField,
  type InferredSchema,
} from './infer/index.js';
export {
  toCSV,
  datasetToCSV,
  datasetToSingleCSV,
  parseCSV,
  parseCSVToDataset,
  parseMultipleCSVToDataset,
  type CsvOptions,
  type CsvParseOptions,
} from './csv/index.js';
export {
  datasetToNdjson,
  datasetToNdjsonByCollection,
  parseNdjson,
  parseNdjsonWithCollections,
  recordToNdjsonLine,
  type NdjsonOptions,
} from './ndjson/index.js';
export {
  DataValidator,
  type ValidationError as DataValidationError,
  type SchemaValidationResult,
  type DatasetValidationResult,
} from './validator/data-validator.js';
export {
  loadConfig,
  loadConfigFile,
  loadConfigFrom,
  findConfigFile,
  type VagueConfig,
  type ResolvedConfig,
  type PluginSpec,
  type LoggingConfig,
  type LogLevel,
  type LogComponent,
  type RetryLimits,
  DEFAULT_RETRY_LIMITS,
  ConfigError,
  PluginLoadError,
} from './config/index.js';
export {
  createLogger,
  configureLogging,
  setLogLevel,
  getLogLevel,
  enableDebug,
  disableLogging,
  setComponents,
  enableAllComponents,
  setTimestamps,
  setColors,
} from './logging/index.js';
export {
  SpectralLinter,
  lintOpenAPISpec,
  formatLintResults,
  type SpectralResult,
  type LintResult,
} from './spectral/index.js';
export {
  isRecord,
  isFiniteNumber,
  isSafeInteger,
  isString,
  isBoolean,
  isArray,
  isNonEmptyArray,
  isNullish,
  isValidDate,
  getProperty,
  setProperty,
  assertRecord,
  assertFiniteNumber,
} from './utils/index.js';

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Lexer } from './lexer/index.js';
import { Parser } from './parser/index.js';
import { Generator } from './interpreter/index.js';

export async function compile(
  source: string,
  options: VagueOptions = {}
): Promise<Record<string, unknown[]>> {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();

  const parser = new Parser(tokens, source);
  const ast = parser.parse();

  // Create context with all options (seed, strict mode, etc.)
  const ctx = createContext({
    retryLimits: options.retryLimits,
    seed: options.seed,
    strict: options.strict,
    optionalFieldProbability: options.optionalFieldProbability,
  });

  const generator = new Generator(ctx);
  return generator.generate(ast);
}

export function parse(source: string) {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens, source);
  return parser.parse();
}

import type { RetryLimits } from './config/index.js';
import { createContext } from './interpreter/index.js';

export interface VagueOptions {
  /**
   * Seed for reproducible random generation.
   */
  seed?: number;

  /**
   * Retry limits for constraint satisfaction.
   */
  retryLimits?: RetryLimits;

  /**
   * If true, throw an error when constraints cannot be satisfied.
   * If false (default), emit a warning and return potentially invalid data.
   */
  strict?: boolean;

  /**
   * Probability that an optional field will be included (0-1).
   * Default: 0.7 (70% chance of including optional fields)
   */
  optionalFieldProbability?: number;
}

type VagueTaggedTemplate<T> = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<T>;

function createVagueTemplate<T = Record<string, unknown[]>>(
  options: VagueOptions = {}
): VagueTaggedTemplate<T> {
  return async (strings: TemplateStringsArray, ...values: unknown[]): Promise<T> => {
    // Interpolate values into the template
    let source = strings[0];
    for (let i = 0; i < values.length; i++) {
      source += String(values[i]) + strings[i + 1];
    }

    // Use the new context-based approach - seed is now in context, not global
    const result = await compile(source, options);

    return result as T;
  };
}

// Overload: vague`...` (tagged template, returns Promise)
export function vague<T = Record<string, unknown[]>>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T>;
// Overload: vague({ seed: 42 }) (options, returns tagged template function)
export function vague<T = Record<string, unknown[]>>(options: VagueOptions): VagueTaggedTemplate<T>;
// Implementation
export function vague<T = Record<string, unknown[]>>(
  stringsOrOptions: TemplateStringsArray | VagueOptions,
  ...values: unknown[]
): Promise<T> | VagueTaggedTemplate<T> {
  // Called as vague`...` (tagged template)
  if (Array.isArray(stringsOrOptions) && 'raw' in stringsOrOptions) {
    return createVagueTemplate<T>()(stringsOrOptions as TemplateStringsArray, ...values);
  }

  // Called as vague({ seed: 42 })`...` (options then tagged template)
  return createVagueTemplate<T>(stringsOrOptions as VagueOptions);
}

export async function fromFile<T = Record<string, unknown[]>>(
  filePath: string,
  options: VagueOptions = {}
): Promise<T> {
  const absolutePath = resolve(filePath);
  const source = await readFile(absolutePath, 'utf-8');

  // Use the new context-based approach - seed is now in context, not global
  const result = await compile(source, options);

  return result as T;
}
