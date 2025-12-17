# Vague Schema Inferrer - Roadmap

This roadmap focuses specifically on the schema inference system (`src/infer/`).

## Current State

The inferrer is a **9-module system (~3,200 LOC)** that reverse-engineers Vague schemas from JSON/CSV data:

| Module | Purpose |
|--------|---------|
| `index.ts` | Main orchestration, field inference |
| `type-detector.ts` | Primitive type detection |
| `range-detector.ts` | Numeric/date ranges, cardinality, uniqueness |
| `enum-detector.ts` | Superposition detection with weights |
| `format-detector.ts` | Pattern matching (UUID, email, etc.) |
| `correlation-detector.ts` | Ordering, derived fields, conditionals |
| `codegen.ts` | Vague source code generation |

**Current Capabilities:** Type inference, ranges, decimal precision, enums with weights, 11+ format patterns, field name semantics (25+ patterns), nested schemas, arrays, ordering constraints, derived field detection (multiplication, addition, constant multipliers), conditional constraints.

---

## Phase 1: Format Detection Enhancements

### 1.1 Custom Format Registry
**Priority:** High | **Complexity:** Medium

Allow users to register custom format patterns for domain-specific data.

```typescript
inferSchema(data, {
  customFormats: {
    'order-id': { pattern: /^ORD-\d{6}$/, generator: 'sequence("ORD-", 100000)' },
    'sku': { pattern: /^[A-Z]{2}-\d{4}$/, generator: 'faker.string.alphanumeric(7)' }
  }
});
```

**Tasks:**
- [ ] Design `CustomFormatSpec` interface
- [ ] Add format registry to `format-detector.ts`
- [ ] Support generator string or function callback
- [ ] Add CLI option `--format-config <file>`

### 1.2 Additional Built-in Formats
**Priority:** Medium | **Complexity:** Low

Expand format detection to cover more common patterns.

| Format | Pattern | Generator |
|--------|---------|-----------|
| `iban` | Country-aware IBAN | `faker.finance.iban()` |
| `credit-card` | Luhn-valid numbers | `faker.finance.creditCardNumber()` |
| `currency-code` | ISO 4217 | `"USD" \| "EUR" \| "GBP"` |
| `country-code` | ISO 3166-1 alpha-2 | `faker.location.countryCode()` |
| `locale` | `en-US`, `fr-FR` | Superposition of detected values |
| `semantic-version` | `1.2.3` | `faker.system.semver()` |
| `file-path` | Unix/Windows paths | String with path pattern |
| `base64` | Base64 encoded | `faker.string.alphanumeric()` |
| `jwt` | JWT structure | Custom generator |

**Tasks:**
- [ ] Add patterns to `format-detector.ts`
- [ ] Map to appropriate generators
- [ ] Add tests for each format
- [ ] Update documentation

### 1.3 Configurable Match Thresholds
**Priority:** Low | **Complexity:** Low

Allow tuning of format detection sensitivity.

```typescript
inferSchema(data, {
  formatThresholds: {
    uuid: 0.95,    // Stricter (default: 0.90)
    phone: 0.70,   // More lenient (default: 0.80)
  }
});
```

**Tasks:**
- [ ] Add per-format threshold configuration
- [ ] Expose via CLI `--format-threshold <format>=<value>`
- [ ] Document threshold tuning guidance

---

## Phase 2: Correlation Detection Improvements

### 2.1 Division & Ratio Detection
**Priority:** High | **Complexity:** Medium

Detect division relationships like `rate = amount / quantity`.

```vague
// Currently detected:
total: round(quantity * unit_price, 2)

// Should also detect:
unit_price: round(total / quantity, 2)
percentage: round(part / whole * 100, 1)
```

**Tasks:**
- [ ] Add division detection to `detectDerivedFields()`
- [ ] Handle divide-by-zero edge cases
- [ ] Detect percentage relationships (× 100)
- [ ] Add confidence scoring for division vs multiplication ambiguity

