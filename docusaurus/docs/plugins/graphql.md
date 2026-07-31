---
sidebar_position: 7
title: GraphQL Plugin
---

# GraphQL Plugin

The GraphQL plugin generates GraphQL-related test data including field names, type names, operations, errors, and schema definitions. Useful for testing GraphQL APIs, clients, and schema tooling.

## Basic Usage

```vague
schema GraphQLTest {
  field: graphql.fieldName(),
  type: graphql.typeName(),
  query: graphql.query()
}
// field: "createdAt", "getUserPosts", "totalCount"
// type: "User", "OrderConnection", "ProductInput"
// query: "query { user(id: \"1\") { id name email } }"
```

## Identifiers

### Field Names

```vague
schema Fields {
  field: graphql.fieldName()
}
// Output: "id", "name", "createdAt", "getUserPosts", "edges", "pageInfo"
```

### Type Names

```vague
schema Types {
  type: graphql.typeName()
}
// Output: "User", "Post", "OrderConnection", "ProductInput", "UserPayload"
```

### Operation Names

```vague
schema Operations {
  operation: graphql.operationName()
}
// Output: "GetUser", "CreatePost", "DeleteOrder", "SearchProducts"
```

### Enum Values

```vague
schema Enums {
  enum_value: graphql.enumValue()
}
// Output: "ACTIVE", "PENDING", "CREATED_AT", "ADMIN", "FULL_ACCESS"
```

### Directives

```vague
schema Directives {
  directive: graphql.directiveName()
}
// Output: "@deprecated", "@auth", "@cacheControl", "@skip"
```

### Arguments and Variables

```vague
schema Args {
  arg: graphql.argumentName(),
  variable: graphql.variableName()
}
// arg: "id", "input", "where", "first", "orderBy"
// variable: "$id", "$input", "$first", "$query"
```

## Scalar Values

```vague
schema Scalars {
  id: graphql.id(),
  str: graphql.string(),
  int: graphql.integer(),
  float: graphql.float(),
  bool: graphql.boolean()
}
// id: "usr_123456", "a1b2c3d4-...", "12345678"
// str: "Hello, World!", "String with \"quotes\""
// int: 42, -100, 2147483647
// float: 3.14159, 99.99, 1e-10
// bool: true, false
```

## Operations

### Queries

```vague
schema Queries {
  simple: graphql.query()
}
// Output examples:
// "query { user(id: \"1\") { id name email } }"
// "query GetUsers { users { id name } }"
// "query { products(first: 10) { edges { node { id title price } } } }"
// "query SearchProducts($query: String!) { search(query: $query) { id name } }"
```

### Mutations

```vague
schema Mutations {
  mutation: graphql.mutation()
}
// Output examples:
// "mutation { createUser(input: { name: \"John\", email: \"john@example.com\" }) { id } }"
// "mutation { deletePost(id: \"123\") { success } }"
// "mutation { login(email: \"user@example.com\", password: \"secret\") { token user { id } } }"
```

### Subscriptions

```vague
schema Subscriptions {
  subscription: graphql.subscription()
}
// Output examples:
// "subscription { messageAdded(channelId: \"general\") { id content author { name } } }"
// "subscription { orderStatusChanged(orderId: \"123\") { id status updatedAt } }"
```

### Fragments

```vague
schema Fragments {
  fragment: graphql.fragment()
}
// Output examples:
// "fragment UserFields on User { id name email createdAt }"
// "fragment PostPreview on Post { id title excerpt author { name } }"
```

## Errors

### Error Objects

```vague
schema ErrorTest {
  error: graphql.error()
}
// Output: {
//   "message": "You must be logged in to perform this action",
//   "locations": [{ "line": 5, "column": 3 }],
//   "path": ["user", "posts", 0],
//   "extensions": { "code": "UNAUTHENTICATED" }
// }
```

### Error Components

```vague
schema Errors {
  message: graphql.errorMessage(),
  code: graphql.errorCode()
}
// message: "The requested resource was not found"
// code: "UNAUTHENTICATED", "FORBIDDEN", "NOT_FOUND", "BAD_USER_INPUT"
```

