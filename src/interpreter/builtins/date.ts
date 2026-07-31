import type { GeneratorContext } from '../context.js';
import { random } from '../random.js';
import { toNumber, toString } from '../../utils/type-guards.js';

/**
 * Date function handlers
 */
export const dateFunctions = {
  /**
   * now() - current ISO 8601 datetime
   */
  now(_args: unknown[], _context: GeneratorContext): string {
    return new Date().toISOString();
  },

  /**
   * today() - current date in YYYY-MM-DD format
   */
  today(_args: unknown[], _context: GeneratorContext): string {
    return new Date().toISOString().split('T')[0];
  },

  /**
   * datetime(min?, max?) - random datetime, optionally within range
   * min/max can be ISO strings or year numbers
   */
  datetime(args: unknown[], _context: GeneratorContext): string {
    const minArg = args[0];
    const maxArg = args[1];

    let minDate: Date;
    let maxDate: Date;

    if (minArg === undefined) {
      minDate = new Date(2020, 0, 1);
    } else if (typeof minArg === 'number') {
      minDate = new Date(minArg, 0, 1);
    } else {
      minDate = new Date(toString(minArg, ''));
    }

    if (maxArg === undefined) {
      maxDate = new Date();
    } else if (typeof maxArg === 'number') {
      maxDate = new Date(maxArg, 11, 31, 23, 59, 59);
    } else {
      maxDate = new Date(toString(maxArg, ''));
    }

    const date = new Date(minDate.getTime() + random() * (maxDate.getTime() - minDate.getTime()));
    return date.toISOString();
  },

  /**
   * daysAgo(n) - date n days in the past
   */
  daysAgo(args: unknown[], _context: GeneratorContext): string {
    const days = toNumber(args[0], 0);
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  },

  /**
   * daysFromNow(n) - date n days in the future
   */
  daysFromNow(args: unknown[], _context: GeneratorContext): string {
    const days = toNumber(args[0], 0);
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  },

  /**
   * dateBetween(start, end) - random date between two dates
   * start/end can be ISO strings, "today", or year numbers
   */
  dateBetween(args: unknown[], _context: GeneratorContext): string {
    const startArg = args[0];
    const endArg = args[1];

    let startDate: Date;
    let endDate: Date;

    if (startArg === 'today') {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    } else if (typeof startArg === 'number') {
      startDate = new Date(startArg, 0, 1);
    } else {
      startDate = new Date(toString(startArg, ''));
    }

    if (endArg === 'today') {
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
    } else if (typeof endArg === 'number') {
      endDate = new Date(endArg, 11, 31);
    } else {
      endDate = new Date(toString(endArg, ''));
    }

    const date = new Date(
      startDate.getTime() + random() * (endDate.getTime() - startDate.getTime())
    );
    return date.toISOString().split('T')[0];
  },

  /**
   * formatDate(date, format) - format a date string
   * Supports: YYYY, MM, DD, HH, mm, ss
   * Uses UTC for consistency with ISO date strings
   */
  formatDate(args: unknown[], _context: GeneratorContext): string {
    const dateStr = toString(args[0], '');
    const format = toString(args[1], 'YYYY-MM-DD');
    const date = new Date(dateStr);

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return format
      .replace('YYYY', String(year))
      .replace('MM', month)
      .replace('DD', day)
      .replace('HH', hours)
      .replace('mm', minutes)
      .replace('ss', seconds);
  },
};