### 2.2 Aggregation Detection
**Priority:** High | **Complexity:** High

Detect aggregate relationships between parent and child collections.

```vague
schema Invoice {
  line_items: 1..5 of LineItem,
  subtotal: sum(line_items.amount),     // Detected!
  item_count: count(line_items)          // Detected!
}
```

**Detection approach:**
1. Identify nested arrays
2. Check if parent field equals `sum/count/avg/min/max` of child field
3. Generate appropriate aggregate expression

**Tasks:**
- [ ] Detect sum relationships between parent and child arrays
- [ ] Detect count relationships
- [ ] Detect min/max/avg relationships
- [ ] Handle nested path expressions in codegen

### 2.3 Temporal Pattern Detection
**Priority:** Medium | **Complexity:** Medium

Detect time-series patterns and sequential relationships.

```vague
// Monotonically increasing IDs
id: sequenceInt("id", 1001)

// Increasing timestamps
created_at: previous("created_at") + date.hours(1)

// Delta patterns
delta: timestamp - previous("timestamp")
```

**Tasks:**
- [ ] Detect monotonically increasing sequences
- [ ] Detect consistent deltas between sequential records
- [ ] Suggest `sequenceInt()` for auto-increment patterns
- [ ] Suggest `previous()` for sequential coherence

### 2.4 Complex Expression Detection
**Priority:** Low | **Complexity:** High

Detect more complex mathematical relationships.

```vague
// Multi-step calculations
grand_total: round((subtotal + tax) * (1 - discount), 2)

// Min/max bounds
capped_amount: min(amount, 1000)
floor_amount: max(amount, 0)
```

**Tasks:**
- [ ] Detect chained operations (add then multiply)
- [ ] Detect min/max capping patterns
- [ ] Detect absolute value patterns
- [ ] Add expression complexity scoring

### 2.5 Cross-Collection Reference Detection
**Priority:** Medium | **Complexity:** High

Detect relationships between different collections in the dataset.

```vague
schema Payment {
  invoice: any of invoices where .id == invoice_id,
  amount: invoice.total - invoice.amount_paid
}
```

**Detection approach:**
1. Find fields with matching values across collections
2. Identify foreign-key-like relationships
3. Check if field values match referenced record's fields

**Tasks:**
- [ ] Detect foreign key relationships
- [ ] Identify `any of` candidates
- [ ] Detect derived values from references
- [ ] Handle ambiguous multi-matches

---

## Phase 3: Constraint Detection Expansion

### 3.1 Dataset-Level Constraints
**Priority:** High | **Complexity:** Medium

Infer `validate { }` blocks from aggregate patterns.

```vague
dataset Generated {
  invoices: 100 of Invoice,
  payments: 50 of Payment,

  validate {
    sum(payments.amount) <= sum(invoices.total),
    count(payments) <= count(invoices)
  }
}
```

**Detection approach:**
1. Calculate aggregate values for each collection
2. Check cross-collection relationships
3. Infer inequality constraints

**Tasks:**
- [ ] Calculate collection-level aggregates
- [ ] Detect sum relationships between collections
- [ ] Detect count relationships
- [ ] Add `validate` block generation to codegen

### 3.2 Collection Predicate Detection
**Priority:** Medium | **Complexity:** Medium

Detect `all()`, `some()`, `none()` patterns.

```vague
validate {
  all(invoices, .amount > 0),           // All amounts positive
  some(invoices, .status == "paid"),    // At least one paid
  none(invoices, .total < .subtotal)    // No total < subtotal
}
```

**Tasks:**
- [ ] Check if condition holds for all records
- [ ] Check if condition holds for some records
- [ ] Check if condition holds for no records
- [ ] Distinguish between all/some/none appropriately

### 3.3 Mutual Exclusivity Detection
**Priority:** Low | **Complexity:** Medium

Detect fields that are mutually exclusive.

