/**
 * Example vague.config.js
 *
 * This config file is automatically loaded by the Vague CLI.
 * It can specify plugins, default seed, output format, and more.
 */

export default {
  // Plugins to load - can be local files, npm packages, or inline objects
  plugins: [
    // Local plugin file (relative to this config file)
    './my-plugin.js',

    // You can also define plugins inline
    {
      name: 'inline',
      generators: {
        timestamp: () => new Date().toISOString(),
        random: (args) => {
          const [min = 0, max = 100] = args.map(Number);
          return Math.floor(Math.random() * (max - min + 1)) + min;
        },
      },
    },

    // npm packages would be listed like:
    // 'vague-plugin-stripe',
    // '@my-org/vague-plugin-custom',
  ],

  // Default seed for reproducible output (can be overridden with --seed)
  seed: 12345,

  // Default output format: 'json' or 'csv'
  format: 'json',

  // Pretty-print JSON output by default
  pretty: true,
};
