import { TokenType } from '../lexer/index.js';
import {
  Expression,
  WeightedOption,
  LogicalExpression,
  NotExpression,
  TernaryExpression,
} from '../ast/index.js';
import { PrimaryParser } from './primaries.js';

/**
 * Expression parser - handles all expression parsing with precedence.
 *
 * Precedence (lowest to highest):
 * ternary → or → and → not → superposition → comparison → range → additive → multiplicative → unary → call → primary
 */
export class ExpressionParser extends PrimaryParser {
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

    // Handle unary minus and plus
    if (this.check(TokenType.MINUS) || this.check(TokenType.PLUS)) {
      const operator = this.advance().value;
      const operand = this.parseUnary();
      return { type: 'UnaryExpression', operator, operand };
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
  // Abstract method implementations for PrimaryParser
  // ============================================

  protected override parseExpressionForPrimary(): Expression {
    return this.parseExpression();
  }

  protected override parseAdditiveForPrimary(): Expression {
    return this.parseAdditive();
  }
}