```vague
schema Account {
  type: "personal" | "business",
  // Only one should be non-null
  personal_id: string when type == "personal",
  company_id: string when type == "business"
}
```

**Tasks:**
- [ ] Detect fields that are never both non-null
- [ ] Correlate with enum values
- [ ] Generate `when` conditional fields

### 3.4 Improved Conditional Constraint Semantics
**Priority:** Medium | **Complexity:** Low

Better filtering of trivial conditional constraints.

**Current issues:**
- Sometimes generates redundant constraints
- Doesn't deduplicate symmetric constraints
- Confidence thresholds could be adaptive

**Tasks:**
- [ ] Add constraint deduplication
- [ ] Improve semantic similarity detection
- [ ] Make confidence thresholds adaptive based on sample size
- [ ] Add constraint ranking by information value

---

## Phase 4: Type & Range Detection

### 4.1 Custom Date Format Detection
**Priority:** Medium | **Complexity:** Medium

Detect non-ISO date formats and infer parsing.

```vague
// Detected format: MM/DD/YYYY
date: formatDate(datetime(2020, 2024), "MM/DD/YYYY")

// Detected format: DD-MMM-YYYY
date: formatDate(datetime(2020, 2024), "DD-MMM-YYYY")
```

**Tasks:**
- [ ] Detect common date format patterns
- [ ] Infer `formatDate()` wrapper
- [ ] Support multiple formats in single field

### 4.2 Distribution Detection
**Priority:** Medium | **Complexity:** High

Detect non-uniform distributions and suggest appropriate generators.

```vague
// Detected: Normal distribution
age: gaussian(35, 10, 18, 65)

// Detected: Log-normal (right-skewed)
income: lognormal(10.5, 0.5, 20000, 500000)

// Detected: Exponential (decay)
wait_time: exponential(0.5, 0, 60)
```

**Detection approach:**
1. Calculate distribution statistics (skewness, kurtosis)
2. Fit candidate distributions
3. Select best fit using goodness-of-fit test

**Tasks:**
- [ ] Calculate distribution statistics
- [ ] Implement distribution fitting (normal, lognormal, exponential)
- [ ] Add goodness-of-fit scoring
- [ ] Generate appropriate distribution calls

### 4.3 Outlier Detection & Range Refinement
**Priority:** Low | **Complexity:** Medium

Detect and optionally exclude outliers from ranges.

```typescript
inferSchema(data, {
  outlierDetection: 'iqr',  // or 'zscore', 'none'
  outlierHandling: 'exclude'  // or 'include', 'warn'
});
```

**Tasks:**
- [ ] Implement IQR-based outlier detection
- [ ] Implement z-score outlier detection
- [ ] Add range refinement with outlier exclusion
- [ ] Add warnings for potential outliers

### 4.4 Smart Enum Threshold
**Priority:** Low | **Complexity:** Low

Adaptive enum detection based on data characteristics.

**Current:** Fixed `maxEnumValues: 10`
**Proposed:** Adaptive based on:
- Total unique values
- Sample size
- Distribution pattern

**Tasks:**
- [ ] Calculate optimal threshold based on uniqueness ratio
- [ ] Consider sample size in threshold calculation
- [ ] Add auto vs manual threshold mode

---

## Phase 5: Output Quality & UX

### 5.1 Schema Deduplication
**Priority:** High | **Complexity:** Medium

Detect and merge identical or similar nested schemas.

```vague
// Before: Separate schemas for identical structures
schema Invoice_ShippingAddress { street: string, city: string, zip: string }
schema Invoice_BillingAddress { street: string, city: string, zip: string }

// After: Single reusable schema
schema Address { street: string, city: string, zip: string }
schema Invoice {
  shipping_address: Address,
  billing_address: Address
}
```

**Tasks:**
- [ ] Implement schema structural comparison
- [ ] Detect identical schemas
- [ ] Detect similar schemas (>90% field overlap)
- [ ] Merge and reference shared schemas
- [ ] Handle naming conflicts

