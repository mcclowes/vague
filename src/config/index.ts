/**
 * Config module - handles vague.config.js loading
 */

export {
  type VagueConfig,
  type ResolvedConfig,
  type PluginSpec,
  type PluginLoadResult,
  type LoggingConfig,
  type LogLevel,
  type LogComponent,
  ConfigError,
  PluginLoadError,
} from './types.js';

export { findConfigFile, loadConfig, loadConfigFile, loadConfigFrom } from './loader.js';
