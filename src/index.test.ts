import { describe, it, expect } from 'vitest';
import { vague } from './index.js';

describe('vague tagged template', () => {
  it('generates data from template literal', async () => {
    const result = await vague`
      schema Person {
        name: string
      }
      dataset Test {
        people: 3 * Person
      }
    `;

    expect(result.people).toHaveLength(3);
    expect(result.people[0]).toHaveProperty('name');
  });

  it('supports interpolation', async () => {
    const count = 5;
    const result = await vague`
      schema Item {
        value: int
      }
      dataset Test {
        items: ${count} * Item
      }
    `;

    expect(result.items).toHaveLength(5);
  });

  it('produces deterministic output with seed option', async () => {
    const result1 = await vague({ seed: 42 })`
      schema Person {
        age: int in 18..65
      }
      dataset Test {
        people: 10 * Person
      }
    `;

    const result2 = await vague({ seed: 42 })`
      schema Person {
        age: int in 18..65
      }
      dataset Test {
        people: 10 * Person
      }
    `;

    expect(result1).toEqual(result2);
  });

  it('produces different output with different seeds', async () => {
    const result1 = await vague({ seed: 1 })`
      schema Person {
        age: int in 18..65
      }
      dataset Test {
        people: 10 * Person
      }
    `;

    const result2 = await vague({ seed: 2 })`
      schema Person {
        age: int in 18..65
      }
      dataset Test {
        people: 10 * Person
      }
    `;

    expect(result1).not.toEqual(result2);
  });

  it('supports typed results with generics', async () => {
    interface Invoice {
      id: number;
      status: string;
    }

    const result = await vague<{ invoices: Invoice[] }>({ seed: 123 })`
      schema Invoice {
        id: int in 1000..9999,
        status: "draft" | "sent" | "paid"
      }
      dataset Test {
        invoices: 5 * Invoice
      }
    `;

    expect(result.invoices).toHaveLength(5);
    expect(typeof result.invoices[0].id).toBe('number');
    expect(['draft', 'sent', 'paid']).toContain(result.invoices[0].status);
  });

  it('interpolation works with seed', async () => {
    const count = 3;
    const result1 = await vague({ seed: 99 })`
      schema Item { value: int in 1..100 }
      dataset Test { items: ${count} * Item }
    `;

    const result2 = await vague({ seed: 99 })`
      schema Item { value: int in 1..100 }
      dataset Test { items: ${count} * Item }
    `;

    expect(result1).toEqual(result2);
    expect(result1.items).toHaveLength(3);
  });
});
