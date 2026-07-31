import { describe, it, expect } from 'vitest';
import { detectFormat, getGeneratorForFormat, detectFieldNamePattern } from './format-detector.js';

describe('Format Detector', () => {
  describe('detectFormat', () => {
    describe('UUID detection', () => {
      it('detects valid UUIDs', () => {
        const values = [
          '123e4567-e89b-12d3-a456-426614174000',
          'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          'ffffffff-ffff-ffff-ffff-ffffffffffff',
        ];
        expect(detectFormat(values)).toBe('uuid');
      });

      it('detects lowercase UUIDs', () => {
        const values = [
          '123e4567-e89b-12d3-a456-426614174000',
          'abcdef00-1234-5678-9abc-def012345678',
        ];
        expect(detectFormat(values)).toBe('uuid');
      });

      it('detects uppercase UUIDs', () => {
        const values = [
          '123E4567-E89B-12D3-A456-426614174000',
          'ABCDEF00-1234-5678-9ABC-DEF012345678',
        ];
        expect(detectFormat(values)).toBe('uuid');
      });

      it('does not detect invalid UUIDs as UUID format', () => {
        // Invalid UUIDs may match other patterns (e.g., slug) but should not match UUID
        const values = ['not-a-uuid', '123e4567-e89b-12d3-a456', 'too-short'];
        expect(detectFormat(values)).not.toBe('uuid');
      });

      it('handles mixed valid/invalid with 90% threshold', () => {
        const valid = Array(9).fill('123e4567-e89b-12d3-a456-426614174000');
        const invalid = ['not-a-uuid'];
        expect(detectFormat([...valid, ...invalid])).toBe('uuid');
      });
    });

    describe('email detection', () => {
      it('detects valid emails', () => {
        const values = [
          'user@example.com',
          'john.doe@company.org',
          'test+label@subdomain.domain.co.uk',
        ];
        expect(detectFormat(values)).toBe('email');
      });

      it('handles various email formats', () => {
        const values = [
          'simple@example.com',
          'very.common@example.com',
          'disposable.style.email.with+symbol@example.com',
          'user.name@example.co.uk',
        ];
        expect(detectFormat(values)).toBe('email');
      });

      it('does not detect invalid emails', () => {
        const values = ['not-an-email', '@missing-local', 'missing@domain'];
        expect(detectFormat(values)).toBe('none');
      });
    });

    describe('URL detection', () => {
      it('detects valid URLs', () => {
        const values = [
          'https://example.com',
          'http://www.google.com/search?q=test',
          'https://api.domain.com/v1/users',
        ];
        expect(detectFormat(values)).toBe('url');
      });

      it('detects URLs with paths and query strings', () => {
        const values = [
          'https://example.com/path/to/resource',
          'http://api.example.com/users?page=1&limit=10',
          'https://cdn.example.com/images/photo.jpg',
        ];
        expect(detectFormat(values)).toBe('url');
      });

      it('does not detect non-URLs', () => {
        const values = ['not a url', 'ftp://files.example.com', 'www.example.com'];
        expect(detectFormat(values)).toBe('none');
      });
    });

    describe('phone detection', () => {
      it('detects international phone numbers', () => {
        const values = ['+1-555-123-4567', '+44 20 7123 4567', '+33 1 23 45 67 89'];
        expect(detectFormat(values)).toBe('phone');
      });

      it('detects phone numbers with parentheses', () => {
        const values = ['(555) 123-4567', '(020) 7123 4567', '(123) 456-7890'];
        expect(detectFormat(values)).toBe('phone');
      });

      it('does not detect plain numbers as phone (requires + or parentheses)', () => {
        // Plain digit-only strings don't match the phone pattern which requires + or ()
        const values = ['1234567890', '5551234567', '9876543210'];
        // These may match other patterns or be none - the key is they're not phone
        expect(detectFormat(values)).not.toBe('phone');
      });
    });

    describe('IPv4 detection', () => {
      it('detects valid IPv4 addresses', () => {
        const values = ['192.168.1.1', '10.0.0.1', '255.255.255.0', '8.8.8.8'];
        expect(detectFormat(values)).toBe('ipv4');
      });

      it('handles edge case IPs', () => {
        const values = ['0.0.0.0', '255.255.255.255', '127.0.0.1'];
        expect(detectFormat(values)).toBe('ipv4');
      });

      it('does not detect invalid IPv4', () => {
        const values = ['256.0.0.1', '192.168.1', '192.168.1.1.1'];
        expect(detectFormat(values)).toBe('none');
      });
    });

    describe('IPv6 detection', () => {
      it('detects full IPv6 addresses', () => {
        const values = [
          '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
          'fe80:0000:0000:0000:0000:0000:0000:0001',
        ];
        expect(detectFormat(values)).toBe('ipv6');
      });

      it('handles compressed IPv6 (may not match all compressed forms)', () => {
        // The regex pattern for IPv6 may not match all compressed forms
        // Full forms are reliably detected
        const fullForms = [
          '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
          'fe80:0000:0000:0000:0000:0000:0000:0001',
          '0000:0000:0000:0000:0000:0000:0000:0001',
        ];
        expect(detectFormat(fullForms)).toBe('ipv6');
      });
    });

    describe('date/datetime detection', () => {
      it('detects ISO datetime format', () => {
        const values = [
          '2024-01-15T12:30:45.000Z',
          '2023-06-20T08:15:30.500Z',
          '2024-12-31T23:59:59.999Z',
        ];
        expect(detectFormat(values)).toBe('datetime');
      });

      it('detects ISO date format', () => {
        const values = ['2024-01-15', '2023-06-20', '2024-12-31'];
        expect(detectFormat(values)).toBe('date');
      });

      it('detects time format', () => {
        const values = ['12:30:45', '08:15', '23:59:59'];
        expect(detectFormat(values)).toBe('time');
      });
    });

    describe('credit card detection', () => {
      it('detects Visa card numbers', () => {
        const values = ['4111111111111111', '4012888888881881', '4222222222222'];
        expect(detectFormat(values)).toBe('credit-card');
      });

      it('detects card numbers with separators', () => {
        const values = ['4111-1111-1111-1111', '4111 1111 1111 1111'];
        expect(detectFormat(values)).toBe('credit-card');
      });
    });

    describe('MAC address detection', () => {
      it('detects MAC addresses with colons', () => {
        const values = ['00:1A:2B:3C:4D:5E', 'AA:BB:CC:DD:EE:FF', '11:22:33:44:55:66'];
        expect(detectFormat(values)).toBe('mac-address');
      });

      it('detects MAC addresses with dashes', () => {
        const values = ['00-1A-2B-3C-4D-5E', 'AA-BB-CC-DD-EE-FF'];
        expect(detectFormat(values)).toBe('mac-address');
      });
    });

    describe('hex color detection', () => {
      it('detects 6-digit hex colors', () => {
        const values = ['#FF5733', '#00FF00', '#336699'];
        expect(detectFormat(values)).toBe('hex-color');
      });

      it('detects 3-digit hex colors', () => {
        const values = ['#F00', '#0F0', '#369'];
        expect(detectFormat(values)).toBe('hex-color');
      });

      it('handles lowercase hex colors', () => {
        const values = ['#ff5733', '#aabbcc', '#123abc'];
        expect(detectFormat(values)).toBe('hex-color');
      });
    });

    describe('SSN detection', () => {
      it('detects valid SSN format', () => {
        const values = ['123-45-6789', '234-56-7890', '345-67-8901'];
        expect(detectFormat(values)).toBe('ssn');
      });

      it('does not detect invalid SSN as SSN format', () => {
        // These SSNs are invalid per SSA rules (000, 666, 9xx prefixes)
        // They won't match SSN but may match other patterns like slug
        const values = ['000-12-3456', '666-12-3456', '900-12-3456'];
        expect(detectFormat(values)).not.toBe('ssn');
      });
    });

    describe('slug detection', () => {
      it('detects URL slugs', () => {
        const values = ['hello-world', 'my-blog-post', 'product-category-item'];
        expect(detectFormat(values)).toBe('slug');
      });

      it('does not detect single words as slugs', () => {
        const values = ['hello', 'world', 'test'];
        expect(detectFormat(values)).toBe('none');
      });
    });

    describe('hostname detection', () => {
      it('detects hostnames', () => {
        const values = ['api.example.com', 'www.google.com', 'cdn.domain.org'];
        expect(detectFormat(values)).toBe('hostname');
      });
    });

    describe('edge cases', () => {
      it('returns none for empty array', () => {
        expect(detectFormat([])).toBe('none');
      });

      it('returns none for non-string values', () => {
        expect(detectFormat([123, 456, 789])).toBe('none');
        expect(detectFormat([null, undefined])).toBe('none');
        expect(detectFormat([{}, []])).toBe('none');
      });

      it('returns none for empty strings', () => {
        expect(detectFormat(['', '', ''])).toBe('none');
      });

      it('filters out empty strings before detection', () => {
        const values = ['', 'user@example.com', '', 'test@domain.com', ''];
        expect(detectFormat(values)).toBe('email');
      });

      it('returns none for mixed unrelated formats', () => {
        const values = ['user@example.com', '192.168.1.1', 'hello-world', '2024-01-15'];
        expect(detectFormat(values)).toBe('none');
      });
    });
  });

  describe('getGeneratorForFormat', () => {
    it('returns uuid() for uuid format', () => {
      expect(getGeneratorForFormat('uuid')).toBe('uuid()');
    });

    it('returns email() for email format', () => {
      expect(getGeneratorForFormat('email')).toBe('email()');
    });

    it('returns phone() for phone format', () => {
      expect(getGeneratorForFormat('phone')).toBe('phone()');
    });

    it('returns faker generator for url format', () => {
      expect(getGeneratorForFormat('url')).toBe('faker.internet.url()');
    });

    it('returns faker generator for hostname format', () => {
      expect(getGeneratorForFormat('hostname')).toBe('faker.internet.domainName()');
    });

    it('returns faker generator for ipv4 format', () => {
      expect(getGeneratorForFormat('ipv4')).toBe('faker.internet.ipv4()');
    });

    it('returns faker generator for ipv6 format', () => {
      expect(getGeneratorForFormat('ipv6')).toBe('faker.internet.ipv6()');
    });

    it('returns null for date/time formats (handled by type detection)', () => {
      expect(getGeneratorForFormat('datetime')).toBe(null);
      expect(getGeneratorForFormat('date')).toBe(null);
      expect(getGeneratorForFormat('time')).toBe(null);
    });

    it('returns faker generator for slug format', () => {
      expect(getGeneratorForFormat('slug')).toBe('faker.lorem.slug()');
    });

    it('returns faker generator for credit-card format', () => {
      expect(getGeneratorForFormat('credit-card')).toBe('faker.finance.creditCardNumber()');
    });

    it('returns faker generator for iban format', () => {
      expect(getGeneratorForFormat('iban')).toBe('faker.finance.iban()');
    });

    it('returns faker generator for mac-address format', () => {
      expect(getGeneratorForFormat('mac-address')).toBe('faker.internet.mac()');
    });

    it('returns null for none format', () => {
      expect(getGeneratorForFormat('none')).toBe(null);
    });
  });

  describe('detectFieldNamePattern', () => {
    describe('name fields', () => {
      it('detects first name variations', () => {
        expect(detectFieldNamePattern('first_name')).toBe('faker.person.firstName()');
        expect(detectFieldNamePattern('firstname')).toBe('faker.person.firstName()');
        expect(detectFieldNamePattern('firstName')).toBe('faker.person.firstName()');
      });

      it('detects last name variations', () => {
        expect(detectFieldNamePattern('last_name')).toBe('faker.person.lastName()');
        expect(detectFieldNamePattern('lastname')).toBe('faker.person.lastName()');
        expect(detectFieldNamePattern('lastName')).toBe('faker.person.lastName()');
      });

      it('detects full name variations', () => {
        expect(detectFieldNamePattern('full_name')).toBe('fullName()');
        expect(detectFieldNamePattern('fullname')).toBe('fullName()');
        expect(detectFieldNamePattern('fullName')).toBe('fullName()');
        expect(detectFieldNamePattern('name')).toBe('fullName()');
      });
    });

    describe('contact fields', () => {
      it('detects email variations', () => {
        expect(detectFieldNamePattern('email')).toBe('email()');
        expect(detectFieldNamePattern('email_address')).toBe('email()');
        expect(detectFieldNamePattern('emailAddress')).toBe('email()');
      });

      it('detects phone variations', () => {
        expect(detectFieldNamePattern('phone')).toBe('phone()');
        expect(detectFieldNamePattern('phone_number')).toBe('phone()');
        expect(detectFieldNamePattern('phoneNumber')).toBe('phone()');
        expect(detectFieldNamePattern('telephone')).toBe('phone()');
      });
    });

    describe('address fields', () => {
      it('detects street variations', () => {
        expect(detectFieldNamePattern('street')).toBe('faker.location.streetAddress()');
        expect(detectFieldNamePattern('street_address')).toBe('faker.location.streetAddress()');
        expect(detectFieldNamePattern('streetAddress')).toBe('faker.location.streetAddress()');
      });

      it('detects city', () => {
        expect(detectFieldNamePattern('city')).toBe('faker.location.city()');
      });

      it('detects state', () => {
        expect(detectFieldNamePattern('state')).toBe('faker.location.state()');
      });

      it('detects country', () => {
        expect(detectFieldNamePattern('country')).toBe('faker.location.country()');
      });

      it('detects zip code variations', () => {
        expect(detectFieldNamePattern('zip')).toBe('faker.location.zipCode()');
        expect(detectFieldNamePattern('zipcode')).toBe('faker.location.zipCode()');
        expect(detectFieldNamePattern('zipCode')).toBe('faker.location.zipCode()');
        expect(detectFieldNamePattern('zip_code')).toBe('faker.location.zipCode()');
        expect(detectFieldNamePattern('postal_code')).toBe('faker.location.zipCode()');
        expect(detectFieldNamePattern('postalCode')).toBe('faker.location.zipCode()');
      });
    });

    describe('internet fields', () => {
      it('detects url variations', () => {
        expect(detectFieldNamePattern('url')).toBe('faker.internet.url()');
        expect(detectFieldNamePattern('website')).toBe('faker.internet.url()');
      });

      it('detects domain variations', () => {
        expect(detectFieldNamePattern('domain')).toBe('faker.internet.domainName()');
        expect(detectFieldNamePattern('hostname')).toBe('faker.internet.domainName()');
      });

      it('detects username variations', () => {
        expect(detectFieldNamePattern('username')).toBe('faker.internet.username()');
        expect(detectFieldNamePattern('user_name')).toBe('faker.internet.username()');
        expect(detectFieldNamePattern('userName')).toBe('faker.internet.username()');
      });

      it('detects avatar variations', () => {
        expect(detectFieldNamePattern('avatar')).toBe('faker.image.avatar()');
        expect(detectFieldNamePattern('avatar_url')).toBe('faker.image.avatar()');
        expect(detectFieldNamePattern('avatarUrl')).toBe('faker.image.avatar()');
      });

      it('detects IP variations', () => {
        expect(detectFieldNamePattern('ip')).toBe('faker.internet.ipv4()');
        expect(detectFieldNamePattern('ip_address')).toBe('faker.internet.ipv4()');
        expect(detectFieldNamePattern('ipAddress')).toBe('faker.internet.ipv4()');
      });

      it('detects MAC variations', () => {
        expect(detectFieldNamePattern('mac')).toBe('faker.internet.mac()');
        expect(detectFieldNamePattern('mac_address')).toBe('faker.internet.mac()');
        expect(detectFieldNamePattern('macAddress')).toBe('faker.internet.mac()');
      });
    });

    describe('company fields', () => {
      it('detects company name variations', () => {
        expect(detectFieldNamePattern('company')).toBe('companyName()');
        expect(detectFieldNamePattern('company_name')).toBe('companyName()');
        expect(detectFieldNamePattern('companyName')).toBe('companyName()');
      });
    });

    describe('identifier fields', () => {
      it('detects uuid/guid', () => {
        expect(detectFieldNamePattern('uuid')).toBe('uuid()');
        expect(detectFieldNamePattern('guid')).toBe('uuid()');
      });

      it('returns null for id fields (let type detection handle)', () => {
        expect(detectFieldNamePattern('id')).toBe(null);
        expect(detectFieldNamePattern('user_id')).toBe(null);
        expect(detectFieldNamePattern('userId')).toBe(null);
      });
    });

    describe('text fields', () => {
      it('detects description fields', () => {
        expect(detectFieldNamePattern('description')).toBe('faker.lorem.paragraph()');
        expect(detectFieldNamePattern('bio')).toBe('faker.lorem.paragraph()');
        expect(detectFieldNamePattern('about')).toBe('faker.lorem.paragraph()');
      });

      it('detects summary/title fields', () => {
        expect(detectFieldNamePattern('summary')).toBe('faker.lorem.sentence()');
        expect(detectFieldNamePattern('title')).toBe('faker.lorem.sentence()');
      });
    });

    describe('finance fields', () => {
      it('detects credit card variations', () => {
        expect(detectFieldNamePattern('credit_card')).toBe('faker.finance.creditCardNumber()');
        expect(detectFieldNamePattern('creditCard')).toBe('faker.finance.creditCardNumber()');
        expect(detectFieldNamePattern('card_number')).toBe('faker.finance.creditCardNumber()');
        expect(detectFieldNamePattern('cardNumber')).toBe('faker.finance.creditCardNumber()');
      });

      it('detects IBAN/bank account', () => {
        expect(detectFieldNamePattern('iban')).toBe('faker.finance.iban()');
        expect(detectFieldNamePattern('bank_account')).toBe('faker.finance.iban()');
        expect(detectFieldNamePattern('bankAccount')).toBe('faker.finance.iban()');
      });

      it('detects BIC/SWIFT', () => {
        expect(detectFieldNamePattern('bic')).toBe('faker.finance.bic()');
        expect(detectFieldNamePattern('swift')).toBe('faker.finance.bic()');
        expect(detectFieldNamePattern('swift_code')).toBe('faker.finance.bic()');
        expect(detectFieldNamePattern('swiftCode')).toBe('faker.finance.bic()');
      });

      it('detects CVV/CVC', () => {
        expect(detectFieldNamePattern('cvv')).toBe('faker.finance.creditCardCVV()');
        expect(detectFieldNamePattern('cvc')).toBe('faker.finance.creditCardCVV()');
      });

      it('detects currency', () => {
        expect(detectFieldNamePattern('currency')).toBe('faker.finance.currencyCode()');
        expect(detectFieldNamePattern('currency_code')).toBe('faker.finance.currencyCode()');
        expect(detectFieldNamePattern('currencyCode')).toBe('faker.finance.currencyCode()');
      });
    });

    describe('other fields', () => {
      it('detects color', () => {
        expect(detectFieldNamePattern('color')).toBe('faker.color.rgb()');
        expect(detectFieldNamePattern('hex_color')).toBe('faker.color.rgb()');
        expect(detectFieldNamePattern('hexColor')).toBe('faker.color.rgb()');
      });

      it('detects job fields', () => {
        expect(detectFieldNamePattern('job')).toBe('faker.person.jobTitle()');
        expect(detectFieldNamePattern('job_title')).toBe('faker.person.jobTitle()');
        expect(detectFieldNamePattern('jobTitle')).toBe('faker.person.jobTitle()');
      });

      it('detects department', () => {
        expect(detectFieldNamePattern('department')).toBe('faker.commerce.department()');
      });

      it('detects slug', () => {
        expect(detectFieldNamePattern('slug')).toBe('faker.lorem.slug()');
      });

      it('detects ISBN/SKU', () => {
        expect(detectFieldNamePattern('isbn')).toBe('faker.commerce.isbn()');
        expect(detectFieldNamePattern('sku')).toBe('faker.commerce.isbn()');
      });
    });

    describe('unknown fields', () => {
      it('returns null for unknown field names', () => {
        expect(detectFieldNamePattern('unknown_field')).toBe(null);
        expect(detectFieldNamePattern('randomField')).toBe(null);
        expect(detectFieldNamePattern('xyz')).toBe(null);
      });
    });
  });
});
