/**
 * Logging utility for Vague
 *
 * Provides structured logging with log levels and component prefixes.
 * Configure via:
 * - vague.config.js: logging: { level: 'debug', components: ['generator'] }
 * - CLI: --debug or --log-level flags
 * - Environment: VAGUE_DEBUG=1 or VAGUE_DEBUG=generator,constraint
 * - Programmatic: setLogLevel('debug') or configureLogging({ level: 'debug' })
 */

import type { LogLevel, LogComponent, LoggingConfig } from '../config/types.js';

// Numeric log levels for comparison
export enum LogLevelNum {
  NONE = 0,
  ERROR = 1,
  WARN = 2,
  INFO = 3,
  DEBUG = 4,
}

// Map string levels to numeric
const levelToNum: Record<LogLevel, LogLevelNum> = {
  none: LogLevelNum.NONE,
  error: LogLevelNum.ERROR,
  warn: LogLevelNum.WARN,
  info: LogLevelNum.INFO,
  debug: LogLevelNum.DEBUG,
};

// Map numeric levels to string names for output
const levelNames: Record<LogLevelNum, string> = {
  [LogLevelNum.NONE]: '',
  [LogLevelNum.ERROR]: 'ERROR',
  [LogLevelNum.WARN]: 'WARN',
  [LogLevelNum.INFO]: 'INFO',
  [LogLevelNum.DEBUG]: 'DEBUG',
};

interface LoggerConfig {
  level: LogLevelNum;
  components: Set<LogComponent> | null; // null = all components
  timestamps: boolean;
  colors: boolean;
}

const config: LoggerConfig = {
  level: LogLevelNum.WARN, // Default: only warnings and errors
  components: null, // All components enabled by default
  timestamps: false,
  colors: process.stdout.isTTY ?? false,
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
};

const levelColors: Record<LogLevelNum, string> = {
  [LogLevelNum.NONE]: '',
  [LogLevelNum.ERROR]: colors.red,
  [LogLevelNum.WARN]: colors.yellow,
  [LogLevelNum.INFO]: colors.blue,
  [LogLevelNum.DEBUG]: colors.gray,
};

/**
 * Configure logging from a LoggingConfig object (from vague.config.js)
 */
export function configureLogging(loggingConfig: LoggingConfig): void {
  if (loggingConfig.level !== undefined) {
    config.level = levelToNum[loggingConfig.level];
  }

  if (loggingConfig.components !== undefined) {
    config.components = new Set(loggingConfig.components);
  } else {
    config.components = null;
  }

  if (loggingConfig.timestamps !== undefined) {
    config.timestamps = loggingConfig.timestamps;
  }

  if (loggingConfig.colors !== undefined) {
    config.colors = loggingConfig.colors;
  }
}

/**
 * Set the global log level using string level name
 */
export function setLogLevel(level: LogLevel): void {
  config.level = levelToNum[level];
}

/**
 * Get the current log level as string
 */
export function getLogLevel(): LogLevel {
  const entries = Object.entries(levelToNum) as [LogLevel, LogLevelNum][];
  for (const [name, num] of entries) {
    if (num === config.level) return name;
  }
  return 'warn';
}

/**
 * Enable debug logging (convenience function)
 */
export function enableDebug(): void {
  config.level = LogLevelNum.DEBUG;
  config.timestamps = true;
}

/**
 * Disable all logging
 */
export function disableLogging(): void {
  config.level = LogLevelNum.NONE;
}

/**
 * Enable logging for specific components only
 */
export function setComponents(components: LogComponent[]): void {
  config.components = new Set(components);
}

/**
 * Enable all components
 */
export function enableAllComponents(): void {
  config.components = null;
}

/**
 * Enable/disable timestamps in log output
 */
export function setTimestamps(enabled: boolean): void {
  config.timestamps = enabled;
}

/**
 * Enable/disable colors in log output
 */
export function setColors(enabled: boolean): void {
  config.colors = enabled;
}

/**
 * Initialize logging from environment variables
 * Called automatically on import
 */
