/**
 * Regex plugin for Vague
 *
 * Provides:
 * 1. String generation from regex patterns
 * 2. Pattern matching/testing for constraints
 * 3. Pattern extraction
 * 4. Common pattern shortcuts
 *
 * Usage in .vague files:
 *   schema Product {
 *     // Generate strings matching a pattern
 *     sku: regex.generate("[A-Z]{3}-[0-9]{4}")
 *     code: regex("[A-Z]{2}[0-9]{6}")  // Shorthand for generate
 *
 *     // Test patterns in constraints
 *     custom_id: string,
 *     assume regex.test("^[A-Z]{3}-[0-9]+$", custom_id)
 *
 *     // Extract matches
 *     extracted: regex.match("[0-9]+", some_string)
 *   }
 *
 * Or with shorthand names:
 *   schema Example {
 *     sku: pattern("[A-Z]{3}-[0-9]{4}")
 *     valid: matches("^[A-Z]+$", some_field)
 *   }
 *
 * Common pattern generators:
 *   schema Example {
 *     alphanumeric_code: regex.alphanumeric(8)     // 8 alphanumeric chars
 *     numeric_code: regex.digits(6)                // 6 digits
 *     alpha_code: regex.alpha(4)                   // 4 letters
 *     hex_code: regex.hex(8)                       // 8 hex chars
 *     slug: regex.slug(3, 5)                       // slug with 3-5 words
 *     phone_pattern: regex.phone()                 // Phone-like pattern
 *     plate: regex.licensePlate()                  // License plate format
 *   }
 */

import RandExp from 'randexp';
import type { VaguePlugin, GeneratorFunction, GeneratorContext } from '../interpreter/generator.js';
import { randomInt, randomChoice } from '../interpreter/random.js';

// Configure RandExp to use our seeded random
function createRandExp(pattern: string | RegExp): RandExp {
  const randexp = new RandExp(pattern);
  // Override the random function to use our seeded one
  randexp.randInt = (from: number, to: number) => randomInt(from, to);
  return randexp;
}

// Helper to create a generator from a function
function wrap<T>(fn: (...args: unknown[]) => T): GeneratorFunction {
  return (args) => fn(...args);
}

// Helper with context - prefixed with underscore as it's not currently used but may be useful
function _wrapWithContext<T>(
  fn: (context: GeneratorContext, ...args: unknown[]) => T
): GeneratorFunction {
  return (args, context) => fn(context, ...args);
}

// ============================================
// Core regex functions
// ============================================

/**
 * Generate a string that matches the given regex pattern.
 * @param pattern - A regex pattern string or RegExp
 * @returns A randomly generated string matching the pattern
 */
function generate(pattern: unknown): string {
  if (typeof pattern !== 'string' && !(pattern instanceof RegExp)) {
    throw new Error(`regex.generate expects a string or RegExp pattern, got ${typeof pattern}`);
  }

  const randexp = createRandExp(pattern);
  return randexp.gen();
}

/**
 * Test if a value matches a regex pattern.
 * Returns true/false - useful in assume clauses.
 * @param pattern - A regex pattern string
 * @param value - The value to test
 * @param flags - Optional regex flags (e.g., 'i' for case-insensitive)
 * @returns boolean indicating if the value matches
 */
function test(pattern: unknown, value: unknown, flags?: unknown): boolean {
  if (typeof pattern !== 'string') {
    throw new Error(`regex.test expects a string pattern, got ${typeof pattern}`);
  }

  const flagStr = typeof flags === 'string' ? flags : '';
  const regex = new RegExp(pattern, flagStr);
  return regex.test(String(value));
}

/**
 * Extract the first match from a string using a regex pattern.
 * Note: Named 'find' because 'match' is a reserved keyword in Vague.
 * @param pattern - A regex pattern string
 * @param value - The string to search in
 * @returns The matched string or null if no match
 */
function find(pattern: unknown, value: unknown): string | null {
  if (typeof pattern !== 'string') {
    throw new Error(`regex.find expects a string pattern, got ${typeof pattern}`);
  }

  const regex = new RegExp(pattern);
  const result = String(value).match(regex);
  return result ? result[0] : null;
}

