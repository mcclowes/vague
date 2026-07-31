---
sidebar_position: 1
title: Importing Schemas
---

# Importing OpenAPI Schemas

Vague can import schema definitions from OpenAPI specifications, allowing you to generate data that matches your API contracts.

## Basic Import

Import schemas from an OpenAPI spec file:

```vague
import petstore from "petstore.json"

schema Pet from petstore.Pet {
  // Use all fields from OpenAPI Pet schema
}
```

## Overriding Fields

Add or override fields from the imported schema:

```vague
import api from "api.yaml"

schema User from api.User {
  // Override with more specific constraints
  age: int in 18..65,

  // Add new fields not in OpenAPI
  internal_id: uuid()
}
```

## Multiple Imports

Import from multiple specs:

```vague
import petstore from "petstore.json"
import users from "users-api.yaml"

schema Pet from petstore.Pet { }
schema User from users.User { }

dataset Combined {
  pets: 50 of Pet,
  users: 100 of User
}
```

## Import Paths

Paths are relative to the `.vague` file:

```
project/
├── schemas/
│   └── data.vague
├── specs/
│   └── api.json
```

```vague
// In schemas/data.vague
import api from "../specs/api.json"
```

## Supported Formats

- JSON OpenAPI 3.0.x / 3.1.x
- YAML OpenAPI 3.0.x / 3.1.x
- JSON Schema (draft-07)

## Schema Resolution

Vague resolves `$ref` references automatically:

```yaml
# api.yaml
components:
  schemas:
    Pet:
      type: object
      properties:
        name:
          type: string
        owner:
          $ref: '#/components/schemas/Person'
    Person:
      type: object
      properties:
        name:
          type: string
```

```vague
import api from "api.yaml"

// Pet.owner is automatically resolved to Person
schema Pet from api.Pet { }
```

## Type Mapping

OpenAPI types are mapped to Vague types:

| OpenAPI Type | Format | Vague Type |
|-------------|--------|------------|
| `string` | — | `string` |
| `string` | `uuid` | `uuid()` |
| `string` | `email` | `email()` |
| `string` | `date` | `date` |
| `string` | `date-time` | `datetime()` |
| `integer` | — | `int` |
| `number` | — | `decimal` |
| `boolean` | — | `boolean` |
| `array` | — | Collection |
| `object` | — | Nested schema |

### Constraints

OpenAPI constraints are preserved:

| OpenAPI | Vague |
|---------|-------|
| `minimum: 0, maximum: 100` | `int in 0..100` |
| `minLength: 1, maxLength: 50` | Length constraints |
| `enum: ["a", "b"]` | `"a" \| "b"` |
| `pattern: "^[A-Z]+$"` | `regex("[A-Z]+")` |

## Practical Examples

### Petstore API

```yaml
# petstore.yaml
openapi: 3.0.0
components:
  schemas:
    Pet:
      type: object
      required: [name, status]
      properties:
        id:
          type: integer
        name:
          type: string
        status:
          type: string
          enum: [available, pending, sold]
```

```vague
import petstore from "petstore.yaml"

schema Pet from petstore.Pet {
  // Override ID to be unique sequence
  id: unique sequenceInt("pets"),

  // Add more realistic name
  name: faker.animal.dog()
}

dataset Pets {
  pets: 100 of Pet
}
```

### E-commerce API

```vague
import shop from "shop-api.json"

schema Product from shop.Product {
  // More realistic price distribution
  price: gaussian(50, 20, 9.99, 199.99)
}

schema Order from shop.Order {
  // Override with reference
  customer: any of customers
}

schema Customer from shop.Customer {
  // Add status not in OpenAPI
  status: 0.8: "active" | 0.2: "inactive"
}

dataset Store {
  customers: 100 of Customer,
  products: 50 of Product,
  orders: 200 of Order
}
```

## Troubleshooting

### Schema Not Found

```
Error: Schema 'Foo' not found in import 'api'
```

Check that the schema exists in `components.schemas` in your OpenAPI spec.

### Invalid Reference

```
Error: Could not resolve $ref '#/components/schemas/Bar'
```

Ensure the referenced schema exists and the path is correct.

### Unsupported Format

```
Error: Unsupported OpenAPI version
```

Vague supports OpenAPI 3.0.x and 3.1.x. Convert older specs using tools like [swagger2openapi](https://github.com/Mermade/oas-kit).

## See Also

- [OpenAPI Validation](/docs/openapi/validation) for validating generated data
- [Example Population](/docs/openapi/example-population) for populating specs with examples
- [OpenAPI Linting](/docs/openapi/linting) for spec quality checks
