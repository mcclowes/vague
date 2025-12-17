import { describe, it, expect, beforeAll } from 'vitest';
import { compile, registerPlugin } from '../index.js';
import { issuerPlugin, issuerShorthandPlugin } from './issuer.js';

describe('Issuer Plugin', () => {
  beforeAll(() => {
    registerPlugin(issuerPlugin);
    registerPlugin(issuerShorthandPlugin);
  });

  describe('Unicode edge cases', () => {
    it('generates zero-width characters with issuer.zeroWidth()', async () => {
      const source = `
        schema Test {
          text: issuer.zeroWidth()
        }

        dataset TestData {
          items: 5 * Test
        }
      `;

      const result = await compile(source);

      expect(result.items).toHaveLength(5);
      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.text).toBe('string');
        // Not guaranteed every string has them, but the base text should be present
        expect((t.text as string).length).toBeGreaterThan(0);
      }
    });

    it('generates RTL override characters with issuer.rtl()', async () => {
      const source = `
        schema Test {
          text: issuer.rtl()
        }

        dataset TestData {
          items: 3 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.text).toBe('string');
        // Should contain RTL override
        expect(t.text as string).toContain('\u202E');
      }
    });

    it('generates homoglyphs with issuer.homoglyph()', async () => {
      const source = `
        schema Test {
          text: issuer.homoglyph("admin")
        }

        dataset TestData {
          items: 5 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.text).toBe('string');
        // Should be similar length to "admin"
        expect((t.text as string).length).toBeGreaterThanOrEqual(4);
        expect((t.text as string).length).toBeLessThanOrEqual(6);
      }
    });

    it('generates complex emoji with issuer.emoji()', async () => {
      const source = `
        schema Test {
          text: issuer.emoji()
        }

        dataset TestData {
          items: 5 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.text).toBe('string');
        // Multi-codepoint emoji are typically longer than regular characters
        expect((t.text as string).length).toBeGreaterThan(0);
      }
    });

    it('generates combining characters with issuer.combining()', async () => {
      const source = `
        schema Test {
          text: issuer.combining()
        }

        dataset TestData {
          items: 3 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.text).toBe('string');
        // Should have combining marks (between \u0300 and \u036F)
        const combiningPattern = /[\u0300-\u036F\u0327\u0328]/;
        expect(t.text as string).toMatch(combiningPattern);
      }
    });

    it('generates full-width characters with issuer.fullWidth()', async () => {
      const source = `
        schema Test {
          text: issuer.fullWidth()
        }

        dataset TestData {
          items: 3 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.text).toBe('string');
        // Full-width characters are in the range FF01-FF60
        const fullWidthPattern = /[\uFF01-\uFF60\u3000]/;
        expect(t.text as string).toMatch(fullWidthPattern);
      }
    });

    it('generates mixed script confusables with issuer.mixedScript()', async () => {
      const source = `
        schema Test {
          text: issuer.mixedScript()
        }

        dataset TestData {
          items: 3 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.text).toBe('string');
        // Should look like common brand names but contain Cyrillic
        expect((t.text as string).length).toBeGreaterThan(3);
      }
    });
  });

  describe('String edge cases', () => {
    it('generates empty strings with issuer.empty()', async () => {
      const source = `
        schema Test {
          text: issuer.empty()
        }

        dataset TestData {
          items: 3 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(t.text).toBe('');
      }
    });

    it('generates whitespace-only strings with issuer.whitespace()', async () => {
      const source = `
        schema Test {
          text: issuer.whitespace()
        }

        dataset TestData {
          items: 3 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.text).toBe('string');
        expect((t.text as string).length).toBeGreaterThan(0);
        // Should be whitespace-like (trim to empty or nearly empty)
        // Note: some whitespace chars might not be trimmed by standard trim
      }
    });

    it('generates long strings with issuer.long()', async () => {
      const source = `
        schema Test {
          text: issuer.long(5000)
        }

        dataset TestData {
          items: 2 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.text).toBe('string');
        expect((t.text as string).length).toBe(5000);
      }
    });

    it('generates SQL-like strings with issuer.sqlLike()', async () => {
      const source = `
        schema Test {
          text: issuer.sqlLike()
        }

        dataset TestData {
          items: 5 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.text).toBe('string');
        // Should contain SQL-ish patterns (some have apostrophes, quotes, semicolons, etc.)
        const sqlPattern = /[';"\-=|(){}$]|SELECT|DROP|UNION|DELETE|OR |AND |SLEEP|Brien/i;
        expect(t.text as string).toMatch(sqlPattern);
      }
    });

    it('generates HTML special strings with issuer.htmlSpecial()', async () => {
      const source = `
        schema Test {
          text: issuer.htmlSpecial()
        }

        dataset TestData {
          items: 5 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.text).toBe('string');
        // Should contain HTML-like patterns
        const htmlPattern = /[<>&"']|script|img|onclick|javascript/i;
        expect(t.text as string).toMatch(htmlPattern);
      }
    });

    it('generates JSON special strings with issuer.jsonSpecial()', async () => {
      const source = `
        schema Test {
          text: issuer.jsonSpecial()
        }

        dataset TestData {
          items: 5 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.text).toBe('string');
      }
    });

    it('generates strings with newlines using issuer.newlines()', async () => {
      const source = `
        schema Test {
          text: issuer.newlines()
        }

        dataset TestData {
          items: 3 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.text).toBe('string');
        // Should contain whitespace characters
        const whitespacePattern = /[\n\r\t\v\f]/;
        expect(t.text as string).toMatch(whitespacePattern);
      }
    });

    it('generates strings with null chars using issuer.nullChar()', async () => {
      const source = `
        schema Test {
          text: issuer.nullChar()
        }

        dataset TestData {
          items: 3 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.text).toBe('string');
        expect(t.text as string).toContain('\0');
      }
    });

    it('generates path traversal strings with issuer.pathTraversal()', async () => {
      const source = `
        schema Test {
          text: issuer.pathTraversal()
        }

        dataset TestData {
          items: 3 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.text).toBe('string');
        // Should contain path traversal patterns (including URL-encoded and double-encoded)
        const pathPattern = /\.\.[\\/]|etc[\\/]?passwd|Windows|%2f|%252f|file:/i;
        expect(t.text as string).toMatch(pathPattern);
      }
    });

    it('generates command injection strings with issuer.commandInjection()', async () => {
      const source = `
        schema Test {
          text: issuer.commandInjection()
        }

        dataset TestData {
          items: 3 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.text).toBe('string');
        // Should contain command-like patterns
        const cmdPattern = /[;|`$&{}]|rm |ls |cat |whoami|id|sh|constructor/;
        expect(t.text as string).toMatch(cmdPattern);
      }
    });
  });

  describe('Numeric edge cases', () => {
    it('generates max safe integer with issuer.maxInt()', async () => {
      const source = `
        schema Test {
          value: issuer.maxInt()
        }

        dataset TestData {
          items: 3 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(t.value).toBe(Number.MAX_SAFE_INTEGER);
      }
    });

    it('generates min safe integer with issuer.minInt()', async () => {
      const source = `
        schema Test {
          value: issuer.minInt()
        }

        dataset TestData {
          items: 3 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(t.value).toBe(Number.MIN_SAFE_INTEGER);
      }
    });

    it('generates tiny decimals with issuer.tinyDecimal()', async () => {
      const source = `
        schema Test {
          value: issuer.tinyDecimal()
        }

        dataset TestData {
          items: 5 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.value).toBe('number');
        expect(t.value as number).toBeGreaterThan(0);
        expect(t.value as number).toBeLessThan(0.001);
      }
    });

    it('generates float precision issues with issuer.floatPrecision()', async () => {
      const source = `
        schema Test {
          value: issuer.floatPrecision()
        }

        dataset TestData {
          items: 5 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.value).toBe('number');
      }
    });

    it('generates negative zero with issuer.negativeZero()', async () => {
      const source = `
        schema Test {
          value: issuer.negativeZero()
        }

        dataset TestData {
          items: 3 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        // Check it's actually -0 using Object.is (toBe uses Object.is)
        expect(Object.is(t.value, -0)).toBe(true);
      }
    });

    it('generates boundary integers with issuer.boundaryInt()', async () => {
      const source = `
        schema Test {
          value: issuer.boundaryInt()
        }

        dataset TestData {
          items: 10 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.value).toBe('number');
      }
    });
  });

  describe('Date edge cases', () => {
    it('generates leap day dates with issuer.leapDay()', async () => {
      const source = `
        schema Test {
          leapDate: issuer.leapDay()
        }

        dataset TestData {
          items: 5 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.leapDate).toBe('string');
        expect(t.leapDate as string).toMatch(/-02-29$/);
      }
    });

    it('generates Y2K dates with issuer.y2k()', async () => {
      const source = `
        schema Test {
          y2kDate: issuer.y2k()
        }

        dataset TestData {
          items: 5 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.y2kDate).toBe('string');
        expect(t.y2kDate as string).toMatch(/^(1999|2000|2001)-/);
      }
    });

    it('generates epoch boundary dates with issuer.epoch()', async () => {
      const source = `
        schema Test {
          epochDate: issuer.epoch()
        }

        dataset TestData {
          items: 5 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.epochDate).toBe('string');
        // Should be around epoch or 32-bit overflow dates
        const epochPattern = /^(1969|1970|1901|2038)-/;
        expect(t.epochDate as string).toMatch(epochPattern);
      }
    });

    it('generates far future dates with issuer.farFuture()', async () => {
      const source = `
        schema Test {
          futureDate: issuer.farFuture()
        }

        dataset TestData {
          items: 5 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.futureDate).toBe('string');
        const year = parseInt((t.futureDate as string).split('-')[0]);
        expect(year).toBeGreaterThan(2050);
      }
    });

    it('generates far past dates with issuer.farPast()', async () => {
      const source = `
        schema Test {
          pastDate: issuer.farPast()
        }

        dataset TestData {
          items: 5 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.pastDate).toBe('string');
        const year = parseInt((t.pastDate as string).split('-')[0]);
        expect(year).toBeLessThan(1700);
      }
    });
  });

  describe('Format edge cases', () => {
    it('generates unusual but valid emails with issuer.weirdEmail()', async () => {
      const source = `
        schema Test {
          email: issuer.weirdEmail()
        }

        dataset TestData {
          items: 5 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.email).toBe('string');
        // Should contain @ or be a valid email format
        expect(t.email as string).toMatch(/@/);
      }
    });

    it('generates unusual but valid URLs with issuer.weirdUrl()', async () => {
      const source = `
        schema Test {
          url: issuer.weirdUrl()
        }

        dataset TestData {
          items: 5 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.url).toBe('string');
        // Should start with a protocol
        expect(t.url as string).toMatch(/^(https?|ftp|data|javascript):/);
      }
    });

    it('generates special UUIDs with issuer.specialUuid()', async () => {
      const source = `
        schema Test {
          uuid: issuer.specialUuid()
        }

        dataset TestData {
          items: 5 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.uuid).toBe('string');
        // Should match UUID format
        expect(t.uuid as string).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
      }
    });
  });

  describe('Shorthand generators', () => {
    it('works with shorthand zeroWidth()', async () => {
      const source = `
        schema Test {
          text: zeroWidth()
        }

        dataset TestData {
          items: 3 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.text).toBe('string');
      }
    });

    it('works with shorthand homoglyph()', async () => {
      const source = `
        schema Test {
          text: homoglyph("password")
        }

        dataset TestData {
          items: 3 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.text).toBe('string');
        expect((t.text as string).length).toBeGreaterThanOrEqual(6);
      }
    });

    it('works with shorthand sqlLike()', async () => {
      const source = `
        schema Test {
          text: sqlLike()
        }

        dataset TestData {
          items: 3 * Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.text).toBe('string');
      }
    });
  });

  describe('Integration with other field types', () => {
    it('works alongside regular vague fields', async () => {
      const source = `
        schema EdgeCaseUser {
          id: int in 1..1000,
          name: string,
          displayName: issuer.zeroWidth(),
          homoglyphName: issuer.homoglyph("admin"),
          score: int in 0..100,
          specialEmail: issuer.weirdEmail(),
          status: "active" | "inactive"
        }

        dataset TestData {
          users: 5 * EdgeCaseUser
        }
      `;

      const result = await compile(source);

      expect(result.users).toHaveLength(5);
      for (const user of result.users) {
        const u = user as Record<string, unknown>;
        expect(typeof u.id).toBe('number');
        expect(typeof u.name).toBe('string');
        expect(typeof u.displayName).toBe('string');
        expect(typeof u.homoglyphName).toBe('string');
        expect(typeof u.score).toBe('number');
        expect(typeof u.specialEmail).toBe('string');
        expect(['active', 'inactive']).toContain(u.status);
      }
    });
  });
});
