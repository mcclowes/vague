import { TokenType } from '../lexer/index.js';
import {
  Expression,
  WeightedOption,
  FieldType,
  PrimitiveType,
  RangeType,
  Cardinality,
  DynamicCardinality,
  GeneratorType,
} from '../ast/index.js';
import { ExpressionParser } from './expressions.js';

/**
 * Type parser - handles field type parsing including:
 * - Primitive types (string, int, decimal, date, boolean)
 * - Range types (int in 18..65)
 * - Collection types (100 * Schema, 1..10 * Item)
 * - Dynamic cardinality ((condition ? 5..10 : 1..3) * Item)
 * - Generator types (faker.email(), uuid())
 * - Reference types (Schema)
 * - Superposition types ("a" | "b" | "c")
 * - Nullable types (string?, int | null)
 */
export class TypeParser extends ExpressionParser {
  // ============================================
  // Main entry point
  // ============================================

  parseFieldType(): FieldType {
    // Check for weighted superposition starting with number: 0.7: int in 10..50 | 0.3: value
    // (must check before cardinality since both start with NUMBER)
    if (this.check(TokenType.NUMBER) && this.isWeightedSuperposition()) {
      return this.parseWeightedSuperpositionType();
    }

    // Check for primitive types with range: int in 18..65
    // Also handles generator types: uuid(), faker.email()
    if (this.checkPrimitive()) {
      const primitiveOrGenerator = this.parsePrimitiveType();

      if (primitiveOrGenerator !== null) {
        // Range type: int in 18..65
        if (this.match(TokenType.IN)) {
          const range = this.parseRangeExpression();
          if (primitiveOrGenerator.type !== 'PrimitiveType') {
            throw this.error('Range type requires a primitive base type (int, decimal, date)');
          }
          const rangeType = {
            type: 'RangeType',
            baseType: primitiveOrGenerator,
            min: range.min,
            max: range.max,
          } as RangeType;

          // Check for superposition after range: int in 10..500 | other_value
          // Also supports weights: 0.7: int in 10..500 | 0.3: other_value (weight on range comes before 'int')
          if (this.check(TokenType.PIPE)) {
            const options: WeightedOption[] = [
              { value: { type: 'RangeExpression', min: range.min, max: range.max } as Expression },
            ];
            while (this.match(TokenType.PIPE)) {
              options.push(this.parseSuperpositionOptionForType());
            }
            return { type: 'SuperpositionType', options };
          }

          return rangeType;
        }

        // Nullable shorthand: string?, int?
        if (this.match(TokenType.QUESTION)) {
          const baseExpr: Expression = { type: 'Identifier', name: primitiveOrGenerator.name };
          const nullLiteral: Expression = { type: 'Literal', value: null, dataType: 'null' };
          return {
            type: 'SuperpositionType',
            options: [{ value: baseExpr }, { value: nullLiteral }],
          };
        }

        // Superposition with primitive: string | null, int | "special"
        if (this.check(TokenType.PIPE)) {
          const baseExpr: Expression = { type: 'Identifier', name: primitiveOrGenerator.name };
          const options: WeightedOption[] = [{ value: baseExpr }];

          while (this.match(TokenType.PIPE)) {
            const nextExpr = this.parsePrimary();
            options.push({ value: nextExpr });
          }
          return { type: 'SuperpositionType', options };
        }

        return primitiveOrGenerator;
      }
    }

    // Collection type with static cardinality: 100 * Company, 1..10 * LineItem
    if (this.check(TokenType.NUMBER) && this.isCardinalityNotWeight()) {
      return this.parseCollectionType();
    }

    // Collection type with dynamic cardinality: (condition ? 1..5 : 10..20) * Item
    if (this.check(TokenType.LPAREN) && this.isDynamicCardinality()) {
      return this.parseCollectionType();
    }

    // Reference type or superposition starting with identifier
    return this.parseExpressionAsFieldType();
  }

  // ============================================
  // Primitive and generator types
  // ============================================

