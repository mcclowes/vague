/**
 * Config file loader for vague.config.js
 */

import { existsSync } from 'node:fs';
import { resolve, dirname, join, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { VaguePlugin } from '../interpreter/plugin.js';
import {
  type VagueConfig,
  type ResolvedConfig,
  type PluginSpec,
  type LogLevel,
  type LogComponent,
  ConfigError,
  PluginLoadError,
} from './types.js';

const VALID_LOG_LEVELS: LogLevel[] = ['none', 'error', 'warn', 'info', 'debug'];
const VALID_LOG_COMPONENTS: LogComponent[] = [
  'lexer',
  'parser',
  'generator',
  'constraint',
  'validator',
  'plugin',
  'cli',
  'openapi',
  'infer',
  'config',
];

const CONFIG_FILENAMES = ['vague.config.js', 'vague.config.mjs', 'vague.config.cjs'];

/**
 * Find config file by searching current directory and parent directories
 */
export function findConfigFile(startDir: string = process.cwd()): string | null {
  let currentDir = resolve(startDir);
  const root = dirname(currentDir);

  while (currentDir !== root) {
    for (const filename of CONFIG_FILENAMES) {
      const configPath = join(currentDir, filename);
      if (existsSync(configPath)) {
        return configPath;
      }
    }
    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) break;
    currentDir = parentDir;
  }

  // Check root directory
  for (const filename of CONFIG_FILENAMES) {
    const configPath = join(currentDir, filename);
    if (existsSync(configPath)) {
      return configPath;
    }
  }

  return null;
}

/**
 * Check if a value is a valid VaguePlugin object
 */
function isVaguePlugin(value: unknown): value is VaguePlugin {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as VaguePlugin).name === 'string' &&
    typeof (value as VaguePlugin).generators === 'object' &&
    (value as VaguePlugin).generators !== null
  );
}

/**
 * Load a single plugin from a spec (path or package name)
 */
async function loadPluginFromSpec(
  spec: PluginSpec,
  configDir: string
): Promise<VaguePlugin | VaguePlugin[]> {
  // If it's already a plugin object, return it directly
  if (isVaguePlugin(spec)) {
    return spec;
  }

  if (typeof spec !== 'string') {
    throw new PluginLoadError(
      `Invalid plugin spec: expected string path or VaguePlugin object`,
      String(spec)
    );
  }

  // Resolve the path
  let resolvedPath: string;

  if (spec.startsWith('./') || spec.startsWith('../') || isAbsolute(spec)) {
    // Local file path - resolve relative to config file
    resolvedPath = isAbsolute(spec) ? spec : resolve(configDir, spec);

    if (!existsSync(resolvedPath)) {
      throw new PluginLoadError(`Plugin file not found: ${resolvedPath}`, spec);
    }
  } else {
    // npm package name - try to resolve from node_modules
    try {
      // Try to resolve the package from the config directory
      const { createRequire } = await import('node:module');
      const require = createRequire(join(configDir, 'package.json'));
      resolvedPath = require.resolve(spec);
    } catch {
      throw new PluginLoadError(
        `Could not resolve plugin package "${spec}". Make sure it's installed.`,
        spec
      );
    }
  }

  // Dynamic import the module
  try {
    const moduleUrl = pathToFileURL(resolvedPath).href;
    const module = (await import(moduleUrl)) as Record<string, unknown>;

    // Look for the plugin export
    // Support: default export, named 'plugin' export, or the module itself
    const plugin = module.default ?? module.plugin ?? module;

    if (isVaguePlugin(plugin)) {
      return plugin;
    }

    // Check if it exports multiple plugins (array)
    if (Array.isArray(plugin)) {
      const plugins: VaguePlugin[] = [];
      for (const p of plugin) {
        if (isVaguePlugin(p)) {
          plugins.push(p);
        }
      }
      if (plugins.length > 0) {
        return plugins;
      }
    }

    // Check for named exports that are plugins
    const plugins: VaguePlugin[] = [];
    for (const [key, value] of Object.entries(module)) {
      if (key !== 'default' && isVaguePlugin(value)) {
        plugins.push(value);
      }
    }
    if (plugins.length > 0) {
      return plugins;
    }

    throw new PluginLoadError(
      `Module "${spec}" does not export a valid VaguePlugin. ` +
        `Expected an object with 'name' (string) and 'generators' (object) properties.`,
      spec
    );
  } catch (err) {
    if (err instanceof PluginLoadError) {
      throw err;
    }
    throw new PluginLoadError(
      `Failed to load plugin "${spec}": ${err instanceof Error ? err.message : String(err)}`,
      spec,
      err instanceof Error ? err : undefined
    );
  }
}

