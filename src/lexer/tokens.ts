export enum TokenType {
  // Literals
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  IDENTIFIER = 'IDENTIFIER',

  // Keywords
  LET = 'LET',
  SCHEMA = 'SCHEMA',
  FROM = 'FROM',
  IMPORT = 'IMPORT',
  CONTEXT = 'CONTEXT',
  DISTRIBUTION = 'DISTRIBUTION',
  DATASET = 'DATASET',
  WITH = 'WITH',
  WHERE = 'WHERE',
  WHEN = 'WHEN',
  IN = 'IN',
  PER = 'PER',
  ANY = 'ANY',
  OF = 'OF',
  MATCH = 'MATCH',
  AFFECTS = 'AFFECTS',
  CONSTRAINTS = 'CONSTRAINTS',
  VALIDATE = 'VALIDATE',
  ASSUME = 'ASSUME',
  THEN = 'THEN',
  REFINE = 'REFINE',
  IF = 'IF',
  VIOLATING = 'VIOLATING',
  UNIQUE = 'UNIQUE',
  PRIVATE = 'PRIVATE',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',
  NULL = 'NULL',
  TRUE = 'TRUE',
  FALSE = 'FALSE',
  INT = 'INT',
  DECIMAL = 'DECIMAL',
  DATE = 'DATE',

  // Operators
  PIPE = 'PIPE', // |
  TILDE = 'TILDE', // ~
  COLON = 'COLON', // :
  EQUALS = 'EQUALS', // =
  DOUBLE_EQUALS = 'DOUBLE_EQUALS', // ==
  PLUS_EQUALS = 'PLUS_EQUALS', // +=
  ARROW = 'ARROW', // =>
  RIGHT_ARROW = 'RIGHT_ARROW', // ->
  PLUS = 'PLUS', // +
  MINUS = 'MINUS', // -
  STAR = 'STAR', // *
  SLASH = 'SLASH', // /
  DOT = 'DOT', // .
  DOTDOT = 'DOTDOT', // ..
  CARET = 'CARET', // ^
  PERCENT = 'PERCENT', // %
  LT = 'LT', // <
  GT = 'GT', // >
  LTE = 'LTE', // <=
  GTE = 'GTE', // >=
  QUESTION = 'QUESTION', // ?
  COMMA = 'COMMA', // ,

  // Delimiters
  LPAREN = 'LPAREN', // (
  RPAREN = 'RPAREN', // )
  LBRACE = 'LBRACE', // {
  RBRACE = 'RBRACE', // }
  LBRACKET = 'LBRACKET', // [
  RBRACKET = 'RBRACKET', // ]

  // Special
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType | string; // TokenType for built-in, string for plugin keywords
  value: string;
  line: number;
  column: number;
}

export const KEYWORDS: Record<string, TokenType> = {
  let: TokenType.LET,
  schema: TokenType.SCHEMA,
  from: TokenType.FROM,
  import: TokenType.IMPORT,
  context: TokenType.CONTEXT,
  distribution: TokenType.DISTRIBUTION,
  dataset: TokenType.DATASET,
  with: TokenType.WITH,
  where: TokenType.WHERE,
  when: TokenType.WHEN,
  in: TokenType.IN,
  per: TokenType.PER,
  any: TokenType.ANY,
  of: TokenType.OF,
  match: TokenType.MATCH,
  affects: TokenType.AFFECTS,
  constraints: TokenType.CONSTRAINTS,
  validate: TokenType.VALIDATE,
  assume: TokenType.ASSUME,
  then: TokenType.THEN,
  refine: TokenType.REFINE,
  if: TokenType.IF,
  violating: TokenType.VIOLATING,
  unique: TokenType.UNIQUE,
  private: TokenType.PRIVATE,
  and: TokenType.AND,
  or: TokenType.OR,
  not: TokenType.NOT,
  null: TokenType.NULL,
  true: TokenType.TRUE,
  false: TokenType.FALSE,
  int: TokenType.INT,
  decimal: TokenType.DECIMAL,
  date: TokenType.DATE,
};

/**
 * Runtime keyword registry for plugin-registered keywords.
 * Maps keyword string -> token type string.
 */
const pluginKeywords: Map<string, string> = new Map();

/**
 * Register a keyword at runtime (for plugins).
 * @param keyword The keyword string (e.g., 'mission', 'fetch')
 * @param tokenType The token type name (e.g., 'MISSION', 'FETCH')
 */
export function registerKeyword(keyword: string, tokenType: string): void {
  pluginKeywords.set(keyword, tokenType);
}

/**
 * Unregister a keyword (for cleanup/testing).
 */
export function unregisterKeyword(keyword: string): void {
  pluginKeywords.delete(keyword);
}

/**
 * Clear all plugin keywords (for cleanup/testing).
 */
export function clearPluginKeywords(): void {
  pluginKeywords.clear();
}

/**
 * Look up a keyword, checking both built-in and plugin-registered keywords.
 * Returns the token type string if found, undefined otherwise.
 */
export function lookupKeyword(keyword: string): string | undefined {
  // Check built-in keywords first
  if (keyword in KEYWORDS) {
    return KEYWORDS[keyword];
  }
  // Check plugin keywords
  return pluginKeywords.get(keyword);
}
