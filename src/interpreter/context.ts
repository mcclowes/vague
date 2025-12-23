import type { SchemaDefinition, Expression } from '../ast/index.js';
import type { ImportedSchema } from '../openapi/index.js';
import { type RetryLimits, DEFAULT_RETRY_LIMITS } from '../config/index.js';
import { SeededRandom } from './random.js';

/**
 * Generation behavior options
 */
export interface GenerationOptions {
  /**
   * If true, throw an error when constraints cannot be satisfied.
   * If false, emit a warning and return potentially invalid data.
   * Default: false (for backward compatibility)
   */
  strict?: boolean;

  /**
   * Probability that an optional field will be included (0-1).
   * Default: 0.7 (70% chance of including optional fields)
   */
  optionalFieldProbability?: number;
}

/**
 * Default generation options
 */
export const DEFAULT_GENERATION_OPTIONS: Required<GenerationOptions> = {
  strict: false,
  optionalFieldProbability: 0.7,
};

/**
 * Context maintained during generation.
 * Tracks schemas, collections, and state for sequential generation.
 *
 * ## State Lifecycle
 *
 * Context state is divided into two categories:
 *
 * ### Persistent State (preserved across resets)
 * - `schemas`: Schema definitions parsed from source
 * - `importedSchemas`: Schemas imported from OpenAPI specs
 * - `bindings`: Let bindings (name -> expression)
 *
 * These are set during parsing and remain constant for a given source.
 *
 * ### Runtime State (cleared on reset)
 * - `collections`: Generated collection data
 * - `parent`: Parent record during nested generation
 * - `current`: Current record being generated
 * - `previous`: Previous record in collection (for sequential coherence)
 * - `currentSchemaName`: Name of schema currently being generated
 * - `violating`: Whether to generate constraint-violating data
 * - `uniqueValues`: Tracks used values for unique fields
 * - `sequences`: Counters for sequence() and sequenceInt()
 * - `orderedSequenceIndices`: Cycling indices for ordered sequences [a, b, c]
 *
 * Runtime state should be reset between independent generation runs to ensure
 * reproducible results and prevent state leakage between runs.
 */
export interface GeneratorContext {
  schemas: Map<string, SchemaDefinition>;
  importedSchemas: Map<string, Map<string, ImportedSchema>>;
  collections: Map<string, unknown[]>;
  bindings: Map<string, Expression>; // let bindings (name -> expression)
  parent?: Record<string, unknown>;
  current?: Record<string, unknown>;
  previous?: Record<string, unknown>; // Previous record in collection for sequential coherence
  currentSchemaName?: string;
  violating?: boolean; // If true, generate data that violates constraints
  uniqueValues: Map<string, Set<unknown>>; // Track unique values per field
  sequences: Map<string, number>; // Track sequence counters
  orderedSequenceIndices: Map<string, number>; // Track cycling index for ordered sequences
  retryLimits: Required<RetryLimits>; // Configurable retry limits
  rng: SeededRandom; // Instance-based random number generator (avoids global state)
  options: Required<GenerationOptions>; // Generation behavior options
}

/**
 * Options for creating a generator context
 */
export interface CreateContextOptions {
  retryLimits?: RetryLimits;
  seed?: number | null;
  strict?: boolean;
  optionalFieldProbability?: number;
}

/**
 * Create a fresh generator context with all state initialized to empty.
 * @param options Optional configuration for the context
 */
export function createContext(options?: CreateContextOptions | RetryLimits): GeneratorContext {
  // Support both old API (RetryLimits) and new API (CreateContextOptions)
  const opts: CreateContextOptions =
    options && ('seed' in options || 'strict' in options || 'optionalFieldProbability' in options)
      ? options
      : { retryLimits: options as RetryLimits | undefined };

  return {
    schemas: new Map(),
    importedSchemas: new Map(),
    collections: new Map(),
    bindings: new Map(),
    uniqueValues: new Map(),
    sequences: new Map(),
    orderedSequenceIndices: new Map(),
    retryLimits: { ...DEFAULT_RETRY_LIMITS, ...opts.retryLimits },
    rng: new SeededRandom(opts.seed ?? undefined),
    options: {
      ...DEFAULT_GENERATION_OPTIONS,
      strict: opts.strict ?? DEFAULT_GENERATION_OPTIONS.strict,
      optionalFieldProbability:
        opts.optionalFieldProbability ?? DEFAULT_GENERATION_OPTIONS.optionalFieldProbability,
    },
  };
}

/**
 * Reset runtime state in a context while preserving schema definitions.
 *
 * Use this when you want to regenerate data with the same schemas but fresh
 * runtime state (e.g., for reproducible generation with a new seed, or to
 * clear accumulated unique values and sequences).
 *
 * @param ctx - The context to reset
 * @returns The same context object with runtime state cleared
 *
 * @example
 * ```typescript
 * const ctx = createContext();
 * // ... parse and generate ...
 * resetContext(ctx); // Clear runtime state, keep schemas
 * // ... generate again with fresh state ...
 * ```
 */
export function resetContext(ctx: GeneratorContext): GeneratorContext {
  // Clear runtime state
  ctx.collections.clear();
  ctx.uniqueValues.clear();
  ctx.sequences.clear();
  ctx.orderedSequenceIndices.clear();

  // Reset transient properties
  ctx.parent = undefined;
  ctx.current = undefined;
  ctx.previous = undefined;
  ctx.currentSchemaName = undefined;
  ctx.violating = undefined;

  // Preserve: schemas, importedSchemas, bindings (these are set during parsing)

  return ctx;
}

/**
 * Perform a full reset of all context state, including schema definitions.
 *
 * Use this when you want to completely clear the context for parsing
 * a new source file.
 *
 * @param ctx - The context to reset
 * @returns The same context object with all state cleared
 */
export function resetContextFull(ctx: GeneratorContext): GeneratorContext {
  // First reset runtime state
  resetContext(ctx);

  // Then clear persistent state
  ctx.schemas.clear();
  ctx.importedSchemas.clear();
  ctx.bindings.clear();

  return ctx;
}
