# Wine Quality Schema Inference Example

This example demonstrates Vague's schema inference feature using the [UCI Wine Quality Dataset](https://archive.ics.uci.edu/dataset/186/wine+quality).

## Inferring a Schema

The red wine CSV uses semicolons as delimiters:

```bash
node dist/cli.js --infer winequality-red.csv --infer-delimiter ";" -o red-wine.vague
```

This generates `red-wine.vague` with:
- Decimal ranges derived from actual min/max values
- Precision specified using `decimal(N)` syntax
- Quality scores weighted by their frequency in the original data
- Derived fields detected from correlations in the data
- Conditional constraints inferred from value relationships

## Generated Schema

```vague
schema WinequalityRed {
  fixed_acidity: decimal(1) in 4.6..15.9,
  volatile_acidity: decimal(2) in 0.12..1.58,
  citric_acid: decimal(2) in 0..1,
  residual_sugar: decimal(1) in 0.9..15.5,
  chlorides: = fixed_acidity * 0.0108,           // Derived field detected
  free_sulfur_dioxide: decimal(1) in 1..72,
  total_sulfur_dioxide: decimal(1) in 6..289,
  density: decimal in 0.99007..1.00369,
  ph: decimal(2) in 2.74..4.01,
  sulphates: decimal(2) in 0.33..2,
  alcohol: decimal(1) in 8.4..14.9,
  quality: 0.43: 5 | 0.4: 6 | 0.12: 7 | 0.03: 4 | 0.01: 8 | 0.01: 3,

  // Conditional constraints inferred from data correlations
  assume if quality == 3 { free_sulfur_dioxide >= quality }
  assume if quality == 3 { ph >= quality }
  assume if quality == 5 { free_sulfur_dioxide >= quality }
}

dataset Generated {
  winequality_reds: 1599 of WinequalityRed
}
```

Key inferred features:
- **Precision syntax** - Decimal places specified directly as `decimal(N)` (e.g., `decimal(2)` for 2 decimal places)
- **Derived fields** - Correlations detected between fields (e.g., `chlorides` derived from `fixed_acidity`)
- **Conditional constraints** - Value relationships inferred as `assume if` statements
- **Weighted superposition** - Quality scores match original frequency distribution
- **Record count preservation** - Dataset generates same number of records as source (1599)

## Running the Example

```bash
# Generate 1599 synthetic wine samples (same as original dataset)
node dist/cli.js examples/wine-inference/red-wine.vague

# With deterministic output
node dist/cli.js examples/wine-inference/red-wine.vague --seed 42

# Output to CSV
node dist/cli.js examples/wine-inference/red-wine.vague -f csv -o synthetic-wines.csv
```

## Key Features Demonstrated

1. **CSV inference** - Parse existing datasets to bootstrap schemas
2. **Custom delimiters** - Handle semicolon-separated files with `--infer-delimiter`
3. **Precision syntax** - Decimal places inferred and specified as `decimal(N)`
4. **Derived field detection** - Linear correlations detected and expressed as computed fields
5. **Conditional constraint inference** - Value relationships captured as `assume if` statements
6. **Weighted superposition** - Quality scores match the original frequency distribution
7. **Range detection** - Numeric bounds derived from actual data
8. **Field name sanitization** - Spaces converted to snake_case (`"fixed acidity"` → `fixed_acidity`)
9. **Record count preservation** - Dataset count matches source data for realistic volumes
