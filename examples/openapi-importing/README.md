# OpenAPI Schema Import

Demonstrates importing schemas from OpenAPI specifications to avoid manually defining field types.

## Example

### `openapi-import.vague`

Shows how to import schemas from an OpenAPI spec and extend them with custom generation rules.

**Key concepts:**
- Import syntax: `import petstore from "path/to/openapi.json"`
- Schema inheritance: `schema Pet from petstore.Pet { ... }`
- Override fields: `age: int in 1..15` (replaces OpenAPI definition)
- Add new fields: `memberSince: date in 2020..2024` (extends schema)

## How It Works

1. Vague loads the OpenAPI spec and extracts component schemas
2. Inherited fields get their types from the OpenAPI definition
3. You can override any field with custom generation rules
4. Additional fields can be added that aren't in the OpenAPI spec

## Supported OpenAPI Versions

- OpenAPI 3.0.x (full support via swagger-parser)
- OpenAPI 3.1.x (basic support via direct JSON parsing)

## Running

```bash
node dist/cli.js examples/openapi-importing/openapi-import.vague
```

## Related

- **Validation**: Use `-v` to validate generated data against an OpenAPI spec
- **Example Population**: See `openapi-examples-generation/` to populate specs with examples