/**
 * Load and validate config file
 */
export async function loadConfigFile(configPath: string): Promise<VagueConfig> {
  if (!existsSync(configPath)) {
    throw new ConfigError(`Config file not found: ${configPath}`, configPath);
  }

  try {
    const moduleUrl = pathToFileURL(resolve(configPath)).href;
    const module = (await import(moduleUrl)) as Record<string, unknown>;

    const config = (module.default ?? module) as VagueConfig;

    // Basic validation
    if (typeof config !== 'object' || config === null) {
      throw new ConfigError(`Config file must export an object`, configPath);
    }

    // Validate plugins array if present
    if (config.plugins !== undefined && !Array.isArray(config.plugins)) {
      throw new ConfigError(`'plugins' must be an array`, configPath);
    }

    // Validate seed if present
    if (config.seed !== undefined && typeof config.seed !== 'number') {
      throw new ConfigError(`'seed' must be a number`, configPath);
    }

    // Validate format if present
    if (config.format !== undefined && config.format !== 'json' && config.format !== 'csv') {
      throw new ConfigError(`'format' must be 'json' or 'csv'`, configPath);
    }

    // Validate pretty if present
    if (config.pretty !== undefined && typeof config.pretty !== 'boolean') {
      throw new ConfigError(`'pretty' must be a boolean`, configPath);
    }

    // Validate logging config if present
    if (config.logging !== undefined) {
      if (typeof config.logging !== 'object' || config.logging === null) {
        throw new ConfigError(`'logging' must be an object`, configPath);
      }

      if (config.logging.level !== undefined && !VALID_LOG_LEVELS.includes(config.logging.level)) {
        throw new ConfigError(
          `'logging.level' must be one of: ${VALID_LOG_LEVELS.join(', ')}`,
          configPath
        );
      }

      if (config.logging.components !== undefined) {
        if (!Array.isArray(config.logging.components)) {
          throw new ConfigError(`'logging.components' must be an array`, configPath);
        }
        for (const comp of config.logging.components) {
          if (!VALID_LOG_COMPONENTS.includes(comp)) {
            throw new ConfigError(
              `Invalid logging component '${comp}'. Must be one of: ${VALID_LOG_COMPONENTS.join(', ')}`,
              configPath
            );
          }
        }
      }

      if (
        config.logging.timestamps !== undefined &&
        typeof config.logging.timestamps !== 'boolean'
      ) {
        throw new ConfigError(`'logging.timestamps' must be a boolean`, configPath);
      }

      if (config.logging.colors !== undefined && typeof config.logging.colors !== 'boolean') {
        throw new ConfigError(`'logging.colors' must be a boolean`, configPath);
      }
    }

    return config;
  } catch (err) {
    if (err instanceof ConfigError) {
      throw err;
    }
    throw new ConfigError(
      `Failed to load config file: ${err instanceof Error ? err.message : String(err)}`,
      configPath
    );
  }
}

/**
 * Load config and resolve all plugins
 */
export async function loadConfig(configPath?: string): Promise<ResolvedConfig | null> {
  // Find config file if not specified
  const resolvedConfigPath = configPath ?? findConfigFile();

  if (!resolvedConfigPath) {
    return null;
  }

  const config = await loadConfigFile(resolvedConfigPath);
  const configDir = dirname(resolve(resolvedConfigPath));

  // Load all plugins
  const plugins: VaguePlugin[] = [];

  if (config.plugins) {
    for (const spec of config.plugins) {
      const loaded = await loadPluginFromSpec(spec, configDir);
      if (Array.isArray(loaded)) {
        plugins.push(...loaded);
      } else {
        plugins.push(loaded);
      }
    }
  }

  return {
    plugins,
    seed: config.seed,
    format: config.format,
    pretty: config.pretty,
    logging: config.logging,
    configPath: resolvedConfigPath,
  };
}

/**
 * Load config with a specific file path (no searching)
 */
export async function loadConfigFrom(configPath: string): Promise<ResolvedConfig> {
  const config = await loadConfigFile(configPath);
  const configDir = dirname(resolve(configPath));

  const plugins: VaguePlugin[] = [];

  if (config.plugins) {
    for (const spec of config.plugins) {
      const loaded = await loadPluginFromSpec(spec, configDir);
      if (Array.isArray(loaded)) {
        plugins.push(...loaded);
      } else {
        plugins.push(loaded);
      }
    }
  }

  return {
    plugins,
    seed: config.seed,
    format: config.format,
    pretty: config.pretty,
    logging: config.logging,
    configPath,
  };
}
