import { Token, TokenType } from '../lexer/index.js';
import { ParseError, tokenTypeName } from './errors.js';

/**
 * Base parser class with token utilities.
 * All parser modules extend or use this for token manipulation.
 */
export class ParserBase {
  protected tokens: Token[];
  protected pos = 0;
  protected source?: string;

  constructor(tokens: Token[], source?: string) {
    this.tokens = tokens.filter((t) => t.type !== TokenType.NEWLINE);
    this.source = source;
  }

  protected peek(): Token {
    return this.tokens[this.pos];
  }

  protected check(type: TokenType | string): boolean {
    return !this.isAtEnd() && this.peek().type === type;
  }

  protected match(type: TokenType | string): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  protected advance(): Token {
    if (!this.isAtEnd()) this.pos++;
    return this.tokens[this.pos - 1];
  }

  protected consume(type: TokenType | string, message: string): Token {
    if (this.check(type)) return this.advance();
    throw this.error(message, { expected: tokenTypeName(type) });
  }

  protected isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  protected error(message: string, options?: { expected?: string; context?: string }): ParseError {
    const token = this.peek();
    return new ParseError(message, token, {
      source: this.source,
      expected: options?.expected,
      context: options?.context,
    });
  }

  // Save/restore position for lookahead
  protected savePosition(): number {
    return this.pos;
  }

  protected restorePosition(saved: number): void {
    this.pos = saved;
  }
}
