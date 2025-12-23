#!/usr/bin/env node

/**
 * Vague CLI - Declarative test data generator.
 *
 * This is the main entry point that orchestrates the various CLI handlers.
 */

import { registerPlugin } from './index.js';
import {
  fakerPlugin,
  fakerShorthandPlugin,
  datePlugin,
  dateShorthandPlugin,
  issuerPlugin,
  issuerShorthandPlugin,
  regexPlugin,
  regexShorthandPlugin,
  graphqlPlugin,
  graphqlShorthandPlugin,
  httpPlugin,
  httpShorthandPlugin,
  discoverPlugins,
} from './plugins/index.js';
import { loadConfig, loadConfigFrom, type ResolvedConfig } from './config/index.js';
import {
  createLogger,
  configureLogging,
  setLogLevel,
  enableDebug,
  setTimestamps,
} from './logging/index.js';
import {
  parseArgs,
  showHelp,
  handleLint,
  handleInfer,
  handleValidate,
  handleCompile,
  handleServe,
} from './cli/index.js';

// Create CLI logger
const log = createLogger('cli');

// Built-in plugins (registered after config plugins to allow overrides)
const builtinPlugins = [
  fakerPlugin,
  fakerShorthandPlugin,
  datePlugin,
  dateShorthandPlugin,
  issuerPlugin,
  issuerShorthandPlugin,
  regexPlugin,
  regexShorthandPlugin,
  graphqlPlugin,
  graphqlShorthandPlugin,
  httpPlugin,
  httpShorthandPlugin,
];

async function main() {
  const args = process.argv.slice(2);

  // Handle help
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  // Parse command line arguments
  const options = parseArgs(args);

  // Discover and register external plugins
  if (options.autoPlugins || options.pluginDirs.length > 0) {
    const discovered = await discoverPlugins({
      pluginDirs: options.pluginDirs,
      searchNodeModules: options.autoPlugins,
      verbose: options.verbose,
    });
    for (const { plugin } of discovered) {
      registerPlugin(plugin);
    }
  }

  // Load config file (unless disabled)
  let config: ResolvedConfig | null = null;
  if (!options.noConfig) {
    try {
      config = options.configFile ? await loadConfigFrom(options.configFile) : await loadConfig();
      if (config) {
        // Register plugins from config first (they can be overridden by built-ins)
        for (const plugin of config.plugins) {
          registerPlugin(plugin);
        }
        if (config.configPath) {
          console.error(`Loaded config from ${config.configPath}`);
        }
      }
    } catch (err) {
      console.error(`Error loading config: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }
  }

  // Register built-in plugins (after config plugins so they take precedence)
  for (const plugin of builtinPlugins) {
    registerPlugin(plugin);
  }

  // Configure logging (config first, then CLI overrides)
  if (config?.logging) {
    configureLogging(config.logging);
    log.debug('Applied logging config from file', { configPath: config.configPath });
  }

  // CLI logging flags take precedence over config
  if (options.debugMode) {
    enableDebug();
    log.info('Debug logging enabled via --debug flag');
  } else if (options.logLevelArg) {
    setLogLevel(options.logLevelArg);
    if (options.logLevelArg === 'info' || options.logLevelArg === 'debug') {
      setTimestamps(true);
    }
    log.debug('Log level set via --log-level flag', { level: options.logLevelArg });
  }

  // Apply config defaults (CLI flags take precedence)
  if (config) {
    if (options.seed === null && config.seed !== undefined) {
      options.seed = config.seed;
    }
    if (options.outputFormat === 'json' && config.format !== undefined) {
      options.outputFormat = config.format;
    }
    if (!options.pretty && config.pretty !== undefined) {
      options.pretty = config.pretty;
    }
  }

  try {
    // Route to appropriate handler based on mode
    if (options.servePort !== null) {
      await handleServe(options);
    } else if (options.lintSpecFile) {
      await handleLint(options);
    } else if (options.inferFile) {
      await handleInfer(options);
    } else if (options.validateDataFile) {
      await handleValidate(options);
    } else {
      await handleCompile(options);
    }
  } catch (err) {
    console.error('Error:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
