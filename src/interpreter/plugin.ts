import type { GeneratorContext } from './context.js';
import type { Statement, Expression } from '../ast/index.js';
import type { Token } from '../lexer/index.js';
import { registerKeyword, unregisterKeyword } from '../lexer/index.js';
import { registerStatementParser, unregisterStatementParser } from '../parser/index.js';
import { createLogger } from '../logging/index.js';

const pluginLog = createLogger('plugin');

/**
 * A generator function that can be registered with a plugin.
 * Receives evaluated arguments and the generator context.
 */
export type GeneratorFunction = (args: unknown[], context: GeneratorContext) => unknown;

/**
 * Parser context provided to statement parsers.
 * This is a subset of parser functionality that plugins can use.
 */
export interface ParserContext {
  /** Peek at current token without consuming */
  peek(): Token;
  /** Check if current token matches type */
  check(type: string): boolean;
  /** Consume a token of expected type, or throw */
  consume(type: string, message: string): Token;
  /** Match and consume if current token matches type */
  match(type: string): boolean;
  /** Advance to next token, returning current */
  advance(): Token;
  /** Check if at end of input */
  isAtEnd(): boolean;
  /** Create a parse error */
  error(message: string): Error;
  /** Parse an expression (delegates to core parser) */
  parseExpression(): Expression;
}

/**
 * A function that parses a custom statement type.
 * Called when the registered token type is encountered.
 */
export type StatementParserFunction = (ctx: ParserContext) => Statement;

/**
 * Custom keyword/token definition for a plugin.
 */
export interface PluginKeyword {
  /** The keyword string (e.g., 'mission', 'fetch') */
  keyword: string;
  /** The token type name (e.g., 'MISSION', 'FETCH') */
  tokenType: string;
}

/**
 * A plugin that provides custom generators and/or language extensions.
 */
export interface VaguePlugin {
  name: string;
  /** Custom generator functions */
  generators?: Record<string, GeneratorFunction>;
  /** Custom keywords to register with the lexer */
  keywords?: PluginKeyword[];
  /** Custom statement parsers, keyed by token type */
  statements?: Record<string, StatementParserFunction>;
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
 * Register a plugin with all its extensions (generators, keywords, statements).
 */
export function registerPlugin(plugin: VaguePlugin): void {
  pluginRegistry.set(plugin.name, plugin);
  clearGeneratorCache(); // Invalidate cache when plugins change

  // Register keywords with the lexer
  if (plugin.keywords) {
    for (const kw of plugin.keywords) {
      registerKeyword(kw.keyword, kw.tokenType);
    }
  }

  // Register statement parsers
  if (plugin.statements) {
    for (const [tokenType, parser] of Object.entries(plugin.statements)) {
      registerStatementParser(tokenType, parser);
    }
  }

  pluginLog.debug('Plugin registered', {
    name: plugin.name,
    generators: Object.keys(plugin.generators ?? {}).length,
    keywords: plugin.keywords?.length ?? 0,
    statements: Object.keys(plugin.statements ?? {}).length,
  });
}

/**
 * Unregister a plugin and all its extensions.
 */
export function unregisterPlugin(name: string): void {
  const plugin = pluginRegistry.get(name);
  if (!plugin) return;

  // Unregister keywords
  if (plugin.keywords) {
    for (const kw of plugin.keywords) {
      unregisterKeyword(kw.keyword);
    }
  }

  // Unregister statement parsers
  if (plugin.statements) {
    for (const tokenType of Object.keys(plugin.statements)) {
      unregisterStatementParser(tokenType);
    }
  }

  pluginRegistry.delete(name);
  clearGeneratorCache();
  pluginLog.debug('Plugin unregistered', { name });
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
    if (plugin?.generators?.[generatorPath]) {
      const result = { plugin, generator: plugin.generators[generatorPath] };
      generatorCache.set(name, result);
      return result;
    }
    // Also check faker plugin with full path
    const fakerPlugin = pluginRegistry.get('faker');
    if (fakerPlugin?.generators?.[name]) {
      const result = { plugin: fakerPlugin, generator: fakerPlugin.generators[name] };
      generatorCache.set(name, result);
      return result;
    }
  }

  // Simple name - search all plugins
  for (const plugin of pluginRegistry.values()) {
    if (plugin.generators?.[name]) {
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