/**
 * Extract all matches from a string using a regex pattern.
 * @param pattern - A regex pattern string
 * @param value - The string to search in
 * @returns Array of matched strings
 */
function matchAll(pattern: unknown, value: unknown): string[] {
  if (typeof pattern !== 'string') {
    throw new Error(`regex.matchAll expects a string pattern, got ${typeof pattern}`);
  }

  const regex = new RegExp(pattern, 'g');
  const matches = String(value).matchAll(regex);
  return Array.from(matches, (m) => m[0]);
}

/**
 * Extract captured groups from a string using a regex pattern.
 * @param pattern - A regex pattern string with capture groups
 * @param value - The string to search in
 * @returns Array of captured group values or null if no match
 */
function capture(pattern: unknown, value: unknown): string[] | null {
  if (typeof pattern !== 'string') {
    throw new Error(`regex.capture expects a string pattern, got ${typeof pattern}`);
  }

  const regex = new RegExp(pattern);
  const result = String(value).match(regex);
  if (!result) return null;

  // Return captured groups (skip full match at index 0)
  return result.slice(1);
}

/**
 * Replace matches of a pattern in a string.
 * @param pattern - A regex pattern string
 * @param value - The string to search in
 * @param replacement - The replacement string
 * @param flags - Optional regex flags (default: 'g' for global replace)
 * @returns The modified string
 */
function replace(pattern: unknown, value: unknown, replacement: unknown, flags?: unknown): string {
  if (typeof pattern !== 'string') {
    throw new Error(`regex.replace expects a string pattern, got ${typeof pattern}`);
  }

  const flagStr = typeof flags === 'string' ? flags : 'g';
  const regex = new RegExp(pattern, flagStr);
  return String(value).replace(regex, String(replacement ?? ''));
}

/**
 * Split a string by a regex pattern.
 * @param pattern - A regex pattern string
 * @param value - The string to split
 * @returns Array of string parts
 */
function split(pattern: unknown, value: unknown): string[] {
  if (typeof pattern !== 'string') {
    throw new Error(`regex.split expects a string pattern, got ${typeof pattern}`);
  }

  const regex = new RegExp(pattern);
  return String(value).split(regex);
}

// ============================================
// Common pattern generators
// ============================================

/**
 * Generate an alphanumeric string of the given length.
 * @param length - Number of characters (default: 8)
 */
function alphanumeric(length?: unknown): string {
  const len = typeof length === 'number' ? length : 8;
  return generate(`[A-Za-z0-9]{${len}}`);
}

/**
 * Generate a string of digits.
 * @param length - Number of digits (default: 6)
 */
function digits(length?: unknown): string {
  const len = typeof length === 'number' ? length : 6;
  return generate(`[0-9]{${len}}`);
}

/**
 * Generate a string of letters only.
 * @param length - Number of letters (default: 8)
 * @param caseStyle - 'upper', 'lower', or 'mixed' (default)
 */
function alpha(length?: unknown, caseStyle?: unknown): string {
  const len = typeof length === 'number' ? length : 8;
  const style = typeof caseStyle === 'string' ? caseStyle : 'mixed';

  let charset: string;
  switch (style) {
    case 'upper':
      charset = 'A-Z';
      break;
    case 'lower':
      charset = 'a-z';
      break;
    default:
      charset = 'A-Za-z';
  }

  return generate(`[${charset}]{${len}}`);
}

/**
 * Generate a hexadecimal string.
 * @param length - Number of hex characters (default: 8)
 * @param caseStyle - 'upper', 'lower' (default), or 'mixed'
 */
function hex(length?: unknown, caseStyle?: unknown): string {
  const len = typeof length === 'number' ? length : 8;
  const style = typeof caseStyle === 'string' ? caseStyle : 'lower';

  let charset: string;
  switch (style) {
    case 'upper':
      charset = '0-9A-F';
      break;
    case 'mixed':
      charset = '0-9A-Fa-f';
      break;
    default:
      charset = '0-9a-f';
  }

  return generate(`[${charset}]{${len}}`);
}

