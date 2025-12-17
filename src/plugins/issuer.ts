/**
 * Issuer plugin for Vague
 *
 * Generates problematic but technically valid values for edge case testing.
 * Use this plugin to test system limits, encoding handling, and edge cases.
 *
 * Usage in .vague files:
 *   schema EdgeCaseTest {
 *     // Unicode edge cases
 *     zeroWidth: issuer.zeroWidth()               // Strings with zero-width characters
 *     rtlText: issuer.rtl()                       // Right-to-left override characters
 *     homoglyph: issuer.homoglyph("admin")        // Lookalike characters
 *     emoji: issuer.emoji()                       // Multi-codepoint emoji
 *     combining: issuer.combining()               // Characters with combining marks
 *
 *     // String edge cases
 *     empty: issuer.empty()                       // Empty string
 *     whitespace: issuer.whitespace()             // Whitespace-only strings
 *     long: issuer.long(10000)                    // Very long strings
 *     sqlLike: issuer.sqlLike()                   // SQL injection-like (but valid) text
 *     htmlSpecial: issuer.htmlSpecial()          // HTML special characters
 *     jsonSpecial: issuer.jsonSpecial()          // JSON special characters
 *     newlines: issuer.newlines()                 // Embedded newlines/tabs
 *     null: issuer.nullChar()                     // Embedded null character
 *
 *     // Numeric edge cases
 *     maxInt: issuer.maxInt()                     // Maximum safe integer
 *     minInt: issuer.minInt()                     // Minimum safe integer
 *     tinyDecimal: issuer.tinyDecimal()          // Very small decimal
 *     floatPrecision: issuer.floatPrecision()    // Floating point precision issues
 *     negativeZero: issuer.negativeZero()        // -0
 *
 *     // Date edge cases
 *     leapDay: issuer.leapDay()                   // Feb 29
 *     y2k: issuer.y2k()                           // Year 2000 edge cases
 *     epoch: issuer.epoch()                       // Unix epoch boundaries
 *     farFuture: issuer.farFuture()               // Very far future dates
 *     farPast: issuer.farPast()                   // Very far past dates
 *
 *     // Format edge cases
 *     weirdEmail: issuer.weirdEmail()             // Valid but unusual emails
 *     weirdUrl: issuer.weirdUrl()                 // Valid but unusual URLs
 *     specialUuid: issuer.specialUuid()           // Edge case UUIDs
 *   }
 *
 * Or with simple names:
 *   schema Test {
 *     name: zeroWidth()
 *     text: homoglyph("password")
 *   }
 */

import type { VaguePlugin, GeneratorFunction } from '../interpreter/generator.js';
import { random } from '../interpreter/random.js';

// Helper to create a generator from a function
function wrap<T>(fn: (...args: unknown[]) => T): GeneratorFunction {
  return (args) => fn(...args);
}

// Helper for no-arg generators
function wrapNoArgs<T>(fn: () => T): GeneratorFunction {
  return () => fn();
}

// ============================================
// Unicode Edge Cases
// ============================================

// Zero-width characters
const ZERO_WIDTH_CHARS = [
  '\u200B', // Zero Width Space (ZWSP)
  '\u200C', // Zero Width Non-Joiner (ZWNJ)
  '\u200D', // Zero Width Joiner (ZWJ)
  '\uFEFF', // Zero Width No-Break Space (BOM)
  '\u2060', // Word Joiner
  '\u180E', // Mongolian Vowel Separator (sometimes zero-width)
];

function generateZeroWidth(): string {
  const baseWords = ['test', 'admin', 'user', 'hello', 'data'];
  const word = baseWords[Math.floor(random() * baseWords.length)];

  // Insert random zero-width characters
  let result = '';
  for (const char of word) {
    result += char;
    if (random() > 0.5) {
      result += ZERO_WIDTH_CHARS[Math.floor(random() * ZERO_WIDTH_CHARS.length)];
    }
  }
  return result;
}

function generateRtl(): string {
  const words = ['document.exe', 'report.pdf', 'image.png'];
  const word = words[Math.floor(random() * words.length)];

  // Apply RTL override to make text display backwards
  return '\u202E' + word + '\u202C';
}

