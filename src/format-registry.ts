/**
 * Unified Format Registry
 *
 * Centralizes format definitions used by:
 * - Schema inference (format-detector.ts) - maps detected formats to generator syntax
 * - Value generation (generator.ts) - maps OpenAPI/JSON Schema formats to value generators
 *
 * This eliminates duplication and ensures consistency across the codebase.
 */

import { randomUUID, randomInt } from 'crypto';

/**
 * Format definition for the registry
 */
export interface FormatDefinition {
  /** Plugin generator name to try first (e.g., 'uuid', 'email', 'internet.ipv6') */
  pluginGenerator?: string;

  /** Vague syntax string for code generation (e.g., 'uuid()', 'email()') */
  vagueSyntax: string | null;

  /** Fallback value generator when plugin is not available */
  fallback?: () => unknown;
}

/**
 * Central registry mapping format names to their definitions.
 * Format names follow OpenAPI/JSON Schema conventions where applicable.
 */
export const FORMAT_REGISTRY: Record<string, FormatDefinition> = {
  // Identifiers
  uuid: {
    pluginGenerator: 'uuid',
    vagueSyntax: 'uuid()',
    fallback: () => randomUUID(),
  },

  // Contact
  email: {
    pluginGenerator: 'email',
    vagueSyntax: 'email()',
    fallback: () => `user${randomInt(1, 9999)}@example.com`,
  },
  phone: {
    pluginGenerator: 'phone',
    vagueSyntax: 'phone()',
    fallback: () => `+1${randomInt(200, 999)}${randomInt(100, 999)}${randomInt(1000, 9999)}`,
  },
  'phone-number': {
    pluginGenerator: 'phone',
    vagueSyntax: 'phone()',
    fallback: () => `+1${randomInt(200, 999)}${randomInt(100, 999)}${randomInt(1000, 9999)}`,
  },

  // Internet
  uri: {
    pluginGenerator: 'url',
    vagueSyntax: 'faker.internet.url()',
    fallback: () => `https://example.com/${randomInt(1, 9999)}`,
  },
  url: {
    pluginGenerator: 'url',
    vagueSyntax: 'faker.internet.url()',
    fallback: () => `https://example.com/${randomInt(1, 9999)}`,
  },
  hostname: {
    pluginGenerator: 'internet.domainName',
    vagueSyntax: 'faker.internet.domainName()',
    fallback: () => `host${randomInt(1, 999)}.example.com`,
  },
  ipv4: {
    pluginGenerator: 'internet.ip',
    vagueSyntax: 'faker.internet.ipv4()',
    fallback: () =>
      `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`,
  },
  ipv6: {
    pluginGenerator: 'internet.ipv6',
    vagueSyntax: 'faker.internet.ipv6()',
    fallback: () =>
      Array.from({ length: 8 }, () => randomInt(0, 65535).toString(16).padStart(4, '0')).join(':'),
  },
  'mac-address': {
    pluginGenerator: 'internet.mac',
    vagueSyntax: 'faker.internet.mac()',
    fallback: () =>
      Array.from({ length: 6 }, () => randomInt(0, 255).toString(16).padStart(2, '0')).join(':'),
  },
  slug: {
    pluginGenerator: 'lorem.slug',
    vagueSyntax: 'faker.lorem.slug()',
    fallback: () => `item-${randomInt(1, 9999)}`,
  },
  password: {
    pluginGenerator: 'internet.password',
    vagueSyntax: 'faker.internet.password()',
    fallback: () => `Pass${randomInt(1000, 9999)}!`,
  },

  // Date/Time - handled by type detection, not format registry
  date: {
    vagueSyntax: null, // Let type detection handle this
  },
  datetime: {
    vagueSyntax: null,
  },
  'date-time': {
    vagueSyntax: null,
  },
  time: {
    pluginGenerator: undefined,
    vagueSyntax: null,
    fallback: () =>
      `${String(randomInt(0, 23)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}:${String(randomInt(0, 59)).padStart(2, '0')}`,
  },

  // Finance
  'credit-card': {
    pluginGenerator: 'finance.creditCardNumber',
    vagueSyntax: 'faker.finance.creditCardNumber()',
    fallback: () => `4${String(randomInt(0, 999999999999999)).padStart(15, '0')}`,
  },
  iban: {
    pluginGenerator: 'iban',
    vagueSyntax: 'faker.finance.iban()',
    fallback: () => `GB${randomInt(10, 99)}MOCK${randomInt(10000000, 99999999)}`,
  },
  isbn: {
    pluginGenerator: 'commerce.isbn',
    vagueSyntax: 'faker.commerce.isbn()',
    fallback: () =>
      `978-${randomInt(0, 9)}-${randomInt(10000, 99999)}-${randomInt(100, 999)}-${randomInt(0, 9)}`,
  },
  ssn: {
    pluginGenerator: undefined,
    vagueSyntax: 'faker.string.numeric({ length: 9, allowLeadingZeros: false })',
    fallback: () => `${randomInt(100, 899)}-${randomInt(10, 99)}-${randomInt(1000, 9999)}`,
  },

  // Colors
  'hex-color': {
    pluginGenerator: 'color.rgb',
    vagueSyntax: 'faker.color.rgb()',
    fallback: () =>
      `#${randomInt(0, 255).toString(16).padStart(2, '0')}${randomInt(0, 255).toString(16).padStart(2, '0')}${randomInt(0, 255).toString(16).padStart(2, '0')}`,
  },

  // Binary data
  byte: {
    pluginGenerator: undefined,
    vagueSyntax: null,
    fallback: () =>
      Buffer.from(Array.from({ length: 16 }, () => randomInt(0, 255))).toString('base64'),
  },
  binary: {
    pluginGenerator: undefined,
    vagueSyntax: null,
    fallback: () =>
      Array.from({ length: 16 }, () => randomInt(0, 255).toString(16).padStart(2, '0')).join(''),
  },
};

/**
 * Get the Vague syntax string for a format (used in schema inference codegen)
 */
export function getVagueSyntaxForFormat(format: string): string | null {
  const def = FORMAT_REGISTRY[format];
  return def?.vagueSyntax ?? null;
}

/**
 * Get the plugin generator name for a format
 */
export function getPluginGeneratorForFormat(format: string): string | undefined {
  const def = FORMAT_REGISTRY[format];
  return def?.pluginGenerator;
}

/**
 * Get the fallback generator for a format
 */
export function getFallbackForFormat(format: string): (() => unknown) | undefined {
  const def = FORMAT_REGISTRY[format];
  return def?.fallback;
}

/**
 * Check if a format is known to the registry
 */
export function isKnownFormat(format: string): boolean {
  return format in FORMAT_REGISTRY;
}

/**
 * Get all known format names
 */
export function getKnownFormats(): string[] {
  return Object.keys(FORMAT_REGISTRY);
}
