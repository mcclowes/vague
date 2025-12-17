import type { SchemaDefinition, ContractDefinition } from '../ast/index.js';
import type { ImportedSchema } from '../openapi/index.js';

/**
 * Context maintained during generation.
 * Tracks schemas, contracts, collections, and state for sequential generation.
 */
export interface GeneratorContext {
  schemas: Map<string, SchemaDefinition>;
  contracts: Map<string, ContractDefinition>; // Named contracts that can be applied to schemas
  importedSchemas: Map<string, Map<string, ImportedSchema>>;
  collections: Map<string, unknown[]>;
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
 * Create a fresh generator context
 */
export function createContext(): GeneratorContext {
  return {
    schemas: new Map(),
    contracts: new Map(),
    importedSchemas: new Map(),
    collections: new Map(),
    uniqueValues: new Map(),
    sequences: new Map(),
    orderedSequenceIndices: new Map(),
  };
}
