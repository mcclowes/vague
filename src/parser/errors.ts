import { Token, TokenType } from '../lexer/index.js';

/**
 * Custom error class for parse errors with rich context information.
 * Provides structured error data and formatted messages with source snippets.
 */
export class ParseError extends Error {
  /** The token where the error occurred */
  readonly token: Token;
  /** The source code being parsed (for snippet generation) */
  readonly source?: string;
  /** What token type was expected (if applicable) */
  readonly expected?: string;
  /** Additional context about what was being parsed */
  readonly context?: string;

  constructor(
    message: string,
    token: Token,
    options?: {
      source?: string;
      expected?: string;
      context?: string;
    }
  ) {
    super(message);
    this.name = 'ParseError';
    this.token = token;
    this.source = options?.source;
    this.expected = options?.expected;
    this.context = options?.context;

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ParseError);
    }
  }

  /** Line number where error occurred (1-indexed) */
  get line(): number {
    return this.token.line;
  }

  /** Column number where error occurred (1-indexed) */
  get column(): number {
    return this.token.column;
  }

  /**
   * Format the error with location and optional source snippet.
   */
  format(options?: { showSnippet?: boolean; filename?: string }): string {
    const { showSnippet = true, filename } = options ?? {};
    const lines: string[] = [];

    // Location header
    const location = filename
      ? `${filename}:${this.line}:${this.column}`
      : `line ${this.line}, column ${this.column}`;
    lines.push(`Parse error at ${location}`);

    // Add source snippet if available
    if (showSnippet && this.source) {
      const snippet = this.getSourceSnippet();
      if (snippet) {
        lines.push('');
        lines.push(snippet);
      }
    }

    // Main error message
    lines.push('');
    lines.push(`  ${this.message}`);

    // Add expected token hint
    if (this.expected) {
      lines.push(`  Expected: ${this.expected}`);
    }

    // Add found token info
    const found = formatToken(this.token);
    if (found) {
      lines.push(`  Found: ${found}`);
    }

    // Add context if available
    if (this.context) {
      lines.push(`  Context: ${this.context}`);
    }

    return lines.join('\n');
  }

  /**
   * Generate a source snippet with error pointer.
   */
  private getSourceSnippet(): string | null {
    if (!this.source) return null;

    const sourceLines = this.source.split('\n');
    const lineIndex = this.line - 1;

    if (lineIndex < 0 || lineIndex >= sourceLines.length) return null;

    const lines: string[] = [];
    const lineNum = String(this.line);
    const padding = lineNum.length;

    // Show line before if available
    if (lineIndex > 0) {
      const prevLineNum = String(this.line - 1).padStart(padding);
      lines.push(`  ${prevLineNum} │ ${sourceLines[lineIndex - 1]}`);
    }

    // Error line with pointer
    const sourceLine = sourceLines[lineIndex];
    lines.push(`  ${lineNum} │ ${sourceLine}`);

    // Pointer line
    const pointerPadding = ' '.repeat(padding + 3 + Math.max(0, this.column - 1));
    lines.push(`${pointerPadding}^`);

    return lines.join('\n');
  }

  /**
   * Override toString to provide formatted output
   */
  override toString(): string {
    return this.format({ showSnippet: true });
  }
}

/**
 * Format a token for display in error messages.
 */
function formatToken(token: Token): string {
  if (token.type === TokenType.EOF) {
    return 'end of file';
  }
  if (token.type === TokenType.STRING) {
    return `string "${token.value}"`;
  }
  if (token.type === TokenType.NUMBER) {
    return `number ${token.value}`;
  }
  if (token.type === TokenType.IDENTIFIER) {
    return `identifier '${token.value}'`;
  }
  // For keywords and operators, show the value
  return `'${token.value}'`;
}

/**
 * Get a human-readable name for a token type.
 */
export function tokenTypeName(type: TokenType | string): string {
  const names: Partial<Record<TokenType | string, string>> = {
    [TokenType.LPAREN]: "'('",
    [TokenType.RPAREN]: "')'",
    [TokenType.LBRACE]: "'{'",
    [TokenType.RBRACE]: "'}'",
    [TokenType.LBRACKET]: "'['",
    [TokenType.RBRACKET]: "']'",
    [TokenType.COLON]: "':'",
    [TokenType.COMMA]: "','",
    [TokenType.DOT]: "'.'",
    [TokenType.DOTDOT]: "'..'",
    [TokenType.PIPE]: "'|'",
    [TokenType.EQUALS]: "'='",
    [TokenType.DOUBLE_EQUALS]: "'=='",
    [TokenType.ARROW]: "'=>'",
    [TokenType.IDENTIFIER]: 'identifier',
    [TokenType.NUMBER]: 'number',
    [TokenType.STRING]: 'string',
    [TokenType.EOF]: 'end of file',
  };
  return names[type] ?? type.toLowerCase();
}

/**
 * Create a ParseError for an unexpected token.
 */
export function unexpectedToken(
  token: Token,
  options?: { expected?: string; context?: string; source?: string }
): ParseError {
  const found = formatToken(token);
  return new ParseError(`Unexpected ${found}`, token, options);
}

/**
 * Create a ParseError for a missing expected token.
 */
export function expectedToken(
  expectedType: TokenType | string,
  token: Token,
  options?: { context?: string; source?: string }
): ParseError {
  const expected = tokenTypeName(expectedType);
  return new ParseError(`Expected ${expected}`, token, {
    ...options,
    expected,
  });
}
