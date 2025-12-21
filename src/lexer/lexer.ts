import { Token, TokenType, KEYWORDS } from './tokens.js';

export class Lexer {
  private source: string;
  private pos = 0;
  private line = 1;
  private column = 1;

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (!this.isAtEnd()) {
      const token = this.nextToken();
      if (token) {
        tokens.push(token);
      }
    }

    tokens.push(this.makeToken(TokenType.EOF, ''));
    return tokens;
  }

  private nextToken(): Token | null {
    this.skipWhitespace();

    if (this.isAtEnd()) return null;

    const char = this.peek();

    // Skip comments
    if (char === '/' && this.peekNext() === '/') {
      this.skipLineComment();
      return null;
    }

    // Newlines (significant for statement termination)
    if (char === '\n') {
      const token = this.makeToken(TokenType.NEWLINE, '\n');
      this.advance();
      this.line++;
      this.column = 1;
      return token;
    }

    // String literals
    if (char === '"') return this.readString();

    // Numbers
    if (this.isDigit(char)) return this.readNumber();

    // Identifiers and keywords
    if (this.isAlpha(char)) return this.readIdentifier();

    // Operators and delimiters
    return this.readOperator();
  }

  private readString(): Token {
    const startColumn = this.column;
    this.advance(); // consume opening quote

    // Use array for efficient string building (avoids O(n²) concatenation)
    const chars: string[] = [];
    while (!this.isAtEnd() && this.peek() !== '"') {
      if (this.peek() === '\\') {
        this.advance();
        const escaped = this.advance();
        switch (escaped) {
          case 'n':
            chars.push('\n');
            break;
          case 't':
            chars.push('\t');
            break;
          case '\\':
            chars.push('\\');
            break;
          case '"':
            chars.push('"');
            break;
          default:
            chars.push(escaped);
        }
      } else {
        chars.push(this.advance());
      }
    }

    if (this.isAtEnd()) {
      throw new Error(`Unterminated string at line ${this.line}`);
    }

    this.advance(); // consume closing quote
    return {
      type: TokenType.STRING,
      value: chars.join(''),
      line: this.line,
      column: startColumn,
    };
  }

  private readNumber(): Token {
    const startColumn = this.column;
    // Use array for efficient string building
    const chars: string[] = [];

    while (this.isDigit(this.peek())) {
      chars.push(this.advance());
    }

    // Handle decimals
    if (this.peek() === '.' && this.isDigit(this.peekNext())) {
      chars.push(this.advance()); // consume '.'
      while (this.isDigit(this.peek())) {
        chars.push(this.advance());
      }
    }

    // Handle underscores in numbers (e.g., 100_000)
    const value = chars.join('').replace(/_/g, '');

    return {
      type: TokenType.NUMBER,
      value,
      line: this.line,
      column: startColumn,
    };
  }

  private readIdentifier(): Token {
    const startColumn = this.column;
    // Use array for efficient string building
    const chars: string[] = [];

    while (this.isAlphaNumeric(this.peek()) || this.peek() === '_') {
      chars.push(this.advance());
    }

    const value = chars.join('');
    const type = KEYWORDS[value] ?? TokenType.IDENTIFIER;
    return { type, value, line: this.line, column: startColumn };
  }

  private readOperator(): Token {
    const startColumn = this.column;
    const char = this.advance();

    const twoChar = char + this.peek();
    const twoCharOps: Record<string, TokenType> = {
      '..': TokenType.DOTDOT,
      '=>': TokenType.ARROW,
      '==': TokenType.DOUBLE_EQUALS,
      '+=': TokenType.PLUS_EQUALS,
      '<=': TokenType.LTE,
      '>=': TokenType.GTE,
    };

    if (twoCharOps[twoChar]) {
      this.advance();
      return { type: twoCharOps[twoChar], value: twoChar, line: this.line, column: startColumn };
    }

    const singleCharOps: Record<string, TokenType> = {
      '|': TokenType.PIPE,
      '~': TokenType.TILDE,
      ':': TokenType.COLON,
      '=': TokenType.EQUALS,
      '+': TokenType.PLUS,
      '-': TokenType.MINUS,
      '*': TokenType.STAR,
      '/': TokenType.SLASH,
      '.': TokenType.DOT,
      '^': TokenType.CARET,
      '%': TokenType.PERCENT,
      '<': TokenType.LT,
      '>': TokenType.GT,
      '?': TokenType.QUESTION,
      ',': TokenType.COMMA,
      '(': TokenType.LPAREN,
      ')': TokenType.RPAREN,
      '{': TokenType.LBRACE,
      '}': TokenType.RBRACE,
      '[': TokenType.LBRACKET,
      ']': TokenType.RBRACKET,
    };

    const type = singleCharOps[char];
    if (type) {
      return { type, value: char, line: this.line, column: startColumn };
    }

    throw new Error(`Unexpected character '${char}' at line ${this.line}, column ${startColumn}`);
  }

  private skipWhitespace(): void {
    while (!this.isAtEnd()) {
      const char = this.peek();
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else {
        break;
      }
    }
  }

  private skipLineComment(): void {
    while (!this.isAtEnd() && this.peek() !== '\n') {
      this.advance();
    }
  }

  private makeToken(type: TokenType, value: string): Token {
    return { type, value, line: this.line, column: this.column };
  }

  private peek(): string {
    return this.source[this.pos] ?? '\0';
  }

  private peekNext(): string {
    return this.source[this.pos + 1] ?? '\0';
  }

  private advance(): string {
    const char = this.source[this.pos];
    this.pos++;
    this.column++;
    return char;
  }

  private isAtEnd(): boolean {
    return this.pos >= this.source.length;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }
}