Common error codes:
- `UNAUTHENTICATED` - Not logged in
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `BAD_USER_INPUT` - Invalid input
- `VALIDATION_ERROR` - Schema validation failed
- `INTERNAL_SERVER_ERROR` - Server error
- `GRAPHQL_PARSE_FAILED` - Query syntax error
- `RATE_LIMITED` - Too many requests

## Variables

```vague
schema VariablesTest {
  variables: graphql.variables()
}
// Output examples:
// { "id": "usr_123456" }
// { "first": 25, "after": "abc123" }
// { "input": { "name": "Test", "email": "test@example.com" } }
// { "filter": { "status": "ACTIVE", "createdAfter": "2024-01-01" } }
```

## Schema Introspection

```vague
schema Introspection {
  type: graphql.introspectionType(),
  scalar: graphql.builtinScalar(),
  directive: graphql.builtinDirective(),
  kind: graphql.typeKind()
}
// type: "__Schema", "__Type", "__Field", "__InputValue"
// scalar: "ID", "String", "Int", "Float", "Boolean"
// directive: "@skip", "@include", "@deprecated"
// kind: "SCALAR", "OBJECT", "INTERFACE", "UNION", "ENUM"
```

## Schema Definitions

```vague
schema SchemaTest {
  definition: graphql.schemaDefinition(),
  connection: graphql.connectionType()
}
// definition: "type User { id: ID!, name: String!, email: String!, posts: [Post!]! }"
// connection: "UserConnection", "ProductConnection"
```

## Shorthand Functions

These are available with the `gql` prefix (to avoid conflicts):

| Function | Description |
|----------|-------------|
| `gqlFieldName()` | Field name |
| `gqlTypeName()` | Type name |
| `gqlOperationName()` | Operation name |
| `gqlEnumValue()` | Enum value |
| `gqlDirective()` | Directive name |
| `gqlId()` | GraphQL ID |
| `gqlQuery()` | Query string |
| `gqlMutation()` | Mutation string |
| `gqlSubscription()` | Subscription string |
| `gqlFragment()` | Fragment definition |
| `gqlError()` | Error object |
| `gqlErrorCode()` | Error code |
| `gqlVariables()` | Variables object |
| `gqlSchema()` | Schema definition |

## Practical Examples

### GraphQL Request/Response Logging

```vague
schema GraphQLLog {
  id: uuid(),
  operation_name: graphql.operationName(),
  operation_type: "query" | "mutation" | "subscription",
  variables: graphql.variables(),
  duration_ms: int in 1..5000,
  has_errors: boolean
}
```

### API Test Case

```vague
schema TestCase {
  name: sentence(),
  query: graphql.query(),
  variables: graphql.variables(),
  expected_data: {
    user: {
      id: graphql.id(),
      name: fullName()
    }
  }
}
```

### Error Response Testing

```vague
schema ErrorScenario {
  scenario: "auth_required" | "not_found" | "validation",
  query: graphql.query(),
  errors: 1..3 of graphql.error()
}

dataset ErrorTests {
  scenarios: 10 of ErrorScenario
}
```

### Schema Registry Entry

```vague
schema SchemaVersion {
  id: uuid(),
  version: semver(),
  schema_sdl: graphql.schemaDefinition(),
  created_at: now(),
  is_breaking: boolean
}
```

### Subscription Event

```vague
schema SubscriptionEvent {
  subscription: graphql.subscription(),
  payload: {
    data: {
      eventType: graphql.enumValue(),
      timestamp: now()
    }
  }
}
```

### Relay-Style Pagination Test

```vague
schema ConnectionTest {
  type_name: graphql.connectionType(),
  edges: 5..20 of {
    cursor: graphql.id(),
    node: {
      id: graphql.id(),
      name: graphql.fieldName()
    }
  },
  pageInfo: {
    hasNextPage: boolean,
    hasPreviousPage: boolean,
    startCursor: graphql.id(),
    endCursor: graphql.id()
  },
  totalCount: int in 1..1000
}
```

## See Also

- [HTTP Plugin](/docs/plugins/http) for HTTP-level testing
- [SQL Plugin](/docs/plugins/sql) for database testing
- [Custom Plugins](/docs/plugins/custom-plugins) for extending generators
