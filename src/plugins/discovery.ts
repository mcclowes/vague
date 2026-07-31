import { readdir, stat, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { VaguePlugin } from '../interpreter/generator.js';

/**
 * Options for plugin discovery
 */
export interface DiscoverOptions {
  /** Custom directories to search for plugins */
  pluginDirs?: string[];
  /** Whether to search node_modules for vague-plugin-* packages */
  searchNodeModules?: boolean;
  /** Working directory (defaults to process.cwd()) */
  cwd?: string;
  /** Whether to log discovered plugins */
  verbose?: boolean;
}

/**
 * Result of plugin discovery
 */
export interface DiscoveredPlugin {
  /** The plugin object */
  plugin: VaguePlugin;
  /** Where the plugin was loaded from */
  source: string;
}

/**
 * Check if a value is a valid VaguePlugin
 */
function isVaguePlugin(value: unknown): value is VaguePlugin {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.name === 'string' &&
    obj.name.length > 0 &&
    typeof obj.generators === 'object' &&
    obj.generators !== null
  );
}

/**
 * Try to load a plugin from a file path
 */
async function loadPluginFromFile(filePath: string): Promise<VaguePlugin | null> {
  try {
    // Convert to file URL for dynamic import
    const fileUrl = pathToFileURL(filePath).href;
    const module = (await import(fileUrl)) as Record<string, unknown>;

    // Check for default export
    if (isVaguePlugin(module.default)) {
      return module.default;
    }

    // Check for named 'plugin' export
    if (isVaguePlugin(module.plugin)) {
      return module.plugin;
    }

    // Check for any export that looks like a plugin
    for (const key of Object.keys(module)) {
      if (isVaguePlugin(module[key])) {
        return module[key] as VaguePlugin;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a directory exists
 */
async function directoryExists(dir: string): Promise<boolean> {
  try {
    const stats = await stat(dir);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a file exists
 */
async function fileExists(file: string): Promise<boolean> {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * Discover plugins from a directory
 */
async function discoverFromDirectory(dir: string): Promise<DiscoveredPlugin[]> {
  const results: DiscoveredPlugin[] = [];

  if (!(await directoryExists(dir))) {
    return results;
  }

  try {
    const entries = await readdir(dir);

    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stats = await stat(fullPath);

      if (stats.isFile() && (entry.endsWith('.js') || entry.endsWith('.mjs'))) {
        // Load JS/MJS files directly
        const plugin = await loadPluginFromFile(fullPath);
        if (plugin) {
          results.push({ plugin, source: fullPath });
        }
      } else if (stats.isDirectory()) {
        // Check for index.js or package.json in subdirectory
        const indexPath = join(fullPath, 'index.js');
        const mjsIndexPath = join(fullPath, 'index.mjs');

        if (await fileExists(indexPath)) {
          const plugin = await loadPluginFromFile(indexPath);
          if (plugin) {
            results.push({ plugin, source: fullPath });
          }
        } else if (await fileExists(mjsIndexPath)) {
          const plugin = await loadPluginFromFile(mjsIndexPath);
          if (plugin) {
            results.push({ plugin, source: fullPath });
          }
        }
      }
    }
  } catch {
    // Directory read failed, return empty
  }

  return results;
}

/**
 * Discover plugins from node_modules (vague-plugin-* packages)
 */
async function discoverFromNodeModules(cwd: string): Promise<DiscoveredPlugin[]> {
  const results: DiscoveredPlugin[] = [];
  const nodeModulesPath = join(cwd, 'node_modules');

  if (!(await directoryExists(nodeModulesPath))) {
    return results;
  }

  try {
    const entries = await readdir(nodeModulesPath);

    for (const entry of entries) {
      // Look for packages starting with 'vague-plugin-'
      if (entry.startsWith('vague-plugin-')) {
        const pkgPath = join(nodeModulesPath, entry);
        const pkgJsonPath = join(pkgPath, 'package.json');

        if (await fileExists(pkgJsonPath)) {
          try {
            // Read package.json to find main entry point
            const { readFile } = await import('node:fs/promises');
            const pkgJson = JSON.parse(await readFile(pkgJsonPath, 'utf-8')) as {
              main?: string;
              exports?: string | { '.': string | { import?: string; default?: string } };
            };

            // Determine entry point
            let entryPoint = 'index.js';
            if (pkgJson.main) {
              entryPoint = pkgJson.main;
            } else if (typeof pkgJson.exports === 'string') {
              entryPoint = pkgJson.exports;
            } else if (pkgJson.exports && typeof pkgJson.exports['.'] === 'string') {
              entryPoint = pkgJson.exports['.'];
            } else if (
              pkgJson.exports &&
              typeof pkgJson.exports['.'] === 'object' &&
              pkgJson.exports['.'].import
            ) {
              entryPoint = pkgJson.exports['.'].import;
            }

            const entryPath = join(pkgPath, entryPoint);
            if (await fileExists(entryPath)) {
              const plugin = await loadPluginFromFile(entryPath);
              if (plugin) {
                results.push({ plugin, source: pkgPath });
              }
            }
          } catch {
            // Failed to load this package, continue
          }
        }
      }
    }
  } catch {
    // node_modules read failed, return empty
  }

  return results;
}

/**
 * Discover and load plugins from various locations
 *
 * By default, searches:
 * - ./vague-plugins/ directory
 * - ./plugins/ directory
 * - node_modules/vague-plugin-* packages
 *
 * @param options Discovery options
 * @returns Array of discovered plugins
 */
export async function discoverPlugins(options: DiscoverOptions = {}): Promise<DiscoveredPlugin[]> {
  const {
    pluginDirs = [],
    searchNodeModules = true,
    cwd = process.cwd(),
    verbose = false,
  } = options;

  const results: DiscoveredPlugin[] = [];

  // Search custom plugin directories
  for (const dir of pluginDirs) {
    const resolvedDir = resolve(cwd, dir);
    const plugins = await discoverFromDirectory(resolvedDir);
    results.push(...plugins);
  }

  // Search default directories
  const defaultDirs = ['vague-plugins', 'plugins'];
  for (const dir of defaultDirs) {
    const resolvedDir = resolve(cwd, dir);
    const plugins = await discoverFromDirectory(resolvedDir);
    results.push(...plugins);
  }

  // Search node_modules
  if (searchNodeModules) {
    const plugins = await discoverFromNodeModules(cwd);
    results.push(...plugins);
  }

  if (verbose && results.length > 0) {
    console.error(`Discovered ${results.length} plugin(s):`);
    for (const { plugin, source } of results) {
      console.error(`  - ${plugin.name} (from ${source})`);
    }
  }

  return results;
}
