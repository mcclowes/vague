---
sidebar_position: 1
title: Faker Plugin
---

# Faker Plugin

The Faker plugin provides generators for realistic data like names, emails, addresses, and more. It's built on top of [Faker.js](https://fakerjs.dev/).

## Common Generators

These shorthand generators are available without a namespace:

| Generator | Description | Example Output |
|-----------|-------------|----------------|
| `uuid()` | UUID v4 | `"a1b2c3d4-e5f6-7890-abcd-ef1234567890"` |
| `email()` | Email address | `"john.doe@example.com"` |
| `phone()` | Phone number | `"+1-555-123-4567"` |
| `firstName()` | First name | `"John"` |
| `lastName()` | Last name | `"Smith"` |
| `fullName()` | Full name | `"John Smith"` |
| `companyName()` | Company name | `"Acme Corp"` |
| `streetAddress()` | Street address | `"123 Main St"` |
| `city()` | City name | `"New York"` |
| `state()` | US state | `"California"` |
| `zipCode()` | ZIP code | `"90210"` |
| `country()` | Country name | `"United States"` |
| `sentence()` | Random sentence | `"The quick brown fox jumps."` |
| `paragraph()` | Random paragraph | `"Lorem ipsum dolor sit amet..."` |

## Usage

```vague
schema Customer {
  id: uuid(),
  name: fullName(),
  email: email(),
  phone: phone(),
  company: companyName(),
  bio: paragraph()
}

schema Address {
  street: streetAddress(),
  city: city(),
  state: state(),
  zip: zipCode(),
  country: country()
}
```

## Full Faker Namespace

Access any Faker.js generator using the `faker.*` namespace:

```vague
schema Product {
  name: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  price: faker.commerce.price(),
  department: faker.commerce.department()
}

schema Developer {
  avatar: faker.image.avatar(),
  username: faker.internet.username(),
  ip: faker.internet.ip(),
  userAgent: faker.internet.userAgent()
}

schema Repository {
  branch: faker.git.branch(),
  commitSha: faker.git.commitSha(),
  commitMessage: faker.git.commitMessage()
}
```

## Popular Faker Modules

### Person

```vague
schema Person {
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  fullName: faker.person.fullName(),
  gender: faker.person.gender(),
  jobTitle: faker.person.jobTitle(),
  jobType: faker.person.jobType()
}
```

### Internet

```vague
schema Account {
  email: faker.internet.email(),
  username: faker.internet.username(),
  password: faker.internet.password(),
  url: faker.internet.url(),
  ip: faker.internet.ip(),
  ipv6: faker.internet.ipv6(),
  mac: faker.internet.mac(),
  userAgent: faker.internet.userAgent()
}
```

### Commerce

```vague
schema Product {
  name: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  price: faker.commerce.price(),
  department: faker.commerce.department(),
  isbn: faker.commerce.isbn()
}
```

### Finance

```vague
schema Finance {
  accountNumber: faker.finance.accountNumber(),
  routingNumber: faker.finance.routingNumber(),
  creditCardNumber: faker.finance.creditCardNumber(),
  currencyCode: faker.finance.currencyCode(),
  bitcoinAddress: faker.finance.bitcoinAddress()
}
```

### Lorem

```vague
schema Content {
  word: faker.lorem.word(),
  words: faker.lorem.words(),
  sentence: faker.lorem.sentence(),
  sentences: faker.lorem.sentences(),
  paragraph: faker.lorem.paragraph(),
  paragraphs: faker.lorem.paragraphs(),
  text: faker.lorem.text()
}
```

### Date

```vague
schema Events {
  past: faker.date.past(),
  future: faker.date.future(),
  recent: faker.date.recent(),
  birthdate: faker.date.birthdate()
}
```

### System

```vague
schema Files {
  fileName: faker.system.fileName(),
  fileExt: faker.system.fileExt(),
  mimeType: faker.system.mimeType(),
  filePath: faker.system.filePath(),
  semver: faker.system.semver()
}
```

### Company

```vague
schema Company {
  name: faker.company.name(),
  catchPhrase: faker.company.catchPhrase(),
  buzzPhrase: faker.company.buzzPhrase()
}
```

### Location

```vague
schema Location {
  city: faker.location.city(),
  state: faker.location.state(),
  country: faker.location.country(),
  latitude: faker.location.latitude(),
  longitude: faker.location.longitude(),
  timeZone: faker.location.timeZone()
}
```

## Combining with Other Features

```vague
schema User {
  id: uuid(),
  name: fullName(),
  email: email(),
  status: 0.8: "active" | 0.2: "inactive",
  created_at: datetime(2020, 2024),

  // Computed from faker values
  username: lowercase(concat(firstName(), ".", lastName()))
}
```

## See Also

- [Faker.js Documentation](https://fakerjs.dev/) for the complete API reference
- [Issuer Plugin](/docs/plugins/issuer) for edge case testing
- [Custom Plugins](/docs/plugins/custom-plugins) for creating your own generators
