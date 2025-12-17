# Data Description Model Examples

These examples demonstrate how Vague functions as a **data description model** rather than just a fake data generator. They showcase the three key differentiators:

## Examples

### 1. Intent Encoding (`intent-encoding.vague`)

Shows how to encode **realistic data distributions** that reflect actual production patterns:

- Weighted superpositions for status distributions (`0.8: "active" | 0.2: "inactive"`)
- Statistical distributions for demographics (`gaussian(35, 12, 18, 80)`)
- Conditional logic based on business rules
- Log-normal distributions for financial data

**Key insight:** Your test data should reflect how real data is distributed, not just random values.

```bash
node dist/cli.js examples/data-description-model/intent-encoding.vague -p
```

### 2. Constraint Encoding (`constraint-encoding.vague`)

Demonstrates **business rules as first-class schema citizens**:

- Inter-field constraints (`due_date >= issued_date`)
- Conditional constraints (`if status == "paid" { amount > 0 }`)
- Cross-record relationships (`any of invoices where .status == "open"`)
- Side effects that maintain consistency (`then` blocks)
- Dataset-level validation rules

**Key insight:** The same constraints that generate valid test data can validate production data.

```bash
node dist/cli.js examples/data-description-model/constraint-encoding.vague -p
```

### 3. Edge Case Bias (`edge-case-bias.vague`)

Shows how to generate **intentionally problematic but valid data** for security and robustness testing:

- Unicode edge cases (zero-width chars, RTL override, homoglyphs)
- Injection patterns (SQL-like, HTML/XSS, path traversal)
- Numeric boundaries (MAX_SAFE_INTEGER, floating point precision)
- Date edge cases (leap days, Y2K, Unix epoch limits)
- Negative testing with `violating` datasets

**Key insight:** Edge cases shouldn't be an afterthought — bias your test data toward the problematic cases that break systems.

```bash
node dist/cli.js examples/data-description-model/edge-case-bias.vague -p
```

## The Data Description Model Perspective

These examples illustrate why Vague is better understood as a **data description model** rather than a synthetic data tool:

| Traditional View | Data Description Model View |
|------------------|----------------------------|
| "Generate fake data" | "Describe what valid data looks like" |
| Random distributions | Intentional distributions matching production |
| Validation is separate | Constraints are part of the schema |
| Edge cases are manual | Edge case bias is declarative |
| One-way (generation only) | Bidirectional (generate + validate) |

## Running the Examples

```bash
# Generate with pretty output
node dist/cli.js examples/data-description-model/intent-encoding.vague -p

# Reproducible output with seed
node dist/cli.js examples/data-description-model/constraint-encoding.vague -p --seed 42

# Validate against the same schema (when you have real data)
node dist/cli.js --validate-data your-data.json --schema examples/data-description-model/constraint-encoding.vague
```