### 5.2 Schema Naming Improvements
**Priority:** Medium | **Complexity:** Low

Better automatic naming for inferred schemas.

**Current issues:**
- Nested schemas use parent path (`Invoice_LineItem`)
- Pluralization not always correct
- Name conflicts possible

**Tasks:**
- [ ] Improve singular/plural detection
- [ ] Add name uniqueness checking
- [ ] Support custom naming strategies
- [ ] Handle abbreviations (e.g., `SKU`, `UUID`)

### 5.3 Inference Confidence Reporting
**Priority:** Medium | **Complexity:** Medium

Report confidence levels for inferred schema elements.

```typescript
const result = inferSchemaWithConfidence(data);
// result.schema: string (the Vague code)
// result.confidence: {
//   'Invoice.total': { type: 'decimal', confidence: 0.95 },
//   'Invoice.status': { type: 'enum', confidence: 0.88, note: 'Low sample variety' },
//   'Invoice.created_at': { format: 'datetime', confidence: 0.92 }
// }
```

**Tasks:**
- [ ] Add confidence tracking to each detector
- [ ] Aggregate confidence scores
- [ ] Add `--verbose` output for CLI
- [ ] Generate comments for low-confidence inferences

### 5.4 Interactive Mode
**Priority:** Low | **Complexity:** High

Interactive CLI for reviewing and refining inferences.

```bash
$ vague --infer data.json --interactive

Detected Invoice.status as enum:
  0.6: "paid" | 0.3: "pending" | 0.1: "draft"

? Confirm detection (y/n/edit): edit
? Enter field definition: "draft" | "pending" | "sent" | "paid"

Detected Invoice.total as derived:
  total = subtotal + tax

? Confirm detection (y/n/skip): y
```

**Tasks:**
- [ ] Design interactive flow
- [ ] Implement prompts for each major inference
- [ ] Support editing inferences inline
- [ ] Allow skipping uncertain inferences

---

## Phase 6: Performance

### 6.1 Streaming CSV Processing
**Priority:** Medium | **Complexity:** Medium

Process large CSV files without loading entirely into memory.

**Tasks:**
- [ ] Implement streaming CSV parser
- [ ] Use reservoir sampling for large files
- [ ] Add `--sample-size` option
- [ ] Report total rows vs sampled rows

### 6.2 Parallel Correlation Detection
**Priority:** Low | **Complexity:** Medium

Parallelize expensive correlation checks.

**Tasks:**
- [ ] Profile correlation detection bottlenecks
- [ ] Parallelize independent field-pair checks
- [ ] Add worker pool for large datasets
- [ ] Benchmark improvements

### 6.3 Memoization & Caching
**Priority:** Low | **Complexity:** Low

Cache expensive computations.

**Tasks:**
- [ ] Memoize format pattern compilation
- [ ] Cache field statistics
- [ ] Add LRU cache for correlation results

---

## Phase 7: Integration & API

### 7.1 TypeScript Type Generation
**Priority:** High | **Complexity:** Medium

Generate TypeScript interfaces alongside Vague schemas.

```bash
$ vague --infer data.json -o schema.vague --types schema.d.ts
```

```typescript
// schema.d.ts
export interface Invoice {
  id: number;
  status: 'draft' | 'pending' | 'paid';
  total: number;
  line_items: LineItem[];
}
```

**Tasks:**
- [ ] Design type generation from inferred schema
- [ ] Handle nullable types
- [ ] Handle array types
- [ ] Handle enum/union types
- [ ] Add `--types` CLI option

### 7.2 Schema Diff & Migration
**Priority:** Medium | **Complexity:** High

Compare inferred schema with existing schema to detect drift.

```bash
$ vague --infer new-data.json --diff existing.vague

Schema changes detected:
  + Invoice.discount: decimal in 0..50 (new field)
  ~ Invoice.status: added "cancelled" variant
  - Invoice.legacy_id: field no longer present
```

