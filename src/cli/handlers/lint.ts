/**
 * Spectral linting handler.
 */

import { resolve } from 'node:path';
import { lintOpenAPISpec, formatLintResults } from '../../spectral/index.js';
import type { CliOptions } from '../types.js';

export async function handleLint(options: CliOptions): Promise<void> {
  if (!options.lintSpecFile) {
    throw new Error('No lint spec file specified');
  }

  console.error(`Linting OpenAPI spec: ${options.lintSpecFile}`);
  const lintResult = await lintOpenAPISpec(resolve(options.lintSpecFile));

  console.error(formatLintResults(lintResult, options.lintVerbose));

  if (!lintResult.valid) {
    console.error('\nSpec has linting errors.');
    process.exit(1);
  } else if (lintResult.warningCount > 0) {
    console.error('\nSpec passed with warnings.');
    process.exit(0);
  } else {
    console.error('\nSpec passed linting.');
    process.exit(0);
  }
}
