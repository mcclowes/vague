#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { compile, registerPlugin } from "./index.js";
import { SchemaValidator } from "./validator/index.js";
import { fakerPlugin, fakerShorthandPlugin } from "./plugins/index.js";

// Register faker plugins automatically
registerPlugin(fakerPlugin);
registerPlugin(fakerShorthandPlugin);

interface ValidationMapping {
  [collection: string]: string;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
vague - Declarative test data generator

Usage:
  vague <input.vague> [options]

Options:
  -o, --output <file>      Write output to file (default: stdout)
  -p, --pretty             Pretty-print JSON output
  -v, --validate <spec>    Validate output against OpenAPI spec
  -m, --mapping <json>     Schema mapping for validation (JSON: {"collection": "SchemaName"})
  --validate-only          Only validate, don't output data
  -h, --help               Show this help message

Examples:
  vague schema.vague -o output.json -p
  vague schema.vague -v openapi.json -m '{"invoices": "AccountingInvoice"}'
  vague schema.vague -v openapi.json -m '{"invoices": "AccountingInvoice"}' --validate-only
`);
    process.exit(0);
  }

  const inputFile = args[0];
  let outputFile: string | null = null;
  let pretty = false;
  let validateSpec: string | null = null;
  let schemaMapping: ValidationMapping | null = null;
  let validateOnly = false;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "-o" || args[i] === "--output") {
      outputFile = args[++i];
    } else if (args[i] === "-p" || args[i] === "--pretty") {
      pretty = true;
    } else if (args[i] === "-v" || args[i] === "--validate") {
      validateSpec = args[++i];
    } else if (args[i] === "-m" || args[i] === "--mapping") {
      try {
        schemaMapping = JSON.parse(args[++i]) as ValidationMapping;
      } catch {
        console.error("Error: Invalid JSON for schema mapping");
        process.exit(1);
      }
    } else if (args[i] === "--validate-only") {
      validateOnly = true;
    }
  }

  try {
    const source = readFileSync(resolve(inputFile), "utf-8");
    const result = await compile(source);

    // Validate if spec provided
    if (validateSpec) {
      const validator = new SchemaValidator();
      const loadedSchemas = await validator.loadOpenAPISchemas(resolve(validateSpec));

      console.error(`Loaded ${loadedSchemas.length} schemas from ${validateSpec}`);

      if (schemaMapping) {
        const validationResults = validator.validateDataset(
          result as Record<string, unknown[]>,
          schemaMapping
        );

        let totalValidated = 0;
        let totalFailed = 0;
        let hasErrors = false;

        for (const { collection, schema, result: collResult } of validationResults) {
          totalValidated += collResult.itemsValidated;
          totalFailed += collResult.itemsFailed;

          if (collResult.valid) {
            console.error(
              `✓ ${collection} (${collResult.itemsValidated} items) - valid against ${schema}`
            );
          } else {
            hasErrors = true;
            console.error(
              `✗ ${collection} (${collResult.itemsFailed}/${collResult.itemsValidated} failed) - invalid against ${schema}`
            );

            // Show first few errors
            const errorsToShow = collResult.errors.slice(0, 5);
            for (const err of errorsToShow) {
              console.error(`  ${err.path}: ${err.message}`);
            }
            if (collResult.errors.length > 5) {
              console.error(`  ... and ${collResult.errors.length - 5} more errors`);
            }
          }
        }

        console.error(`\nValidation summary: ${totalValidated - totalFailed}/${totalValidated} items valid`);

        if (hasErrors && validateOnly) {
          process.exit(1);
        }
      } else {
        console.error("Available schemas:", loadedSchemas.slice(0, 20).join(", "));
        if (loadedSchemas.length > 20) {
          console.error(`  ... and ${loadedSchemas.length - 20} more`);
        }
        console.error("\nUse -m/--mapping to specify which collections to validate against which schemas");
      }
    }

    // Output data unless validate-only
    if (!validateOnly) {
      const json = pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result);

      if (outputFile) {
        writeFileSync(resolve(outputFile), json);
        console.error(`Output written to ${outputFile}`);
      } else {
        console.log(json);
      }
    }
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