// Homoglyph substitutions (characters that look like others)
const HOMOGLYPHS: Record<string, string[]> = {
  a: ['а', 'ɑ', 'α', 'ạ', 'ǎ'], // Cyrillic а, Latin alpha, Greek alpha
  e: ['е', 'ё', 'ε', 'ẹ'], // Cyrillic е, Greek epsilon
  o: ['о', 'ο', 'σ', '๐', 'ο'], // Cyrillic о, Greek omicron
  p: ['р', 'ρ'], // Cyrillic р, Greek rho
  c: ['с', 'ϲ', 'ⅽ'], // Cyrillic с
  x: ['х', 'χ', '×'], // Cyrillic х, Greek chi
  y: ['у', 'γ'], // Cyrillic у, Greek gamma
  i: ['і', 'ι', 'ı', '℩'], // Cyrillic і, Greek iota
  s: ['ѕ', 'ꜱ'], // Cyrillic ѕ
  n: ['п', 'η'], // Cyrillic п (looks like n upside down), Greek eta
  m: ['м', 'ⅿ'], // Cyrillic м
  l: ['ⅼ', '|', 'ι', 'Ⅰ'], // Roman numeral l, pipe, Greek iota
  '0': ['О', 'о', 'Ο', 'ο', '০'], // Cyrillic/Greek O
  '1': ['Ⅰ', 'ⅼ', 'ı', '|'], // Roman numeral I
};

function generateHomoglyph(text?: unknown): string {
  const input = String(text ?? 'admin');
  let result = '';

  for (const char of input.toLowerCase()) {
    if (HOMOGLYPHS[char] && random() > 0.3) {
      const alternatives = HOMOGLYPHS[char];
      result += alternatives[Math.floor(random() * alternatives.length)];
    } else {
      result += char;
    }
  }
  return result;
}

// Multi-codepoint emoji (family emoji, skin tones, flags)
const COMPLEX_EMOJI = [
  '👨‍👩‍👧‍👦', // Family with ZWJ
  '👩🏽‍🔬', // Woman scientist with skin tone
  '🏳️‍🌈', // Rainbow flag
  '👨🏻‍❤️‍💋‍👨🏿', // Couple with skin tones
  '🧑‍🤝‍🧑', // People holding hands
  '🏴󠁧󠁢󠁳󠁣󠁴󠁿', // Scotland flag (uses tag characters)
  '👩‍👩‍👧', // Family: woman, woman, girl
  '🧔🏻‍♀️', // Woman with beard
  '🫱🏻‍🫲🏿', // Handshake with skin tones
  '👨‍💻', // Man technologist
  '🏃‍♀️‍➡️', // Woman running right
];

function generateEmoji(): string {
  return COMPLEX_EMOJI[Math.floor(random() * COMPLEX_EMOJI.length)];
}

// Combining characters (diacritics stacking)
function generateCombining(): string {
  const baseChars = 'aeiou';
  const combiningMarks = [
    '\u0300', // Combining Grave Accent
    '\u0301', // Combining Acute Accent
    '\u0302', // Combining Circumflex
    '\u0303', // Combining Tilde
    '\u0304', // Combining Macron
    '\u0305', // Combining Overline
    '\u0306', // Combining Breve
    '\u0307', // Combining Dot Above
    '\u0308', // Combining Diaeresis
    '\u0309', // Combining Hook Above
    '\u030A', // Combining Ring Above
    '\u030B', // Combining Double Acute
    '\u030C', // Combining Caron
    '\u030D', // Combining Vertical Line Above
    '\u0327', // Combining Cedilla
    '\u0328', // Combining Ogonek
  ];

  let result = '';
  for (let i = 0; i < 3; i++) {
    const base = baseChars[Math.floor(random() * baseChars.length)];
    result += base;
    // Stack multiple combining marks (Zalgo-like)
    const numMarks = Math.floor(random() * 5) + 1;
    for (let j = 0; j < numMarks; j++) {
      result += combiningMarks[Math.floor(random() * combiningMarks.length)];
    }
  }
  return result;
}