  private parsePrimitiveType(): PrimitiveType | GeneratorType | null {
    // Built-in primitive keywords
    if (this.match(TokenType.INT)) return { type: 'PrimitiveType', name: 'int' };
    if (this.match(TokenType.DECIMAL)) return { type: 'PrimitiveType', name: 'decimal' };
    if (this.match(TokenType.DATE)) return { type: 'PrimitiveType', name: 'date' };

    // Identifier-based types (string, boolean, or generators)
    const id = this.consume(TokenType.IDENTIFIER, 'Expected type name').value;
    if (id === 'string') return { type: 'PrimitiveType', name: 'string' };
    if (id === 'boolean') return { type: 'PrimitiveType', name: 'boolean' };

    // Check for generator type: qualified (faker.uuid) or with args (uuid())
    let name = id;
    let isGenerator = false;

    // Handle qualified names: faker.uuid, faker.person.firstName
    if (this.check(TokenType.DOT)) {
      isGenerator = true;
      while (this.match(TokenType.DOT)) {
        const part = this.consume(TokenType.IDENTIFIER, "Expected identifier after '.'").value;
        name += '.' + part;
      }
    }

    // Handle arguments: phone("US"), uuid()
    const args: Expression[] = [];
    if (this.check(TokenType.LPAREN)) {
      isGenerator = true;
      this.advance();
      if (!this.check(TokenType.RPAREN)) {
        do {
          args.push(this.parseExpression());
        } while (this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RPAREN, "Expected ')' after arguments");
    }

    if (isGenerator) {
      return { type: 'GeneratorType', name, arguments: args };
    }

    // Bare identifier - not a primitive or generator, restore position
    this.pos--;
    return null;
  }

  private checkPrimitive(): boolean {
    return (
      this.check(TokenType.INT) ||
      this.check(TokenType.DECIMAL) ||
      this.check(TokenType.DATE) ||
      this.check(TokenType.IDENTIFIER)
    );
  }

  // ============================================
  // Collection types
  // ============================================

  parseCollectionType(): FieldType {
    const cardinality = this.parseCardinalityOrDynamic();

    let perParent = undefined;
    if (this.match(TokenType.PER)) {
      perParent = this.parseQualifiedName();
    }

    this.consume(TokenType.STAR, "Expected '*'");
    const elementType = this.parseFieldType();

    return {
      type: 'CollectionType',
      cardinality,
      elementType,
      perParent,
    };
  }

  parseCardinalityOrDynamic(): Cardinality | DynamicCardinality {
    // Dynamic cardinality: (expression)
    if (this.match(TokenType.LPAREN)) {
      const expression = this.parseExpression();
      this.consume(TokenType.RPAREN, "Expected ')'");
      return { type: 'DynamicCardinality', expression };
    }

    // Static cardinality: 100 or 1..10
    return this.parseCardinality();
  }

  parseCardinality(): Cardinality {
    const min = parseInt(this.consume(TokenType.NUMBER, 'Expected number').value, 10);

    if (this.match(TokenType.DOTDOT)) {
      const max = parseInt(this.consume(TokenType.NUMBER, 'Expected number').value, 10);
      return { type: 'Cardinality', min, max };
    }

    return { type: 'Cardinality', min, max: min };
  }

  // ============================================
  // Lookahead helpers
  // ============================================

  private isCardinalityNotWeight(): boolean {
    // Look ahead: if NUMBER is followed by COLON, it's a weight not cardinality
    const saved = this.savePosition();
    this.advance();

    const next = this.peek().type;
    this.restorePosition(saved);

    return next === TokenType.STAR || next === TokenType.DOTDOT || next === TokenType.PER;
  }

  private isWeightedSuperposition(): boolean {
    // Look ahead: NUMBER followed by COLON indicates a weighted superposition
    const saved = this.savePosition();
    this.advance(); // consume number

    const isWeight = this.check(TokenType.COLON);
    this.restorePosition(saved);
    return isWeight;
  }

  private parseWeightedSuperpositionType(): FieldType {
    const options: WeightedOption[] = [];

    // Parse first weighted option
    options.push(this.parseSuperpositionOptionForType());

    // Parse additional options
    while (this.match(TokenType.PIPE)) {
      options.push(this.parseSuperpositionOptionForType());
    }

    return { type: 'SuperpositionType', options };
  }

  private isDynamicCardinality(): boolean {
    // Look ahead for ) * pattern indicating dynamic cardinality
    const saved = this.savePosition();
    let depth = 0;

    while (!this.isAtEnd()) {
      const token = this.peek();
      if (token.type === TokenType.LPAREN) {
        depth++;
      } else if (token.type === TokenType.RPAREN) {
        depth--;
        if (depth === 0) {
          this.advance();
          const afterParen = this.peek().type;
          this.restorePosition(saved);
          return afterParen === TokenType.STAR || afterParen === TokenType.PER;
        }
      }
      this.advance();
    }

    this.restorePosition(saved);
    return false;
  }

  // ============================================
  // Superposition option for field types
  // ============================================

  /**
   * Parse a superposition option that may include:
   * - A weight prefix: 0.7: value
   * - A range type: int in 10..50 or (int in 10..50)
   * - A regular expression: invoice.total
   */
  private parseSuperpositionOptionForType(): WeightedOption {
    // Check for weight prefix: 0.7: value
    let weight: number | undefined;
    if (this.check(TokenType.NUMBER)) {
      const saved = this.savePosition();
      const numToken = this.advance();
      if (this.match(TokenType.COLON)) {
        weight = parseFloat(numToken.value);
      } else {
        this.restorePosition(saved);
      }
    }

    // Check for range type: int in 10..50
    if (this.checkPrimitive()) {
      const saved = this.savePosition();
      const primitive = this.parsePrimitiveType();
      if (primitive?.type === 'PrimitiveType' && this.match(TokenType.IN)) {
        const range = this.parseRangeExpression();
        return {
          weight,
          value: { type: 'RangeExpression', min: range.min, max: range.max } as Expression,
        };
      }
      this.restorePosition(saved);
    }

    // Regular expression
    const value = this.parseComparison();
    return { weight, value };
  }

  // ============================================
  // Expression as field type
  // ============================================

  private parseExpressionAsFieldType(): FieldType {
    const expr = this.parseExpression();

    if (expr.type === 'SuperpositionExpression') {
      return {
        type: 'SuperpositionType',
        options: expr.options,
      };
    }

    // Ordered sequence: [1, 2, 3, 4]
    if (expr.type === 'OrderedSequenceType') {
      return expr;
    }

    // Single literal as single-value superposition
    if (expr.type === 'Literal') {
      return {
        type: 'SuperpositionType',
        options: [{ value: expr }],
      };
    }

    if (expr.type === 'QualifiedName' || expr.type === 'Identifier') {
      return {
        type: 'ReferenceType',
        path: expr.type === 'Identifier' ? { type: 'QualifiedName', parts: [expr.name] } : expr,
      };
    }

    // Expression types (any of, parent reference)
    if (expr.type === 'AnyOfExpression' || expr.type === 'ParentReference') {
      return {
        type: 'ExpressionType',
        expression: expr,
      };
    }

    throw this.error(`Cannot use expression as field type: ${expr.type}`);
  }
}
