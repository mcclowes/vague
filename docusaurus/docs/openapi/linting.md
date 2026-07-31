---
sidebar_position: 4
title: Linting
---

# OpenAPI Linting

Vague includes built-in OpenAPI linting powered by [Spectral](https://stoplight.io/spectral), helping you maintain high-quality API specifications.

## Basic Usage

Lint an OpenAPI spec:

```bash
vague --lint-spec openapi.json
```

## Verbose Output

Show all issues including hints:

```bash
vague --lint-spec openapi.yaml --lint-verbose
```

## Output Format

```bash
$ vague --lint-spec api.json

OpenAPI Linting Results
=======================

api.json
  3:10    error    oas3-api-servers     OpenAPI "servers" must be present and non-empty array.
  15:7    warning  operation-operationId    Operation must have "operationId".
  23:11   info     description-duplication  Property description duplicates summary.

✖ 3 problems (1 error, 1 warning, 1 info)
```

## Severity Levels

| Level | Description |
|-------|-------------|
| `error` | Must fix — spec is invalid or has serious issues |
| `warning` | Should fix — potential problems or bad practices |
| `info` | Consider fixing — suggestions for improvement |
| `hint` | Nice to have — minor suggestions (verbose only) |

## Common Rules

### Errors

| Rule | Description |
|------|-------------|
| `oas3-schema` | Spec must be valid OpenAPI 3.x |
| `oas3-valid-schema-example` | Examples must match schema |
| `path-params` | Path parameters must be defined |

### Warnings

| Rule | Description |
|------|-------------|
| `operation-operationId` | Operations should have IDs |
| `operation-tags` | Operations should have tags |
| `operation-description` | Operations should have descriptions |
| `info-contact` | API should have contact info |

### Info

| Rule | Description |
|------|-------------|
| `operation-success-response` | Should define success responses |
| `oas3-unused-component` | Unused components detected |

## Programmatic API

```typescript
import { lintOpenAPISpec, SpectralLinter } from 'vague-lang';

// Simple function
const result = await lintOpenAPISpec('openapi.json');
console.log(result.errors);   // Error-level issues
console.log(result.warnings); // Warning-level issues
console.log(result.valid);    // true if no errors

// Class-based for multiple files
const linter = new SpectralLinter();
const result1 = await linter.lint('api1.json');
const result2 = await linter.lint('api2.yaml');

// Lint raw content
const result3 = await linter.lintContent(jsonString, 'json');
```

## Integration Examples

### Pre-commit Hook

```bash
#!/bin/bash
# .git/hooks/pre-commit

for spec in specs/*.json; do
  if ! vague --lint-spec "$spec"; then
    echo "Linting failed for $spec"
    exit 1
  fi
done
```

### CI Pipeline

```yaml
# GitHub Actions
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install -g vague-lang
      - run: vague --lint-spec api.yaml
```

### npm Script

```json
{
  "scripts": {
    "lint:api": "vague --lint-spec openapi.yaml",
    "lint:api:verbose": "vague --lint-spec openapi.yaml --lint-verbose"
  }
}
```

## Workflow: Lint Before Generate

```bash
#!/bin/bash
# Lint first, then generate if valid

if vague --lint-spec api.json; then
  echo "Spec is valid, generating data..."
  vague data.vague -v api.json -o output.json
else
  echo "Fix linting errors first"
  exit 1
fi
```

## Fixing Common Issues

### Missing operationId

```yaml
# Before
paths:
  /pets:
    get:
      summary: List pets

# After
paths:
  /pets:
    get:
      operationId: listPets
      summary: List pets
```

### Missing Servers

```yaml
# Before
openapi: 3.0.0
info:
  title: My API

# After
openapi: 3.0.0
info:
  title: My API
servers:
  - url: https://api.example.com
```

### Invalid Example

```yaml
# Before - example doesn't match schema
schema:
  type: integer
example: "not a number"

# After
schema:
  type: integer
example: 42
```

## See Also

- [Importing Schemas](/docs/openapi/importing-schemas) for using OpenAPI schemas
- [Validation](/docs/openapi/validation) for validating generated data
- [Spectral Documentation](https://stoplight.io/spectral) for more rules
