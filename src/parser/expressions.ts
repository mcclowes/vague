import { TokenType } from '../lexer/index.js';
import {
  Expression,
  WeightedOption,
  QualifiedName,
  RangeExpression,
  MatchExpression,
  MatchArm,
  LogicalExpression,
  NotExpression,
  TernaryExpression,
  OrderedSequenceType,
} from '../ast/index.js';
import { ParserBase } from './base.js';

/**
 * Expression parser - handles all expression parsing with precedence.
 *
 * Precedence (lowest to highest):
 * ternary → or → and → not → superposition → comparison → range → additive → multiplicative → unary → call → primary
 */
export class ExpressionParser extends ParserBase {
  // ============================================
  // Main entry point
  // ============================================

  parseExpression(): Expression {
    return this.parseTernary();
  }

  // For backward compatibility
  parseLogicalExpression(): Expression {
    return this.parseOr();
  }

  // ============================================
  // Ternary expressions
  // ============================================

  private parseTernary(): Expression {
    const condition = this.parseOr();

    if (this.match(TokenType.QUESTION)) {
      const consequent = this.parseTernaryBranch();
      this.consume(TokenType.COLON, "Expected ':' in ternary expression");
      const alternate = this.parseTernaryBranch();
      return {
        type: 'TernaryExpression',
        condition,
        consequent,
        alternate,
      } as TernaryExpression;
    }

    return condition;
  }

  // Parse a ternary branch - allows nested ternaries but not weighted superpositions
  private parseTernaryBranch(): Expression {
    const expr = this.parseTernaryBranchOr();

    if (this.match(TokenType.QUESTION)) {
      const consequent = this.parseTernaryBranch();
      this.consume(TokenType.COLON, "Expected ':' in ternary expression");
      const alternate = this.parseTernaryBranch();
      return {
        type: 'TernaryExpression',
        condition: expr,
        consequent,
        alternate,
      } as TernaryExpression;
    }

    return expr;
  }

  private parseTernaryBranchOr(): Expression {
    let left = this.parseTernaryBranchAnd();

    while (this.match(TokenType.OR)) {
      const right = this.parseTernaryBranchAnd();
      left = { type: 'LogicalExpression', operator: 'or', left, right } as LogicalExpression;
    }

    return left;
  }

  private parseTernaryBranchAnd(): Expression {
    let left = this.parseTernaryBranchNot();

    while (this.match(TokenType.AND)) {
      const right = this.parseTernaryBranchNot();
      left = { type: 'LogicalExpression', operator: 'and', left, right } as LogicalExpression;
    }

    return left;
  }

  private parseTernaryBranchNot(): Expression {
    if (this.match(TokenType.NOT)) {
      const operand = this.parseTernaryBranchNot();
      return { type: 'NotExpression', operand } as NotExpression;
    }

    // Skip superposition, go directly to comparison
    return this.parseComparison();
  }

  // ============================================
  // Logical operators
  // ============================================

  private parseOr(): Expression {
    let left = this.parseAnd();

    while (this.match(TokenType.OR)) {
      const right = this.parseAnd();
      left = { type: 'LogicalExpression', operator: 'or', left, right } as LogicalExpression;
    }

    return left;
  }

  private parseAnd(): Expression {
    let left = this.parseNot();

    while (this.match(TokenType.AND)) {
      const right = this.parseNot();
      left = { type: 'LogicalExpression', operator: 'and', left, right } as LogicalExpression;
    }

    return left;
  }

  private parseNot(): Expression {
    if (this.match(TokenType.NOT)) {
      const operand = this.parseNot();
      return { type: 'NotExpression', operand } as NotExpression;
    }

    return this.parseSuperposition();
  }

  // ============================================
  // Superposition (weighted alternatives)
  // ============================================

