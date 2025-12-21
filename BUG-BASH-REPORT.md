# Bug Bash Report - 2025-12-21

## Critical Bugs

### 1. Recursive Schema Causes Stack Overflow
**Severity:** Critical
**File:** `src/interpreter/generator.ts`

Self-referential schemas with `0..N of Schema` syntax cause infinite recursion:

```vague
schema Item {
  amount: int in 1..100,
  subitems: 0..3 of Item  // Stack overflow!
}
dataset D { items: 2 of Item }
```

**Error:** `Maximum call stack size exceeded`

**Recommendation:** Add recursion depth tracking and limit, or detect circular references.

---

### 2. Direct Schema Reference Resolves to Null
**Severity:** High
**File:** `src/interpreter/generator.ts`

Using a schema name directly as a field type results in `null` instead of embedding the schema:

```vague
schema Inner { value: int in 1..10 }
schema Outer { inner: Inner }  // inner is always null!
dataset D { x: 2 of Outer }
```

**Output:** `{"x":[{"inner":null},{"inner":null}]}`

**Expected:** `{"x":[{"inner":{"value":5}},{"inner":{"value":3}}]}`

**Workaround:** Use `inner: 1 of Inner` (returns array with one element)

---

## Missing Features

### 3. Missing `!=` (Not-Equal) Operator
**Severity:** Medium
**File:** `src/lexer/lexer.ts`

The lexer doesn't recognize `!=` as an operator:

```vague
assume a != b  // Error: Unexpected character '!'
```

**Workaround:** Use `not a == b`

**Fix:** Add `'!=': TokenType.NOT_EQUALS` to `twoCharOps` in `readOperator()`

---

### 4. Missing `abs()` Function
**Severity:** Low
**File:** `src/interpreter/builtins/math.ts`

`floor()` and `ceil()` are built-in but `abs()` is not:

```vague
x: abs(-5)  // Error: Generator 'abs' not found
```

---

## Warnings/Error Handling

### 5. Match Expression with Missing Cases Returns Null Silently
**Severity:** Medium
**File:** `src/interpreter/generator.ts`

Incomplete match patterns return `null` without any warning:

```vague
schema Test {
  status: "a" | "b" | "c",
  display: match status { "a" => "Alpha" }
}
```

When status is "b" or "c", display is `null`. No compile-time or runtime warning.

---

### 6. Inverted Date Range Works Silently
**Severity:** Low
**File:** `src/interpreter/generator.ts`

Inverted date ranges generate dates without error/warning:

```vague
x: date in 2025..2024  // Generates dates in 2024
```

**Expected:** Error or swap the range bounds

---

### 7. Division by Zero Returns Null Silently
**Severity:** Low

```vague
x: int in 1..10 / 0  // Returns null
y: round(1.5 / 0, 2)  // Returns null
```

No warning is emitted.

---

### 8. Reference to Undefined Collection Returns Null Silently
**Severity:** Medium

```vague
x: any of undefinedCollection  // Returns null, no warning
```

Should produce an error or warning about missing collection.

---

## Type Coercion Behaviors (May Be Intentional)

These may be by design but could surprise users:

- `1 + "hello"` → `"1hello"` (string coercion)
- `true + false` → `1` (boolean to number)
- `"hello" - "world"` → `null` (invalid operation)

---

## Test Coverage Notes

All 1407 existing tests pass. The above issues were found through manual edge case testing.

## Environment

- Node.js v22
- npm v10.9
- vague-lang v3.2.0
