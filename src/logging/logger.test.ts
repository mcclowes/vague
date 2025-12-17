import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setLogLevel,
  getLogLevel,
  enableDebug,
  disableLogging,
  setComponents,
  enableAllComponents,
  setTimestamps,
  setColors,
  configureLogging,
  createLogger,
} from './logger.js';

describe('Logger', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Reset to default state
    setLogLevel('warn');
    enableAllComponents();
    setTimestamps(false);
    setColors(false);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('log levels', () => {
    it('respects log level settings', () => {
      const log = createLogger('generator');

      setLogLevel('error');
      log.error('error message');
      log.warn('warn message');
      log.info('info message');
      log.debug('debug message');

      // Only error should be logged
      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy.mock.calls[0][0]).toContain('[ERROR]');
    });

    it('logs all levels when set to debug', () => {
      const log = createLogger('generator');

      setLogLevel('debug');
      log.error('error');
      log.warn('warn');
      log.info('info');
      log.debug('debug');

      expect(consoleSpy).toHaveBeenCalledTimes(4);
    });

    it('disables all logging with none level', () => {
      const log = createLogger('generator');

      disableLogging();
      log.error('error');
      log.warn('warn');

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('enableDebug sets level to debug', () => {
      enableDebug();
      expect(getLogLevel()).toBe('debug');
    });
  });

  describe('component filtering', () => {
    it('filters by component', () => {
      const genLog = createLogger('generator');
      const constraintLog = createLogger('constraint');

      setLogLevel('debug');
      setComponents(['generator']);

      genLog.debug('generator message');
      constraintLog.debug('constraint message');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy.mock.calls[0][0]).toContain('[generator]');
    });

    it('allows all components when enableAllComponents is called', () => {
      const genLog = createLogger('generator');
      const constraintLog = createLogger('constraint');

      setLogLevel('debug');
      setComponents(['generator']);
      enableAllComponents();

      genLog.debug('generator');
      constraintLog.debug('constraint');

      expect(consoleSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('message formatting', () => {
    it('includes level and component in message', () => {
      const log = createLogger('validator');
      setLogLevel('warn');

      log.warn('test message');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[validator]'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test message'));
    });

    it('includes data in message', () => {
      const log = createLogger('generator');
      setLogLevel('warn');

      log.warn('message', { count: 5, name: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('count=5'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('name="test"'));
    });

    it('includes timestamp when enabled', () => {
      const log = createLogger('generator');
      setLogLevel('warn');
      setTimestamps(true);

      log.warn('message');

      // Timestamp format: [HH:mm:ss.sss]
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/)
      );
    });
  });

  describe('configureLogging', () => {
    it('configures from LoggingConfig object', () => {
      const log = createLogger('generator');

      configureLogging({
        level: 'debug',
        timestamps: true,
      });

      log.debug('test');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{2}:\d{2}:\d{2}\.\d{3}\]/)
      );
    });

    it('configures component filtering', () => {
      const genLog = createLogger('generator');
      const cliLog = createLogger('cli');

      configureLogging({
        level: 'debug',
        components: ['cli'],
      });

      genLog.debug('generator message');
      cliLog.debug('cli message');

      expect(consoleSpy).toHaveBeenCalledTimes(1);
      expect(consoleSpy.mock.calls[0][0]).toContain('[cli]');
    });
  });

  describe('isDebugEnabled', () => {
    it('returns true when debug logging is enabled', () => {
      const log = createLogger('generator');
      setLogLevel('debug');

      expect(log.isDebugEnabled()).toBe(true);
    });

    it('returns false when debug logging is disabled', () => {
      const log = createLogger('generator');
      setLogLevel('warn');

      expect(log.isDebugEnabled()).toBe(false);
    });

    it('returns false when component is filtered out', () => {
      const log = createLogger('generator');
      setLogLevel('debug');
      setComponents(['constraint']);

      expect(log.isDebugEnabled()).toBe(false);
    });
  });

  describe('time helper', () => {
    it('logs timing information when debug is enabled', async () => {
      const log = createLogger('generator');
      setLogLevel('debug');

      const done = log.time('test operation');
      await new Promise((resolve) => setTimeout(resolve, 10));
      done();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('test operation completed'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('duration='));
    });

    it('does not log when debug is disabled', () => {
      const log = createLogger('generator');
      setLogLevel('warn');

      const done = log.time('test operation');
      done();

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('all log levels', () => {
    it('error level works correctly', () => {
      const log = createLogger('parser');
      setLogLevel('error');

      log.error('error message', { code: 123 });

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[parser]'));
    });

    it('info level works correctly', () => {
      const log = createLogger('cli');
      setLogLevel('info');

      log.info('info message');

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[cli]'));
    });
  });
});
