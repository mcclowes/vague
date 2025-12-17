# Custom Plugins Example

This example demonstrates how to create and use custom Vague plugins with the `vague.config.js` configuration file.

## Files

- `vague.config.js` - Configuration file that loads plugins and sets defaults
- `my-plugin.js` - Example custom plugin with various generator types
- `demo.vague` - Schema that uses the custom plugins

## Running

From this directory:

```bash
# Run with config file auto-detected
node ../../dist/cli.js demo.vague

# Skip config file (will fail because plugins aren't loaded)
node ../../dist/cli.js demo.vague --no-config

# Use a specific config file
node ../../dist/cli.js demo.vague -c ./vague.config.js
```

## Creating Your Own Plugin

1. Create a JavaScript file that exports a plugin object:

```javascript
// my-plugin.js
export default {
  name: 'my',
  generators: {
    'hello': () => 'Hello!',
    'add': (args) => Number(args[0]) + Number(args[1]),
  }
};
```

2. Add it to your `vague.config.js`:

```javascript
export default {
  plugins: ['./my-plugin.js']
};
```

3. Use it in your `.vague` files:

```vague
schema Example {
  greeting: my.hello(),
  sum: my.add(10, 20)
}
```

## Plugin Options in Config

```javascript
export default {
  plugins: [
    './local-plugin.js',        // Local file
    'vague-plugin-foo',         // npm package
    { name: 'inline', ... }     // Inline plugin object
  ],
  seed: 42,                     // Default seed
  format: 'json',               // 'json' or 'csv'
  pretty: true                  // Pretty-print JSON
};
```