// ============================================
// String Edge Cases
// ============================================

function generateEmpty(): string {
  return '';
}

function generateWhitespace(): string {
  const whitespaceChars = [
    ' ', // Regular space
    '\t', // Tab
    '\n', // Newline
    '\r', // Carriage return
    '\u00A0', // Non-breaking space
    '\u2003', // Em space
    '\u2002', // En space
    '\u2009', // Thin space
    '\u200A', // Hair space
    '\u3000', // Ideographic space
  ];

  let result = '';
  const length = Math.floor(random() * 10) + 1;
  for (let i = 0; i < length; i++) {
    result += whitespaceChars[Math.floor(random() * whitespaceChars.length)];
  }
  return result;
}

function generateLong(length?: unknown): string {
  const len = typeof length === 'number' ? length : 10000;
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars[Math.floor(random() * chars.length)];
  }
  return result;
}

// SQL injection-like strings (but technically valid text)
const SQL_LIKE_STRINGS = [
  "O'Brien",
  'SELECT * FROM users--',
  "1'; DROP TABLE users;--",
  "admin'--",
  "' OR '1'='1",
  '"; DELETE FROM orders WHERE "',
  "Robert'); DROP TABLE students;--",
  '1 UNION SELECT * FROM passwords',
  '1 OR 1=1',
  "' OR ''='",
  "admin' AND 1=1--",
  'SLEEP(5)--',
  '${7*7}',
  '{{7*7}}',
  '<%= 7*7 %>',
];

function generateSqlLike(): string {
  return SQL_LIKE_STRINGS[Math.floor(random() * SQL_LIKE_STRINGS.length)];
}

// HTML special characters
const HTML_SPECIAL_STRINGS = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror="alert(1)">',
  '&lt;script&gt;',
  '<div onclick="evil()">Click me</div>',
  '"><img src=x onerror=alert(1)>',
  "javascript:alert('XSS')",
  '<svg onload="alert(1)">',
  '<iframe src="javascript:alert(1)">',
  '&amp;&lt;&gt;&quot;&#39;',
  '<marquee>Annoying</marquee>',
  '<!--comment-->',
  '<style>body{display:none}</style>',
  '<a href="data:text/html,<script>alert(1)</script>">Link</a>',
];

function generateHtmlSpecial(): string {
  return HTML_SPECIAL_STRINGS[Math.floor(random() * HTML_SPECIAL_STRINGS.length)];
}

// JSON special characters
const JSON_SPECIAL_STRINGS = [
  '{"key": "value"}',
  '["array", "items"]',
  '"quoted\\"string"',
  'line1\\nline2',
  'tab\\there',
  'back\\\\slash',
  'unicode\\u0000null',
  '\u0000\u0001\u0002', // Control characters
  '{"__proto__": {"admin": true}}', // Prototype pollution
  '{"constructor": {"prototype": {}}}',
  'null',
  'undefined',
  'NaN',
  'Infinity',
  '-Infinity',
];

function generateJsonSpecial(): string {
  return JSON_SPECIAL_STRINGS[Math.floor(random() * JSON_SPECIAL_STRINGS.length)];
}

// Strings with embedded newlines/tabs
function generateNewlines(): string {
  const templates = [
    'Line 1\nLine 2\nLine 3',
    'Column1\tColumn2\tColumn3',
    'Mixed\r\nWindows\r\nNewlines',
    'Tab\tthen\nnewline',
    '\n\n\nLeading newlines',
    'Trailing newlines\n\n\n',
    'Single\rCarriage\rReturns',
    'Vertical\vTabs\vHere',
    'Form\fFeeds\fToo',
  ];
  return templates[Math.floor(random() * templates.length)];
}

// Strings with null character
function generateNullChar(): string {
  const templates = [
    'before\0after',
    '\0leading null',
    'trailing null\0',
    'multi\0ple\0nulls',
    'text\0\0double null',
  ];
  return templates[Math.floor(random() * templates.length)];
}

// ============================================
// Numeric Edge Cases
// ============================================

