import { Token, TokenType } from '../lexer/index.js';

/**
 * Base parser class with token utilities.
 * All parser modules extend or use this for token manipulation.
 */
export class ParserBase {
  protected tokens: Token[];
  protected pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens.filter((t) => t.type !== TokenType.NEWLINE);
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
    throw this.error(message);
  }

  protected isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  protected error(message: string): Error {
    const token = this.peek();
    return new Error(`Parse error at line ${token.line}, column ${token.column}: ${message}`);
  }

  // Save/restore position for lookahead
  protected savePosition(): number {
    return this.pos;
  }

  protected restorePosition(saved: number): void {
    this.pos = saved;
  }
}
