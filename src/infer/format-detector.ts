/**
 * Format detection for schema inference.
 * Recognizes common patterns like UUID, email, phone, URL, etc.
 */

export type DetectedFormat =
  | 'uuid'
  | 'email'
  | 'phone'
  | 'url'
  | 'uri'
  | 'ipv4'
  | 'ipv6'
  | 'date'
  | 'datetime'
  | 'time'
  | 'hostname'
  | 'slug'
  | 'credit-card'
  | 'iban'
  | 'mac-address'
  | 'isbn'
  | 'hex-color'
  | 'ssn'
  | 'none';

interface FormatPattern {
  format: DetectedFormat;
  pattern: RegExp;
  minMatchRatio: number; // Minimum ratio of values that must match
}

const FORMAT_PATTERNS: FormatPattern[] = [
  // Most specific patterns first
  {
    format: 'uuid',
    pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    minMatchRatio: 0.9,
  },
  {
    format: 'email',
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    minMatchRatio: 0.9,
  },
  {
    format: 'url',
    pattern: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,
    minMatchRatio: 0.9,
  },
  // Credit card patterns (Visa, Mastercard, Amex, Discover, etc.)
  // Supports with/without spaces or dashes
  {
    format: 'credit-card',
    pattern:
      /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})$|^(?:4[0-9]{3}|5[1-5][0-9]{2}|3[47][0-9]{2}|6(?:011|5[0-9]{2}))[- ]?[0-9]{4}[- ]?[0-9]{4}[- ]?[0-9]{4}$/,
    minMatchRatio: 0.85,
  },
  // IBAN - International Bank Account Number (starts with 2-letter country code)
  {
    format: 'iban',
    pattern: /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/i,
    minMatchRatio: 0.85,
  },
  // MAC address - 6 pairs of hex digits separated by : or -
  {
    format: 'mac-address',
    pattern: /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
    minMatchRatio: 0.9,
  },
  // ISBN-10 or ISBN-13 (with or without hyphens)
  {
    format: 'isbn',
    pattern:
      /^(?:ISBN(?:-1[03])?:?\s*)?(?=[0-9X]{10}$|(?=(?:[0-9]+[-\s]){3})[-\s0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[-\s]){4})[-\s0-9]{17}$)[0-9]{1,5}[-\s]?[0-9]+[-\s]?[0-9]+[-\s]?[0-9X]$/i,
    minMatchRatio: 0.85,
  },
  // Hex color codes (#RGB or #RRGGBB)
  {
    format: 'hex-color',
    pattern: /^#(?:[0-9a-fA-F]{3}){1,2}$/,
    minMatchRatio: 0.9,
  },
  // US Social Security Number (XXX-XX-XXXX)
  {
    format: 'ssn',
    pattern: /^(?!000|666|9\d{2})\d{3}-(?!00)\d{2}-(?!0000)\d{4}$/,
    minMatchRatio: 0.9,
  },
  // IPv4 before phone to avoid false matches
  {
    format: 'ipv4',
    pattern:
      /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    minMatchRatio: 0.9,
  },
  {
    format: 'ipv6',
    pattern:
      /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$/,
    minMatchRatio: 0.9,
  },
  // Phone pattern - requires + or () to be more specific
  {
    format: 'phone',
    pattern: /^[+][(]?[0-9]{1,4}[)]?[-\s./0-9]{6,}$|^[(][0-9]{1,4}[)][-\s./0-9]{6,}$/,
    minMatchRatio: 0.8,
  },
  {
    format: 'datetime',
    pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
    minMatchRatio: 0.9,
  },
  {
    format: 'date',
    pattern: /^\d{4}-\d{2}-\d{2}$/,
    minMatchRatio: 0.9,
  },
  {
    format: 'time',
    pattern: /^\d{2}:\d{2}(:\d{2})?$/,
    minMatchRatio: 0.9,
  },
  // Hostname must have at least one dot (to be a valid FQDN)
  {
    format: 'hostname',
    pattern:
      /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})?$/,
    minMatchRatio: 0.8,
  },
  // Slug pattern - must have at least one hyphen to distinguish from regular words
  {
    format: 'slug',
    pattern: /^[a-z0-9]+-[a-z0-9]+(-[a-z0-9]+)*$/,
    minMatchRatio: 0.8,
  },
];

/**
 * Detect the format of string values
 */
export function detectFormat(values: unknown[]): DetectedFormat {
  // Filter to strings only
  const strings = values.filter((v): v is string => typeof v === 'string' && v.length > 0);

  if (strings.length === 0) {
    return 'none';
  }

  // Try each pattern
  for (const { format, pattern, minMatchRatio } of FORMAT_PATTERNS) {
    const matches = strings.filter((s) => pattern.test(s));
    const matchRatio = matches.length / strings.length;

    if (matchRatio >= minMatchRatio) {
      return format;
    }
  }

  return 'none';
}

/**
 * Get the Vague generator function for a format
 */
