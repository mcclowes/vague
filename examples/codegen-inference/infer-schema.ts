/**
 * Example: Using inferSchema to generate Vague code from existing JSON data
 *
 * This demonstrates how to reverse-engineer a Vague schema from real data,
 * useful for:
 * - Bootstrapping test fixture schemas from production data samples
 * - Understanding data patterns and distributions
 * - Migrating from static JSON fixtures to dynamic Vague schemas
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { inferSchema } from '../../dist/index.js';

// Load the sample data
const sampleDataPath = join(import.meta.dirname, 'sample-data.json');
const rawData = readFileSync(sampleDataPath, 'utf-8');
const data = JSON.parse(rawData);

console.log('='.repeat(60));
console.log('Schema Inference Example: E-Commerce SaaS Analytics Data');
console.log('='.repeat(60));
console.log();

// Show what data we're working with
console.log('Input data summary:');
console.log(`  - customers: ${data.customers.length} records`);
console.log(`  - orders: ${data.orders.length} records`);
console.log(`  - events: ${data.events.length} records`);
console.log();

// Basic inference with default options
console.log('-'.repeat(60));
console.log('1. Basic inference (default options)');
console.log('-'.repeat(60));

const basicSchema = inferSchema(data);
console.log(basicSchema);
console.log();

// Inference with custom dataset name
console.log('-'.repeat(60));
console.log('2. Custom dataset name');
console.log('-'.repeat(60));

const customNameSchema = inferSchema(data, {
  datasetName: 'SaaSAnalytics',
});
// Just show the dataset block
const datasetMatch = customNameSchema.match(/dataset \w+ \{[\s\S]*$/);
if (datasetMatch) {
  console.log('...');
  console.log(datasetMatch[0]);
}
console.log();

// Inference without format detection
console.log('-'.repeat(60));
console.log('3. Without format detection (uses plain string instead of uuid(), email())');
console.log('-'.repeat(60));

const noFormatsSchema = inferSchema(data, {
  detectFormats: false,
  datasetName: 'NoFormats',
});
// Show just the Customer schema to highlight the difference
const customerMatch = noFormatsSchema.match(/schema Customer \{[\s\S]*?\}/);
if (customerMatch) {
  console.log(customerMatch[0]);
}
console.log();

// Inference without weighted superpositions
console.log('-'.repeat(60));
console.log('4. Without weighted superpositions (equal weights)');
console.log('-'.repeat(60));

const equalWeightsSchema = inferSchema(data, {
  weightedSuperpositions: false,
  datasetName: 'EqualWeights',
});
// Show the Order schema to see status field
const orderMatch = equalWeightsSchema.match(/schema Order \{[\s\S]*?\}/);
if (orderMatch) {
  console.log(orderMatch[0]);
}
console.log();

// Save the generated schema to a file
const outputPath = join(import.meta.dirname, 'generated-schema.vague');
writeFileSync(outputPath, basicSchema);
console.log('-'.repeat(60));
console.log(`Schema saved to: ${outputPath}`);
console.log('-'.repeat(60));
console.log();

// Demonstrate regenerating data from the inferred schema
console.log('Next steps:');
console.log('  1. Review and customize the generated schema');
console.log('  2. Add constraints (assume blocks) for business rules');
console.log('  3. Add cross-references between collections');
console.log('  4. Run: node dist/cli.js examples/codegen-inference/generated-schema.vague');
