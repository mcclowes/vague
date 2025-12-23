import { Token } from '../lexer/index.js';
import { Program, Statement } from '../ast/index.js';
import { StatementParser } from './statements.js';
import { ParseError } from './errors.js';

/**
 * Result of parsing with error recovery enabled.
 * Contains both the (possibly partial) AST and any errors encountered.
 */
export interface ParseResult {
  /** The parsed program (may be partial if errors occurred) */
  program: Program;
  /** Parse errors encountered during parsing */
  errors: ParseError[];
  /** Whether parsing completed without errors */
  success: boolean;
}

/**
 * Main Parser class - orchestrates parsing of Vague source code.
 *
 * The parser is organized into a hierarchy:
 * - ParserBase (base.ts) - Token utilities (peek, match, consume, etc.)
 * - ExpressionParser (expressions.ts) - Expression parsing with precedence
 * - TypeParser (types.ts) - Field type parsing
 * - StatementParser (statements.ts) - Statement parsing
 * - Parser (this file) - Main entry point
 *
 * Precedence chain (lowest to highest):
 * ternary → or → and → not → superposition → comparison → range → additive → multiplicative → unary → call → primary
 */
export class Parser extends StatementParser {
  /**
   * Create a new parser.
   * @param tokens The tokens to parse
   * @param source Optional source code for error messages with snippets
   */
  constructor(tokens: Token[], source?: string) {
    super(tokens, source);
  }

  /**
   * Parse the token stream into an AST.
   * Throws on first error (default behavior).
   */
  parse(): Program {
    const statements: Statement[] = [];

    while (!this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
    }

    return { type: 'Program', statements };
  }

  /**
   * Parse with error recovery enabled.
   * Collects all errors and returns a partial AST alongside them.
   * This allows reporting multiple errors in a single parse.
   *
   * @example
   * ```typescript
   * const parser = new Parser(tokens, source);
   * const { program, errors, success } = parser.parseWithRecovery();
   * if (!success) {
   *   for (const error of errors) {
   *     console.error(error.format());
   *   }
   * }
   * ```
   */
  parseWithRecovery(): ParseResult {
    this.enableRecovery();
    const statements: Statement[] = [];

    while (!this.isAtEnd()) {
      try {
        const stmt = this.parseStatement();
        if (stmt) statements.push(stmt);
      } catch (e) {
        if (e instanceof ParseError) {
          this.recordError(e);
          this.synchronize();
        } else {
          // Re-throw non-parse errors (shouldn't happen, but be safe)
          throw e;
        }
      }
    }

    const program: Program = { type: 'Program', statements };
    const errors = this.getErrors();

    return {
      program,
      errors,
      success: errors.length === 0,
    };
  }
}