export function getGeneratorForFormat(format: DetectedFormat): string | null {
  switch (format) {
    case 'uuid':
      return 'uuid()';
    case 'email':
      return 'email()';
    case 'phone':
      return 'phone()';
    case 'url':
      return 'faker.internet.url()';
    case 'hostname':
      return 'faker.internet.domainName()';
    case 'ipv4':
      return 'faker.internet.ipv4()';
    case 'ipv6':
      return 'faker.internet.ipv6()';
    case 'datetime':
    case 'date':
    case 'time':
      // These are handled by type detection, not format
      return null;
    case 'slug':
      return 'faker.lorem.slug()';
    case 'credit-card':
      return 'faker.finance.creditCardNumber()';
    case 'iban':
      return 'faker.finance.iban()';
    case 'mac-address':
      return 'faker.internet.mac()';
    case 'isbn':
      return 'faker.commerce.isbn()';
    case 'hex-color':
      return 'faker.color.rgb()';
    case 'ssn':
      // Note: Use issuer plugin for SSN-like values if testing edge cases
      return 'faker.string.numeric({ length: 9, allowLeadingZeros: false })';
    default:
      return null;
  }
}

/**
 * Detect common field name patterns that suggest a specific generator
 */
export function detectFieldNamePattern(fieldName: string): string | null {
  const lowerName = fieldName.toLowerCase();

  // ID fields
  if (lowerName === 'id' || lowerName.endsWith('_id') || lowerName.endsWith('Id')) {
    return null; // Let type/range detection handle this
  }

  // Common name patterns
  const patterns: Record<string, string> = {
    // Names
    first_name: 'faker.person.firstName()',
    firstname: 'faker.person.firstName()',
    firstName: 'faker.person.firstName()',
    last_name: 'faker.person.lastName()',
    lastname: 'faker.person.lastName()',
    lastName: 'faker.person.lastName()',
    full_name: 'fullName()',
    fullname: 'fullName()',
    fullName: 'fullName()',
    name: 'fullName()',

    // Contact
    email: 'email()',
    email_address: 'email()',
    emailAddress: 'email()',
    phone: 'phone()',
    phone_number: 'phone()',
    phoneNumber: 'phone()',
    telephone: 'phone()',

    // Address
    street: 'faker.location.streetAddress()',
    street_address: 'faker.location.streetAddress()',
    streetAddress: 'faker.location.streetAddress()',
    city: 'faker.location.city()',
    state: 'faker.location.state()',
    country: 'faker.location.country()',
    zip: 'faker.location.zipCode()',
    zipcode: 'faker.location.zipCode()',
    zipCode: 'faker.location.zipCode()',
    zip_code: 'faker.location.zipCode()',
    postal_code: 'faker.location.zipCode()',
    postalCode: 'faker.location.zipCode()',

    // Internet
    url: 'faker.internet.url()',
    website: 'faker.internet.url()',
    domain: 'faker.internet.domainName()',
    hostname: 'faker.internet.domainName()',
    username: 'faker.internet.username()',
    user_name: 'faker.internet.username()',
    userName: 'faker.internet.username()',
    avatar: 'faker.image.avatar()',
    avatar_url: 'faker.image.avatar()',
    avatarUrl: 'faker.image.avatar()',
    ip: 'faker.internet.ipv4()',
    ip_address: 'faker.internet.ipv4()',
    ipAddress: 'faker.internet.ipv4()',
    mac: 'faker.internet.mac()',
    mac_address: 'faker.internet.mac()',
    macAddress: 'faker.internet.mac()',

    // Company
    company: 'companyName()',
    company_name: 'companyName()',
    companyName: 'companyName()',

    // UUID
    uuid: 'uuid()',
    guid: 'uuid()',

    // Descriptions
    description: 'faker.lorem.paragraph()',
    bio: 'faker.lorem.paragraph()',
    about: 'faker.lorem.paragraph()',
    summary: 'faker.lorem.sentence()',
    title: 'faker.lorem.sentence()',

    // Finance
    credit_card: 'faker.finance.creditCardNumber()',
    creditCard: 'faker.finance.creditCardNumber()',
    card_number: 'faker.finance.creditCardNumber()',
    cardNumber: 'faker.finance.creditCardNumber()',
    iban: 'faker.finance.iban()',
    bank_account: 'faker.finance.iban()',
    bankAccount: 'faker.finance.iban()',
    bic: 'faker.finance.bic()',
    swift: 'faker.finance.bic()',
    swift_code: 'faker.finance.bic()',
    swiftCode: 'faker.finance.bic()',
    cvv: 'faker.finance.creditCardCVV()',
    cvc: 'faker.finance.creditCardCVV()',
    currency: 'faker.finance.currencyCode()',
    currency_code: 'faker.finance.currencyCode()',
    currencyCode: 'faker.finance.currencyCode()',

    // Books/Products
    isbn: 'faker.commerce.isbn()',

    // Colors
    color: 'faker.color.rgb()',
    hex_color: 'faker.color.rgb()',
    hexColor: 'faker.color.rgb()',

    // Job/Work
    job: 'faker.person.jobTitle()',
    job_title: 'faker.person.jobTitle()',
    jobTitle: 'faker.person.jobTitle()',
    department: 'faker.commerce.department()',

    // Identifiers
    slug: 'faker.lorem.slug()',
    sku: 'faker.commerce.isbn()',
  };

  return patterns[lowerName] || patterns[fieldName] || null;
}
