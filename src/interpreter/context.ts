import type { SchemaDefinition, Expression } from '../ast/index.js';
import type { ImportedSchema } from '../openapi/index.js';

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
}

/**
 * Create a fresh generator context with all state initialized to empty.
 */
export function createContext(): GeneratorContext {
  return {
    schemas: new Map(),
    importedSchemas: new Map(),
    collections: new Map(),
    bindings: new Map(),
    uniqueValues: new Map(),
    sequences: new Map(),
    orderedSequenceIndices: new Map(),
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