function generateMaxInt(): number {
  return Number.MAX_SAFE_INTEGER; // 9007199254740991
}

function generateMinInt(): number {
  return Number.MIN_SAFE_INTEGER; // -9007199254740991
}

function generateTinyDecimal(): number {
  const tinyValues = [
    Number.MIN_VALUE, // ~5e-324
    1e-308,
    1e-100,
    0.000000001,
    Number.EPSILON, // ~2.22e-16
  ];
  return tinyValues[Math.floor(random() * tinyValues.length)];
}

function generateFloatPrecision(): number {
  // Values that expose floating point precision issues
  const problematic = [
    0.1 + 0.2, // 0.30000000000000004
    0.7 + 0.1, // 0.7999999999999999
    1.0 - 0.9, // 0.09999999999999998
    0.3 - 0.1, // 0.19999999999999998
    Number.MAX_SAFE_INTEGER + 1, // Loses precision (becomes same as MAX_SAFE_INTEGER + 2)
    Number.parseFloat('0.123456789012345678901234567890'), // Truncated at ~17 digits
  ];
  return problematic[Math.floor(random() * problematic.length)];
}

function generateNegativeZero(): number {
  return -0;
}

function generateLargeDecimal(): number {
  // Large decimals that may cause issues in some systems
  const large = [
    9999999999.99, // Within safe range but many digits
    1234567890.12345, // Many decimal places
    Number.MAX_SAFE_INTEGER - 0.5, // Near max safe integer
    Number.MAX_VALUE / 1e100, // Very large but valid
  ];
  return large[Math.floor(random() * large.length)];
}

// ============================================
// Date Edge Cases
// ============================================

function generateLeapDay(): string {
  const leapYears = [2000, 2004, 2020, 2024, 2028, 2096, 2400];
  const year = leapYears[Math.floor(random() * leapYears.length)];
  return `${year}-02-29`;
}

function generateY2k(): string {
  const y2kDates = [
    '1999-12-31',
    '2000-01-01',
    '2000-02-29', // 2000 was a leap year (divisible by 400)
    '2000-03-01',
    '1999-01-01',
    '2001-01-01',
  ];
  return y2kDates[Math.floor(random() * y2kDates.length)];
}

function generateEpoch(): string {
  const epochDates = [
    '1970-01-01', // Unix epoch start
    '1970-01-01T00:00:00.000Z',
    '1969-12-31T23:59:59.000Z', // Just before epoch
    '2038-01-19T03:14:07.000Z', // 32-bit signed overflow
    '2038-01-19T03:14:08.000Z', // After 32-bit overflow
    '1901-12-13T20:45:52.000Z', // 32-bit signed underflow
  ];
  return epochDates[Math.floor(random() * epochDates.length)];
}

function generateFarFuture(): string {
  const farFutureDates = [
    '9999-12-31',
    '3000-01-01',
    '2100-02-28', // Not a leap year (divisible by 100 but not 400)
    '2400-02-29', // Leap year (divisible by 400)
    '5000-06-15',
  ];
  return farFutureDates[Math.floor(random() * farFutureDates.length)];
}

function generateFarPast(): string {
  const farPastDates = [
    '0001-01-01',
    '0100-01-01',
    '1000-01-01',
    '1582-10-15', // Gregorian calendar adoption
    '1582-10-04', // Last day of Julian calendar (followed by Oct 15)
  ];
  return farPastDates[Math.floor(random() * farPastDates.length)];
}

// ============================================
// Format Edge Cases
// ============================================

// Valid but unusual email addresses (RFC 5321/5322 compliant)
const WEIRD_EMAILS = [
  'user+tag@example.com',
  '"quoted string"@example.com',
  '"very.unusual.@.unusual.com"@example.com',
  'user@[192.168.1.1]', // IP address literal
  'user@[IPv6:2001:db8::1]', // IPv6 literal
  "o'reilly@example.com", // Apostrophe
  "!#$%&'*+-/=?^_`{|}~@example.com", // Special chars in local part
  '".john..doe."@example.com', // Quoted dots
  'postmaster@example.com',
  'admin@localhost',
  'user@xn--n3h.com', // Punycode domain (emoji domain)
  'a@b.co', // Very short
  'a'.repeat(64) + '@example.com', // Max local part length
];

