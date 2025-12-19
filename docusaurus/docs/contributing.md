---
sidebar_position: 15
title: Contributing
---

# Contributing

Thanks for your interest in contributing to Vague!

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/vague.git
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Build:
   ```bash
   npm run build
   ```
5. Run tests:
   ```bash
   npm test
   ```

## Development Workflow

### Making Changes

1. Create a branch:
   ```bash
   git checkout -b feature/your-feature
   ```
2. Make your changes
3. Add tests for new functionality
4. Run tests:
   ```bash
   npm test
   ```
5. Build:
   ```bash
   npm run build
   ```
6. Commit with a clear message

### Code Style

- TypeScript with strict mode
- Prefer concise, well-named functions over comments
- Tests alongside implementation (colocated `*.test.ts` files)
- No unnecessary abstractions — keep it simple

### Testing

Tests use Vitest and are colocated with source files:

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
```

When adding features:
- Add parser tests for new syntax
- Add generator tests for runtime behavior
- Test edge cases and constraints

## Project Structure

```
src/
├── lexer/       # Tokenizer
├── parser/      # Recursive descent parser
├── ast/         # AST node definitions
├── interpreter/ # Generator
├── validator/   # Schema validation
├── openapi/     # OpenAPI support
├── infer/       # Schema inference
├── csv/         # CSV formatting
├── plugins/     # Built-in plugins
├── index.ts     # Library exports
└── cli.ts       # CLI entry point
```

## Architecture

### Pipeline

```
.vague source → Lexer → Tokens → Parser → AST → Generator → JSON
```

### Key Concepts

- **Lexer** — Converts source text to tokens with line/column tracking
- **Parser** — Recursive descent parser producing AST nodes
- **Generator** — Walks AST, generates JSON with:
  - Rejection sampling for constraints (100 max retries)
  - Field generation order: simple → collections → computed
  - Context tracking for parent refs and cross-record refs

### Adding New Syntax

1. Add token type in `src/lexer/tokens.ts`
2. Add keyword to `KEYWORDS` map if needed
3. Add AST node type in `src/ast/nodes.ts`
4. Add parsing logic in `src/parser/parser.ts`
5. Add generation logic in `src/interpreter/generator.ts`
6. Add tests for both parser and generator

## What to Work On

Check [TODO.md](https://github.com/mcclowes/vague/blob/main/TODO.md) for planned features.

### Good First Contributions

- **Bug fixes** — If something doesn't work as expected
- **Documentation** — Improve examples, clarify syntax
- **Tests** — Increase coverage, add edge cases
- **Small features** — Items marked as "quick win"

For larger features, open an issue first to discuss the approach.

## Pull Request Process

1. Ensure tests pass (`npm test`)
2. Ensure build succeeds (`npm run build`)
3. Update documentation if needed
4. Write a clear PR description explaining:
   - What the change does
   - Why it's needed
   - How to test it

## Code Formatting

```bash
# Format code
npm run format

# Check formatting
npm run format:check

# Lint
npm run lint

# Fix lint issues
npm run lint:fix
```

## Questions?

Open an issue for questions or discussion.

## Links

- [GitHub Repository](https://github.com/mcclowes/vague)
- [Issue Tracker](https://github.com/mcclowes/vague/issues)
- [npm Package](https://www.npmjs.com/package/vague-lang)
