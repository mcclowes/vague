export { Lexer, Token, TokenType } from './lexer/index.js';
export { Parser } from './parser/index.js';
export * from './ast/index.js';
export {
  Generator,
  registerPlugin,
  getRegisteredPlugins,
  setSeed,
  getSeed,
  type VaguePlugin,
  type GeneratorFunction,
  type GeneratorContext,
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
  ConfigError,
  PluginLoadError,
} from './config/index.js';

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Lexer } from './lexer/index.js';
import { Parser } from './parser/index.js';
import { Generator } from './interpreter/index.js';
import { setSeed } from './interpreter/index.js';

export async function compile(source: string): Promise<Record<string, unknown[]>> {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();

  const parser = new Parser(tokens);
  const ast = parser.parse();

  const generator = new Generator();
  return generator.generate(ast);
}

export function parse(source: string) {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}

export interface VagueOptions {
  seed?: number;
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

    if (options.seed !== undefined) {
      setSeed(options.seed);
    }

    const result = await compile(source);

    // Reset seed after generation to avoid affecting other calls
    if (options.seed !== undefined) {
      setSeed(null);
    }

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

  if (options.seed !== undefined) {
    setSeed(options.seed);
  }

  const result = await compile(source);

  if (options.seed !== undefined) {
    setSeed(null);
  }

  return result as T;
}