function generateWeirdEmail(): string {
  return WEIRD_EMAILS[Math.floor(random() * WEIRD_EMAILS.length)];
}

// Valid but unusual URLs
const WEIRD_URLS = [
  'http://localhost',
  'http://127.0.0.1',
  'http://[::1]/', // IPv6 localhost
  'http://例え.jp/', // IDN
  'http://xn--n3h.com/', // Punycode
  'https://user:password@example.com/', // Basic auth in URL
  'https://example.com:8080/path?query=value#fragment',
  'https://example.com/path%20with%20spaces',
  'https://example.com/path?a=1&b=2&c=3&d=4',
  'ftp://files.example.com/pub/',
  'https://example.com/path/../../../etc/passwd', // Path traversal attempt (valid URL though)
  'https://example.com/%2e%2e/%2e%2e/', // Encoded path traversal
  'https://example.com/page?redirect=http://evil.com',
  'data:text/html,<h1>Hello</h1>',
  'javascript:void(0)',
  'https://subdomain.subdomain.subdomain.example.com/',
];

function generateWeirdUrl(): string {
  return WEIRD_URLS[Math.floor(random() * WEIRD_URLS.length)];
}

// Edge case UUIDs
const SPECIAL_UUIDS = [
  '00000000-0000-0000-0000-000000000000', // Nil UUID
  'ffffffff-ffff-ffff-ffff-ffffffffffff', // Max UUID
  '00000000-0000-4000-8000-000000000000', // Minimal valid v4
  '12345678-1234-5678-1234-567812345678', // Sequential digits
  'AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA', // All same char (uppercase)
  'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', // All same char (lowercase)
  '6ba7b810-9dad-11d1-80b4-00c04fd430c8', // Example v1 UUID
  '6ba7b811-9dad-11d1-80b4-00c04fd430c8', // Sequential v1
  'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Random-looking v4
];

function generateSpecialUuid(): string {
  return SPECIAL_UUIDS[Math.floor(random() * SPECIAL_UUIDS.length)];
}

// ============================================
// Additional Problematic Values
// ============================================

// Path traversal patterns
const PATH_TRAVERSAL = [
  '../../../etc/passwd',
  '..\\..\\..\\windows\\system32\\config\\sam',
  '/etc/passwd',
  'C:\\Windows\\System32',
  '....//....//....//etc/passwd',
  '..%2f..%2f..%2fetc%2fpasswd',
  '..%252f..%252f..%252fetc%252fpasswd', // Double encoded
  '/var/log/../../../etc/passwd',
  'file:///etc/passwd',
];

function generatePathTraversal(): string {
  return PATH_TRAVERSAL[Math.floor(random() * PATH_TRAVERSAL.length)];
}

// Command injection patterns (valid strings)
const COMMAND_INJECTION = [
  '; ls -la',
  '| cat /etc/passwd',
  '`id`',
  '$(whoami)',
  '&& rm -rf /',
  '|| true',
  '\n/bin/sh',
  '${{7*7}}', // Template injection
  '{{constructor.constructor}}',
];

function generateCommandInjection(): string {
  return COMMAND_INJECTION[Math.floor(random() * COMMAND_INJECTION.length)];
}

// Boundary value integers
function generateBoundaryInt(): number {
  const boundaries = [
    0,
    1,
    -1,
    127, // Max signed byte
    128,
    255, // Max unsigned byte
    256,
    32767, // Max signed 16-bit
    32768,
    65535, // Max unsigned 16-bit
    65536,
    2147483647, // Max signed 32-bit
    2147483648,
    4294967295, // Max unsigned 32-bit
    4294967296,
    Number.MAX_SAFE_INTEGER,
    Number.MIN_SAFE_INTEGER,
  ];
  return boundaries[Math.floor(random() * boundaries.length)];
}

