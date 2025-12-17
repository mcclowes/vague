import { describe, it, expect, beforeAll } from 'vitest';
import { compile, registerPlugin } from '../index.js';
import { datesPlugin, datesShorthandPlugin } from './dates.js';

describe('Dates Plugin', () => {
  beforeAll(() => {
    registerPlugin(datesPlugin);
    registerPlugin(datesShorthandPlugin);
  });

  describe('Weekday generation', () => {
    it('generates weekday dates with dates.weekday()', async () => {
      const source = `
        schema Event {
          meeting_date: dates.weekday(2024, 2025)
        }

        dataset TestData {
          events: 20 * Event
        }
      `;

      const result = await compile(source);

      expect(result.events).toHaveLength(20);
      for (const event of result.events) {
        const e = event as Record<string, unknown>;
        expect(typeof e.meeting_date).toBe('string');

        const date = new Date(e.meeting_date as string);
        const dayOfWeek = date.getUTCDay(); // Use UTC to match ISO date output
        // Monday = 1, Tuesday = 2, ..., Friday = 5
        expect(dayOfWeek).toBeGreaterThanOrEqual(1);
        expect(dayOfWeek).toBeLessThanOrEqual(5);
      }
    });

    it('generates weekday dates with ISO string range', async () => {
      const source = `
        schema Event {
          meeting_date: dates.weekday("2024-06-01", "2024-06-30")
        }

        dataset TestData {
          events: 10 * Event
        }
      `;

      const result = await compile(source);

      expect(result.events).toHaveLength(10);
      for (const event of result.events) {
        const e = event as Record<string, unknown>;
        const dateStr = e.meeting_date as string;
        const date = new Date(dateStr);

        // Check it's a weekday
        const dayOfWeek = date.getUTCDay();
        expect(dayOfWeek).toBeGreaterThanOrEqual(1);
        expect(dayOfWeek).toBeLessThanOrEqual(5);

        // Check it's in June 2024
        expect(dateStr).toMatch(/^2024-06-/);
      }
    });

    it('generates weekday dates with shorthand weekday()', async () => {
      const source = `
        schema Event {
          meeting_date: weekday(2024, 2025)
        }

        dataset TestData {
          events: 10 * Event
        }
      `;

      const result = await compile(source);

      for (const event of result.events) {
        const e = event as Record<string, unknown>;
        const date = new Date(e.meeting_date as string);
        const dayOfWeek = date.getUTCDay();
        expect(dayOfWeek).toBeGreaterThanOrEqual(1);
        expect(dayOfWeek).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('Weekend generation', () => {
    it('generates weekend dates with dates.weekend()', async () => {
      const source = `
        schema Event {
          party_date: dates.weekend(2024, 2025)
        }

        dataset TestData {
          events: 20 * Event
        }
      `;

      const result = await compile(source);

      expect(result.events).toHaveLength(20);
      for (const event of result.events) {
        const e = event as Record<string, unknown>;
        expect(typeof e.party_date).toBe('string');

        const date = new Date(e.party_date as string);
        const dayOfWeek = date.getUTCDay();
        // Saturday = 6, Sunday = 0
        expect(dayOfWeek === 0 || dayOfWeek === 6).toBe(true);
      }
    });

    it('generates weekend dates with ISO string range', async () => {
      const source = `
        schema Event {
          party_date: dates.weekend("2024-03-01", "2024-03-31")
        }

        dataset TestData {
          events: 10 * Event
        }
      `;

      const result = await compile(source);

      expect(result.events).toHaveLength(10);
      for (const event of result.events) {
        const e = event as Record<string, unknown>;
        const dateStr = e.party_date as string;
        const date = new Date(dateStr);

        // Check it's a weekend
        const dayOfWeek = date.getUTCDay();
        expect(dayOfWeek === 0 || dayOfWeek === 6).toBe(true);

        // Check it's in March 2024
        expect(dateStr).toMatch(/^2024-03-/);
      }
    });

    it('generates weekend dates with shorthand weekend()', async () => {
      const source = `
        schema Event {
          party_date: weekend(2024, 2025)
        }

        dataset TestData {
          events: 10 * Event
        }
      `;

      const result = await compile(source);

      for (const event of result.events) {
        const e = event as Record<string, unknown>;
        const date = new Date(e.party_date as string);
        const dayOfWeek = date.getUTCDay();
        expect(dayOfWeek === 0 || dayOfWeek === 6).toBe(true);
      }
    });
  });

  describe('Day of week generation', () => {
    it('generates specific day of week with dates.dayOfWeek()', async () => {
      // Generate only Mondays (day 1)
      const source = `
        schema Event {
          monday_meeting: dates.dayOfWeek(1, 2024, 2025)
        }

        dataset TestData {
          events: 10 * Event
        }
      `;

      const result = await compile(source);

      expect(result.events).toHaveLength(10);
      for (const event of result.events) {
        const e = event as Record<string, unknown>;
        const date = new Date(e.monday_meeting as string);
        expect(date.getUTCDay()).toBe(1); // Monday
      }
    });

    it('generates Sundays with dates.dayOfWeek(0)', async () => {
      const source = `
        schema Event {
          sunday_brunch: dates.dayOfWeek(0, 2024, 2025)
        }

        dataset TestData {
          events: 10 * Event
        }
      `;

      const result = await compile(source);

      for (const event of result.events) {
        const e = event as Record<string, unknown>;
        const date = new Date(e.sunday_brunch as string);
        expect(date.getUTCDay()).toBe(0); // Sunday
      }
    });

    it('generates Saturdays with dates.dayOfWeek(6)', async () => {
      const source = `
        schema Event {
          saturday_event: dates.dayOfWeek(6, 2024, 2025)
        }

        dataset TestData {
          events: 10 * Event
        }
      `;

      const result = await compile(source);

      for (const event of result.events) {
        const e = event as Record<string, unknown>;
        const date = new Date(e.saturday_event as string);
        expect(date.getUTCDay()).toBe(6); // Saturday
      }
    });
  });

  describe('Weighted weekday/weekend distribution', () => {
    it('supports superposition for weighted distribution', async () => {
      const source = `
        schema Event {
          event_date: 0.5: dates.weekday(2024, 2025) | 0.5: dates.weekend(2024, 2025)
        }

        dataset TestData {
          events: 200 * Event
        }
      `;

      const result = await compile(source);

      expect(result.events).toHaveLength(200);

      let weekdayCount = 0;
      let weekendCount = 0;

      for (const event of result.events) {
        const e = event as Record<string, unknown>;
        const date = new Date(e.event_date as string);
        const dayOfWeek = date.getUTCDay();

        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          weekdayCount++;
        } else {
          weekendCount++;
        }
      }

      // With 50/50 split over 200 events, expect significant counts of both
      // Allow for statistical variance
      expect(weekdayCount).toBeGreaterThan(30);
      expect(weekendCount).toBeGreaterThan(30);
    });
  });

  describe('Integration with other field types', () => {
    it('works alongside regular vague fields', async () => {
      const source = `
        schema Meeting {
          id: int in 1..1000,
          title: string,
          scheduled_date: dates.weekday(2024, 2025),
          is_recurring: boolean,
          priority: "low" | "medium" | "high"
        }

        dataset TestData {
          meetings: 10 * Meeting
        }
      `;

      const result = await compile(source);

      expect(result.meetings).toHaveLength(10);
      for (const meeting of result.meetings) {
        const m = meeting as Record<string, unknown>;
        expect(typeof m.id).toBe('number');
        expect(typeof m.title).toBe('string');
        expect(typeof m.scheduled_date).toBe('string');
        expect(typeof m.is_recurring).toBe('boolean');
        expect(['low', 'medium', 'high']).toContain(m.priority);

        // Verify it's a weekday
        const date = new Date(m.scheduled_date as string);
        const dayOfWeek = date.getUTCDay();
        expect(dayOfWeek).toBeGreaterThanOrEqual(1);
        expect(dayOfWeek).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('Edge cases', () => {
    it('handles single year argument', async () => {
      const source = `
        schema Event {
          event_date: dates.weekday(2024)
        }

        dataset TestData {
          events: 5 * Event
        }
      `;

      const result = await compile(source);

      for (const event of result.events) {
        const e = event as Record<string, unknown>;
        const dateStr = e.event_date as string;
        expect(dateStr).toMatch(/^2024-/);

        const date = new Date(dateStr);
        const dayOfWeek = date.getUTCDay();
        expect(dayOfWeek).toBeGreaterThanOrEqual(1);
        expect(dayOfWeek).toBeLessThanOrEqual(5);
      }
    });

    it('handles no arguments (defaults to current year)', async () => {
      const source = `
        schema Event {
          event_date: dates.weekday()
        }

        dataset TestData {
          events: 5 * Event
        }
      `;

      const result = await compile(source);
      const currentYear = new Date().getFullYear();

      for (const event of result.events) {
        const e = event as Record<string, unknown>;
        const dateStr = e.event_date as string;
        expect(dateStr).toMatch(new RegExp(`^${currentYear}-`));

        const date = new Date(dateStr);
        const dayOfWeek = date.getUTCDay();
        expect(dayOfWeek).toBeGreaterThanOrEqual(1);
        expect(dayOfWeek).toBeLessThanOrEqual(5);
      }
    });
  });
});
