---
sidebar_position: 12
title: TypeScript API
---

# TypeScript API

Use Vague programmatically in your TypeScript or JavaScript applications.

## Installation

```bash
npm install vague-lang
```

## Quick Start

```typescript
import { fromFile, vague } from 'vague-lang';

// Generate from file
const data = await fromFile('./fixtures.vague');

// Generate from template
const data = await vague`
  schema Person { name: string, age: int in 18..65 }
  dataset Test { people: 10 of Person }
`;
```

## Core Functions

### fromFile()

Generate data from a `.vague` file:

```typescript
import { fromFile } from 'vague-lang';

const data = await fromFile('./schema.vague');

// With options
const data = await fromFile('./schema.vague', {
  seed: 42,           // Reproducible generation
  pretty: true,       // Not used for programmatic API
});
```

### vague\`\`

Tagged template for inline schemas:

```typescript
import { vague } from 'vague-lang';

const data = await vague`
  schema User {
    id: uuid(),
    name: fullName(),
    email: email()
  }

  dataset Users {
    users: 100 of User
  }
`;

console.log(data.users); // Array of 100 users
```

### vague() with options

Pass options to the tagged template:

```typescript
import { vague } from 'vague-lang';

const data = await vague({ seed: 42 })`
  schema Product { name: string, price: decimal in 9.99..99.99 }
  dataset Catalog { products: 50 of Product }
`;

// Same seed = same output
const data2 = await vague({ seed: 42 })`
  schema Product { name: string, price: decimal in 9.99..99.99 }
  dataset Catalog { products: 50 of Product }
`;

// data.products === data2.products (by value)
```

## Compilation API

### compile()

Compile a schema string to a generator:

```typescript
import { compile } from 'vague-lang';

const generator = await compile(`
  schema Invoice {
    id: uuid(),
    amount: decimal in 100..1000
  }
  dataset Data { invoices: 10 of Invoice }
`);

// Generate multiple times
const batch1 = await generator.generate();
const batch2 = await generator.generate();
```

## Validation API

### validate()

Validate generated data against OpenAPI:

```typescript
import { fromFile, validate } from 'vague-lang';

const data = await fromFile('./data.vague');

const result = await validate(data, './openapi.json', {
  mapping: {
    invoices: 'Invoice',
    customers: 'Customer'
  }
});

if (result.valid) {
  console.log('All data is valid');
} else {
  console.error('Validation errors:', result.errors);
}
```

### validateData()

Validate external JSON against a Vague schema:

```typescript
import { validateData } from 'vague-lang';

const externalData = JSON.parse(fs.readFileSync('data.json', 'utf-8'));

const result = await validateData(externalData, './schema.vague');

for (const error of result.errors) {
  console.error(`${error.path}: ${error.message}`);
}
```

## OpenAPI Integration

### lintOpenAPISpec()

Lint an OpenAPI specification:

```typescript
import { lintOpenAPISpec } from 'vague-lang';

const result = await lintOpenAPISpec('./openapi.json');

console.log('Errors:', result.errors);
console.log('Warnings:', result.warnings);
console.log('Valid:', result.valid);
```

### SpectralLinter class

For linting multiple specs:

```typescript
import { SpectralLinter } from 'vague-lang';

const linter = new SpectralLinter();

const result1 = await linter.lint('api1.json');
const result2 = await linter.lint('api2.yaml');

// Lint raw content
const result3 = await linter.lintContent(jsonString, 'json');
```

## Schema Inference

### inferSchema()

Infer a Vague schema from JSON data:

```typescript
import { inferSchema } from 'vague-lang';

const data = [
  { name: 'John', age: 30, email: 'john@example.com' },
  { name: 'Jane', age: 25, email: 'jane@example.com' }
];

const schema = inferSchema(data, {
  collectionName: 'users',
  datasetName: 'InferredData'
});

console.log(schema);
// schema User {
//   name: string,
//   age: int in 25..30,
//   email: email()
// }
// dataset InferredData { users: 2 of User }
```

## Plugin Registration

### registerPlugin()

Register custom generators:

```typescript
import { registerPlugin, VaguePlugin } from 'vague-lang';

const myPlugin: VaguePlugin = {
  name: 'custom',
  generators: {
    'greeting': () => 'Hello!',
    'timestamp': () => Date.now(),
  },
};

registerPlugin(myPlugin);

// Now use in schemas
const data = await vague`
  schema Test { msg: custom.greeting() }
  dataset D { tests: 1 of Test }
`;
```

## Types

### VaguePlugin

```typescript
interface VaguePlugin {
  name: string;
  generators: Record<string, (args: unknown[]) => unknown>;
}
```

### ValidationResult

```typescript
interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

interface ValidationError {
  path: string;
  message: string;
  schemaPath?: string;
}
```

### LintResult

```typescript
interface LintResult {
  valid: boolean;
  errors: LintIssue[];
  warnings: LintIssue[];
  info: LintIssue[];
}

interface LintIssue {
  code: string;
  message: string;
  path: string[];
  severity: 'error' | 'warning' | 'info' | 'hint';
}
```

## Error Handling

```typescript
import { fromFile, VagueError } from 'vague-lang';

try {
  const data = await fromFile('./schema.vague');
} catch (error) {
  if (error instanceof VagueError) {
    console.error('Vague error:', error.message);
    console.error('Line:', error.line);
    console.error('Column:', error.column);
  } else {
    throw error;
  }
}
```

## Practical Examples

### Test Fixtures

```typescript
// fixtures.ts
import { vague } from 'vague-lang';

export const createTestUser = async (overrides = {}) => {
  const data = await vague({ seed: Date.now() })`
    schema User {
      id: uuid(),
      name: fullName(),
      email: email(),
      role: "user" | "admin"
    }
    dataset D { users: 1 of User }
  `;
  return { ...data.users[0], ...overrides };
};

// In tests
const user = await createTestUser({ role: 'admin' });
```

### API Mocking

```typescript
import { fromFile } from 'vague-lang';
import express from 'express';

const app = express();

app.get('/api/users', async (req, res) => {
  const data = await fromFile('./fixtures/users.vague', {
    seed: 42 // Consistent responses
  });
  res.json(data.users);
});
```

### Database Seeding

```typescript
import { fromFile } from 'vague-lang';
import { db } from './database';

async function seedDatabase() {
  const data = await fromFile('./seeds.vague');

  await db.users.insertMany(data.users);
  await db.products.insertMany(data.products);
  await db.orders.insertMany(data.orders);
}
```
