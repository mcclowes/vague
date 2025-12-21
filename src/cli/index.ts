/**
 * CLI module exports.
 */

export { parseArgs } from './args.js';
export { showHelp, HELP_TEXT } from './help.js';
export { handleLint, handleInfer, handleValidate, handleCompile } from './handlers/index.js';
export { createDefaultOptions } from './types.js';
export type { CliOptions, ValidationMapping } from './types.js';
