/**
 * Faker plugin for Vague
 *
 * Provides semantic generators for common data types using @faker-js/faker
 *
 * Usage in .vague files:
 *   schema User {
 *     id: faker.string.uuid()
 *     firstName: faker.person.firstName()
 *     lastName: faker.person.lastName()
 *     email: faker.internet.email()
 *     phone: faker.phone.number()
 *     avatar: faker.image.avatar()
 *     createdAt: faker.date.past()
 *   }
 *
 * Or with simple names (after registering):
 *   schema User {
 *     id: uuid()
 *     email: email()
 *   }
 */

import { faker } from '@faker-js/faker';
import type { VaguePlugin, GeneratorFunction } from '../interpreter/generator.js';

// Helper to create a generator from a faker function
function wrap(fn: (...args: unknown[]) => unknown): GeneratorFunction {
  return (args) => fn(...args);
}

// Helper to wrap a faker method that takes no args
function wrapNoArgs(fn: () => unknown): GeneratorFunction {
  return () => fn();
}

/**
 * The faker plugin provides generators for all major faker.js modules
 */
export const fakerPlugin: VaguePlugin = {
  name: 'faker',
  generators: {
    // String generators
    'string.uuid': wrapNoArgs(() => faker.string.uuid()),
    'string.alphanumeric': wrap((length?: unknown) =>
      faker.string.alphanumeric(typeof length === 'number' ? length : undefined)
    ),
    'string.nanoid': wrap((length?: unknown) =>
      faker.string.nanoid(typeof length === 'number' ? length : undefined)
    ),

    // Person generators
    'person.firstName': wrap((sex?: unknown) =>
      faker.person.firstName(sex === 'male' || sex === 'female' ? sex : undefined)
    ),
    'person.lastName': wrap((sex?: unknown) =>
      faker.person.lastName(sex === 'male' || sex === 'female' ? sex : undefined)
    ),
    'person.fullName': wrap((options?: unknown) =>
      faker.person.fullName(
        typeof options === 'object' ? (options as Record<string, unknown>) : undefined
      )
    ),
    'person.jobTitle': wrapNoArgs(() => faker.person.jobTitle()),
    'person.jobType': wrapNoArgs(() => faker.person.jobType()),
    'person.gender': wrapNoArgs(() => faker.person.gender()),
    'person.prefix': wrapNoArgs(() => faker.person.prefix()),
    'person.suffix': wrapNoArgs(() => faker.person.suffix()),

    // Internet generators
    'internet.email': wrap((options?: unknown) =>
      faker.internet.email(
        typeof options === 'object' ? (options as Record<string, unknown>) : undefined
      )
    ),
    'internet.userName': wrapNoArgs(() => faker.internet.username()),
    'internet.url': wrapNoArgs(() => faker.internet.url()),
    'internet.domainName': wrapNoArgs(() => faker.internet.domainName()),
    'internet.ip': wrapNoArgs(() => faker.internet.ip()),
    'internet.ipv6': wrapNoArgs(() => faker.internet.ipv6()),
    'internet.mac': wrapNoArgs(() => faker.internet.mac()),
    'internet.password': wrap((length?: unknown) =>
      faker.internet.password({ length: typeof length === 'number' ? length : undefined })
    ),

    // Phone generators
    'phone.number': wrap((format?: unknown) =>
      faker.phone.number({
        style:
          typeof format === 'string'
            ? (format as 'human' | 'national' | 'international')
            : undefined,
      })
    ),
    'phone.imei': wrapNoArgs(() => faker.phone.imei()),

    // Company generators
    'company.name': wrapNoArgs(() => faker.company.name()),
    'company.catchPhrase': wrapNoArgs(() => faker.company.catchPhrase()),
    'company.buzzPhrase': wrapNoArgs(() => faker.company.buzzPhrase()),

    // Location/Address generators
    'location.streetAddress': wrap((useFullAddress?: unknown) =>
      faker.location.streetAddress({ useFullAddress: useFullAddress === true })
    ),
    'location.city': wrapNoArgs(() => faker.location.city()),
    'location.state': wrapNoArgs(() => faker.location.state()),
    'location.zipCode': wrap((format?: unknown) =>
      faker.location.zipCode(typeof format === 'string' ? format : undefined)
    ),
    'location.country': wrapNoArgs(() => faker.location.country()),
    'location.countryCode': wrapNoArgs(() => faker.location.countryCode()),
    'location.latitude': wrapNoArgs(() => faker.location.latitude()),
    'location.longitude': wrapNoArgs(() => faker.location.longitude()),

    // Date generators
    'date.past': wrap((options?: unknown) =>
      faker.date
        .past(typeof options === 'object' ? (options as Record<string, unknown>) : undefined)
        .toISOString()
    ),
    'date.future': wrap((options?: unknown) =>
      faker.date
        .future(typeof options === 'object' ? (options as Record<string, unknown>) : undefined)
        .toISOString()
    ),
    'date.recent': wrap((options?: unknown) =>
      faker.date
        .recent(typeof options === 'object' ? (options as Record<string, unknown>) : undefined)
        .toISOString()
    ),
    'date.birthdate': wrap(
      (options?: unknown) =>
        faker.date
          .birthdate(typeof options === 'object' ? (options as Record<string, unknown>) : undefined)
          .toISOString()
          .split('T')[0]
    ),

    // Finance generators
    'finance.accountNumber': wrap((length?: unknown) =>
      faker.finance.accountNumber({ length: typeof length === 'number' ? length : undefined })
    ),
    'finance.iban': wrapNoArgs(() => faker.finance.iban()),
    'finance.bic': wrapNoArgs(() => faker.finance.bic()),
    'finance.creditCardNumber': wrap((issuer?: unknown) =>
      faker.finance.creditCardNumber({ issuer: typeof issuer === 'string' ? issuer : undefined })
    ),
    'finance.creditCardCVV': wrapNoArgs(() => faker.finance.creditCardCVV()),
    'finance.currency': wrapNoArgs(() => faker.finance.currency()),
    'finance.currencyCode': wrapNoArgs(() => faker.finance.currencyCode()),
    'finance.amount': wrap((min?: unknown, max?: unknown, dec?: unknown) =>
      faker.finance.amount({
        min: typeof min === 'number' ? min : undefined,
        max: typeof max === 'number' ? max : undefined,
        dec: typeof dec === 'number' ? dec : undefined,
      })
    ),
    'finance.transactionType': wrapNoArgs(() => faker.finance.transactionType()),

    // Commerce generators
    'commerce.department': wrapNoArgs(() => faker.commerce.department()),
    'commerce.productName': wrapNoArgs(() => faker.commerce.productName()),
    'commerce.price': wrap((options?: unknown) =>
      faker.commerce.price(
        typeof options === 'object' ? (options as Record<string, unknown>) : undefined
      )
    ),
    'commerce.productDescription': wrapNoArgs(() => faker.commerce.productDescription()),

    // Lorem generators
    'lorem.word': wrapNoArgs(() => faker.lorem.word()),
    'lorem.words': wrap((count?: unknown) =>
      faker.lorem.words(typeof count === 'number' ? count : undefined)
    ),
    'lorem.sentence': wrap((wordCount?: unknown) =>
      faker.lorem.sentence(typeof wordCount === 'number' ? wordCount : undefined)
    ),
    'lorem.sentences': wrap((count?: unknown) =>
      faker.lorem.sentences(typeof count === 'number' ? count : undefined)
    ),
    'lorem.paragraph': wrap((sentenceCount?: unknown) =>
      faker.lorem.paragraph(typeof sentenceCount === 'number' ? sentenceCount : undefined)
    ),
    'lorem.paragraphs': wrap((count?: unknown) =>
      faker.lorem.paragraphs(typeof count === 'number' ? count : undefined)
    ),

    // Image generators
    'image.avatar': wrapNoArgs(() => faker.image.avatar()),
    'image.url': wrap((options?: unknown) =>
      faker.image.url(
        typeof options === 'object' ? (options as Record<string, unknown>) : undefined
      )
    ),

    // Database generators
    'database.column': wrapNoArgs(() => faker.database.column()),
    'database.type': wrapNoArgs(() => faker.database.type()),
    'database.collation': wrapNoArgs(() => faker.database.collation()),
    'database.engine': wrapNoArgs(() => faker.database.engine()),
    'database.mongodbObjectId': wrapNoArgs(() => faker.database.mongodbObjectId()),

    // Git generators
    'git.branch': wrapNoArgs(() => faker.git.branch()),
    'git.commitSha': wrapNoArgs(() => faker.git.commitSha()),
    'git.commitMessage': wrapNoArgs(() => faker.git.commitMessage()),

    // Hacker generators
    'hacker.abbreviation': wrapNoArgs(() => faker.hacker.abbreviation()),
    'hacker.adjective': wrapNoArgs(() => faker.hacker.adjective()),
    'hacker.noun': wrapNoArgs(() => faker.hacker.noun()),
    'hacker.verb': wrapNoArgs(() => faker.hacker.verb()),
    'hacker.phrase': wrapNoArgs(() => faker.hacker.phrase()),

    // Color generators
    'color.rgb': wrapNoArgs(() => faker.color.rgb()),
    'color.human': wrapNoArgs(() => faker.color.human()),

    // Number generators (useful aliases)
    'number.int': wrap((options?: unknown) =>
      faker.number.int(
        typeof options === 'object' ? (options as Record<string, unknown>) : undefined
      )
    ),
    'number.float': wrap((options?: unknown) =>
      faker.number.float(
        typeof options === 'object' ? (options as Record<string, unknown>) : undefined
      )
    ),

    // Datatype
    'datatype.boolean': wrapNoArgs(() => faker.datatype.boolean()),

    // Airline
    'airline.airline': wrapNoArgs(() => faker.airline.airline()),
    'airline.airport': wrapNoArgs(() => faker.airline.airport()),
    'airline.flightNumber': wrapNoArgs(() => faker.airline.flightNumber()),

    // Vehicle
    'vehicle.vehicle': wrapNoArgs(() => faker.vehicle.vehicle()),
    'vehicle.manufacturer': wrapNoArgs(() => faker.vehicle.manufacturer()),
    'vehicle.model': wrapNoArgs(() => faker.vehicle.model()),
    'vehicle.vin': wrapNoArgs(() => faker.vehicle.vin()),
    'vehicle.vrm': wrapNoArgs(() => faker.vehicle.vrm()),
  },
};

