/**
 * Config module - handles vague.config.js loading
 */

export {
  type VagueConfig,
  type ResolvedConfig,
  type PluginSpec,
  type PluginLoadResult,
  ConfigError,
  PluginLoadError,
} from './types.js';

export { findConfigFile, loadConfig, loadConfigFile, loadConfigFrom } from './loader.js';
