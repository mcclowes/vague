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
  type RetryLimits,
  DEFAULT_RETRY_LIMITS,
  ConfigError,
  PluginLoadError,
} from './types.js';

export { findConfigFile, loadConfig, loadConfigFile, loadConfigFrom } from './loader.js';
