/**
 * Utility functions for correlation detection.
 */

import { toValidIdentifier } from '../codegen.js';

/**
 * Check if a value is a valid date string
 */
export function isDateString(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Convert a value to a comparable number (handles dates)
 */
export function toComparableNumber(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      return date.getTime();
    }
  }
  return null;
}

/**
 * Format a condition for Vague output
 */
export function formatCondition(field: string, value: unknown): string {
  if (typeof value === 'string') {
    return `${field} == "${value}"`;
  }
  return `${field} == ${value}`;
}

/**
 * Format a multiplier as a nice string
 */
export function formatMultiplier(n: number): string {
  // Check for common fractions
  const commonFractions: [number, string][] = [
    [0.25, '0.25'],
    [0.5, '0.5'],
    [0.75, '0.75'],
    [0.1, '0.1'],
    [0.2, '0.2'],
    [0.15, '0.15'],
    [1.5, '1.5'],
    [2, '2'],
    [0.05, '0.05'],
  ];

  for (const [val, str] of commonFractions) {
    if (Math.abs(n - val) < 0.0001) {
      return str;
    }
  }

  // Round to reasonable precision
  if (Math.abs(n) < 1) {
    return n.toFixed(4).replace(/\.?0+$/, '');
  }
  return n.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * Sanitize a string containing field names, converting them to valid identifiers
 */
export function sanitizeFieldNames(str: string, originalFieldNames: string[]): string {
  let result = str;
  // Sort by length descending to match longer field names first
  const sortedNames = [...originalFieldNames].sort((a, b) => b.length - a.length);
  for (const name of sortedNames) {
    const sanitized = toValidIdentifier(name);
    if (name !== sanitized) {
      // Use word boundary-aware replacement
      result = result.split(name).join(sanitized);
    }
  }
  return result;
}

/**
 * Check if two field names are semantically similar (likely related data)
 */
export function isSemanticallySimilar(field1: string, field2: string): boolean {
  const f1 = field1.toLowerCase();
  const f2 = field2.toLowerCase();

  // Same field
  if (f1 === f2) return true;

  // Related terms
  const relatedGroups = [
    ['amount', 'total', 'price', 'cost', 'paid', 'due', 'grand'],
    ['start', 'end', 'begin', 'finish', 'from', 'to'],
    ['min', 'max', 'low', 'high'],
    ['date', 'time', 'day', 'month', 'year'],
    ['quantity', 'count', 'num', 'number'],
  ];

  for (const group of relatedGroups) {
    const f1Matches = group.some((term) => f1.includes(term));
    const f2Matches = group.some((term) => f2.includes(term));
    if (f1Matches && f2Matches) return true;
  }

  return false;
}

/**
 * Flip a comparison operator
 */
export function flipOperator(op: '<=' | '>=' | '<' | '>'): string {
  switch (op) {
    case '<=':
      return '>=';
    case '>=':
      return '<=';
    case '<':
      return '>';
    case '>':
      return '<';
  }
}
