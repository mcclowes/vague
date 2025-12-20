# FAQ & Troubleshooting

Common questions and solutions when working with Vague.

## Constraints

### "Max retries exceeded" error

Vague uses rejection sampling for constraints—it generates values and retries if constraints aren't satisfied. After 100 attempts, it gives up.

**Causes:**
- Constraints that are mathematically impossible
- Constraints that are too restrictive given the value ranges
- Conflicting constraints

**Solutions:**

```vague
// Bad: 0.01% chance of success
price: int in 1..10000
assume price == 42

// Good: Narrow the range
price: int in 40..45
assume price >= 42
```

```vague
// Bad: Conflicting constraints
status: "active" | "inactive"
assume status == "active"
assume status == "inactive"

// Good: Pick one or use superposition weights
status: "active"
// or
status: 0.9: "active" | 0.1: "inactive"
```

### Constraint doesn't seem to work

Constraints only apply within a single record. They can't reference other records in a collection.

```vague
// This won't work as expected
assume invoices[0].total > invoices[1].total

// Use dataset validation instead
dataset Data {
  invoices: 100 of Invoice,
  validate {
    all(invoices, .total > 0)
  }
}
```

## References

### "Cannot find collection" error

Collections must be defined in the dataset before they're referenced.

```vague
// Bad: payments references invoices, but invoices comes after
dataset Data {
  payments: 50 of Payment,  // Payment uses "any of invoices"
  invoices: 100 of Invoice
}

// Good: Define referenced collections first
dataset Data {
  invoices: 100 of Invoice,
  payments: 50 of Payment
}
```

### "No matching items" for filtered reference

If `any of X where .condition` finds no matches, it returns `null`. Either relax the filter or ensure the referenced collection has matching items.

```vague
// If no active customers exist, this is null
customer: any of customers where .status == "active"

// Ensure some customers are active
schema Customer {
  status: 0.8: "active" | 0.2: "inactive"  // 80% active
}
```

## Unique Values

### "Exhausted unique values" warning

When using `unique`, Vague tracks used values. If you request more unique values than possible, it warns and may return duplicates.

```vague
// Problem: Only 10 possible values, but need 100 records
schema Item {
  code: unique "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J"
}
dataset Data { items: 100 of Item }

// Solution: Expand the value space
schema Item {
  code: unique regex("[A-Z]{3}")  // 17,576 possibilities
}
```

## Types & Values

### Decimal precision issues

Use `decimal(n)` to specify decimal places, and `round()` for computed values.

```vague
// Imprecise
price: decimal in 0.01..99.99

// Precise: exactly 2 decimal places
price: decimal(2) in 0.01..99.99
tax: round(subtotal * 0.2, 2)
```

### Date format issues

Dates generate as ISO strings (`YYYY-MM-DD`). Use `formatDate()` for other formats.

```vague
created: date in 2023..2024                    // "2023-07-15"
formatted: formatDate(created, "DD/MM/YYYY")   // "15/07/2023"
```

## Performance

### Generation is slow

- **Large collections:** Generating millions of records takes time. Consider smaller datasets for development.
- **Complex constraints:** Heavily constrained schemas require more retries.
- **Deep nesting:** Deeply nested schemas with many `any of` references are slower.

**Tips:**
- Use `--seed` for reproducible runs during development
- Start with smaller counts, scale up when needed
- Simplify constraints where possible

### Memory issues with large datasets

For very large datasets, generate in batches:

```bash
# Generate 10 files of 10,000 records each
for i in {1..10}; do
  vague schema.vague -o "data_$i.json" --seed $i
done
```

## OpenAPI Integration

### Schema not found in OpenAPI spec

Ensure the schema name matches exactly (case-sensitive):

```vague
// OpenAPI has "Pet" not "pet"
import api from "openapi.json"
schema MyPet from api.Pet { }  // Correct
schema MyPet from api.pet { }  // Error: not found
```

### Validation errors

OpenAPI validation uses JSON Schema. Common issues:

- **Missing required fields:** Add them to your schema
- **Type mismatches:** Ensure Vague types match OpenAPI types
- **Format violations:** Use appropriate generators (`uuid()`, `email()`, etc.)

```vague
// OpenAPI expects: { id: string (uuid), email: string (email) }
schema User from api.User {
  id: uuid(),        // Not just "string"
  email: email()     // Not just "string"
}
```

## CLI

### Watch mode not detecting changes

Ensure you're saving the file and the path is correct. On some systems, editors use atomic saves that don't trigger filesystem events.

```bash
# Verify the file path
vague ./schemas/data.vague -w -o output.json
```

### Output file not created

Check for errors in the schema. Use `-p` (pretty print) without `-o` first to see output in terminal.

```bash
# Debug: see output in terminal
vague schema.vague -p

# Then save to file
vague schema.vague -o output.json
```

## Still stuck?

- Check the [GitHub Issues](https://github.com/mcclowes/vague/issues) for similar problems
- Use `--debug` flag for detailed logging: `vague schema.vague --debug`
- Try the [Playground](https://vague-playground.vercel.app) to test schemas interactively