/**
 * Shorthand generators that don't require the "faker." prefix
 * These are the most commonly used generators
 */
export const fakerShorthandPlugin: VaguePlugin = {
  name: 'shorthand',
  generators: {
    // Most common
    uuid: wrapNoArgs(() => faker.string.uuid()),
    email: wrapNoArgs(() => faker.internet.email()),
    phone: wrap((format?: unknown) =>
      faker.phone.number({
        style:
          typeof format === 'string'
            ? (format as 'human' | 'national' | 'international')
            : undefined,
      })
    ),
    firstName: wrapNoArgs(() => faker.person.firstName()),
    lastName: wrapNoArgs(() => faker.person.lastName()),
    fullName: wrapNoArgs(() => faker.person.fullName()),
    companyName: wrapNoArgs(() => faker.company.name()),
    streetAddress: wrapNoArgs(() => faker.location.streetAddress()),
    city: wrapNoArgs(() => faker.location.city()),
    country: wrapNoArgs(() => faker.location.country()),
    countryCode: wrapNoArgs(() => faker.location.countryCode()),
    zipCode: wrapNoArgs(() => faker.location.zipCode()),
    url: wrapNoArgs(() => faker.internet.url()),
    avatar: wrapNoArgs(() => faker.image.avatar()),
    iban: wrapNoArgs(() => faker.finance.iban()),
    currencyCode: wrapNoArgs(() => faker.finance.currencyCode()),
    pastDate: wrapNoArgs(() => faker.date.past().toISOString()),
    futureDate: wrapNoArgs(() => faker.date.future().toISOString()),
    recentDate: wrapNoArgs(() => faker.date.recent().toISOString()),
    sentence: wrapNoArgs(() => faker.lorem.sentence()),
    paragraph: wrapNoArgs(() => faker.lorem.paragraph()),
  },
};

/**
 * Set the faker locale
 * Note: In Faker 8+, locale is set during initialization.
 * This function is provided for compatibility but may have limited effect.
 */
export function setFakerLocale(_locale: string): void {
  // In Faker 8+, you need to import from a specific locale:
  // import { faker } from '@faker-js/faker/locale/de'
  // This is a no-op placeholder for API compatibility
  console.warn(
    'setFakerLocale: In Faker 8+, locale is set at import time. Import from @faker-js/faker/locale/XX instead.'
  );
}

/**
 * Set a seed for reproducible generation
 */
export function setFakerSeed(seed: number): void {
  faker.seed(seed);
}

export default fakerPlugin;
