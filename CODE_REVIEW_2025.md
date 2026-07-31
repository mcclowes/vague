# Principal Engineer Code Review: Vague

**Reviewer**: Principal Software Engineer (Day 1 Onboarding)
**Date**: December 2025
**Verdict**: This codebase has potential but contains fundamental architectural decisions that will cause production incidents. Let me explain why, and how to fix it.

---

## Executive Summary

Vague is a compiler/interpreter for a declarative test data DSL. The core pipeline (Lexer → Parser → Generator) is reasonably well-structured. However, **this codebase is not production-ready** due to:

1. **Global mutable state everywhere** - will cause data races in any concurrent environment
2. **Rejection sampling for constraints** - O(∞) worst case, no detection of unsatisfiable constraints
3. **Silent failures** - nulls returned instead of errors, warnings instead of exceptions
4. **No resource limits** - unbounded memory growth, no timeouts

This review is written to help junior engineers understand *why* these patterns are problematic, not just *that* they are.

---

## Table of Contents

1. [Critical Issues (P0)](#critical-issues-p0)
2. [High-Priority Issues (P1)](#high-priority-issues-p1)
3. [Medium-Priority Issues (P2)](#medium-priority-issues-p2)
4. [Code Smells & Anti-patterns](#code-smells--anti-patterns)
5. [Edge Cases Not Handled](#edge-cases-not-handled)
6. [Testing Gaps](#testing-gaps)
7. [What Was Done Well](#what-was-done-well)
8. [Recommendations for Junior Engineers](#recommendations-for-junior-engineers)

---

## Critical Issues (P0)

### 1. Global Mutable State Will Cause Data Races

**Location**: `src/interpreter/random.ts:229`, `src/interpreter/plugin.ts:69`, `src/warnings.ts:141`

**The Problem**:
```typescript
// random.ts:229 - Global random state
const globalRandom = new SeededRandom();

// plugin.ts:69 - Global plugin registry
const pluginRegistry: Map<string, VaguePlugin> = new Map();

// warnings.ts:141 - Global warning collector
export const warningCollector = new WarningCollector();
```

**Why This Is Catastrophic**:

Imagine two API requests compiling different Vague schemas concurrently:

```
Request A: setSeed(42) → compile("schema A {...}")
Request B: setSeed(100) → compile("schema B {...}")
```

Since `setSeed()` mutates global state, Request A's seed might be overwritten by Request B *mid-generation*. The result: non-deterministic output despite using a seed.

**Junior Engineers Should Learn**:
- Global mutable state is the #1 cause of concurrency bugs
- "Works on my machine" often means "fails in production under load"
- Even if you're not using threads, async/await creates interleaving

**The Fix**:
```typescript
// Pass dependencies explicitly
class Generator {
  constructor(
    private rng: SeededRandom,
    private plugins: PluginRegistry,
    private warnings: WarningCollector
  ) {}
}

// Usage
const result = await compile(source, {
  seed: 42,  // Creates isolated SeededRandom instance
});
```

---

### 2. Rejection Sampling Has Unbounded Runtime

**Location**: `src/interpreter/instance-generator.ts:50-77`

**The Problem**:
```typescript
generate(schema: SchemaDefinition): Record<string, unknown> {
  const maxAttempts = this.ctx.retryLimits.instance;  // Default: 100

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const instance = this.generateAttempt(schema);
    if (this.validateConstraints(schema.assumes, instance)) {
      return instance;
    }
  }

  // After 100 failures, return invalid data with a warning
  warningCollector.add(createConstraintRetryWarning(...));
  return this.generateAttempt(schema);  // Returns data that VIOLATES constraints!
}
```

**Why This Is Broken**:

1. **Unsatisfiable constraints cause 100 wasted iterations + invalid output**
   ```vague
   schema Impossible {
     x: int in 1..10,
     assume x > 100  // Can never be satisfied
   }
   ```

2. **Near-impossible constraints cause exponential slowdown**
   ```vague
   schema Rare {
     a: int in 1..1000000,
     b: int in 1..1000000,
     assume a == b  // 1-in-a-million chance
   }
   ```

3. **The warning is easy to miss** - code continues with invalid data

**Junior Engineers Should Learn**:
- Rejection sampling is O(1/p) where p is probability of satisfaction
- When p → 0, runtime → ∞
- Always validate inputs at parse time, not runtime

**The Fix**:
- Detect unsatisfiable constraints during parsing (use SMT solver or static analysis)
- Throw an error instead of returning invalid data
- Add timeouts: `--max-generation-time 30s`

---

### 3. The Plugin System Mutates Lexer/Parser Globals

**Location**: `src/interpreter/plugin.ts:87-111`

**The Problem**:
```typescript
export function registerPlugin(plugin: VaguePlugin): void {
  pluginRegistry.set(plugin.name, plugin);

  // These mutate GLOBAL lexer state!
  if (plugin.keywords) {
    for (const kw of plugin.keywords) {
      registerKeyword(kw.keyword, kw.tokenType);  // Affects ALL future parsing
    }
  }

  // These mutate GLOBAL parser state!
  if (plugin.statements) {
    for (const [tokenType, parser] of Object.entries(plugin.statements)) {
      registerStatementParser(tokenType, parser);  // Affects ALL future parsing
    }
  }
}
```

**Why This Is Dangerous**:

Once a plugin is registered, it affects *every* subsequent parse, even for unrelated schemas. There's no way to:
1. Use different plugins for different compilations
2. Run a "clean" compilation after plugins are loaded
3. Unload a plugin safely (other compilations may be using it)

**Junior Engineers Should Learn**:
- Libraries should not mutate global state as a side effect
- Registration should be explicit, not ambient
- "Convenience" APIs often hide dangerous behavior

**The Fix**:
```typescript
// Compilation-scoped plugins
const result = await compile(source, {
  plugins: [fakerPlugin, customPlugin],
});
```

---

## High-Priority Issues (P1)

### 4. Silent Null Returns Instead of Errors

**Location**: `src/interpreter/expression-evaluator.ts:195-197`

**The Problem**:
```typescript
evaluate(expr: Expression): unknown {
  switch (expr.type) {
    // ... cases
    default:
      return null;  // Unknown expression type? Just return null!
  }
}
```

Also in `evaluateBinary`:
```typescript
switch (expr.operator) {
  // ... cases
  default:
    return null;  // Unknown operator? Null!
}
```

**Why This Is Bad**:
- Bugs hide silently - you get `null` instead of an error
- Debugging is a nightmare - where did this null come from?
- Downstream code has to handle unexpected nulls everywhere

**Junior Engineers Should Learn**:
- "Fail fast" is better than "fail mysteriously later"
- Unknown cases should throw, not return a sentinel value
- Use TypeScript's exhaustiveness checking

**The Fix**:
```typescript
default:
  throw new Error(`Unsupported expression type: ${(expr as {type: string}).type}`);
```

---

### 5. Circular Dependencies Between Sub-generators

**Location**: `src/interpreter/generator.ts:74-107`

**The Problem**:
```typescript
private initializeSubGenerators(): void {
  this.expressionEvaluator = new ExpressionEvaluator(this.ctx, {
    generatePrimitive: (type, fieldName, precision) => {
      return this.fieldGenerator.generatePrimitive(...);  // Uses fieldGenerator
    },
  });

  this.fieldGenerator = new FieldGenerator(this.ctx, {
    evaluateExpression: (expr) => this.expressionEvaluator.evaluate(expr),  // Uses expressionEvaluator
  });
  // Circular: expressionEvaluator → fieldGenerator → expressionEvaluator
}
```

The sub-generators pass callbacks to each other, creating circular runtime dependencies.

**Why This Is Fragile**:
- Order of initialization matters (change order → runtime crash)
- Difficult to test in isolation
- Impossible to understand data flow

**Junior Engineers Should Learn**:
- Circular dependencies indicate confused responsibilities
- Each module should have one clear dependency direction
- If you need callbacks, your abstraction is probably wrong

**The Fix**:
Use a Visitor pattern or separate the evaluation engine from the generation engine completely.

---

### 6. No Validation of Computed Field Dependencies

**Location**: `src/interpreter/instance-generator.ts:424-488`

**The Problem**:
The code does topological sorting of computed fields, but only for *computed* fields. It doesn't handle:

```vague
schema Broken {
  b: a + 1,        // References 'a' which hasn't been generated yet
  a: int in 1..10
}
```

The topological sort (`sortComputedFields`) only runs on fields marked `computed`. Regular expression fields aren't sorted.

**Junior Engineers Should Learn**:
- Dependency analysis must be comprehensive
- Partial solutions create confusion about what's supported

---

### 7. Magic Numbers Scattered Throughout

**Location**: Multiple files

```typescript
// instance-generator.ts:116
if (field.optional && random() > 0.7) {  // Why 0.7?

// field-generator.ts:112-113
return Math.floor(random() * 1000);  // Why 1000?

// expression-evaluator.ts:139
if (items.length > 0) {  // Should there be a max?
```

**Junior Engineers Should Learn**:
- Magic numbers make behavior inexplicable
- Extract to named constants with documentation
- Make them configurable if they're policy decisions

---

## Medium-Priority Issues (P2)

### 8. The Lexer Doesn't Handle Unicode

**Location**: `src/lexer/lexer.ts:245-250`

```typescript
private isAlpha(char: string): boolean {
  return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
}
```

This only handles ASCII letters. What about:
- `schéma Utilisateur` (French)
- `схема Пользователь` (Russian)
- `スキーマ ユーザー` (Japanese)

**The Fix**:
```typescript
private isAlpha(char: string): boolean {
  return /\p{L}/u.test(char) || char === '_';  // Unicode letter property
}
```

---

### 9. Numbers with Underscores Don't Actually Work

**Location**: `src/lexer/lexer.ts:124`

```typescript
// Handle underscores in numbers (e.g., 100_000)
const value = chars.join('').replace(/_/g, '');
```

But the lexer never *reads* underscores in the first place:
```typescript
while (this.isDigit(this.peek())) {  // Only accepts 0-9
  chars.push(this.advance());
}
```

The underscore stripping is dead code.

---

### 10. Parser Filters Out Newlines, Losing Location Info

**Location**: `src/parser/base.ts:12`

```typescript
constructor(tokens: Token[]) {
  this.tokens = tokens.filter((t) => t.type !== TokenType.NEWLINE);
}
```

By filtering early, you lose the ability to give accurate line numbers in error messages for tokens that came after newlines.

---

### 11. The Warning System Is Easy to Ignore

**Location**: `src/warnings.ts`

Warnings are collected but:
- CLI doesn't fail on warnings by default
- No `--strict` mode to treat warnings as errors
- Easy to miss in output (written to stderr, not structured)

**The Fix**: Add `--strict` flag and machine-readable output (`--format json`).

---

## Code Smells & Anti-patterns

### Type Assertions Instead of Type Guards

```typescript
// Bad (instance-generator.ts:318-319)
const parts = (expr as QualifiedName).parts;

// Good
if (expr.type === 'QualifiedName') {
  const parts = expr.parts;  // TypeScript narrows the type
}
```

### Non-null Assertions After Existence Checks

```typescript
// Dangerous (instance-generator.ts:447)
const degree = inDegree.get(other)!;  // Could still be undefined

// Safe
const degree = inDegree.get(other);
if (degree === undefined) throw new Error('...');
```

### Duplicated Logic

`pickWeighted` appears in both `ExpressionEvaluator` and `FieldGenerator` with identical logic. Extract to a utility.

### Inconsistent Error Messages

Some errors include location info, some don't:
```typescript
throw new Error(`Unterminated string at line ${this.line}`);  // Good
throw new Error(`Generator '${name}' not found.`);  // Bad - where in the source?
```

---

## Edge Cases Not Handled

### 1. Empty Collections
```vague
dataset Empty { items: 0 of Item }  // What happens?
```
Works, but `any of items` returns `null` - should this be an error?

### 2. Negative Cardinality
```vague
dataset Bad { items: -5 of Item }  // Caught at runtime, not parse time
```

### 3. Self-Referential Schemas
```vague
schema Node { child: Node }  // Infinite recursion
```
No depth limit, no cycle detection at parse time.

### 4. Division by Zero in Constraints
```vague
schema Div { x: int in 1..10, y: int in 0..10, assume x / y > 0 }
```
Throws at runtime if y=0, but should be a static warning.

### 5. Constraint Timeout
What if constraint evaluation itself hangs (e.g., infinite regex backtracking)?

### 6. MAX_SAFE_INTEGER Overflow
```vague
schema Big { id: int in 1..9999999999999999 }  // Beyond MAX_SAFE_INTEGER
```
Silent precision loss.

### 7. Empty Superposition
```vague
schema Empty { status: }  // Parser should reject, does it?
```

### 8. Conflicting Unique Fields
```vague
schema Conflict {
  id: unique int in 1..5
}
dataset Test { items: 10 of Conflict }  // Only 5 unique values possible for 10 items
```
Currently: warns after 100 retries, returns duplicates.

---

## Testing Gaps

| Category | Status |
|----------|--------|
| Concurrency tests | Missing |
| Fuzz testing | Missing |
| Property-based tests | Missing |
| Memory regression tests | Missing |
| Performance benchmarks | Missing |
| Timeout tests | Missing |

### Suggested Test Cases

```typescript
// Concurrency: parallel compilations with different seeds
test('concurrent compilations are isolated', async () => {
  const results = await Promise.all([
    compile('...', { seed: 1 }),
    compile('...', { seed: 2 }),
  ]);
  // Should produce deterministic, different results
});

// Property-based: any valid schema should not crash
test.prop([validSchemaArbitrary])('never crashes', async (schema) => {
  await expect(compile(schema)).resolves.toBeDefined();
});

// Timeout: impossible constraints should fail fast
test('impossible constraints timeout', async () => {
  const schema = `schema X { a: int in 1..10, assume a > 100 }`;
  await expect(compile(schema, { timeout: 1000 })).rejects.toThrow('timeout');
});
```

---

## What Was Done Well

1. **Clean lexer implementation** - Simple, readable, efficient character array building
2. **Topological sorting for computed fields** - Handles dependency ordering correctly
3. **Discriminated unions for AST** - Type-safe expression handling
4. **Plugin architecture concept** - Extensible design (just needs isolation)
5. **Comprehensive documentation** - CLAUDE.md, SYNTAX.md, README are thorough
6. **Structured warning types** - Well-typed warning system
7. **Configuration system** - `vague.config.js` with plugin discovery

---

## Recommendations for Junior Engineers

### 1. Always Ask "What Happens If..."
- What if this is called concurrently?
- What if the input is empty/huge/malformed?
- What if this throws?

### 2. Prefer Errors Over Silent Failures
```typescript
// Bad
return null;

// Good
throw new Error(`Unexpected state: ${JSON.stringify(state)}`);
```

### 3. Avoid Global State
```typescript
// Bad
let globalConfig: Config;
export function setConfig(c: Config) { globalConfig = c; }

// Good
export function createService(config: Config) { return new Service(config); }
```

### 4. Use TypeScript's Exhaustiveness Checking
```typescript
function handle(expr: Expression): Value {
  switch (expr.type) {
    case 'Literal': return expr.value;
    case 'Binary': return evalBinary(expr);
    default:
      const _exhaustive: never = expr;  // Type error if cases missing
      throw new Error(`Unhandled: ${_exhaustive}`);
  }
}
```

### 5. Make Invalid States Unrepresentable
```typescript
// Bad
interface User { name: string | null; verified: boolean; }
// What does verified=true with name=null mean?

// Good
type User = { status: 'anonymous' } | { status: 'verified'; name: string };
```

---

## Summary

This codebase is ~80% of the way to production quality. The core algorithms work, the API design is reasonable, and the documentation is good. However, the remaining 20% (global state, error handling, resource limits) is what separates "works in demos" from "works in production."

**Immediate Actions Required**:
1. Remove all global mutable state (random, plugins, warnings)
2. Add `--strict` mode that fails on any warning
3. Add timeouts to constraint satisfaction
4. Replace `return null` with thrown errors

**Before v1.0**:
1. Add concurrency tests
2. Add fuzz testing
3. Implement constraint validation at parse time
4. Add resource limits (max depth, max iterations, max memory)

The foundation is solid. Now make it production-ready.

---

*Review completed. Questions welcome.*
