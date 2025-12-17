import { describe, it, expect, beforeAll } from 'vitest';
import { compile, registerPlugin } from '../index.js';
import { datePlugin, dateShorthandPlugin } from './date.js';

describe('Date Plugin', () => {
  beforeAll(() => {
    registerPlugin(datePlugin);
    registerPlugin(dateShorthandPlugin);
  });

  describe('Weekday generation', () => {
    it('generates weekday dates with date.weekday()', async () => {
      const source = `
        schema Event {
          meeting_date: date.weekday(2024, 2025)
        }

        dataset TestData {
          events: 20 of Event
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
          meeting_date: date.weekday("2024-06-01", "2024-06-30")
        }

        dataset TestData {
          events: 10 of Event
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
          events: 10 of Event
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
    it('generates weekend dates with date.weekend()', async () => {
      const source = `
        schema Event {
          party_date: date.weekend(2024, 2025)
        }

        dataset TestData {
          events: 20 of Event
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
          party_date: date.weekend("2024-03-01", "2024-03-31")
        }

        dataset TestData {
          events: 10 of Event
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
          events: 10 of Event
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
    it('generates specific day of week with date.dayOfWeek()', async () => {
      // Generate only Mondays (day 1)
      const source = `
        schema Event {
          monday_meeting: date.dayOfWeek(1, 2024, 2025)
        }

        dataset TestData {
          events: 10 of Event
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

    it('generates Sundays with date.dayOfWeek(0)', async () => {
      const source = `
        schema Event {
          sunday_brunch: date.dayOfWeek(0, 2024, 2025)
        }

        dataset TestData {
          events: 10 of Event
        }
      `;

      const result = await compile(source);

      for (const event of result.events) {
        const e = event as Record<string, unknown>;
        const date = new Date(e.sunday_brunch as string);
        expect(date.getUTCDay()).toBe(0); // Sunday
      }
    });

    it('generates Saturdays with date.dayOfWeek(6)', async () => {
      const source = `
        schema Event {
          saturday_event: date.dayOfWeek(6, 2024, 2025)
        }

        dataset TestData {
          events: 10 of Event
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
          event_date: 0.5: date.weekday(2024, 2025) | 0.5: date.weekend(2024, 2025)
        }

        dataset TestData {
          events: 200 of Event
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
          scheduled_date: date.weekday(2024, 2025),
          is_recurring: boolean,
          priority: "low" | "medium" | "high"
        }

        dataset TestData {
          meetings: 10 of Meeting
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
          event_date: date.weekday(2024)
        }

        dataset TestData {
          events: 5 of Event
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
          event_date: date.weekday()
        }

        dataset TestData {
          events: 5 of Event
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

  describe('Date arithmetic', () => {
    it('adds days to a date with date.days()', async () => {
      const source = `
        schema Invoice {
          issued_date: "2024-01-15",
          due_date: issued_date + date.days(30)
        }

        dataset TestData {
          invoices: 1 of Invoice
        }
      `;

      const result = await compile(source);
      const invoice = result.invoices[0] as Record<string, unknown>;

      expect(invoice.issued_date).toBe('2024-01-15');
      expect(invoice.due_date).toBe('2024-02-14');
    });

    it('subtracts days from a date with date.days()', async () => {
      const source = `
        schema Event {
          event_date: "2024-03-15",
          reminder_date: event_date - date.days(7)
        }

        dataset TestData {
          events: 1 of Event
        }
      `;

      const result = await compile(source);
      const event = result.events[0] as Record<string, unknown>;

      expect(event.event_date).toBe('2024-03-15');
      expect(event.reminder_date).toBe('2024-03-08');
    });

    it('adds weeks to a date with date.weeks()', async () => {
      const source = `
        schema Project {
          start_date: "2024-01-01",
          milestone_date: start_date + date.weeks(2)
        }

        dataset TestData {
          projects: 1 of Project
        }
      `;

      const result = await compile(source);
      const project = result.projects[0] as Record<string, unknown>;

      expect(project.start_date).toBe('2024-01-01');
      expect(project.milestone_date).toBe('2024-01-15');
    });

    it('adds months to a date with date.months()', async () => {
      const source = `
        schema Subscription {
          start_date: "2024-01-15",
          renewal_date: start_date + date.months(3)
        }

        dataset TestData {
          subscriptions: 1 of Subscription
        }
      `;

      const result = await compile(source);
      const sub = result.subscriptions[0] as Record<string, unknown>;

      expect(sub.start_date).toBe('2024-01-15');
      // 3 months = 90 days (approximate)
      expect(sub.renewal_date).toBe('2024-04-14');
    });

    it('adds years to a date with date.years()', async () => {
      const source = `
        schema Contract {
          signed_date: "2024-06-15",
          expiry_date: signed_date + date.years(1)
        }

        dataset TestData {
          contracts: 1 of Contract
        }
      `;

      const result = await compile(source);
      const contract = result.contracts[0] as Record<string, unknown>;

      expect(contract.signed_date).toBe('2024-06-15');
      // 1 year = 365 days (approximate)
      expect(contract.expiry_date).toBe('2025-06-15');
    });

    it('works with generated dates', async () => {
      const source = `
        schema Invoice {
          issued_date: date in 2024..2024,
          due_date: issued_date + date.days(30)
        }

        dataset TestData {
          invoices: 10 of Invoice
        }
      `;

      const result = await compile(source);

      for (const invoice of result.invoices) {
        const inv = invoice as Record<string, unknown>;
        const issued = new Date(inv.issued_date as string);
        const due = new Date(inv.due_date as string);

        // Due date should be 30 days after issued date
        const diffMs = due.getTime() - issued.getTime();
        const diffDays = diffMs / (24 * 60 * 60 * 1000);
        expect(diffDays).toBe(30);
      }
    });

    it('works in constraints', async () => {
      const source = `
        schema Invoice {
          issued_date: date in 2024..2024,
          due_date: date in 2024..2024,
          assume due_date >= issued_date,
          assume due_date <= issued_date + date.days(90)
        }

        dataset TestData {
          invoices: 20 of Invoice
        }
      `;

      const result = await compile(source);

      for (const invoice of result.invoices) {
        const inv = invoice as Record<string, unknown>;
        const issued = new Date(inv.issued_date as string);
        const due = new Date(inv.due_date as string);

        // Due date should be >= issued date
        expect(due >= issued).toBe(true);

        // Due date should be <= issued date + 90 days
        const maxDue = new Date(issued.getTime() + 90 * 24 * 60 * 60 * 1000);
        expect(due <= maxDue).toBe(true);
      }
    });
  });
});
