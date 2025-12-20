---
sidebar_position: 11
title: CLI Reference
---

# CLI Reference

Complete reference for the Vague command-line interface.

## Basic Usage

```bash
vague <file.vague> [options]
```

## Output Options

Control where and how Vague writes generated data:

| Option | Description |
|--------|-------------|
| `-o, --output <file>` | Write output to file |
| `-f, --format <fmt>` | Output format: `json` (default), `csv` |
| `-p, --pretty` | Pretty-print JSON output |

```bash
# Output to file
vague data.vague -o output.json

# Pretty print
vague data.vague -p

# CSV format
vague data.vague -f csv -o data.csv
```

## Reproducibility

Generate consistent output across runs:

| Option | Description |
|--------|-------------|
| `-s, --seed <number>` | Seed for reproducible generation |
| `-w, --watch` | Watch input file and regenerate on changes |

```bash
# Reproducible output
vague data.vague --seed 42

# Watch mode
vague data.vague -o output.json -w
```

## CSV Options

Configure CSV output formatting:

| Option | Description |
|--------|-------------|
| `--csv-delimiter <char>` | Field delimiter (default: `,`) |
| `--csv-no-header` | Omit header row |
| `--csv-arrays <mode>` | Array handling: `json`, `first`, `count` |
| `--csv-nested <mode>` | Nested objects: `flatten`, `json` |

```bash
# Semicolon delimiter
vague data.vague -f csv --csv-delimiter ";"

# No header row
vague data.vague -f csv --csv-no-header
```

## OpenAPI Validation

Validate generated data against an OpenAPI specification:

| Option | Description |
|--------|-------------|
| `-v, --validate <spec>` | Validate against OpenAPI spec |
| `-m, --mapping <json>` | Schema mapping `{"collection": "Schema"}` |
| `--validate-only` | Only validate, don't output data |

```bash
# Validate generated data
vague data.vague -v openapi.json -m '{"invoices": "Invoice"}'

# Validate only (for CI)
vague data.vague -v openapi.json --validate-only
```

## OpenAPI Example Population

Populate OpenAPI specs with generated examples:

| Option | Description |
|--------|-------------|
| `--oas-source <spec>` | Source OpenAPI spec to populate |
| `--oas-output <file>` | Output path for populated spec |
| `--oas-example-count <n>` | Examples per schema (default: 1) |
| `--oas-external` | Use external file references |

```bash
# Populate spec with examples
vague data.vague --oas-source api.json --oas-output api.json

# Multiple examples
vague data.vague --oas-source api.json --oas-output api.json --oas-example-count 3
```

## OpenAPI Linting

Lint OpenAPI specs using Spectral:

| Option | Description |
|--------|-------------|
| `--lint-spec <file>` | Lint OpenAPI spec with Spectral |
| `--lint-verbose` | Show detailed lint results |

```bash
# Lint spec
vague --lint-spec openapi.json

# Verbose output
vague --lint-spec openapi.yaml --lint-verbose
```

## Schema Inference

Reverse-engineer Vague schemas from existing data:

| Option | Description |
|--------|-------------|
| `--infer <file>` | Infer schema from JSON/CSV |
| `--collection-name <name>` | Collection name for CSV |
| `--dataset-name <name>` | Dataset name for inference |
| `--infer-delimiter <char>` | CSV delimiter (default: `,`) |

```bash
# Infer from JSON
vague --infer data.json -o schema.vague

# Infer from CSV
vague --infer data.csv --collection-name employees
```

## Data Validation

Validate external JSON data against Vague schema constraints:

| Option | Description |
|--------|-------------|
| `--validate-data <file>` | Validate JSON against Vague schema |
| `--schema <file>` | Schema file for data validation |

```bash
# Validate external data
vague --validate-data data.json --schema schema.vague
```

## TypeScript Generation

Generate TypeScript type definitions from schemas:

| Option | Description |
|--------|-------------|
| `--typescript` | Generate TypeScript definitions |
| `--ts-only` | Only TypeScript (no .vague) |

```bash
# Generate TypeScript
vague --infer data.json --typescript

# TypeScript only
vague --infer data.json --ts-only
```

## Plugins

Load custom generator plugins:

| Option | Description |
|--------|-------------|
| `--plugins <dir>` | Load plugins from directory |
| `--no-auto-plugins` | Disable automatic plugin discovery |

```bash
# Load custom plugins
vague data.vague --plugins ./custom-plugins

# Disable auto-discovery
vague data.vague --no-auto-plugins --plugins ./plugins
```

## Debugging

Enable detailed logging for troubleshooting:

| Option | Description |
|--------|-------------|
| `--debug` | Enable debug logging |
| `--log-level <level>` | Set log level |
| `--verbose` | Show verbose output |

```bash
# Debug mode
vague data.vague --debug

# Verbose output
vague data.vague --verbose
```

Environment variable:

```bash
VAGUE_DEBUG=generator,constraint vague data.vague
```

Debug components: `lexer`, `parser`, `generator`, `constraint`, `validator`, `plugin`, `cli`, `openapi`, `infer`, `config`

## Help

```bash
vague --help
vague -h
```

## Examples

### Development Workflow

```bash
# Generate and watch
vague fixtures.vague -o fixtures.json -w -p

# Generate with validation
vague data.vague -v api.json -o output.json -p
```

### CI/CD Pipeline

```bash
# Validate and fail on error
vague data.vague -v openapi.json --validate-only

# Lint API spec
vague --lint-spec api.yaml
```

### Data Migration

```bash
# Infer schema from existing data
vague --infer legacy-data.json -o schema.vague

# Generate new data matching schema
vague schema.vague -o new-data.json -s 42
```

### API Documentation

```bash
# Populate OpenAPI with examples
vague examples.vague \
  --oas-source api.yaml \
  --oas-output api-documented.yaml \
  --oas-example-count 2
```

## Configuration File

Create `vague.config.js` for default options:

```javascript
// vague.config.js
export default {
  plugins: ['./plugins/custom.js'],
  seed: 42,
  pretty: true
};
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Validation or generation error |
| 2 | Invalid arguments |