**Tasks:**
- [ ] Implement schema comparison
- [ ] Detect added/removed/modified fields
- [ ] Detect constraint changes
- [ ] Generate migration suggestions

### 7.3 Validation Feedback Loop
**Priority:** Medium | **Complexity:** Medium

Use validation failures to refine inferences.

```typescript
// 1. Infer initial schema
const schema = inferSchema(trainingData);

// 2. Validate against new data
const errors = validator.validateDataset(newData, schema);

// 3. Refine schema based on errors
const refinedSchema = refineSchema(schema, errors);
```

**Tasks:**
- [ ] Design refinement API
- [ ] Handle range expansion
- [ ] Handle new enum values
- [ ] Handle new nullable fields
- [ ] Track refinement history

### 7.4 OpenAPI Schema Comparison
**Priority:** Low | **Complexity:** Medium

Compare inferred schema against OpenAPI spec.

```bash
$ vague --infer data.json --compare openapi.yaml

Comparison with OpenAPI spec 'Invoice':
  Match: 15/18 fields
  Missing in data: created_by, updated_at, archived
  Extra in data: legacy_code (not in spec)
  Type mismatch: amount (inferred: int, spec: number)
```

**Tasks:**
- [ ] Load OpenAPI schema for comparison
- [ ] Compare field names and types
- [ ] Report discrepancies
- [ ] Suggest schema adjustments

---

## Implementation Priority Matrix

| Phase | Feature | Priority | Complexity | Dependencies |
|-------|---------|----------|------------|--------------|
| 2.1 | Division detection | High | Medium | None |
| 2.2 | Aggregation detection | High | High | None |
| 5.1 | Schema deduplication | High | Medium | None |
| 7.1 | TypeScript generation | High | Medium | None |
| 1.1 | Custom format registry | High | Medium | None |
| 3.1 | Dataset-level constraints | High | Medium | 2.2 |
| 2.3 | Temporal patterns | Medium | Medium | None |
| 2.5 | Cross-collection refs | Medium | High | None |
| 3.2 | Collection predicates | Medium | Medium | 3.1 |
| 4.1 | Custom date formats | Medium | Medium | None |
| 4.2 | Distribution detection | Medium | High | None |
| 5.3 | Confidence reporting | Medium | Medium | None |
| 7.2 | Schema diff | Medium | High | None |
| 7.3 | Validation feedback | Medium | Medium | None |
| 1.2 | Additional formats | Medium | Low | None |
| 5.2 | Naming improvements | Medium | Low | None |
| 6.1 | Streaming CSV | Medium | Medium | None |
| 2.4 | Complex expressions | Low | High | 2.1 |
| 3.3 | Mutual exclusivity | Low | Medium | None |
| 3.4 | Constraint semantics | Low | Low | None |
| 4.3 | Outlier detection | Low | Medium | None |
| 4.4 | Smart enum threshold | Low | Low | None |
| 5.4 | Interactive mode | Low | High | 5.3 |
| 6.2 | Parallel detection | Low | Medium | None |
| 6.3 | Memoization | Low | Low | None |
| 7.4 | OpenAPI comparison | Low | Medium | None |
| 1.3 | Match thresholds | Low | Low | None |

---

## Suggested Milestone Plan

### Milestone 1: Core Improvements
- Division & ratio detection (2.1)
- Schema deduplication (5.1)
- TypeScript type generation (7.1)

### Milestone 2: Relationship Detection
- Aggregation detection (2.2)
- Dataset-level constraints (3.1)
- Cross-collection references (2.5)

### Milestone 3: Format & Distribution
- Custom format registry (1.1)
- Additional built-in formats (1.2)
- Distribution detection (4.2)

### Milestone 4: UX & Integration
- Confidence reporting (5.3)
- Schema diff & migration (7.2)
- Validation feedback loop (7.3)

### Milestone 5: Advanced Features
- Temporal pattern detection (2.3)
- Interactive mode (5.4)
- Complex expression detection (2.4)
