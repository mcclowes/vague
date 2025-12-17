/**
 * Logging module - provides structured logging with levels and component filtering
 */

export {
  createLogger,
  configureLogging,
  setLogLevel,
  getLogLevel,
  enableDebug,
  disableLogging,
  setComponents,
  enableAllComponents,
  setTimestamps,
  setColors,
  initFromEnv,
  logger,
  LogLevelNum,
  type LogLevel,
  type LogComponent,
  type LoggingConfig,
} from './logger.js';