export function initFromEnv(): void {
  const vagueDebug = process.env.VAGUE_DEBUG;
  const debug = process.env.DEBUG;

  if (vagueDebug === '1' || vagueDebug === 'true') {
    config.level = LogLevelNum.DEBUG;
    config.timestamps = true;
  } else if (debug?.includes('vague')) {
    config.level = LogLevelNum.DEBUG;
    config.timestamps = true;
  }

  // Support component filtering: VAGUE_DEBUG=generator,constraint
  if (vagueDebug && vagueDebug !== '1' && vagueDebug !== 'true') {
    const parts = vagueDebug.split(',').map((s) => s.trim()) as LogComponent[];
    if (parts.length > 0 && parts.every((p) => isValidComponent(p))) {
      config.components = new Set(parts);
      config.level = LogLevelNum.DEBUG;
      config.timestamps = true;
    }
  }
}

function isValidComponent(s: string): s is LogComponent {
  return [
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
  ].includes(s);
}

function formatMessage(
  level: LogLevelNum,
  component: LogComponent,
  message: string,
  data?: Record<string, unknown>
): string {
  const parts: string[] = [];

  if (config.timestamps) {
    const ts = new Date().toISOString().substring(11, 23); // HH:mm:ss.sss
    parts.push(config.colors ? `${colors.gray}[${ts}]${colors.reset}` : `[${ts}]`);
  }

  const levelName = levelNames[level];
  if (config.colors) {
    parts.push(`${levelColors[level]}[${levelName}]${colors.reset}`);
    parts.push(`${colors.cyan}[${component}]${colors.reset}`);
  } else {
    parts.push(`[${levelName}]`);
    parts.push(`[${component}]`);
  }

  parts.push(message);

  if (data && Object.keys(data).length > 0) {
    const dataStr = Object.entries(data)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(' ');
    parts.push(config.colors ? `${colors.gray}${dataStr}${colors.reset}` : dataStr);
  }

  return parts.join(' ');
}

function shouldLog(level: LogLevelNum, component: LogComponent): boolean {
  if (config.level < level) return false;
  if (config.components !== null && !config.components.has(component)) return false;
  return true;
}

/**
 * Create a logger for a specific component
 */
export function createLogger(component: LogComponent) {
  return {
    error(message: string, data?: Record<string, unknown>): void {
      if (shouldLog(LogLevelNum.ERROR, component)) {
        console.error(formatMessage(LogLevelNum.ERROR, component, message, data));
      }
    },

    warn(message: string, data?: Record<string, unknown>): void {
      if (shouldLog(LogLevelNum.WARN, component)) {
        console.error(formatMessage(LogLevelNum.WARN, component, message, data));
      }
    },

    info(message: string, data?: Record<string, unknown>): void {
      if (shouldLog(LogLevelNum.INFO, component)) {
        console.error(formatMessage(LogLevelNum.INFO, component, message, data));
      }
    },

    debug(message: string, data?: Record<string, unknown>): void {
      if (shouldLog(LogLevelNum.DEBUG, component)) {
        console.error(formatMessage(LogLevelNum.DEBUG, component, message, data));
      }
    },

    /**
     * Log with timing - returns a function to call when done
     */
    time(label: string): () => void {
      if (!shouldLog(LogLevelNum.DEBUG, component)) {
        return () => {};
      }
      const start = performance.now();
      return () => {
        const duration = performance.now() - start;
        console.error(
          formatMessage(LogLevelNum.DEBUG, component, `${label} completed`, {
            duration: `${duration.toFixed(2)}ms`,
          })
        );
      };
    },

    /**
     * Check if debug logging is enabled for this component
     */
    isDebugEnabled(): boolean {
      return shouldLog(LogLevelNum.DEBUG, component);
    },
  };
}

// Initialize from environment on import
initFromEnv();

// Export a default logger for general use
export const logger = createLogger('generator');

// Re-export types for convenience
export type { LogLevel, LogComponent, LoggingConfig } from '../config/types.js';
