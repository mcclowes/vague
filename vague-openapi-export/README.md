# vague-openapi-export

Export [Vague](https://github.com/mcclowes/vague) schemas to OpenAPI specifications.

## Installation

```bash
npm install vague-openapi-export
```

## Usage

```typescript
import { parse } from 'vague-lang';
import { toOpenAPI } from 'vague-openapi-export';

const ast = parse(`
  schema User {
    id: int,
    name: string,
    email: email(),
    age: int in 18..120,
    status: "active" | "inactive" | "pending"
  }
`);

const spec = toOpenAPI(ast, {
  title: 'My API',
  version: '3.1',
});

console.log(JSON.stringify(spec, null, 2));
```

**Output:**
```json
{
  "openapi": "3.1.0",
  "info": {
    "title": "My API",
    "version": "1.0.0"
  },
  "paths": {},
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": { "type": "integer" },
          "name": { "type": "string" },
          "email": { "type": "string", "format": "email" },
          "age": { "type": "integer", "minimum": 18, "maximum": 120 },
          "status": { "enum": ["active", "inactive", "pending"] }
        },
        "required": ["id", "name", "email", "age", "status"]
      }
    }
  }
}
```

## API

### `toOpenAPI(ast, options?)`

Convert a Vague AST to an OpenAPI specification.

```typescript
function toOpenAPI(ast: Program, options?: ExportOptions): OpenAPISpec;
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `version` | `'3.0'` \| `'3.1'` | `'3.0'` | OpenAPI version |
| `title` | `string` | `'Generated from Vague'` | API title |
| `infoVersion` | `string` | `'1.0.0'` | API version |
| `description` | `string` | - | API description |
| `includeExtensions` | `boolean` | `false` | Include `x-vague-*` extensions |
| `schemas` | `string[]` | - | Only export specified schemas |

### `toOpenAPIString(ast, options?, indent?)`

Same as `toOpenAPI` but returns a JSON string.

```typescript
function toOpenAPIString(ast: Program, options?: ExportOptions, indent?: number): string;
```

### `listSchemas(ast)`

Get a list of schema names defined in the AST.

```typescript
function listSchemas(ast: Program): string[];
```

### `toOpenAPIPartial(ast, schemaNames, options?)`

Export only specific schemas.

```typescript
function toOpenAPIPartial(ast: Program, schemaNames: string[], options?: ExportOptions): OpenAPISpec;
```

## Type Mappings

| Vague Type | OpenAPI Type |
|------------|-------------|
| `int` | `{ type: "integer" }` |
| `decimal` | `{ type: "number" }` |
| `string` | `{ type: "string" }` |
| `boolean` | `{ type: "boolean" }` |
| `date` | `{ type: "string", format: "date" }` |
| `int in 1..100` | `{ type: "integer", minimum: 1, maximum: 100 }` |
| `"a" \| "b" \| "c"` | `{ enum: ["a", "b", "c"] }` |
| `string?` | `{ type: "string", nullable: true }` (3.0) or `{ type: ["string", "null"] }` (3.1) |
| `1..10 * Item` | `{ type: "array", items: {...}, minItems: 1, maxItems: 10 }` |
| `uuid()` | `{ type: "string", format: "uuid" }` |
| `email()` | `{ type: "string", format: "email" }` |

### Generator Format Mappings

Common generators are mapped to OpenAPI formats:

| Generator | OpenAPI Format |
|-----------|---------------|
| `uuid()` | `format: "uuid"` |
| `email()` | `format: "email"` |
| `url()` | `format: "uri"` |
| `phone()` | `format: "phone"` |
| `iban()` | `format: "iban"` |
| `pastDate()` | `format: "date-time"` |
| `futureDate()` | `format: "date-time"` |

## Vague Extensions

When `includeExtensions: true`, Vague-specific metadata is preserved:

```typescript
const spec = toOpenAPI(ast, { includeExtensions: true });
```

| Extension | Description |
|-----------|-------------|
| `x-vague-computed` | Field is computed (has `=` prefix) |
| `x-vague-unique` | Field has `unique` constraint |
| `x-vague-constraint` | Schema-level constraints (`assume` clauses) |
| `x-vague-generator` | Generator function used |
| `x-vague-weights` | Superposition weights (for weighted options) |

**Example:**

```vague
schema Invoice {
  id: unique int in 1000..9999,
  status: 0.7: "paid" | 0.2: "pending" | 0.1: "draft",
  total: decimal,
  tax: = round(total * 0.2, 2),
  assume total > 0
}
```

With extensions enabled:

```json
{
  "Invoice": {
    "type": "object",
    "properties": {
      "id": {
        "type": "integer",
        "minimum": 1000,
        "maximum": 9999,
        "x-vague-unique": true
      },
      "status": {
        "enum": ["paid", "pending", "draft"],
        "x-vague-weights": [0.7, 0.2, 0.1]
      },
      "total": { "type": "number" },
      "tax": {
        "type": "number",
        "readOnly": true,
        "x-vague-computed": true
      }
    },
    "x-vague-constraint": "total > 0"
  }
}
```

## Limitations

Some Vague features cannot be fully represented in OpenAPI:

| Feature | OpenAPI Handling |
|---------|-----------------|
| Weighted superposition | Weights stored in `x-vague-weights` extension |
| Dynamic cardinality | Uses static min/max bounds |
| `then` blocks | Not representable |
| `previous()`, `sequence()` | Not representable (runtime behavior) |
| Cross-record references (`any of`) | Not representable |
| Constraint expressions | Stored in `x-vague-constraint` extension |

## License

MIT
