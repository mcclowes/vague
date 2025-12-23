/**
 * Tests for parser error recovery
 */
import { describe, it, expect } from 'vitest';
import { Lexer } from '../lexer/index.js';
import { Parser } from './parser.js';
import { ParseError } from './errors.js';

function parseWithRecovery(source: string) {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens, source);
  return parser.parseWithRecovery();
}

describe('Parser error recovery', () => {
  describe('parseWithRecovery', () => {
    it('returns success for valid input', () => {
      const source = `
        schema Invoice {
          id: int,
          name: string
        }
      `;
      const result = parseWithRecovery(source);

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(1);
    });

    it('collects single error and returns partial AST', () => {
      const source = `
        schema Invoice {
          id: int,
          name:
        }
        schema Customer {
          name: string
        }
      `;
      const result = parseWithRecovery(source);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(1);
      // Should still parse Customer schema
      expect(result.program.statements.length).toBeGreaterThanOrEqual(1);
    });

    it('collects multiple errors from different statements', () => {
      const source = `
        schema A {
          id:
        }
        schema B {
          name:
        }
        schema C {
          valid: string
        }
      `;
      const result = parseWithRecovery(source);

      expect(result.success).toBe(false);
      // Should have at least 2 errors (one for each broken schema)
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      // Should still parse schema C
      const schemaNames = result.program.statements
        .filter((s) => s.type === 'SchemaDefinition')
        .map((s) => (s as { name: string }).name);
      expect(schemaNames).toContain('C');
    });

    it('recovers at statement boundaries', () => {
      // Note: @ character would throw in lexer, so we test a parser error instead
      const source = `
        schema Broken {
          field: unknown_type_name
        }
        schema Valid { name: string }
      `;
      const result = parseWithRecovery(source);

      // Should parse Valid schema even if Broken has issues
      const schemaNames = result.program.statements
        .filter((s) => s.type === 'SchemaDefinition')
        .map((s) => (s as { name: string }).name);
      expect(schemaNames).toContain('Valid');
    });

    it('errors include location information', () => {
      const source = `schema Test {
  id:
}`;
      const result = parseWithRecovery(source);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);

      const error = result.errors[0];
      expect(error).toBeInstanceOf(ParseError);
      expect(error.line).toBeGreaterThan(0);
      expect(error.column).toBeGreaterThan(0);
    });

    it('errors can be formatted with source snippets', () => {
      const source = `schema Test {
  id:
}`;
      const result = parseWithRecovery(source);

      expect(result.success).toBe(false);
      const error = result.errors[0];
      const formatted = error.format();

      expect(formatted).toContain('Parse error');
      expect(formatted).toContain('line');
    });

    it('handles missing opening brace', () => {
      const source = `
        schema Invoice }
        schema Valid { name: string }
      `;
      const result = parseWithRecovery(source);

      expect(result.success).toBe(false);
      // Should still attempt to parse Valid
      const schemaNames = result.program.statements
        .filter((s) => s.type === 'SchemaDefinition')
        .map((s) => (s as { name: string }).name);
      expect(schemaNames).toContain('Valid');
    });

    it('handles missing closing brace', () => {
      const source = `
        schema Broken {
          id: int

        schema Valid { name: string }
      `;
      const result = parseWithRecovery(source);

      expect(result.success).toBe(false);
      // Parser should recover when it sees 'schema' keyword
    });

    it('handles empty source', () => {
      const result = parseWithRecovery('');

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.program.statements).toHaveLength(0);
    });

    it('handles multiple statement types', () => {
      const source = `
        let x =
        schema Test { id: int }
        dataset Data { items: 10 of Test }
      `;
      const result = parseWithRecovery(source);

      expect(result.success).toBe(false);
      // Should have error for incomplete let statement
      expect(result.errors.length).toBeGreaterThan(0);
      // Should still parse at least some statements (schema or dataset)
      expect(result.program.statements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('original parse() behavior', () => {
    it('still throws on first error by default', () => {
      const source = `schema Test { id: }`;
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens, source);

      expect(() => parser.parse()).toThrow(ParseError);
    });

    it('works normally for valid input', () => {
      const source = `schema Test { id: int }`;
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens, source);
      const program = parser.parse();

      expect(program.statements).toHaveLength(1);
    });
  });
});
