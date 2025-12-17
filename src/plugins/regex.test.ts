import { describe, it, expect, beforeAll } from 'vitest';
import { compile, registerPlugin, setSeed } from '../index.js';
import { regexPlugin, regexShorthandPlugin } from './regex.js';

describe('Regex Plugin', () => {
  beforeAll(() => {
    registerPlugin(regexPlugin);
    registerPlugin(regexShorthandPlugin);
  });

  describe('regex.generate / regex()', () => {
    it('generates strings matching simple patterns', async () => {
      setSeed(42);
      const result = await compile(`
        schema Test {
          code: regex.generate("[A-Z]{3}")
        }
        dataset Output { items: 5 of Test }
      `);

      const items = result.items as Array<{ code: string }>;
      expect(items).toHaveLength(5);
      for (const item of items) {
        expect(item.code).toMatch(/^[A-Z]{3}$/);
      }
    });

    it('generates strings matching complex patterns', async () => {
      setSeed(42);
      const result = await compile(`
        schema Test {
          sku: regex.generate("[A-Z]{3}-[0-9]{4}-[a-z]{2}")
        }
        dataset Output { items: 10 of Test }
      `);

      const items = result.items as Array<{ sku: string }>;
      for (const item of items) {
        expect(item.sku).toMatch(/^[A-Z]{3}-[0-9]{4}-[a-z]{2}$/);
      }
    });

    it('supports shorthand regex() function', async () => {
      setSeed(42);
      const result = await compile(`
        schema Test {
          code: regex("[0-9]{5}")
        }
        dataset Output { items: 5 of Test }
      `);

      const items = result.items as Array<{ code: string }>;
      for (const item of items) {
        expect(item.code).toMatch(/^[0-9]{5}$/);
      }
    });

    it('supports pattern() alias', async () => {
      setSeed(42);
      const result = await compile(`
        schema Test {
          code: pattern("[a-f0-9]{8}")
        }
        dataset Output { items: 5 of Test }
      `);

      const items = result.items as Array<{ code: string }>;
      for (const item of items) {
        expect(item.code).toMatch(/^[a-f0-9]{8}$/);
      }
    });

    it('generates with quantifiers', async () => {
      setSeed(42);
      const result = await compile(`
        schema Test {
          variable: regex.generate("[A-Z]{2,5}")
        }
        dataset Output { items: 10 of Test }
      `);

      const items = result.items as Array<{ variable: string }>;
      for (const item of items) {
        expect(item.variable).toMatch(/^[A-Z]{2,5}$/);
        expect(item.variable.length).toBeGreaterThanOrEqual(2);
        expect(item.variable.length).toBeLessThanOrEqual(5);
      }
    });

    it('generates deterministic output with seed', async () => {
      setSeed(123);
      const result1 = await compile(`
        schema Test { code: regex("[A-Z]{5}") }
        dataset Output { items: 3 of Test }
      `);

      setSeed(123);
      const result2 = await compile(`
        schema Test { code: regex("[A-Z]{5}") }
        dataset Output { items: 3 of Test }
      `);

      expect(result1.items).toEqual(result2.items);
    });
  });

  describe('regex.test / matches()', () => {
    it('validates patterns in constraints', async () => {
      setSeed(42);
      const result = await compile(`
        schema Test {
          code: regex("[A-Z]{3}-[0-9]{3}"),
          assume regex.test("^[A-Z]{3}-[0-9]{3}$", code)
        }
        dataset Output { items: 10 of Test }
      `);

      const items = result.items as Array<{ code: string }>;
      for (const item of items) {
        expect(item.code).toMatch(/^[A-Z]{3}-[0-9]{3}$/);
      }
    });

    it('supports matches() shorthand', async () => {
      setSeed(42);
      const result = await compile(`
        schema Test {
          code: regex("[A-Z]{2}[0-9]{4}"),
          assume matches("^[A-Z]{2}[0-9]{4}$", code)
        }
        dataset Output { items: 5 of Test }
      `);

      const items = result.items as Array<{ code: string }>;
      for (const item of items) {
        expect(item.code).toMatch(/^[A-Z]{2}[0-9]{4}$/);
      }
    });

    it('filters with pattern in where clause context', async () => {
      // Test that regex.test returns boolean properly
      setSeed(42);
      const result = await compile(`
        schema Item {
          id: regex("[A-Z]{2}[0-9]{2}"),
          valid: regex.test("^[A-Z]{2}[0-9]{2}$", id)
        }
        dataset Output { items: 5 of Item }
      `);

      const items = result.items as Array<{ id: string; valid: boolean }>;
      for (const item of items) {
        expect(item.valid).toBe(true);
      }
    });

    it('supports case-insensitive matching', async () => {
      setSeed(42);
      const result = await compile(`
        schema Test {
          text: "Hello World",
          matches_upper: regex.test("^hello", text, "i")
        }
        dataset Output { items: 1 of Test }
      `);

      const items = result.items as Array<{ text: string; matches_upper: boolean }>;
      expect(items[0].matches_upper).toBe(true);
    });
  });

  describe('regex.find and regex.capture', () => {
    it('extracts first match', async () => {
      setSeed(42);
      const result = await compile(`
        schema Test {
          text: "Order12345ABC",
          extracted: regex.find("[0-9]+", text)
        }
        dataset Output { items: 1 of Test }
      `);

      const items = result.items as Array<{ text: string; extracted: string }>;
      expect(items[0].extracted).toBe('12345');
    });

    it('returns null for no match', async () => {
      setSeed(42);
      const result = await compile(`
        schema Test {
          text: "nonumbershere",
          extracted: regex.find("[0-9]+", text)
        }
        dataset Output { items: 1 of Test }
      `);

      const items = result.items as Array<{ text: string; extracted: string | null }>;
      expect(items[0].extracted).toBe(null);
    });

    it('extracts all matches with matchAll', async () => {
      setSeed(42);
      const result = await compile(`
        schema Test {
          text: "a1 b2 c3 d4",
          numbers: regex.matchAll("[0-9]", text)
        }
        dataset Output { items: 1 of Test }
      `);

      const items = result.items as Array<{ text: string; numbers: string[] }>;
      expect(items[0].numbers).toEqual(['1', '2', '3', '4']);
    });

    it('extracts captured groups', async () => {
      setSeed(42);
      const result = await compile(`
        schema Test {
          text: "John Doe (age 30)",
          groups: regex.capture("([A-Za-z]+) ([A-Za-z]+) \\\\(age ([0-9]+)\\\\)", text)
        }
        dataset Output { items: 1 of Test }
      `);

      const items = result.items as Array<{ text: string; groups: string[] }>;
      expect(items[0].groups).toEqual(['John', 'Doe', '30']);
    });
  });

  describe('regex.replace and regex.split', () => {
    it('replaces pattern matches', async () => {
      setSeed(42);
      const result = await compile(`
        schema Test {
          text: "Hello 123 World 456",
          cleaned: regex.replace("[0-9]+", text, "XXX")
        }
        dataset Output { items: 1 of Test }
      `);

      const items = result.items as Array<{ text: string; cleaned: string }>;
      expect(items[0].cleaned).toBe('Hello XXX World XXX');
    });

    it('splits by pattern', async () => {
      setSeed(42);
      const result = await compile(`
        schema Test {
          text: "one,two;three:four",
          parts: regex.split("[,;:]", text)
        }
        dataset Output { items: 1 of Test }
      `);

      const items = result.items as Array<{ text: string; parts: string[] }>;
      expect(items[0].parts).toEqual(['one', 'two', 'three', 'four']);
    });
  });

  describe('Common Pattern Generators', () => {
    describe('alphanumeric', () => {
      it('generates alphanumeric strings', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            code: regex.alphanumeric(10)
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ code: string }>;
        for (const item of items) {
          expect(item.code).toMatch(/^[A-Za-z0-9]{10}$/);
        }
      });

      it('uses default length of 8', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            code: alphanumeric()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ code: string }>;
        for (const item of items) {
          expect(item.code).toHaveLength(8);
          expect(item.code).toMatch(/^[A-Za-z0-9]+$/);
        }
      });
    });

    describe('digits', () => {
      it('generates digit-only strings', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            pin: regex.digits(4)
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ pin: string }>;
        for (const item of items) {
          expect(item.pin).toMatch(/^[0-9]{4}$/);
        }
      });

      it('uses default length of 6', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            code: digits()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ code: string }>;
        for (const item of items) {
          expect(item.code).toHaveLength(6);
          expect(item.code).toMatch(/^[0-9]+$/);
        }
      });
    });

    describe('alpha', () => {
      it('generates letter-only strings', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            name: regex.alpha(5)
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ name: string }>;
        for (const item of items) {
          expect(item.name).toMatch(/^[A-Za-z]{5}$/);
        }
      });

      it('supports case styles', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            upper: regex.alpha(5, "upper"),
            lower: regex.alpha(5, "lower")
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ upper: string; lower: string }>;
        for (const item of items) {
          expect(item.upper).toMatch(/^[A-Z]{5}$/);
          expect(item.lower).toMatch(/^[a-z]{5}$/);
        }
      });
    });

    describe('hex', () => {
      it('generates hex strings', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            color: regex.hex(6)
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ color: string }>;
        for (const item of items) {
          expect(item.color).toMatch(/^[0-9a-f]{6}$/);
        }
      });

      it('supports uppercase hex', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            color: regex.hex(6, "upper")
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ color: string }>;
        for (const item of items) {
          expect(item.color).toMatch(/^[0-9A-F]{6}$/);
        }
      });
    });

    describe('slug', () => {
      it('generates URL slugs', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            slug: regex.slug(2, 4)
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ slug: string }>;
        for (const item of items) {
          expect(item.slug).toMatch(/^[a-z]+(-[a-z]+){1,3}$/);
        }
      });

      it('uses shorthand', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            slug: slug()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ slug: string }>;
        for (const item of items) {
          expect(item.slug).toMatch(/^[a-z]+(-[a-z]+)*$/);
        }
      });
    });

    describe('phone', () => {
      it('generates US phone format', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            phone: regex.phone("us")
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ phone: string }>;
        for (const item of items) {
          expect(item.phone).toMatch(/^\([0-9]{3}\) [0-9]{3}-[0-9]{4}$/);
        }
      });

      it('generates UK phone format', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            phone: regex.phone("uk")
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ phone: string }>;
        for (const item of items) {
          expect(item.phone).toMatch(/^0[0-9]{4} [0-9]{6}$/);
        }
      });

      it('generates international phone format', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            phone: regex.phone("intl")
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ phone: string }>;
        for (const item of items) {
          expect(item.phone).toMatch(/^\+[0-9]{1,3} [0-9]{3} [0-9]{3} [0-9]{4}$/);
        }
      });
    });

    describe('licensePlate', () => {
      it('generates US license plate format', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            plate: regex.licensePlate("us")
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ plate: string }>;
        for (const item of items) {
          expect(item.plate).toMatch(/^[A-Z]{3}-[0-9]{4}$/);
        }
      });

      it('generates UK license plate format', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            plate: regex.licensePlate("uk")
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ plate: string }>;
        for (const item of items) {
          expect(item.plate).toMatch(/^[A-Z]{2}[0-9]{2} [A-Z]{3}$/);
        }
      });

      it('uses shorthand', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            plate: licensePlate()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ plate: string }>;
        for (const item of items) {
          expect(item.plate).toMatch(/^[A-Z]{3}-[0-9]{4}$/);
        }
      });
    });

    describe('sku', () => {
      it('generates standard SKU format', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            sku: regex.sku()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ sku: string }>;
        for (const item of items) {
          expect(item.sku).toMatch(/^[A-Z]{3}-[0-9]{4}-[A-Z]{2}$/);
        }
      });

      it('supports custom SKU format', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            sku: regex.sku("[A-Z]{2}-[0-9]{6}")
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ sku: string }>;
        for (const item of items) {
          expect(item.sku).toMatch(/^[A-Z]{2}-[0-9]{6}$/);
        }
      });
    });

    describe('postalCode', () => {
      it('generates US zip codes', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            zip: regex.postalCode("us")
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ zip: string }>;
        for (const item of items) {
          expect(item.zip).toMatch(/^[0-9]{5}(-[0-9]{4})?$/);
        }
      });

      it('uses shorthand', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            zip: postalCode()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ zip: string }>;
        for (const item of items) {
          expect(item.zip).toMatch(/^[0-9]{5}(-[0-9]{4})?$/);
        }
      });
    });

    describe('ip', () => {
      it('generates IPv4 addresses', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            ip: regex.ip("v4")
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ ip: string }>;
        for (const item of items) {
          const parts = item.ip.split('.');
          expect(parts).toHaveLength(4);
          for (const part of parts) {
            const num = parseInt(part, 10);
            expect(num).toBeGreaterThanOrEqual(0);
            expect(num).toBeLessThanOrEqual(255);
          }
        }
      });

      it('generates IPv6-like addresses', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            ip: regex.ip("v6")
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ ip: string }>;
        for (const item of items) {
          expect(item.ip).toMatch(/^[0-9a-f]{4}(:[0-9a-f]{4}){7}$/);
        }
      });
    });

    describe('mac', () => {
      it('generates MAC addresses', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            mac: regex.mac()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ mac: string }>;
        for (const item of items) {
          expect(item.mac).toMatch(/^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/);
        }
      });

      it('supports custom separator', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            mac: regex.mac("-")
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ mac: string }>;
        for (const item of items) {
          expect(item.mac).toMatch(/^[0-9A-F]{2}(-[0-9A-F]{2}){5}$/);
        }
      });
    });

    describe('creditCard', () => {
      it('generates Visa-like numbers', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            card: regex.creditCard("visa")
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ card: string }>;
        for (const item of items) {
          expect(item.card).toMatch(/^4[0-9]{15}$/);
        }
      });

      it('generates Mastercard-like numbers', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            card: regex.creditCard("mastercard")
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ card: string }>;
        for (const item of items) {
          expect(item.card).toMatch(/^5[1-5][0-9]{14}$/);
        }
      });

      it('generates Amex-like numbers', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            card: regex.creditCard("amex")
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ card: string }>;
        for (const item of items) {
          expect(item.card).toMatch(/^3[47][0-9]{13}$/);
        }
      });
    });

    describe('semver', () => {
      it('generates semantic versions', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            version: regex.semver()
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ version: string }>;
        for (const item of items) {
          expect(item.version).toMatch(/^[0-9]+\.[0-9]+\.[0-9]+$/);
        }
      });

      it('generates prerelease versions', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            version: regex.semver(true)
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ version: string }>;
        for (const item of items) {
          expect(item.version).toMatch(/^[0-9]+\.[0-9]+\.[0-9]+-(alpha|beta|rc)\.[0-9]+$/);
        }
      });

      it('uses shorthand', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            version: semver()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ version: string }>;
        for (const item of items) {
          expect(item.version).toMatch(/^[0-9]+\.[0-9]+\.[0-9]+$/);
        }
      });
    });

    describe('colorHex', () => {
      it('generates hex colors with hash', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            color: regex.colorHex()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ color: string }>;
        for (const item of items) {
          expect(item.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
      });

      it('generates hex colors without hash', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            color: regex.colorHex(false)
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ color: string }>;
        for (const item of items) {
          expect(item.color).toMatch(/^[0-9A-Fa-f]{6}$/);
          expect(item.color).not.toContain('#');
        }
      });

      it('uses shorthand', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            color: colorHex()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ color: string }>;
        for (const item of items) {
          expect(item.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        }
      });
    });

    describe('hashtag', () => {
      it('generates hashtags', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            tag: regex.hashtag()
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ tag: string }>;
        for (const item of items) {
          expect(item.tag).toMatch(/^#[a-z]+([A-Z][a-z]+)*$/);
        }
      });

      it('uses shorthand', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            tag: hashtag()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ tag: string }>;
        for (const item of items) {
          expect(item.tag).toMatch(/^#[a-z]+([A-Z][a-z]+)*$/);
        }
      });
    });

    describe('mention', () => {
      it('generates @mentions', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            handle: regex.mention()
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ handle: string }>;
        for (const item of items) {
          expect(item.handle).toMatch(/^@[a-z][a-z0-9_]+$/);
        }
      });

      it('uses shorthand', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            handle: mention()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ handle: string }>;
        for (const item of items) {
          expect(item.handle).toMatch(/^@[a-z][a-z0-9_]+$/);
        }
      });
    });
  });

  describe('Integration with Constraints', () => {
    it('works with conditional constraints', async () => {
      setSeed(42);
      const result = await compile(`
        schema Test {
          type: "email" | "phone",
          value: type == "email" ? regex("[a-z]+@[a-z]+\\\\.com") : regex("\\\\([0-9]{3}\\\\) [0-9]{3}-[0-9]{4}"),

          assume if type == "email" {
            regex.test("@", value)
          },
          assume if type == "phone" {
            regex.test("^\\\\(", value)
          }
        }
        dataset Output { items: 20 of Test }
      `);

      const items = result.items as Array<{ type: string; value: string }>;
      for (const item of items) {
        if (item.type === 'email') {
          expect(item.value).toContain('@');
        } else {
          expect(item.value).toMatch(/^\(/);
        }
      }
    });

    it('works with unique constraints', async () => {
      setSeed(42);
      const result = await compile(`
        schema Test {
          code: unique regex("[A-Z]{2}[0-9]{4}")
        }
        dataset Output { items: 20 of Test }
      `);

      const items = result.items as Array<{ code: string }>;
      const codes = items.map((i) => i.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('works with superposition', async () => {
      setSeed(42);
      const result = await compile(`
        schema Test {
          code: 0.5: regex("[A-Z]{3}") | 0.5: regex("[0-9]{3}")
        }
        dataset Output { items: 100 of Test }
      `);

      const items = result.items as Array<{ code: string }>;
      const hasAlpha = items.some((i) => /^[A-Z]{3}$/.test(i.code));
      const hasDigits = items.some((i) => /^[0-9]{3}$/.test(i.code));
      expect(hasAlpha).toBe(true);
      expect(hasDigits).toBe(true);
    });
  });
});
