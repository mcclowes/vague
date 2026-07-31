import { describe, it, expect } from 'vitest';
import { createContext, resetContext, resetContextFull } from './context.js';
import type { SchemaDefinition } from '../ast/index.js';

describe('createContext', () => {
  it('creates a fresh context with empty maps', () => {
    const ctx = createContext();

    expect(ctx.schemas).toBeInstanceOf(Map);
    expect(ctx.schemas.size).toBe(0);
    expect(ctx.importedSchemas).toBeInstanceOf(Map);
    expect(ctx.importedSchemas.size).toBe(0);
    expect(ctx.collections).toBeInstanceOf(Map);
    expect(ctx.collections.size).toBe(0);
    expect(ctx.bindings).toBeInstanceOf(Map);
    expect(ctx.bindings.size).toBe(0);
    expect(ctx.uniqueValues).toBeInstanceOf(Map);
    expect(ctx.uniqueValues.size).toBe(0);
    expect(ctx.sequences).toBeInstanceOf(Map);
    expect(ctx.sequences.size).toBe(0);
    expect(ctx.orderedSequenceIndices).toBeInstanceOf(Map);
    expect(ctx.orderedSequenceIndices.size).toBe(0);
  });

  it('creates context with undefined transient properties', () => {
    const ctx = createContext();

    expect(ctx.parent).toBeUndefined();
    expect(ctx.current).toBeUndefined();
    expect(ctx.previous).toBeUndefined();
    expect(ctx.currentSchemaName).toBeUndefined();
    expect(ctx.violating).toBeUndefined();
  });
});

describe('resetContext', () => {
  it('clears runtime state', () => {
    const ctx = createContext();

    // Set up some runtime state
    ctx.collections.set('users', [{ id: 1 }, { id: 2 }]);
    ctx.uniqueValues.set('user.id', new Set([1, 2]));
    ctx.sequences.set('invoice', 1001);
    ctx.orderedSequenceIndices.set('colors', 2);
    ctx.parent = { name: 'parent' };
    ctx.current = { name: 'current' };
    ctx.previous = { name: 'previous' };
    ctx.currentSchemaName = 'User';
    ctx.violating = true;

    resetContext(ctx);

    // Runtime state should be cleared
    expect(ctx.collections.size).toBe(0);
    expect(ctx.uniqueValues.size).toBe(0);
    expect(ctx.sequences.size).toBe(0);
    expect(ctx.orderedSequenceIndices.size).toBe(0);
    expect(ctx.parent).toBeUndefined();
    expect(ctx.current).toBeUndefined();
    expect(ctx.previous).toBeUndefined();
    expect(ctx.currentSchemaName).toBeUndefined();
    expect(ctx.violating).toBeUndefined();
  });

  it('preserves schema definitions', () => {
    const ctx = createContext();

    // Set up persistent state
    const mockSchema = {
      type: 'SchemaDefinition',
      name: 'User',
      fields: [],
    } as unknown as SchemaDefinition;

    ctx.schemas.set('User', mockSchema);
    ctx.importedSchemas.set('petstore', new Map([['Pet', { fields: [] }]]));
    ctx.bindings.set('limit', { type: 'Literal', value: 100 } as never);

    // Also set runtime state
    ctx.collections.set('users', [{ id: 1 }]);
    ctx.sequences.set('counter', 5);

    resetContext(ctx);

    // Persistent state should be preserved
    expect(ctx.schemas.size).toBe(1);
    expect(ctx.schemas.get('User')).toBe(mockSchema);
    expect(ctx.importedSchemas.size).toBe(1);
    expect(ctx.bindings.size).toBe(1);

    // Runtime state should be cleared
    expect(ctx.collections.size).toBe(0);
    expect(ctx.sequences.size).toBe(0);
  });

  it('returns the same context object', () => {
    const ctx = createContext();
    const result = resetContext(ctx);

    expect(result).toBe(ctx);
  });
});

describe('resetContextFull', () => {
  it('clears all state including schemas', () => {
    const ctx = createContext();

    // Set up both persistent and runtime state
    ctx.schemas.set('User', {
      type: 'SchemaDefinition',
      name: 'User',
      fields: [],
    } as SchemaDefinition);
    ctx.importedSchemas.set('petstore', new Map());
    ctx.bindings.set('limit', { type: 'Literal', value: 100 } as never);
    ctx.collections.set('users', [{ id: 1 }]);
    ctx.uniqueValues.set('user.id', new Set([1]));
    ctx.sequences.set('counter', 5);
    ctx.orderedSequenceIndices.set('colors', 1);
    ctx.parent = { name: 'parent' };
    ctx.current = { name: 'current' };
    ctx.previous = { name: 'previous' };
    ctx.currentSchemaName = 'User';
    ctx.violating = true;

    resetContextFull(ctx);

    // All state should be cleared
    expect(ctx.schemas.size).toBe(0);
    expect(ctx.importedSchemas.size).toBe(0);
    expect(ctx.bindings.size).toBe(0);
    expect(ctx.collections.size).toBe(0);
    expect(ctx.uniqueValues.size).toBe(0);
    expect(ctx.sequences.size).toBe(0);
    expect(ctx.orderedSequenceIndices.size).toBe(0);
    expect(ctx.parent).toBeUndefined();
    expect(ctx.current).toBeUndefined();
    expect(ctx.previous).toBeUndefined();
    expect(ctx.currentSchemaName).toBeUndefined();
    expect(ctx.violating).toBeUndefined();
  });

  it('returns the same context object', () => {
    const ctx = createContext();
    const result = resetContextFull(ctx);

    expect(result).toBe(ctx);
  });
});
