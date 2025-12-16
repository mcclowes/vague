# Vague - Project Instructions

Vague is a declarative language for generating realistic test data. It treats ambiguity as a first-class primitive.

## Project Structure

```
src/
├── lexer/       # Tokenizer - converts source to tokens
├── parser/      # Parser - converts tokens to AST
├── ast/         # AST node type definitions
├── interpreter/ # Generator - produces JSON from AST
├── openapi/     # OpenAPI schema import support
├── index.ts     # Library exports
└── cli.ts       # CLI entry point
```

## Key Commands

```bash
npm run build    # Compile TypeScript
npm test         # Run tests (vitest)
npm run dev      # Watch mode compilation
```

## CLI Usage

```bash
node dist/cli.js <file.vague> [-o output.json] [-p]
```

## Language Spec

See the original spec in the conversation history. Key syntax:

- `let x = 5` - variable binding
- `"a" | "b" | "c"` - superposition (random choice)
- `0.7: "a" | 0.3: "b"` - weighted superposition
- `int in 1..100` - range constraint
- `100 * Schema` - cardinality (generate 100 instances)
- `schema Name { field: type }` - schema definition
- `dataset Name { collection: N * Schema }` - dataset definition

## Testing

Tests are colocated with source files (`*.test.ts`). Run with `npm test`.

## Architecture Notes

1. **Lexer** produces tokens with line/column tracking
2. **Parser** is recursive descent, handles operator precedence
3. **Generator** walks AST and produces JSON output
4. **Markov chains** generate realistic strings based on field/schema context
