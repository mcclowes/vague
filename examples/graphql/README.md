# GraphQL Plugin Example

Demonstrates the GraphQL plugin for generating realistic GraphQL-related test data.

## Example

### `graphql.vague`
**Demonstrates:** GraphQL identifiers, operations, errors, schema introspection

Generates comprehensive test data for GraphQL applications including API requests/responses, schema definitions, and resolver test cases.

**Key concepts:**
- Field names: `graphql.fieldName()` - generates valid GraphQL field names (camelCase)
- Type names: `graphql.typeName()` - generates PascalCase type names
- Operation names: `graphql.operationName()` - generates query/mutation operation names
- Enum values: `graphql.enumValue()` - generates SCREAMING_SNAKE_CASE enum values
- Directives: `graphql.directiveName()` - generates @directive names

**Scalar values:**
- `graphql.id()` - GraphQL ID scalar (UUID, numeric, base64, prefixed)
- `graphql.string()` - GraphQL String with various content
- `graphql.int()` - 32-bit signed integers
- `graphql.float()` - GraphQL Float values
- `graphql.boolean()` - true/false values

**Operations:**
- `graphql.query()` - complete query strings
- `graphql.mutation()` - complete mutation strings
- `graphql.subscription()` - complete subscription strings
- `graphql.fragment()` - fragment definitions

**Errors:**
- `graphql.error()` - full error object with message, locations, path, extensions
- `graphql.errorMessage()` - realistic error messages
- `graphql.errorCode()` - standard error codes (UNAUTHENTICATED, NOT_FOUND, etc.)

**Schema introspection:**
- `graphql.introspectionType()` - __Type, __Field, etc.
- `graphql.builtinScalar()` - ID, String, Int, Float, Boolean
- `graphql.builtinDirective()` - @skip, @include, @deprecated
- `graphql.typeKind()` - SCALAR, OBJECT, INTERFACE, etc.
- `graphql.schemaDefinition()` - SDL type definitions

## Use Cases

- Testing GraphQL clients and error handling
- Generating mock data for GraphQL servers
- Testing schema introspection queries
- Populating GraphQL playgrounds
- Testing subscription handlers

## Running the Example

```bash
# Generate test data
node dist/cli.js examples/graphql/graphql.vague

# Pretty-print output
node dist/cli.js examples/graphql/graphql.vague -p

# Reproducible output with seed
node dist/cli.js examples/graphql/graphql.vague -s 42
```

## Shorthand Generators

The plugin also provides shorthand versions prefixed with `gql`:
- `gqlFieldName()` instead of `graphql.fieldName()`
- `gqlTypeName()` instead of `graphql.typeName()`
- `gqlQuery()` instead of `graphql.query()`
- `gqlMutation()` instead of `graphql.mutation()`
- `gqlError()` instead of `graphql.error()`
- etc.
