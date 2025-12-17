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
  fixed_acidity: decimal in 4.6..15.9,
  volatile_acidity: decimal in 0.12..1.58,
  citric_acid: decimal in 0..1,
  residual_sugar: decimal in 0.9..15.5,
  chlorides: decimal in 0.012..0.611,
  free_sulfur_dioxide: decimal in 1..72,
  total_sulfur_dioxide: decimal in 6..289,
  density: decimal in 0.99007..1.00369,
  ph: decimal in 2.74..4.01,
  sulphates: decimal in 0.33..2,
  alcohol: decimal in 8.4..14.9,
  quality: 0.43: 5 | 0.4: 6 | 0.12: 7 | 0.03: 4 | 0.01: 8 | 0.01: 3
}
```

Note how the `quality` field captures the original distribution - most wines scored 5 or 6, with fewer at the extremes.

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
3. **Weighted superposition** - Quality scores match the original frequency distribution
4. **Range detection** - Numeric bounds derived from actual data
5. **Field name sanitization** - Spaces converted to snake_case (`"fixed acidity"` → `fixed_acidity`)
