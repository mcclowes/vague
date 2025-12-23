import { Token } from '../lexer/index.js';
import { Program, Statement } from '../ast/index.js';
import { StatementParser } from './statements.js';

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

  parse(): Program {
    const statements: Statement[] = [];

    while (!this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
    }

    return { type: 'Program', statements };
  }
}
