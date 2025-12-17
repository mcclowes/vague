import type { GeneratorContext } from './context.js';

/**
 * A generator function that can be registered with a plugin.
 * Receives evaluated arguments and the generator context.
 */
export type GeneratorFunction = (args: unknown[], context: GeneratorContext) => unknown;

/**
 * A plugin that provides custom generators.
 */
export interface VaguePlugin {
  name: string;
  generators: Record<string, GeneratorFunction>;
}

// Global plugin registry
const pluginRegistry: Map<string, VaguePlugin> = new Map();

/**
 * Register a plugin with the generator
 */
export function registerPlugin(plugin: VaguePlugin): void {
  pluginRegistry.set(plugin.name, plugin);
}

/**
 * Get all registered plugins
 */
export function getRegisteredPlugins(): string[] {
  return Array.from(pluginRegistry.keys());
}

/**
 * Get the plugin registry (for internal use)
 */
export function getPluginRegistry(): Map<string, VaguePlugin> {
  return pluginRegistry;
}

/**
 * Try to call a plugin generator by name.
 * Returns undefined if not found.
 */
export function tryPluginGenerator(name: string, context: GeneratorContext): unknown | undefined {
  const parts = name.split('.');

  if (parts.length > 1) {
    // Qualified name like "internet.ipv6"
    const pluginName = parts[0];
    const generatorPath = parts.slice(1).join('.');
    const plugin = pluginRegistry.get(pluginName);
    if (plugin?.generators[generatorPath]) {
      return plugin.generators[generatorPath]([], context);
    }
    // Also check faker plugin with full path
    const fakerPlugin = pluginRegistry.get('faker');
    if (fakerPlugin?.generators[name]) {
      return fakerPlugin.generators[name]([], context);
    }
  }

  // Simple name - search all plugins
  for (const plugin of pluginRegistry.values()) {
    if (plugin.generators[name]) {
      return plugin.generators[name]([], context);
    }
  }
  return undefined;
}
