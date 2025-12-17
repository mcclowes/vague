/**
 * Configuration types for vague.config.js
 */

import type { VaguePlugin } from '../interpreter/plugin.js';

/**
 * Plugin specification - can be:
 * - A string path to a JS/TS file (relative or absolute)
 * - A string npm package name
 * - A VaguePlugin object directly
 */
export type PluginSpec = string | VaguePlugin;

/**
 * Log level for debug output
 */
export type LogLevel = 'none' | 'error' | 'warn' | 'info' | 'debug';

/**
 * Log component for filtering debug output
 */
export type LogComponent =
  | 'lexer'
  | 'parser'
  | 'generator'
  | 'constraint'
  | 'validator'
  | 'plugin'
  | 'cli'
  | 'openapi'
  | 'infer'
  | 'config';

/**
 * Logging configuration
 */
export interface LoggingConfig {
  /**
   * Log level: none, error, warn, info, debug
   * Default: 'warn'
   */
  level?: LogLevel;

  /**
   * Filter logs to specific components.
   * If not specified, all components are logged.
   */
  components?: LogComponent[];

  /**
   * Include timestamps in log output.
   * Default: false (true when level is 'debug')
   */
  timestamps?: boolean;

  /**
   * Enable colored output.
   * Default: true if stdout is a TTY
   */
  colors?: boolean;
}

/**
 * Vague configuration file schema
 */
export interface VagueConfig {
  /**
   * Plugins to load. Can be:
   * - Local file paths (relative to config file): "./my-plugin.js"
   * - npm package names: "vague-plugin-stripe"
   * - Plugin objects directly (when using JS config)
   */
  plugins?: PluginSpec[];

  /**
   * Default seed for reproducible generation.
   * Can be overridden by CLI --seed flag.
   */
  seed?: number;

  /**
   * Default output format.
   * Can be overridden by CLI --format flag.
   */
  format?: 'json' | 'csv';

  /**
   * Pretty-print JSON output by default.
   * Can be overridden by CLI --pretty flag.
   */
  pretty?: boolean;

  /**
   * Logging/debug configuration.
   * Can be overridden by CLI --debug or --log-level flags.
   */
  logging?: LoggingConfig;
}

/**
 * Resolved configuration with all plugins loaded
 */
export interface ResolvedConfig {
  plugins: VaguePlugin[];
  seed?: number;
  format?: 'json' | 'csv';
  pretty?: boolean;
  logging?: LoggingConfig;
  configPath?: string;
}

/**
 * Result of loading a plugin
 */
export interface PluginLoadResult {
  plugin: VaguePlugin;
  source: string; // path or package name
}

/**
 * Error thrown when config loading fails
 */
export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly configPath?: string
  ) {
    super(message);
    this.name = 'ConfigError';
  }
}

/**
 * Error thrown when plugin loading fails
 */
export class PluginLoadError extends Error {
  constructor(
    message: string,
    public readonly pluginSpec: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'PluginLoadError';
  }
}
