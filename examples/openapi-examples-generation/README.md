# OpenAPI Example Population

Demonstrates generating realistic test data and embedding it as examples in an OpenAPI specification.

## Example

### `oas-population.vague`

Generates Pet and Owner data that can be used to populate the included `petstore.json` OpenAPI spec with examples.

## How It Works

1. Define Vague schemas that match OpenAPI component schemas
2. Generate data using Vague
3. The CLI populates the OpenAPI spec with generated examples
4. Output an updated OpenAPI spec with realistic examples

## CLI Options

```bash
# Basic usage - single example per schema
node dist/cli.js examples/openapi-examples-generation/oas-population.vague \
  --oas-output petstore-with-examples.json \
  --oas-source examples/openapi-examples-generation/petstore.json

# Multiple examples per schema
node dist/cli.js examples/openapi-examples-generation/oas-population.vague \
  --oas-output petstore-with-examples.json \
  --oas-source examples/openapi-examples-generation/petstore.json \
  --oas-example-count 3

# External file references instead of inline examples
node dist/cli.js examples/openapi-examples-generation/oas-population.vague \
  --oas-output petstore-with-examples.json \
  --oas-source examples/openapi-examples-generation/petstore.json \
  --oas-external
```

## Auto-Detection

Collection names are automatically matched to schema names:
- `pets` → `Pet` (plural to singular)
- `owners` → `Owner` (case-insensitive)
- `line_items` → `LineItem` (snake_case to PascalCase)

Override with manual mapping: `-m '{"animals": "Pet"}'`

## Output Locations

Examples are populated in two places:

1. **Schema-level** (`components/schemas/Pet/example`)
2. **Path-level** (responses and request bodies that reference the schema)

## Files

- `petstore.json` - Source OpenAPI spec
- `petstore-with-examples.json` - Output with populated examples (generated)
- `oas-population.vague` - Vague schema definitions