  private parseSuperposition(): Expression {
    const first = this.parseSuperpositionOption();

    if (this.check(TokenType.PIPE)) {
      const options: WeightedOption[] = [first];

      while (this.match(TokenType.PIPE)) {
        options.push(this.parseSuperpositionOption());
      }

      return { type: 'SuperpositionExpression', options };
    }

    return first.value;
  }

  private parseSuperpositionOption(): WeightedOption {
    const expr = this.parseComparison();

    // Check for weighted option: number followed by colon
    if (expr.type === 'Literal' && expr.dataType === 'number' && this.check(TokenType.COLON)) {
      this.advance();
      const value = this.parseComparison();
      return { weight: expr.value as number, value };
    }

    return { value: expr };
  }

  // ============================================
  // Comparison and arithmetic
  // ============================================

  parseComparison(): Expression {
    let left = this.parseRange();

    while (
      this.check(TokenType.LT) ||
      this.check(TokenType.GT) ||
      this.check(TokenType.LTE) ||
      this.check(TokenType.GTE) ||
      this.check(TokenType.DOUBLE_EQUALS)
    ) {
      const operator = this.advance().value;
      const right = this.parseRange();
      left = { type: 'BinaryExpression', operator, left, right };
    }

    return left;
  }

  parseRange(): Expression {
    const left = this.parseAdditive();

    if (this.match(TokenType.DOTDOT)) {
      const right = this.check(TokenType.NUMBER) ? this.parseAdditive() : undefined;
      return { type: 'RangeExpression', min: left, max: right };
    }

    return left;
  }

  parseAdditive(): Expression {
    let left = this.parseMultiplicative();

    while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) {
      const operator = this.advance().value;
      const right = this.parseMultiplicative();
      left = { type: 'BinaryExpression', operator, left, right };
    }

    return left;
  }

  private parseMultiplicative(): Expression {
    let left = this.parseUnary();

    while (this.check(TokenType.STAR) || this.check(TokenType.SLASH)) {
      const operator = this.advance().value;
      const right = this.parseUnary();
      left = { type: 'BinaryExpression', operator, left, right };
    }

    return left;
  }

  // ============================================
  // Unary and call expressions
  // ============================================

  private parseUnary(): Expression {
    if (this.match(TokenType.CARET)) {
      const path = this.parseQualifiedName();
      return { type: 'ParentReference', path };
    }

    return this.parseCall();
  }

  private parseCall(): Expression {
    let expr = this.parsePrimary();

    while (true) {
      if (this.match(TokenType.LPAREN)) {
        const args: Expression[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RPAREN, "Expected ')'");

        if (expr.type === 'Identifier') {
          expr = { type: 'CallExpression', callee: expr.name, arguments: args };
        } else if (expr.type === 'QualifiedName') {
          expr = { type: 'CallExpression', callee: expr.parts.join('.'), arguments: args };
        }
      } else if (this.match(TokenType.DOT)) {
        const name = this.consume(TokenType.IDENTIFIER, 'Expected property name').value;
        if (expr.type === 'Identifier') {
          expr = { type: 'QualifiedName', parts: [expr.name, name] };
        } else if (expr.type === 'QualifiedName') {
          expr.parts.push(name);
        }
      } else {
        break;
      }
    }

    return expr;
  }

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
      const collection = this.parseExpression();
      let condition: Expression | undefined;
      if (this.match(TokenType.WHERE)) {
        condition = this.parseExpression();
      }
      return { type: 'AnyOfExpression', collection, condition };
    }

    // Parenthesized expression
    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression();
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
      const pattern = this.parseExpression();
      this.consume(TokenType.ARROW, "Expected '=>'");
      const result = this.parseExpression();
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
      elements.push(this.parseExpression());
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
    const min = this.parseAdditive();
    this.consume(TokenType.DOTDOT, "Expected '..'");
    const max =
      this.check(TokenType.RBRACE) || this.check(TokenType.COMMA)
        ? undefined
        : this.parseAdditive();
    return { type: 'RangeExpression', min, max };
  }
}
