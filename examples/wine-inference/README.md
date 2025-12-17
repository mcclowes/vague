# Wine Quality Schema Inference Example

This example demonstrates Vague's schema inference feature using the [UCI Wine Quality Dataset](https://archive.ics.uci.edu/dataset/186/wine+quality).

## Inferring a Schema

The red wine CSV uses semicolons as delimiters:

```bash
node dist/cli.js --infer winequality-red.csv --infer-delimiter ";" -o red-wine.vague
```

This generates `red-wine.vague` with:
- Decimal ranges derived from actual min/max values
- Quality scores weighted by their frequency in the original data

## Generated Schema

```vague
schema RedWine {
  // Private raw fields + computed rounded fields preserve original precision
  _fixed_acidity_raw: private decimal in 4.6..15.9,
  fixed_acidity: = round(_fixed_acidity_raw, 1),
  _volatile_acidity_raw: private decimal in 0.12..1.58,
  volatile_acidity: = round(_volatile_acidity_raw, 3),
  // ... more fields with precision detection
  quality: 0.43: 5 | 0.4: 6 | 0.12: 7 | 0.03: 4 | 0.01: 8 | 0.01: 3
}
```

Key inferred features:
- **Precision preservation** - Decimal places detected from source data (1dp, 2dp, 3dp etc.)
- **Private/computed pattern** - Raw values generated privately, rounded values exposed
- **Weighted superposition** - Quality scores match original frequency distribution

## Running the Example

```bash
# Generate 50 synthetic wine samples
node dist/cli.js examples/wine-inference/red-wine.vague

# With deterministic output
node dist/cli.js examples/wine-inference/red-wine.vague --seed 42

# Output to CSV
node dist/cli.js examples/wine-inference/red-wine.vague -f csv -o synthetic-wines.csv
```

## Key Features Demonstrated

1. **CSV inference** - Parse existing datasets to bootstrap schemas
2. **Custom delimiters** - Handle semicolon-separated files with `--infer-delimiter`
3. **Precision detection** - Decimal places inferred from source data and preserved via `round()`
4. **Weighted superposition** - Quality scores match the original frequency distribution
5. **Range detection** - Numeric bounds derived from actual data
6. **Field name sanitization** - Spaces converted to snake_case (`"fixed acidity"` → `fixed_acidity`)
