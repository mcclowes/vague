/**
 * CLI help text.
 */

export const HELP_TEXT = `
vague - Declarative test data generator

Usage:
  vague <input.vague> [options]
  vague --infer <data.json|data.csv> [options]
  vague --validate-data <data.json> --schema <schema.vague> [options]

Options:
  -o, --output <file>      Write output to file (default: stdout)
  -f, --format <fmt>       Output format: json (default), csv
  -p, --pretty             Pretty-print JSON output
  -s, --seed <number>      Seed for reproducible random generation
  -w, --watch              Watch input file and regenerate on changes
  -v, --validate <spec>    Validate output against OpenAPI spec
  -m, --mapping <json>     Schema mapping for validation (JSON: {"collection": "SchemaName"})
  --validate-only          Only validate, don't output data
  -c, --config <file>      Use specific config file (default: auto-detect vague.config.js)
  --no-config              Skip loading config file
  -d, --debug              Enable debug logging (shows generation details)
  --log-level <level>      Set log level: none, error, warn, info, debug (default: warn)
  --plugins <dir>          Load plugins from directory (can be used multiple times)
  --no-auto-plugins        Disable automatic plugin discovery
  --verbose                Show verbose output (e.g., discovered plugins)
  -h, --help               Show this help message

CSV Options (when --format csv):
  --csv-delimiter <char>   Field delimiter (default: ',')
  --csv-no-header          Omit header row
  --csv-arrays <mode>      Array handling: json, first, count (default: json)
  --csv-nested <mode>      Nested object handling: flatten, json (default: flatten)

Schema Inference:
  --infer <file>           Infer Vague schema from JSON or CSV data
  --dataset-name <name>    Name for generated dataset (default: "Generated")
  --collection-name <name> Collection name for CSV input (default: derived from filename)
  --infer-delimiter <char> CSV delimiter for inference (default: ',')
  --no-formats             Disable format detection (uuid, email, etc.)
  --no-weights             Disable weighted superpositions
  --max-enum <n>           Maximum unique values for enum detection (default: 10)
  --typescript             Also generate TypeScript definitions (.d.ts file)
  --ts-only                Generate only TypeScript definitions (no .vague file)

Data Validation:
  --validate-data <file>   Validate JSON data against a Vague schema
  --schema <file>          Vague schema file for validation
  --dataset <name>         Dataset name for validate {} block constraints

OpenAPI Example Population:
  --oas-output <file>      Write OpenAPI spec with examples to file
  --oas-source <spec>      Source OpenAPI spec to populate (auto-detected if using import)
  --oas-external           Use external file references instead of inline examples
  --oas-example-count <n>  Number of examples per schema (default: 1)

OpenAPI Linting (Spectral):
  --lint-spec <file>       Lint an OpenAPI spec file with Spectral rules
  --lint-verbose           Show detailed lint results including hints

Mock Server:
  --serve [port]           Start HTTP mock server (default port: 3000)

Examples:
  vague schema.vague -o output.json -p
  vague schema.vague -s 12345                 # Reproducible output
  vague schema.vague -f csv -o data.csv       # CSV output
  vague schema.vague -f csv --csv-delimiter ";" -o data.csv  # Semicolon-delimited
  vague schema.vague -v openapi.json -m '{"invoices": "AccountingInvoice"}'
  vague schema.vague -v openapi.json -m '{"invoices": "AccountingInvoice"}' --validate-only

  # Infer schema from JSON or CSV data
  vague --infer data.json -o schema.vague
  vague --infer data.csv -o schema.vague
  vague --infer data.csv --collection-name users -o schema.vague
  vague --infer data.json --dataset-name TestFixtures

  # Infer schema with TypeScript definitions
  vague --infer data.json -o schema.vague --typescript     # Outputs schema.vague and schema.vague.d.ts
  vague --infer data.json -o types.d.ts --ts-only          # Only outputs TypeScript definitions

  # Populate OpenAPI spec with examples
  vague schema.vague --oas-output api-with-examples.json --oas-source api.json
  vague schema.vague --oas-output api.json --oas-source api.json --oas-example-count 3
  vague schema.vague --oas-output api.json --oas-source api.json --oas-external

  # Validate data against Vague schema
  vague --validate-data data.json --schema schema.vague -m '{"invoices": "Invoice"}'
  vague --validate-data data.json --schema schema.vague --dataset TestData  # Include validate {} block

  # Lint an OpenAPI spec with Spectral
  vague --lint-spec openapi.json
  vague --lint-spec openapi.yaml --lint-verbose

  # Start mock server
  vague schema.vague --serve              # http://localhost:3000
  vague schema.vague --serve 8080         # http://localhost:8080
  vague schema.vague --serve --seed 42    # Reproducible data

  # Use custom config file
  vague schema.vague -c ./custom-config.js
  vague schema.vague --no-config  # Skip config file

Configuration File (vague.config.js):
  // vague.config.js
  export default {
    plugins: [
      './my-plugin.js',           // Local plugin file
      'vague-plugin-stripe',      // npm package
    ],
    seed: 42,                     // Default seed
    format: 'json',               // Default format
    pretty: true,                 // Pretty-print by default
    logging: {
      level: 'debug',             // Log level: none, error, warn, info, debug
      components: ['generator'],  // Filter to specific components
      timestamps: true            // Include timestamps
    }
  };
`;

export function showHelp(): void {
  console.log(HELP_TEXT);
}
