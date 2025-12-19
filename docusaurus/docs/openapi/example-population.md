---
sidebar_position: 3
title: Example Population
---

# OpenAPI Example Population

Vague can generate realistic examples and embed them directly in your OpenAPI specification.

## Basic Usage

Populate an OpenAPI spec with examples:

```bash
vague data.vague --oas-source api.json --oas-output api-with-examples.json
```

This:
1. Generates data from your `.vague` file
2. Matches collections to OpenAPI schemas
3. Inserts examples into the spec
4. Writes the updated spec

## Source and Output

| Option | Description |
|--------|-------------|
| `--oas-source <file>` | Input OpenAPI spec to populate |
| `--oas-output <file>` | Output path for populated spec |

```bash
# Same file (overwrite)
vague data.vague --oas-source api.json --oas-output api.json

# Different file (preserve original)
vague data.vague --oas-source api.json --oas-output api-examples.json
```

## Multiple Examples

Generate multiple examples per schema:

```bash
vague data.vague --oas-source api.json --oas-output api.json --oas-example-count 3
```

This adds 3 example values to each schema.

## External References

Use external file references instead of inline examples:

```bash
vague data.vague --oas-source api.json --oas-output api.json --oas-external
```

Creates:
```
examples/
├── Invoice-1.json
├── Invoice-2.json
├── Customer-1.json
└── Customer-2.json
```

And references them in the spec:

```yaml
components:
  schemas:
    Invoice:
      example:
        $ref: 'examples/Invoice-1.json'
```

## Auto-Detection

Collection names are automatically matched to schema names:

| Collection | Schema Match |
|------------|--------------|
| `invoices` | `Invoice` |
| `customers` | `Customer` |
| `orderItems` | `OrderItem` |

```vague
dataset API {
  invoices: 10 of Invoice,    // → Invoice schema
  customers: 10 of Customer   // → Customer schema
}
```

## Practical Examples

### Full API Documentation

```vague
import api from "api.json"

schema Invoice from api.Invoice {
  customer: any of customers,
  amount: gaussian(500, 200, 100, 2000)
}

schema Customer from api.Customer {
  status: 0.8: "active" | 0.2: "inactive"
}

schema Payment from api.Payment {
  invoice: any of invoices,
  amount: invoice.amount
}

dataset Examples {
  customers: 5 of Customer,
  invoices: 10 of Invoice,
  payments: 5 of Payment
}
```

```bash
vague examples.vague \
  --oas-source api.json \
  --oas-output api-documented.json \
  --oas-example-count 2
```

### CI/CD Pipeline

```bash
#!/bin/bash
# Generate examples and update spec

# Generate with reproducible seed
vague examples.vague \
  --seed 42 \
  --oas-source api.yaml \
  --oas-output api.yaml \
  --oas-example-count 3

# Validate the updated spec
vague examples.vague -v api.yaml --validate-only
```

### Multiple APIs

```bash
# Populate different specs from different vague files
vague users.vague --oas-source users-api.json --oas-output users-api.json
vague orders.vague --oas-source orders-api.json --oas-output orders-api.json
```

## Example Placement

Examples are added to schema components:

```yaml
# Before
components:
  schemas:
    Invoice:
      type: object
      properties:
        id: { type: string }
        amount: { type: number }

# After
components:
  schemas:
    Invoice:
      type: object
      properties:
        id: { type: string }
        amount: { type: number }
      example:
        id: "inv-12345"
        amount: 499.99
      examples:
        - id: "inv-12345"
          amount: 499.99
        - id: "inv-67890"
          amount: 1299.50
```

## Workflow Integration

### With Swagger UI

Generated examples appear in Swagger UI's example responses:

1. Generate examples: `vague data.vague --oas-output api.json ...`
2. Serve with Swagger UI
3. Examples appear in response previews

### With Mock Servers

Use populated specs with mock servers like Prism:

```bash
# Generate examples
vague data.vague --oas-output api.json --oas-source api.json

# Start mock server
prism mock api.json
```

### With SDK Generation

Examples improve generated SDK documentation:

```bash
# Populate examples
vague data.vague --oas-output api.json --oas-source api.json

# Generate SDK
openapi-generator generate -i api.json -g typescript-axios
```

## See Also

- [Importing Schemas](/docs/openapi/importing-schemas) for using OpenAPI schemas
- [Validation](/docs/openapi/validation) for validating generated data
- [CLI Reference](/docs/cli) for all OpenAPI options
