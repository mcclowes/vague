---
sidebar_position: 2
title: Getting Started
---

# Getting Started

## Installation

Install Vague from npm:

```bash
npm install vague-lang
```

Or install globally for CLI usage:

```bash
npm install -g vague-lang
```

## Your First Schema

Create a file called `demo.vague`:

```vague
schema Person {
  id: uuid(),
  name: fullName(),
  email: email(),
  age: int in 18..65,
  status: "active" | "pending" | "inactive"
}

dataset Demo {
  people: 10 of Person
}
```

## Generate Data

Run the CLI to generate JSON:

```bash
vague demo.vague
```

Output:

```json
{
  "people": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "John Smith",
      "email": "john.smith@example.com",
      "age": 34,
      "status": "active"
    },
    ...
  ]
}
```

## CLI Options

```bash
# Pretty print
vague demo.vague -p

# Save to file
vague demo.vague -o output.json

# Reproducible output with seed
vague demo.vague --seed 123

# Watch mode - regenerate on file change
vague demo.vague -o output.json -w
```

## TypeScript API

Use Vague programmatically in your TypeScript/JavaScript code:

```typescript
import { fromFile, vague } from 'vague-lang';

// From file
const data = await fromFile('./demo.vague');

// Using tagged template
const data = await vague`
  schema Person { name: string, age: int in 18..65 }
  dataset Test { people: 10 of Person }
`;

// With seed for reproducibility
const data = await vague({ seed: 42 })`
  schema Person { name: fullName() }
  dataset Test { people: 5 of Person }
`;
```

## Next Steps

- Learn the [Language Guide](/docs/language/schemas-and-datasets) for core concepts
- Explore [Plugins](/docs/plugins/faker) for realistic data generation
- See [CLI Reference](/docs/cli) for all command-line options
- Check out [Examples](https://github.com/mcclowes/vague/tree/main/examples) for real-world use cases
