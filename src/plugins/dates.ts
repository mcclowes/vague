/**
 * Dates plugin for Vague
 *
 * Provides generators for weekday/weekend-weighted date generation.
 *
 * Usage in .vague files:
 *   schema Event {
 *     // Generate dates that are weekdays only
 *     meeting_date: dates.weekday(2024, 2025)
 *
 *     // Generate dates that are weekends only
 *     party_date: dates.weekend(2024, 2025)
 *
 *     // With ISO string ranges
 *     event_date: dates.weekday("2024-01-01", "2024-12-31")
 *   }
 *
 * Or with shorthand names:
 *   schema Event {
 *     meeting_date: weekday(2024, 2025)
 *     party_date: weekend(2024, 2025)
 *   }
 *
 * Combine with superposition for weighted weekday/weekend distribution:
 *   schema Event {
 *     // 80% weekdays, 20% weekends
 *     event_date: 0.8: dates.weekday(2024, 2025) | 0.2: dates.weekend(2024, 2025)
 *   }
 */

import type { VaguePlugin, GeneratorFunction } from '../interpreter/generator.js';
import { random } from '../interpreter/random.js';

// Helper to create a generator from a function
function wrap<T>(fn: (...args: unknown[]) => T): GeneratorFunction {
  return (args) => fn(...args);
}

/**
 * Parse date arguments - supports both year numbers and ISO strings
 */
function parseDateRange(startArg: unknown, endArg: unknown): { start: Date; end: Date } {
  let start: Date;
  let end: Date;

  if (typeof startArg === 'number') {
    // Year-based: dates.weekday(2024, 2025)
    start = new Date(startArg, 0, 1); // Jan 1
    end = new Date((endArg as number) ?? startArg, 11, 31); // Dec 31
  } else if (typeof startArg === 'string') {
    // ISO string: dates.weekday("2024-01-01", "2024-12-31")
    start = new Date(startArg);
    end = new Date((endArg as string) ?? startArg);
  } else {
    // Default to current year
    const year = new Date().getFullYear();
    start = new Date(year, 0, 1);
    end = new Date(year, 11, 31);
  }

  return { start, end };
}

/**
 * Generate a random date within range, optionally filtered by day-of-week
 * Uses UTC consistently to avoid timezone issues
 */
function generateDateWithFilter(
  startArg: unknown,
  endArg: unknown,
  filter: (dayOfWeek: number) => boolean,
  maxRetries = 1000
): string {
  const { start, end } = parseDateRange(startArg, endArg);
  const startTime = start.getTime();
  const endTime = end.getTime();

  for (let i = 0; i < maxRetries; i++) {
    const time = startTime + random() * (endTime - startTime);
    const date = new Date(time);
    const dayOfWeek = date.getUTCDay(); // Use UTC to match toISOString output

    if (filter(dayOfWeek)) {
      return date.toISOString().split('T')[0];
    }
  }

  // Fallback: if random sampling fails, iterate to find valid date
  const msPerDay = 24 * 60 * 60 * 1000;
  const totalDays = Math.floor((endTime - startTime) / msPerDay);
  const startOffset = Math.floor(random() * totalDays);

  for (let offset = 0; offset <= totalDays; offset++) {
    const checkOffset = (startOffset + offset) % (totalDays + 1);
    const date = new Date(startTime + checkOffset * msPerDay);
    const dayOfWeek = date.getUTCDay(); // Use UTC to match toISOString output

    if (filter(dayOfWeek)) {
      return date.toISOString().split('T')[0];
    }
  }

  // Should never reach here if range has at least 7 days
  throw new Error('No valid date found in range');
}

/**
 * Generate a weekday (Monday-Friday) date
 */
function generateWeekday(startArg?: unknown, endArg?: unknown): string {
  return generateDateWithFilter(
    startArg,
    endArg,
    (day) => day >= 1 && day <= 5 // Monday = 1, Friday = 5
  );
}

/**
 * Generate a weekend (Saturday-Sunday) date
 */
function generateWeekend(startArg?: unknown, endArg?: unknown): string {
  return generateDateWithFilter(
    startArg,
    endArg,
    (day) => day === 0 || day === 6 // Sunday = 0, Saturday = 6
  );
}

/**
 * Generate a date on a specific day of the week
 * @param dayOfWeek 0 = Sunday, 1 = Monday, ... 6 = Saturday
 */
function generateDayOfWeek(dayArg: unknown, startArg?: unknown, endArg?: unknown): string {
  const targetDay = typeof dayArg === 'number' ? dayArg : parseInt(String(dayArg), 10);

  if (targetDay < 0 || targetDay > 6 || isNaN(targetDay)) {
    throw new Error('dayOfWeek must be 0-6 (0=Sunday, 6=Saturday)');
  }

  return generateDateWithFilter(startArg, endArg, (day) => day === targetDay);
}

// ============================================
// Plugin Definition
// ============================================

export const datesPlugin: VaguePlugin = {
  name: 'dates',
  generators: {
    weekday: wrap(generateWeekday),
    weekend: wrap(generateWeekend),
    dayOfWeek: wrap(generateDayOfWeek),
  },
};

/**
 * Shorthand generators that don't require the "dates." prefix
 */
export const datesShorthandPlugin: VaguePlugin = {
  name: 'dates-shorthand',
  generators: {
    weekday: wrap(generateWeekday),
    weekend: wrap(generateWeekend),
  },
};

export default datesPlugin;
