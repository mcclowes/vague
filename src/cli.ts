#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { compile } from "./index.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
vague - Declarative test data generator

Usage:
  vague <input.vague> [options]

Options:
  -o, --output <file>  Write output to file (default: stdout)
  -p, --pretty         Pretty-print JSON output
  -h, --help           Show this help message

Example:
  vague schema.vague -o output.json -p
`);
    process.exit(0);
  }

  const inputFile = args[0];
  let outputFile: string | null = null;
  let pretty = false;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === "-o" || args[i] === "--output") {
      outputFile = args[++i];
    } else if (args[i] === "-p" || args[i] === "--pretty") {
      pretty = true;
    }
  }

  try {
    const source = readFileSync(resolve(inputFile), "utf-8");
    const result = await compile(source);

    const json = pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result);

    if (outputFile) {
      writeFileSync(resolve(outputFile), json);
      console.log(`Output written to ${outputFile}`);
    } else {
      console.log(json);
    }
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
