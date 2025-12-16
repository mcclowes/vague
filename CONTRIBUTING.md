# Contributing to Vague

Thanks for your interest in contributing to Vague!

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/vague.git`
3. Install dependencies: `npm install`
4. Build: `npm run build`
5. Run tests: `npm test`

## Development Workflow

### Making Changes

1. Create a branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Add tests for new functionality
4. Run tests: `npm test`
5. Build: `npm run build`
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

### Project Structure

```
src/
├── lexer/       # Tokenizer (tokens.ts, lexer.ts)
├── parser/      # Parser (parser.ts)
├── ast/         # Type definitions (nodes.ts)
├── interpreter/ # Generator (generator.ts, markov.ts)
├── openapi/     # Schema import (loader.ts)
```

## What to Work On

Check [ROADMAP.md](ROADMAP.md) for planned features. Good first contributions:

- **Bug fixes** — If something doesn't work as expected
- **Documentation** — Improve examples, clarify syntax
- **Tests** — Increase coverage, add edge cases
- **Small features** — Items marked as "quick win" in the roadmap

For larger features, open an issue first to discuss the approach.

## Pull Request Process

1. Ensure tests pass (`npm test`)
2. Ensure build succeeds (`npm run build`)
3. Update documentation if needed
4. Write a clear PR description explaining:
   - What the change does
   - Why it's needed
   - How to test it

## Architecture Overview

### Pipeline

```
.vague source → Lexer → Tokens → Parser → AST → Generator → JSON
```

### Key Concepts

- **Lexer** (`src/lexer/`) — Converts source text to tokens with line/column tracking
- **Parser** (`src/parser/`) — Recursive descent parser producing AST nodes
- **Generator** (`src/interpreter/`) — Walks AST, generates JSON with:
  - Rejection sampling for constraints (100 max retries)
  - Field generation order: simple → collections → computed
  - Context tracking for parent references and cross-record refs

### Adding New Syntax

1. Add token type in `src/lexer/tokens.ts`
2. Add keyword to `KEYWORDS` map if needed
3. Add AST node type in `src/ast/nodes.ts`
4. Add parsing logic in `src/parser/parser.ts`
5. Add generation logic in `src/interpreter/generator.ts`
6. Add tests for both parser and generator

## Questions?

Open an issue for questions or discussion.
