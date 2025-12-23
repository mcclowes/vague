import { Token, TokenType } from '../lexer/index.js';
import { ParseError, tokenTypeName } from './errors.js';

/** Token types that can start a new statement (synchronization points) */
const STATEMENT_STARTERS = new Set<TokenType | string>([
  TokenType.IMPORT,
  TokenType.LET,
  TokenType.SCHEMA,
  TokenType.CONTEXT,
  TokenType.DISTRIBUTION,
  TokenType.DATASET,
]);

/**
 * Base parser class with token utilities.
 * All parser modules extend or use this for token manipulation.
 */
export class ParserBase {
  protected tokens: Token[];
  protected pos = 0;
  protected source?: string;
  /** Collected parse errors when in recovery mode */
  protected errors: ParseError[] = [];
  /** Whether to recover from errors or throw immediately */
  protected recoveryMode = false;

  constructor(tokens: Token[], source?: string) {
    this.tokens = tokens.filter((t) => t.type !== TokenType.NEWLINE);
    this.source = source;
  }

  /**
   * Enable error recovery mode. When enabled, the parser will
   * collect errors and continue parsing instead of throwing.
   */
  enableRecovery(): void {
    this.recoveryMode = true;
  }

  /**
   * Get all collected parse errors.
   */
  getErrors(): ParseError[] {
    return [...this.errors];
  }

  /**
   * Check if any errors were collected.
   */
  hasErrors(): boolean {
    return this.errors.length > 0;
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

  /**
   * Record an error. In recovery mode, adds to error list.
   * In normal mode, throws immediately.
   */
  protected recordError(error: ParseError): void {
    if (this.recoveryMode) {
      this.errors.push(error);
    } else {
      throw error;
    }
  }

  /**
   * Synchronize the parser after an error by advancing to the next
   * statement boundary. This allows parsing to continue and collect
   * multiple errors.
   */
  protected synchronize(): void {
    this.advance();

    while (!this.isAtEnd()) {
      // If we just passed a closing brace, we might be at a statement boundary
      if (this.tokens[this.pos - 1]?.type === TokenType.RBRACE) {
        return;
      }

      // If we're at a statement starter, we can resume parsing
      if (STATEMENT_STARTERS.has(this.peek().type)) {
        return;
      }

      this.advance();
    }
  }

  // Save/restore position for lookahead
  protected savePosition(): number {
    return this.pos;
  }

  protected restorePosition(saved: number): void {
    this.pos = saved;
  }
}
