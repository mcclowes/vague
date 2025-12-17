import { describe, it, expect, beforeAll } from 'vitest';
import { compile, registerPlugin } from '../index.js';
import { fakerPlugin, fakerShorthandPlugin } from './faker.js';

describe('Faker Plugin', () => {
  beforeAll(() => {
    registerPlugin(fakerPlugin);
    registerPlugin(fakerShorthandPlugin);
  });

  it('generates UUID with faker.string.uuid()', async () => {
    const source = `
      schema User {
        id: faker.string.uuid()
      }

      dataset TestData {
        users: 5 of User
      }
    `;

    const result = await compile(source);

    expect(result.users).toHaveLength(5);
    for (const user of result.users) {
      const u = user as Record<string, unknown>;
      expect(u.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    }
  });

  it('generates email with faker.internet.email()', async () => {
    const source = `
      schema User {
        email: faker.internet.email()
      }

      dataset TestData {
        users: 3 of User
      }
    `;

    const result = await compile(source);

    for (const user of result.users) {
      const u = user as Record<string, unknown>;
      expect(u.email).toMatch(/@/);
    }
  });

  it('generates person names with faker.person', async () => {
    const source = `
      schema User {
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        fullName: faker.person.fullName()
      }

      dataset TestData {
        users: 3 of User
      }
    `;

    const result = await compile(source);

    for (const user of result.users) {
      const u = user as Record<string, unknown>;
      expect(typeof u.firstName).toBe('string');
      expect(typeof u.lastName).toBe('string');
      expect(typeof u.fullName).toBe('string');
      expect((u.firstName as string).length).toBeGreaterThan(0);
    }
  });

  it('generates company data with faker.company', async () => {
    const source = `
      schema Company {
        name: faker.company.name(),
        catchPhrase: faker.company.catchPhrase()
      }

      dataset TestData {
        companies: 3 of Company
      }
    `;

    const result = await compile(source);

    for (const company of result.companies) {
      const c = company as Record<string, unknown>;
      expect(typeof c.name).toBe('string');
      expect(typeof c.catchPhrase).toBe('string');
    }
  });

  it('generates dates with shorthand', async () => {
    // Note: faker.date.* cannot be used because "date" is a reserved keyword
    // Use the shorthand generators instead
    const source = `
      schema Event {
        past: pastDate(),
        future: futureDate()
      }

      dataset TestData {
        events: 3 of Event
      }
    `;

    const result = await compile(source);

    const now = new Date();
    for (const event of result.events) {
      const e = event as Record<string, unknown>;
      const past = new Date(e.past as string);
      const future = new Date(e.future as string);
      expect(past.getTime()).toBeLessThan(now.getTime());
      expect(future.getTime()).toBeGreaterThan(now.getTime());
    }
  });

  it('generates finance data with faker.finance', async () => {
    const source = `
      schema Account {
        iban: faker.finance.iban(),
        currencyCode: faker.finance.currencyCode()
      }

      dataset TestData {
        accounts: 3 of Account
      }
    `;

    const result = await compile(source);

    for (const account of result.accounts) {
      const a = account as Record<string, unknown>;
      expect(typeof a.iban).toBe('string');
      expect((a.iban as string).length).toBeGreaterThan(10);
      expect(typeof a.currencyCode).toBe('string');
      expect((a.currencyCode as string).length).toBe(3);
    }
  });

  it('generates location data with faker.location', async () => {
    const source = `
      schema Address {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        country: faker.location.country()
      }

      dataset TestData {
        addresses: 3 of Address
      }
    `;

    const result = await compile(source);

    for (const address of result.addresses) {
      const a = address as Record<string, unknown>;
      expect(typeof a.street).toBe('string');
      expect(typeof a.city).toBe('string');
      expect(typeof a.country).toBe('string');
    }
  });

  describe('shorthand generators', () => {
    it('generates UUID with shorthand uuid()', async () => {
      const source = `
        schema User {
          id: uuid()
        }

        dataset TestData {
          users: 3 of User
        }
      `;

      const result = await compile(source);

      for (const user of result.users) {
        const u = user as Record<string, unknown>;
        expect(u.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      }
    });

    it('generates email with shorthand email()', async () => {
      const source = `
        schema User {
          email: email()
        }

        dataset TestData {
          users: 3 of User
        }
      `;

      const result = await compile(source);

      for (const user of result.users) {
        const u = user as Record<string, unknown>;
        expect(u.email).toMatch(/@/);
      }
    });

    it('generates names with shorthand', async () => {
      const source = `
        schema User {
          firstName: firstName(),
          lastName: lastName(),
          fullName: fullName()
        }

        dataset TestData {
          users: 3 of User
        }
      `;

      const result = await compile(source);

      for (const user of result.users) {
        const u = user as Record<string, unknown>;
        expect(typeof u.firstName).toBe('string');
        expect(typeof u.lastName).toBe('string');
        expect(typeof u.fullName).toBe('string');
      }
    });
  });

  it('works with other field types in same schema', async () => {
    const source = `
      schema User {
        id: uuid(),
        email: email(),
        age: int in 18..65,
        status: "active" | "inactive",
        isAdmin: boolean
      }

      dataset TestData {
        users: 5 of User
      }
    `;

    const result = await compile(source);

    expect(result.users).toHaveLength(5);
    for (const user of result.users) {
      const u = user as Record<string, unknown>;
      expect(u.id).toMatch(/^[0-9a-f-]{36}$/i);
      expect(u.email).toMatch(/@/);
      expect(u.age).toBeGreaterThanOrEqual(18);
      expect(u.age).toBeLessThanOrEqual(65);
      expect(['active', 'inactive']).toContain(u.status);
      expect(typeof u.isAdmin).toBe('boolean');
    }
  });
});
