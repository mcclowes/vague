import { TokenType } from '../lexer/index.js';
import {
  Expression,
  QualifiedName,
  RangeExpression,
  MatchExpression,
  MatchArm,
  OrderedSequenceType,
} from '../ast/index.js';
import { ParserBase } from './base.js';

/**
 * Primary expression parser - handles the lowest-level expressions:
 * - Literals (numbers, strings, booleans, null)
 * - Identifiers
 * - Parenthesized expressions
 * - Match expressions
 * - Ordered sequences
 * - Any of expressions
 * - Qualified names
 */
export class PrimaryParser extends ParserBase {
  // ============================================
  // Primary expressions
  // ============================================

  parsePrimary(): Expression {
    // Match expression
    if (this.match(TokenType.MATCH)) {
      return this.parseMatchExpression();
    }

    // Ordered sequence: [1, 2, 3, 4]
    if (this.match(TokenType.LBRACKET)) {
      return this.parseOrderedSequence();
    }

    // Any of expression
    if (this.match(TokenType.ANY)) {
      this.consume(TokenType.OF, "Expected 'of'");
      const collection = this.parseExpressionForPrimary();
      let condition: Expression | undefined;
      if (this.match(TokenType.WHERE)) {
        condition = this.parseExpressionForPrimary();
      }
      return { type: 'AnyOfExpression', collection, condition };
    }

    // Parenthesized expression
    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpressionForPrimary();
      this.consume(TokenType.RPAREN, "Expected ')'");
      return expr;
    }

    // Number literal
    if (this.check(TokenType.NUMBER)) {
      const value = parseFloat(this.advance().value);
      return { type: 'Literal', value, dataType: 'number' };
    }

    // String literal
    if (this.check(TokenType.STRING)) {
      const value = this.advance().value;
      return { type: 'Literal', value, dataType: 'string' };
    }

    // Null literal
    if (this.match(TokenType.NULL)) {
      return { type: 'Literal', value: null, dataType: 'null' };
    }

    // Boolean literals
    if (this.match(TokenType.TRUE)) {
      return { type: 'Literal', value: true, dataType: 'boolean' };
    }
    if (this.match(TokenType.FALSE)) {
      return { type: 'Literal', value: false, dataType: 'boolean' };
    }

    // Identifier
    if (this.check(TokenType.IDENTIFIER)) {
      const name = this.advance().value;
      return { type: 'Identifier', name };
    }

    // DATE token followed by '.' is a namespace (date.weekday), not the primitive type
    if (this.check(TokenType.DATE)) {
      const nextToken = this.tokens[this.pos + 1];
      if (nextToken?.type === TokenType.DOT) {
        this.advance(); // consume DATE
        return { type: 'Identifier', name: 'date' };
      }
    }

    // .field shorthand for current scope field access
    if (this.match(TokenType.DOT)) {
      const name = this.consume(TokenType.IDENTIFIER, "Expected field name after '.'").value;
      return { type: 'Identifier', name };
    }

    throw this.error(`Unexpected token: ${this.peek().value}`);
  }

  // ============================================
  // Match expression
  // ============================================

  private parseMatchExpression(): MatchExpression {
    const value = this.parsePrimary();
    this.consume(TokenType.LBRACE, "Expected '{'");

    const arms: MatchArm[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const pattern = this.parseExpressionForPrimary();
      this.consume(TokenType.ARROW, "Expected '=>'");
      const result = this.parseExpressionForPrimary();
      arms.push({ pattern, result });
      this.match(TokenType.COMMA);
    }

    this.consume(TokenType.RBRACE, "Expected '}'");
    return { type: 'MatchExpression', value, arms };
  }

  // ============================================
  // Ordered sequence
  // ============================================

  private parseOrderedSequence(): OrderedSequenceType {
    const elements: Expression[] = [];

    // Handle empty sequence error
    if (this.check(TokenType.RBRACKET)) {
      throw this.error('Ordered sequence cannot be empty');
    }

    // Parse comma-separated expressions
    do {
      elements.push(this.parseExpressionForPrimary());
    } while (this.match(TokenType.COMMA));

    this.consume(TokenType.RBRACKET, "Expected ']'");

    return { type: 'OrderedSequenceType', elements };
  }

  // ============================================
  // Qualified names
  // ============================================

  parseQualifiedName(): QualifiedName {
    const parts: string[] = [];
    parts.push(this.consume(TokenType.IDENTIFIER, 'Expected identifier').value);

    while (this.match(TokenType.DOT)) {
      parts.push(this.consume(TokenType.IDENTIFIER, 'Expected identifier').value);
    }

    return { type: 'QualifiedName', parts };
  }

  parseRangeExpression(): RangeExpression {
    const min = this.parseAdditiveForPrimary();
    this.consume(TokenType.DOTDOT, "Expected '..'");
    const max =
      this.check(TokenType.RBRACE) || this.check(TokenType.COMMA)
        ? undefined
        : this.parseAdditiveForPrimary();
    return { type: 'RangeExpression', min, max };
  }

  // ============================================
  // Abstract methods - implemented by subclass
  // ============================================

  /**
   * Parse a full expression - implemented by ExpressionParser
   */
  protected parseExpressionForPrimary(): Expression {
    throw new Error('parseExpressionForPrimary must be implemented by subclass');
  }

  /**
   * Parse an additive expression - implemented by ExpressionParser
   */
  protected parseAdditiveForPrimary(): Expression {
    throw new Error('parseAdditiveForPrimary must be implemented by subclass');
  }
}
