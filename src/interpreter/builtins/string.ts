import type { GeneratorContext } from '../context.js';
import { toNumber, toNumberOrUndefined } from '../../utils/type-guards.js';

/**
 * String transformation function handlers
 */
export const stringFunctions = {
  /**
   * uppercase(str) - convert string to uppercase
   */
  uppercase(args: unknown[], _context: GeneratorContext): string {
    const str = args[0];
    return str != null ? String(str).toUpperCase() : '';
  },

  /**
   * lowercase(str) - convert string to lowercase
   */
  lowercase(args: unknown[], _context: GeneratorContext): string {
    const str = args[0];
    return str != null ? String(str).toLowerCase() : '';
  },

  /**
   * capitalize(str) - capitalize first letter of each word
   */
  capitalize(args: unknown[], _context: GeneratorContext): string {
    const str = args[0];
    if (str == null) return '';
    return String(str)
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  },

  /**
   * kebabCase(str) - convert to kebab-case (lowercase with hyphens)
   */
  kebabCase(args: unknown[], _context: GeneratorContext): string {
    const str = args[0];
    if (str == null) return '';
    return String(str)
      .replace(/([a-z])([A-Z])/g, '$1-$2') // Handle camelCase
      .replace(/[\s_]+/g, '-') // Replace spaces and underscores
      .toLowerCase();
  },

  /**
   * snakeCase(str) - convert to snake_case (lowercase with underscores)
   */
  snakeCase(args: unknown[], _context: GeneratorContext): string {
    const str = args[0];
    if (str == null) return '';
    return String(str)
      .replace(/([a-z])([A-Z])/g, '$1_$2') // Handle camelCase
      .replace(/[\s-]+/g, '_') // Replace spaces and hyphens
      .toLowerCase();
  },

  /**
   * camelCase(str) - convert to camelCase
   */
  camelCase(args: unknown[], _context: GeneratorContext): string {
    const str = args[0];
    if (str == null) return '';
    return String(str)
      .replace(/[-_\s]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''))
      .replace(/^(.)/, (c) => c.toLowerCase());
  },

  /**
   * trim(str) - remove leading and trailing whitespace
   */
  trim(args: unknown[], _context: GeneratorContext): string {
    const str = args[0];
    return str != null ? String(str).trim() : '';
  },

  /**
   * concat(str1, str2, ...) - concatenate multiple strings
   */
  concat(args: unknown[], _context: GeneratorContext): string {
    return args.map((arg) => (arg != null ? String(arg) : '')).join('');
  },

  /**
   * substring(str, start, end?) - extract a substring
   */
  substring(args: unknown[], _context: GeneratorContext): string {
    const str = args[0];
    const start = toNumber(args[1], 0);
    const end = toNumberOrUndefined(args[2]);
    if (str == null) return '';
    return end !== undefined ? String(str).substring(start, end) : String(str).substring(start);
  },

  /**
   * replace(str, search, replacement) - replace first occurrence
   */
  replace(args: unknown[], _context: GeneratorContext): string {
    const str = args[0];
    const search = String(args[1] ?? '');
    const replacement = String(args[2] ?? '');
    if (str == null) return '';
    return String(str).replace(search, replacement);
  },

  /**
   * length(str) - return the length of a string
   */
  length(args: unknown[], _context: GeneratorContext): number {
    const str = args[0];
    return str != null ? String(str).length : 0;
  },
};