/**
 * Generate a URL-friendly slug.
 * @param minWords - Minimum word count (default: 2)
 * @param maxWords - Maximum word count (default: 4)
 */
function slug(minWords?: unknown, maxWords?: unknown): string {
  const min = typeof minWords === 'number' ? minWords : 2;
  const max = typeof maxWords === 'number' ? maxWords : 4;
  const wordCount = randomInt(min, max);

  // Generate lowercase words joined by hyphens
  const words = [];
  for (let i = 0; i < wordCount; i++) {
    const wordLen = randomInt(3, 8);
    words.push(generate(`[a-z]{${wordLen}}`));
  }
  return words.join('-');
}

/**
 * Generate a phone number pattern.
 * @param format - 'us', 'uk', 'intl', or custom pattern (default: 'us')
 */
function phone(format?: unknown): string {
  const fmt = typeof format === 'string' ? format : 'us';

  switch (fmt) {
    case 'us':
      return generate('\\([0-9]{3}\\) [0-9]{3}-[0-9]{4}');
    case 'uk':
      return generate('0[0-9]{4} [0-9]{6}');
    case 'intl':
      return generate('\\+[0-9]{1,3} [0-9]{3} [0-9]{3} [0-9]{4}');
    default:
      // Treat as custom pattern
      return generate(fmt);
  }
}

/**
 * Generate a license plate pattern.
 * @param format - 'us', 'uk', 'eu', or custom pattern (default: 'us')
 */
function licensePlate(format?: unknown): string {
  const fmt = typeof format === 'string' ? format : 'us';

  switch (fmt) {
    case 'us':
      return generate('[A-Z]{3}-[0-9]{4}');
    case 'uk':
      return generate('[A-Z]{2}[0-9]{2} [A-Z]{3}');
    case 'eu':
      return generate('[A-Z]{1,3}-[A-Z]{1,2} [0-9]{1,4}');
    default:
      return generate(fmt);
  }
}

/**
 * Generate a product SKU.
 * @param format - Pattern format (default: standard SKU pattern)
 */
function sku(format?: unknown): string {
  if (typeof format === 'string') {
    return generate(format);
  }
  return generate('[A-Z]{3}-[0-9]{4}-[A-Z]{2}');
}

/**
 * Generate a postal/zip code.
 * @param format - 'us', 'uk', 'ca', or custom pattern (default: 'us')
 */
function postalCode(format?: unknown): string {
  const fmt = typeof format === 'string' ? format : 'us';

  switch (fmt) {
    case 'us':
      return generate('[0-9]{5}(-[0-9]{4})?');
    case 'uk':
      return generate('[A-Z]{1,2}[0-9][0-9A-Z]? [0-9][A-Z]{2}');
    case 'ca':
      return generate('[A-Z][0-9][A-Z] [0-9][A-Z][0-9]');
    default:
      return generate(fmt);
  }
}

/**
 * Generate an IP address pattern.
 * @param version - 'v4' or 'v6' (default: 'v4')
 */
function ip(version?: unknown): string {
  const v = typeof version === 'string' ? version : 'v4';

  if (v === 'v6') {
    // Simplified IPv6-like pattern
    return generate('[0-9a-f]{4}(:[0-9a-f]{4}){7}');
  }

  // IPv4: Generate each octet separately for valid ranges
  const octets = [];
  for (let i = 0; i < 4; i++) {
    octets.push(randomInt(0, 255));
  }
  return octets.join('.');
}

/**
 * Generate a MAC address.
 * @param separator - Separator character (default: ':')
 */
function mac(separator?: unknown): string {
  const sep = typeof separator === 'string' ? separator : ':';
  const pairs = [];
  for (let i = 0; i < 6; i++) {
    pairs.push(generate('[0-9A-F]{2}'));
  }
  return pairs.join(sep);
}

/**
 * Generate a credit card number pattern (not valid, just pattern).
 * @param format - 'visa', 'mastercard', 'amex', or custom pattern
 */
