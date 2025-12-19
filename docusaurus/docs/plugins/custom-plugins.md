---
sidebar_position: 5
title: Custom Plugins
---

# Custom Plugins

Create custom plugins to extend Vague with domain-specific generators.

## Plugin Structure

A Vague plugin exports a `VaguePlugin` object:

```typescript
import { VaguePlugin, registerPlugin } from 'vague-lang';

const myPlugin: VaguePlugin = {
  name: 'custom',
  generators: {
    'greeting': () => 'Hello!',
    'repeat': (args) => String(args[0]).repeat(Number(args[1]) || 1),
  },
};

registerPlugin(myPlugin);
```

## Generator Functions

Generators receive an array of arguments and return a value:

```typescript
const plugin: VaguePlugin = {
  name: 'example',
  generators: {
    // No arguments
    'timestamp': () => Date.now(),

    // With arguments
    'padLeft': (args) => {
      const str = String(args[0] || '');
      const len = Number(args[1]) || 10;
      const char = String(args[2] || ' ');
      return str.padStart(len, char);
    },

    // Random selection
    'pickOne': (args) => {
      const items = args as string[];
      return items[Math.floor(Math.random() * items.length)];
    },
  },
};
```

## Using Custom Generators

Once registered, use generators with the plugin namespace:

```vague
schema Example {
  message: custom.greeting(),
  repeated: custom.repeat("ha", 3),
  padded: example.padLeft("42", 5, "0"),
  picked: example.pickOne("a", "b", "c")
}
```

## Plugin File Structure

Create a plugin file (e.g., `my-plugin.ts`):

```typescript
// my-plugin.ts
import type { VaguePlugin } from 'vague-lang';

const plugin: VaguePlugin = {
  name: 'mycompany',
  generators: {
    'accountId': () => `ACC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
    'internalCode': (args) => {
      const prefix = String(args[0] || 'INT');
      const num = Math.floor(Math.random() * 10000);
      return `${prefix}-${num.toString().padStart(4, '0')}`;
    },
  },
};

export default plugin;
```

## Configuration File

Register plugins in `vague.config.js`:

```javascript
// vague.config.js
export default {
  plugins: [
    './my-plugin.js',           // Local file
    'vague-plugin-stripe',       // npm package
    './plugins/company-specific.js'
  ],
  seed: 42,
  pretty: true
};
```

## Auto-Discovery

Vague automatically discovers plugins in:

1. `./plugins/` directory
2. `./vague-plugins/` directory
3. `node_modules/vague-plugin-*` packages

```
project/
├── vague.config.js
├── plugins/
│   └── my-plugin.js      # Auto-discovered
├── vague-plugins/
│   └── another-plugin.js # Auto-discovered
└── schemas/
    └── data.vague
```

## CLI Plugin Loading

Load plugins via CLI:

```bash
# Load from directory
vague data.vague --plugins ./custom-plugins

# Multiple directories
vague data.vague --plugins ./plugins --plugins ./more-plugins

# Disable auto-discovery
vague data.vague --no-auto-plugins --plugins ./plugins
```

## Practical Example: E-commerce Plugin

```typescript
// ecommerce-plugin.ts
import type { VaguePlugin } from 'vague-lang';

const plugin: VaguePlugin = {
  name: 'ecom',
  generators: {
    // Product identifiers
    'sku': () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      const prefix = Array(3).fill(0).map(() =>
        chars[Math.floor(Math.random() * chars.length)]
      ).join('');
      const num = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      return `${prefix}-${num}`;
    },

    // Shipping tracking
    'trackingNumber': (args) => {
      const carrier = String(args[0] || 'USPS');
      const prefixes = { USPS: '94', UPS: '1Z', FEDEX: '78' };
      const prefix = prefixes[carrier] || '00';
      const num = Array(18).fill(0).map(() =>
        Math.floor(Math.random() * 10)
      ).join('');
      return `${prefix}${num}`;
    },

    // Price formatting
    'formattedPrice': (args) => {
      const amount = Number(args[0]) || Math.random() * 100;
      const currency = String(args[1] || 'USD');
      const symbols = { USD: '$', EUR: '€', GBP: '£' };
      return `${symbols[currency] || '$'}${amount.toFixed(2)}`;
    },

    // Order status with realistic distribution
    'orderStatus': () => {
      const rand = Math.random();
      if (rand < 0.6) return 'delivered';
      if (rand < 0.8) return 'shipped';
      if (rand < 0.9) return 'processing';
      if (rand < 0.95) return 'pending';
      return 'cancelled';
    },
  },
};

export default plugin;
```

Usage:

```vague
schema Product {
  sku: ecom.sku(),
  price: decimal in 9.99..199.99,
  formatted_price: ecom.formattedPrice(price, "USD")
}

schema Order {
  status: ecom.orderStatus(),
  tracking: ecom.trackingNumber("UPS") when status == "shipped"
}
```

## Best Practices

1. **Use descriptive namespaces** — Avoid collisions with built-in generators
2. **Handle missing arguments** — Provide sensible defaults
3. **Keep generators pure** — Avoid side effects for reproducibility
4. **Document your generators** — Include usage examples
5. **Test edge cases** — Ensure generators handle unusual inputs

## See Also

- [Faker Plugin](/docs/plugins/faker) for built-in generators
- [Configuration File](/docs/cli#configuration-file) for config file options
