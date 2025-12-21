import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  registerPlugin,
  unregisterPlugin,
  getRegisteredPlugins,
  clearGeneratorCache,
  type VaguePlugin,
  type ParserContext,
} from './plugin.js';
import { registerKeyword, unregisterKeyword, clearPluginKeywords } from '../lexer/index.js';
import {
  registerStatementParser,
  unregisterStatementParser,
  clearStatementParsers,
} from '../parser/index.js';
import { Lexer } from '../lexer/index.js';
import { Parser } from '../parser/index.js';
import type { Statement, LetStatement } from '../ast/index.js';

describe('Plugin system', () => {
  beforeEach(() => {
    // Clean up any registered plugins/keywords from previous tests
    clearPluginKeywords();
    clearStatementParsers();
    clearGeneratorCache();
  });

  afterEach(() => {
    // Clean up after each test
    clearPluginKeywords();
    clearStatementParsers();
    clearGeneratorCache();
  });

  describe('keyword registration', () => {
    it('registers and unregisters keywords', () => {
      registerKeyword('mission', 'MISSION');

      const lexer = new Lexer('mission test');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe('MISSION');
      expect(tokens[0].value).toBe('mission');

      unregisterKeyword('mission');

      const lexer2 = new Lexer('mission test');
      const tokens2 = lexer2.tokenize();

      // Now 'mission' should be an identifier
      expect(tokens2[0].type).toBe('IDENTIFIER');
    });

    it('does not override built-in keywords', () => {
      // 'schema' is a built-in keyword
      registerKeyword('schema', 'CUSTOM_SCHEMA');

      const lexer = new Lexer('schema Test');
      const tokens = lexer.tokenize();

      // Should still be the built-in SCHEMA token
      expect(tokens[0].type).toBe('SCHEMA');
    });

    it('clears all plugin keywords', () => {
      registerKeyword('foo', 'FOO');
      registerKeyword('bar', 'BAR');

      clearPluginKeywords();

      const lexer = new Lexer('foo bar');
      const tokens = lexer.tokenize();

      expect(tokens[0].type).toBe('IDENTIFIER');
      expect(tokens[1].type).toBe('IDENTIFIER');
    });
  });

  describe('statement parser registration', () => {
    it('registers and calls custom statement parser', () => {
      // Register a custom 'note' keyword and parser
      registerKeyword('note', 'NOTE');

      const noteParser = (ctx: ParserContext): Statement => {
        ctx.advance(); // consume 'note'
        const value = ctx.consume('STRING', 'Expected string after note');
        return {
          type: 'LetStatement',
          name: '__note__',
          value: { type: 'Literal', value: value.value, dataType: 'string' },
        } as LetStatement;
      };

      registerStatementParser('NOTE', noteParser);

      const source = 'note "hello world"';
      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const program = parser.parse();

      expect(program.statements).toHaveLength(1);
      expect(program.statements[0].type).toBe('LetStatement');
      expect((program.statements[0] as LetStatement).name).toBe('__note__');
    });

    it('unregisters statement parser', () => {
      registerKeyword('note', 'NOTE');
      registerStatementParser('NOTE', () => ({
        type: 'LetStatement',
        name: 'test',
        value: { type: 'Literal', value: 'test', dataType: 'string' },
      }));

      unregisterStatementParser('NOTE');

      const lexer = new Lexer('note "test"');
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);

      // Should throw because NOTE token has no handler
      expect(() => parser.parse()).toThrow();
    });
  });

  describe('full plugin registration', () => {
    it('registers plugin with generators only', () => {
      const plugin: VaguePlugin = {
        name: 'test-generators',
        generators: {
          hello: () => 'world',
          greet: (args) => `Hello, ${args[0]}!`,
        },
      };

      registerPlugin(plugin);

      expect(getRegisteredPlugins()).toContain('test-generators');

      unregisterPlugin('test-generators');

      expect(getRegisteredPlugins()).not.toContain('test-generators');
    });

    it('registers plugin with keywords and statements', () => {
      const plugin: VaguePlugin = {
        name: 'test-syntax',
        keywords: [{ keyword: 'custom', tokenType: 'CUSTOM' }],
        statements: {
          CUSTOM: (ctx: ParserContext): Statement => {
            ctx.advance(); // consume 'custom'
            const name = ctx.consume('IDENTIFIER', 'Expected identifier');
            return {
              type: 'LetStatement',
              name: name.value,
              value: { type: 'Literal', value: 'custom-value', dataType: 'string' },
            };
          },
        },
      };

      registerPlugin(plugin);

      // Test that keyword is registered
      const lexer = new Lexer('custom myVar');
      const tokens = lexer.tokenize();
      expect(tokens[0].type).toBe('CUSTOM');

      // Test that statement parser works
      const parser = new Parser(tokens);
      const program = parser.parse();
      expect(program.statements).toHaveLength(1);
      expect((program.statements[0] as LetStatement).name).toBe('myVar');

      // Cleanup should remove both
      unregisterPlugin('test-syntax');

      const lexer2 = new Lexer('custom myVar');
      const tokens2 = lexer2.tokenize();
      expect(tokens2[0].type).toBe('IDENTIFIER');
    });

    it('unregistering unknown plugin does nothing', () => {
      expect(() => unregisterPlugin('nonexistent')).not.toThrow();
    });
  });

  describe('ParserContext API', () => {
    it('provides working peek and check', () => {
      registerKeyword('test', 'TEST');

      let capturedCtx: ParserContext | null = null;
      registerStatementParser('TEST', (ctx) => {
        capturedCtx = ctx;

        expect(ctx.peek().type).toBe('TEST');
        expect(ctx.check('TEST')).toBe(true);
        expect(ctx.check('IDENTIFIER')).toBe(false);

        ctx.advance();
        return {
          type: 'LetStatement',
          name: '_',
          value: { type: 'Literal', value: null, dataType: 'null' },
        };
      });

      const lexer = new Lexer('test');
      const parser = new Parser(lexer.tokenize());
      parser.parse();

      expect(capturedCtx).not.toBeNull();
    });

    it('provides working match and consume', () => {
      registerKeyword('cmd', 'CMD');

      registerStatementParser('CMD', (ctx) => {
        expect(ctx.match('CMD')).toBe(true); // consumes CMD
        expect(ctx.match('CMD')).toBe(false); // already consumed

        const id = ctx.consume('IDENTIFIER', 'Expected identifier');
        expect(id.value).toBe('foo');

        return {
          type: 'LetStatement',
          name: id.value,
          value: { type: 'Literal', value: 'bar', dataType: 'string' },
        };
      });

      const lexer = new Lexer('cmd foo');
      const parser = new Parser(lexer.tokenize());
      const program = parser.parse();

      expect((program.statements[0] as LetStatement).name).toBe('foo');
    });

    it('provides working parseExpression', () => {
      registerKeyword('expr', 'EXPR');

      registerStatementParser('EXPR', (ctx) => {
        ctx.advance(); // consume 'expr'
        const expr = ctx.parseExpression();

        return {
          type: 'LetStatement',
          name: '_expr',
          value: expr,
        };
      });

      const lexer = new Lexer('expr 1 + 2');
      const parser = new Parser(lexer.tokenize());
      const program = parser.parse();

      const stmt = program.statements[0] as LetStatement;
      expect(stmt.value.type).toBe('BinaryExpression');
    });

    it('error creates proper error message', () => {
      registerKeyword('fail', 'FAIL');

      registerStatementParser('FAIL', (ctx) => {
        ctx.advance();
        throw ctx.error('Custom error message');
      });

      const lexer = new Lexer('fail');
      const parser = new Parser(lexer.tokenize());

      expect(() => parser.parse()).toThrow('Custom error message');
    });
  });
});
