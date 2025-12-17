/**
 * Example custom Vague plugin
 *
 * This plugin demonstrates how to create custom generators.
 * Generators receive an array of arguments and a context object.
 */

export default {
  name: 'my',
  generators: {
    // Simple generator with no arguments
    greeting: () => 'Hello from custom plugin!',

    // Generator with arguments
    repeat: (args) => {
      const [text, count] = args;
      return String(text).repeat(Number(count) || 1);
    },

    // Generator that returns structured data
    coordinates: () => ({
      lat: Math.random() * 180 - 90,
      lng: Math.random() * 360 - 180,
    }),

    // Namespaced generator (accessed as my.user.id in .vague files)
    'user.id': () => `user_${Math.random().toString(36).slice(2, 10)}`,

    // Generator using context (access to other fields, parent, etc.)
    contextDemo: (_args, context) => {
      // context.current contains the current record being generated
      // context.parent contains the parent record (for nested schemas)
      // context.collections contains all generated collections so far
      return `Generated at index with context available`;
    },
  },
};