function creditCard(format?: unknown): string {
  const fmt = typeof format === 'string' ? format : 'visa';

  switch (fmt) {
    case 'visa':
      return '4' + generate('[0-9]{15}');
    case 'mastercard':
      return generate('5[1-5][0-9]{14}');
    case 'amex':
      return generate('3[47][0-9]{13}');
    default:
      return generate(fmt);
  }
}

/**
 * Generate a semantic version string.
 * @param prerelease - Include prerelease tag (default: false)
 */
function semver(prerelease?: unknown): string {
  const major = randomInt(0, 10);
  const minor = randomInt(0, 20);
  const patch = randomInt(0, 50);

  let version = `${major}.${minor}.${patch}`;

  if (prerelease === true) {
    const tags = ['alpha', 'beta', 'rc'];
    const tag = randomChoice(tags);
    const num = randomInt(1, 10);
    version += `-${tag}.${num}`;
  }

  return version;
}

/**
 * Generate a color in hex format.
 * @param includeHash - Include # prefix (default: true)
 */
function colorHex(includeHash?: unknown): string {
  const hash = includeHash !== false ? '#' : '';
  return hash + generate('[0-9A-Fa-f]{6}');
}

/**
 * Generate a hashtag.
 * @param minWords - Minimum camelCase words (default: 1)
 * @param maxWords - Maximum camelCase words (default: 3)
 */
function hashtag(minWords?: unknown, maxWords?: unknown): string {
  const min = typeof minWords === 'number' ? minWords : 1;
  const max = typeof maxWords === 'number' ? maxWords : 3;
  const wordCount = randomInt(min, max);

  let tag = '#';
  for (let i = 0; i < wordCount; i++) {
    const wordLen = randomInt(3, 8);
    const word = generate(`[a-z]{${wordLen}}`);
    // Capitalize first letter for camelCase (except first word)
    tag += i === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1);
  }
  return tag;
}

/**
 * Generate a mention/handle.
 * @param minLength - Minimum length (default: 3)
 * @param maxLength - Maximum length (default: 15)
 */
function mention(minLength?: unknown, maxLength?: unknown): string {
  const min = typeof minLength === 'number' ? minLength : 3;
  const max = typeof maxLength === 'number' ? maxLength : 15;
  const len = randomInt(min, max);
  return '@' + generate(`[a-z][a-z0-9_]{${len - 1}}`);
}

// ============================================
// Plugin Definition
// ============================================

export const regexPlugin: VaguePlugin = {
  name: 'regex',
  generators: {
    // Core functions
    generate: wrap(generate),
    test: wrap(test),
    find: wrap(find), // Note: 'match' is reserved, use 'find' instead
    matchAll: wrap(matchAll),
    capture: wrap(capture),
    replace: wrap(replace),
    split: wrap(split),

    // Common pattern generators
    alphanumeric: wrap(alphanumeric),
    digits: wrap(digits),
    alpha: wrap(alpha),
    hex: wrap(hex),
    slug: wrap(slug),
    phone: wrap(phone),
    licensePlate: wrap(licensePlate),
    sku: wrap(sku),
    postalCode: wrap(postalCode),
    ip: wrap(ip),
    mac: wrap(mac),
    creditCard: wrap(creditCard),
    semver: wrap(semver),
    colorHex: wrap(colorHex),
    hashtag: wrap(hashtag),
    mention: wrap(mention),
  },
};

/**
 * Shorthand generators that don't require the "regex." prefix
 */
export const regexShorthandPlugin: VaguePlugin = {
  name: 'regex-shorthand',
  generators: {
    // Core
    regex: wrap(generate), // regex("[A-Z]{3}") as shorthand for regex.generate
    pattern: wrap(generate), // alias
    matches: wrap(test), // matches("^[A-Z]+$", field) for constraints

    // Common patterns
    alphanumeric: wrap(alphanumeric),
    digits: wrap(digits),
    alpha: wrap(alpha),
    hexString: wrap(hex), // hex is a reserved word in some contexts
    slug: wrap(slug),
    licensePlate: wrap(licensePlate),
    postalCode: wrap(postalCode),
    semver: wrap(semver),
    colorHex: wrap(colorHex),
    hashtag: wrap(hashtag),
    mention: wrap(mention),
  },
};

export default regexPlugin;
