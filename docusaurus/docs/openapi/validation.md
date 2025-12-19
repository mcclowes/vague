---
sidebar_position: 2
title: Validation
---

# OpenAPI Validation

Vague can validate generated data against OpenAPI specifications, ensuring your test data conforms to your API contracts.

## Basic Validation

Use the `-v` flag to validate against an OpenAPI spec:

```bash
vague data.vague -v openapi.json
```

## Schema Mapping

Map collection names to schema names with `-m`:

```bash
vague data.vague -v openapi.json -m '{"invoices": "Invoice", "customers": "Customer"}'
```

The mapping tells Vague which OpenAPI schema to validate each collection against.

## Auto-Detection

If collection names match schema names (case-insensitive), mapping is automatic:

```vague
dataset Data {
  invoices: 100 of Invoice,  // Validates against Invoice schema
  customers: 50 of Customer   // Validates against Customer schema
}
```

```bash
vague data.vague -v openapi.json
# Automatically maps invoices -> Invoice, customers -> Customer
```

## Validate-Only Mode

Skip data output and only run validation (useful for CI):

```bash
vague data.vague -v openapi.json --validate-only
```

Returns exit code 0 on success, 1 on validation failure.

## Validation Output

Successful validation:

```
✓ invoices: 100 records validated against Invoice
✓ customers: 50 records validated against Customer
```

Failed validation:

```
✗ invoices[23]: amount must be >= 0
✗ invoices[45]: status must be one of: draft, sent, paid
✗ customers[12]: email must match format "email"

Validation failed: 3 errors
```

## Practical Examples

### CI Pipeline

```bash
# Generate and validate, fail if invalid
vague fixtures.vague -v api.json --validate-only

# Or with explicit mapping
vague fixtures.vague -v api.json -m '{"orders": "Order"}' --validate-only
```

### Development Workflow

```bash
# Generate, validate, and output
vague data.vague -v api.json -o output.json -p

# Watch mode with validation
vague data.vague -v api.json -o output.json -w
```

### Multiple Specs

Validate different collections against different specs:

```bash
# Validate orders against orders-api.json
vague orders.vague -v orders-api.json -m '{"orders": "Order"}'

# Validate users against users-api.json
vague users.vague -v users-api.json -m '{"users": "User"}'
```

## Validation Rules

Vague validates against:

| OpenAPI Constraint | Validation |
|-------------------|------------|
| `type: string/number/etc` | Type checking |
| `required: [fields]` | Required field presence |
| `enum: [values]` | Value in allowed set |
| `minimum/maximum` | Numeric bounds |
| `minLength/maxLength` | String length |
| `pattern` | Regex matching |
| `format: email/uuid/etc` | Format validation |
| `$ref` | Referenced schema |

## Handling Validation Errors

### Constraint Conflicts

If your Vague schema can produce values that violate OpenAPI constraints:

```vague
schema Invoice {
  // Vague allows 0, but OpenAPI requires > 0
  amount: int in 0..1000,
  assume amount >= 0  // Should be > 0
}
```

Fix by tightening Vague constraints:

```vague
schema Invoice {
  amount: int in 1..1000  // Now always > 0
}
```

### Missing Fields

If OpenAPI requires a field:

```yaml
# openapi.yaml
Invoice:
  required: [id, amount, status]
```

Ensure your Vague schema includes it:

```vague
schema Invoice {
  id: uuid(),
  amount: decimal in 100..1000,
  status: "draft" | "paid"  // All required fields present
}
```

### Format Mismatches

If OpenAPI expects a specific format:

```yaml
# openapi.yaml
email:
  type: string
  format: email
```

Use the appropriate generator:

```vague
schema User {
  email: email()  // Generates valid emails
}
```

## Programmatic Validation

```typescript
import { fromFile, validate } from 'vague-lang';

const data = await fromFile('./data.vague');
const result = await validate(data, './openapi.json', {
  mapping: { invoices: 'Invoice' }
});

if (!result.valid) {
  console.error('Validation errors:', result.errors);
}
```

## See Also

- [Importing Schemas](/docs/openapi/importing-schemas) for using OpenAPI schemas
- [Data Validation](/docs/cli#data-validation) for validating external data
- [CLI Reference](/docs/cli) for all validation options
