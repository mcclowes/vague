import type { GeneratorContext } from './context.js';
import { createLogger } from '../logging/index.js';

const pluginLog = createLogger('plugin');

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

// Cache for generator lookups: generatorName -> { plugin, generator }
const generatorCache: Map<string, { plugin: VaguePlugin; generator: GeneratorFunction } | null> =
  new Map();

/**
 * Clear the generator cache.
 * Called automatically when plugins are registered.
 */
export function clearGeneratorCache(): void {
  generatorCache.clear();
  pluginLog.debug('Generator cache cleared');
}

/**
 * Register a plugin with the generator
 */
export function registerPlugin(plugin: VaguePlugin): void {
  pluginRegistry.set(plugin.name, plugin);
  clearGeneratorCache(); // Invalidate cache when plugins change
  pluginLog.debug('Plugin registered', {
    name: plugin.name,
    generators: Object.keys(plugin.generators).length,
  });
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
 * Look up a generator by name, using cache for efficiency.
 * Returns the cached generator function or null if not found.
 */
function lookupGenerator(
  name: string
): { plugin: VaguePlugin; generator: GeneratorFunction } | null {
  // Check cache first
  if (generatorCache.has(name)) {
    return generatorCache.get(name)!;
  }

  const parts = name.split('.');

  if (parts.length > 1) {
    // Qualified name like "internet.ipv6"
    const pluginName = parts[0];
    const generatorPath = parts.slice(1).join('.');
    const plugin = pluginRegistry.get(pluginName);
    if (plugin?.generators[generatorPath]) {
      const result = { plugin, generator: plugin.generators[generatorPath] };
      generatorCache.set(name, result);
      return result;
    }
    // Also check faker plugin with full path
    const fakerPlugin = pluginRegistry.get('faker');
    if (fakerPlugin?.generators[name]) {
      const result = { plugin: fakerPlugin, generator: fakerPlugin.generators[name] };
      generatorCache.set(name, result);
      return result;
    }
  }

  // Simple name - search all plugins
  for (const plugin of pluginRegistry.values()) {
    if (plugin.generators[name]) {
      const result = { plugin, generator: plugin.generators[name] };
      generatorCache.set(name, result);
      return result;
    }
  }

  // Cache the negative result too
  generatorCache.set(name, null);
  return null;
}

/**
 * Try to call a plugin generator by name.
 * Returns undefined if not found.
 * Uses caching for efficient repeated lookups.
 */
export function tryPluginGenerator(name: string, context: GeneratorContext): unknown | undefined {
  const lookup = lookupGenerator(name);
  if (lookup) {
    return lookup.generator([], context);
  }
  return undefined;
}

/**
 * Get a generator function by name without calling it.
 * Returns the generator function or undefined if not found.
 * Uses caching for efficient repeated lookups.
 */
export function getGenerator(name: string): GeneratorFunction | undefined {
  const lookup = lookupGenerator(name);
  return lookup?.generator;
}

/**
 * Call a plugin generator with arguments.
 * Throws if generator not found.
 * Uses caching for efficient repeated lookups.
 */
export function callGenerator(name: string, args: unknown[], context: GeneratorContext): unknown {
  const lookup = lookupGenerator(name);
  if (lookup) {
    return lookup.generator(args, context);
  }

  const parts = name.split('.');
  if (parts.length > 1) {
    const pluginName = parts[0];
    const generatorPath = parts.slice(1).join('.');
    if (pluginRegistry.has(pluginName)) {
      throw new Error(`Generator '${generatorPath}' not found in plugin '${pluginName}'`);
    }
    throw new Error(`Plugin '${pluginName}' not registered. Use registerPlugin() to register it.`);
  }

  throw new Error(
    `Generator '${name}' not found. Register a plugin that provides it using registerPlugin().`
  );
}