// Full-width characters (CJK)
function generateFullWidth(): string {
  // Convert ASCII to full-width equivalents
  const text = 'Hello123';
  let result = '';
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code >= 33 && code <= 126) {
      // ASCII printable range -> full-width
      result += String.fromCharCode(code - 33 + 0xff01);
    } else if (code === 32) {
      // Space -> ideographic space
      result += '\u3000';
    } else {
      result += char;
    }
  }
  return result;
}

// Mixed script confusables
function generateMixedScript(): string {
  const mixedStrings = [
    'pаypal', // Cyrillic 'а' in 'paypal'
    'аpple', // Cyrillic 'а' in 'apple'
    'gооgle', // Cyrillic 'о' in 'google'
    'miсrosoft', // Cyrillic 'с' in 'microsoft'
    'аmаzоn', // Multiple Cyrillic substitutions
    'fаcebook', // Cyrillic 'а' in 'facebook'
  ];
  return mixedStrings[Math.floor(random() * mixedStrings.length)];
}

// ============================================
// Plugin Definition
// ============================================

export const issuerPlugin: VaguePlugin = {
  name: 'issuer',
  generators: {
    // Unicode edge cases
    zeroWidth: wrapNoArgs(generateZeroWidth),
    rtl: wrapNoArgs(generateRtl),
    homoglyph: wrap(generateHomoglyph),
    emoji: wrapNoArgs(generateEmoji),
    combining: wrapNoArgs(generateCombining),
    fullWidth: wrapNoArgs(generateFullWidth),
    mixedScript: wrapNoArgs(generateMixedScript),

    // String edge cases
    empty: wrapNoArgs(generateEmpty),
    whitespace: wrapNoArgs(generateWhitespace),
    long: wrap(generateLong),
    sqlLike: wrapNoArgs(generateSqlLike),
    htmlSpecial: wrapNoArgs(generateHtmlSpecial),
    jsonSpecial: wrapNoArgs(generateJsonSpecial),
    newlines: wrapNoArgs(generateNewlines),
    nullChar: wrapNoArgs(generateNullChar),
    pathTraversal: wrapNoArgs(generatePathTraversal),
    commandInjection: wrapNoArgs(generateCommandInjection),

    // Numeric edge cases
    maxInt: wrapNoArgs(generateMaxInt),
    minInt: wrapNoArgs(generateMinInt),
    tinyDecimal: wrapNoArgs(generateTinyDecimal),
    floatPrecision: wrapNoArgs(generateFloatPrecision),
    negativeZero: wrapNoArgs(generateNegativeZero),
    largeDecimal: wrapNoArgs(generateLargeDecimal),
    boundaryInt: wrapNoArgs(generateBoundaryInt),

    // Date edge cases
    leapDay: wrapNoArgs(generateLeapDay),
    y2k: wrapNoArgs(generateY2k),
    epoch: wrapNoArgs(generateEpoch),
    farFuture: wrapNoArgs(generateFarFuture),
    farPast: wrapNoArgs(generateFarPast),

    // Format edge cases
    weirdEmail: wrapNoArgs(generateWeirdEmail),
    weirdUrl: wrapNoArgs(generateWeirdUrl),
    specialUuid: wrapNoArgs(generateSpecialUuid),
  },
};

/**
 * Shorthand generators that don't require the "issuer." prefix
 */
export const issuerShorthandPlugin: VaguePlugin = {
  name: 'issuer-shorthand',
  generators: {
    // Most commonly used
    zeroWidth: wrapNoArgs(generateZeroWidth),
    rtl: wrapNoArgs(generateRtl),
    homoglyph: wrap(generateHomoglyph),
    emoji: wrapNoArgs(generateEmoji),
    sqlLike: wrapNoArgs(generateSqlLike),
    htmlSpecial: wrapNoArgs(generateHtmlSpecial),
    weirdEmail: wrapNoArgs(generateWeirdEmail),
    weirdUrl: wrapNoArgs(generateWeirdUrl),
    maxInt: wrapNoArgs(generateMaxInt),
    leapDay: wrapNoArgs(generateLeapDay),
  },
};

export default issuerPlugin;
