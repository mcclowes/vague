import { TokenType } from '../lexer/index.js';
import {
  Statement,
  ImportStatement,
  LetStatement,
  SchemaDefinition,
  ContextDefinition,
  DistributionDefinition,
  DatasetDefinition,
  FieldDefinition,
  FieldType,
  Expression,
  RangeExpression,
  ContextApplication,
  AffectsClause,
  DistributionBucket,
  CollectionDefinition,
  ConstraintBlock,
  ValidationBlock,
  AssumeClause,
  RefineBlock,
  RefineCondition,
  ThenBlock,
  Mutation,
} from '../ast/index.js';
import { TypeParser } from './types.js';

/**
 * Statement parser - handles top-level statements:
 * - import statements
 * - let statements
 * - schema definitions
 * - context definitions
 * - distribution definitions
 * - dataset definitions
 */
export class StatementParser extends TypeParser {
  // ============================================
  // Statement dispatch
  // ============================================

  parseStatement(): Statement | null {
    if (this.check(TokenType.IMPORT)) return this.parseImport();
    if (this.check(TokenType.LET)) return this.parseLet();
    if (this.check(TokenType.SCHEMA)) return this.parseSchema();
    if (this.check(TokenType.CONTEXT)) return this.parseContext();
    if (this.check(TokenType.DISTRIBUTION)) return this.parseDistribution();
    if (this.check(TokenType.DATASET)) return this.parseDataset();

    throw this.error(`Unexpected token: ${this.peek().value}`);
  }

  // ============================================
  // Import and let statements
  // ============================================

  private parseImport(): ImportStatement {
    this.consume(TokenType.IMPORT, "Expected 'import'");
    const name = this.consume(TokenType.IDENTIFIER, 'Expected import name').value;
    this.consume(TokenType.FROM, "Expected 'from'");
    const path = this.consume(TokenType.STRING, 'Expected import path').value;

    return { type: 'ImportStatement', name, path };
  }

  private parseLet(): LetStatement {
    this.consume(TokenType.LET, "Expected 'let'");
    const name = this.consume(TokenType.IDENTIFIER, 'Expected variable name').value;
    this.consume(TokenType.EQUALS, "Expected '='");
    const value = this.parseExpression();

    return { type: 'LetStatement', name, value };
  }

  // ============================================
  // Schema definitions
  // ============================================

  private parseSchema(): SchemaDefinition {
    this.consume(TokenType.SCHEMA, "Expected 'schema'");
    const name = this.consume(TokenType.IDENTIFIER, 'Expected schema name').value;

    let base = undefined;
    if (this.match(TokenType.FROM)) {
      base = this.parseQualifiedName();
    }

    const contexts = this.parseContextApplications();

    this.consume(TokenType.LBRACE, "Expected '{'");
    const { fields, constraints, assumes } = this.parseSchemaBody();
    this.consume(TokenType.RBRACE, "Expected '}'");

    // Optional refine block: } refine {
    let refineBlock: RefineBlock | undefined;
    if (this.match(TokenType.REFINE)) {
      refineBlock = this.parseRefineBlock();
    }

    // Optional then block: } then {
    let thenBlock: ThenBlock | undefined;
    if (this.match(TokenType.THEN)) {
      thenBlock = this.parseThenBlock();
    }

    return {
      type: 'SchemaDefinition',
      name,
      base,
      contexts,
      fields,
      constraints,
      assumes,
      refineBlock,
      thenBlock,
    };
  }

  private parseSchemaBody(): {
    fields: FieldDefinition[];
    constraints?: ConstraintBlock;
    assumes?: AssumeClause[];
  } {
    const fields: FieldDefinition[] = [];
    const assumes: AssumeClause[] = [];
    let constraints: ConstraintBlock | undefined;

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.CONSTRAINTS)) {
        constraints = this.parseConstraintBlock();
      } else if (this.check(TokenType.ASSUME)) {
        assumes.push(this.parseAssumeClause());
      } else {
        fields.push(this.parseFieldDefinition());
      }
      this.match(TokenType.COMMA);
    }

    return { fields, constraints, assumes: assumes.length > 0 ? assumes : undefined };
  }

  parseFieldDefinition(): FieldDefinition {
    const name = this.consume(TokenType.IDENTIFIER, 'Expected field name').value;
    this.consume(TokenType.COLON, "Expected ':'");

    const unique = this.match(TokenType.UNIQUE);
    const isPrivate = this.match(TokenType.PRIVATE);
    const fieldType = this.parseFieldType();
    const optional = this.match(TokenType.QUESTION);

    // Check if the field type is actually a computed expression
    // (contains field references, binary operations, etc.)
    const computed = this.isComputedExpression(fieldType);

    let condition: Expression | undefined;
    if (this.match(TokenType.WHEN)) {
      condition = this.parseExpression();
    }

    let distribution: Expression | undefined;
    if (this.match(TokenType.TILDE)) {
      distribution = this.parseExpression();
    }

    let constraints: Expression | undefined;
    if (this.match(TokenType.WHERE)) {
      constraints = this.parseExpression();
    }

    // If computed, convert the field type to the computed format
    if (computed) {
      const expr = this.fieldTypeToExpression(fieldType);
      return {
        type: 'FieldDefinition',
        name,
        fieldType: { type: 'ReferenceType', path: { type: 'QualifiedName', parts: ['computed'] } },
        optional,
        computed: true,
        unique: unique || undefined,
        private: isPrivate || undefined,
        condition,
        distribution: expr,
        constraints,
      };
    }

    return {
      type: 'FieldDefinition',
      name,
      fieldType,
      optional,
      computed: false,
      unique: unique || undefined,
      private: isPrivate || undefined,
      condition,
      distribution,
      constraints,
    };
  }

  /**
   * Determines if a field type represents a computed expression
   * (i.e., it references other fields or uses operators)
   */
  private isComputedExpression(fieldType: FieldType): boolean {
    if (fieldType.type === 'ExpressionType') {
      return this.expressionHasFieldRefs(fieldType.expression);
    }
    return false;
  }

  /**
   * Check if an expression contains field references or operations
   * that require other fields to be generated first
   */
  private expressionHasFieldRefs(expr: Expression): boolean {
    switch (expr.type) {
      case 'Identifier':
        // Bare identifier that's not a known function - it's a field reference
        return true;

      case 'QualifiedName':
        // Field access like invoice.total or line_items.amount
        return true;

      case 'BinaryExpression':
        // Any binary operation (arithmetic, comparison)
        return true;

      case 'LogicalExpression':
        // Logical operations (and, or)
        return true;

      case 'TernaryExpression':
        // Conditional expressions reference other fields
        return true;

      case 'CallExpression': {
        // Function calls: check if any argument references fields
        // Aggregate functions (sum, count, etc.) always reference fields
        const aggregates = [
          'sum',
          'count',
          'min',
          'max',
          'avg',
          'first',
          'last',
          'median',
          'product',
          'round',
          'floor',
          'ceil',
          'previous',
          'sequence',
          'sequenceInt',
        ];
        // callee is a string in CallExpression
        if (aggregates.includes(expr.callee)) {
          return true;
        }
        // Check arguments for field refs
        for (const arg of expr.arguments) {
          if (this.expressionHasFieldRefs(arg)) {
            return true;
          }
        }
        return false;
      }

      case 'ParentReference':
        // ^field references parent
        return true;

      case 'UnaryExpression':
        return this.expressionHasFieldRefs(expr.operand);

      case 'NotExpression':
        return this.expressionHasFieldRefs(expr.operand);

      default:
        return false;
    }
  }

  /**
   * Convert a field type back to an expression for computed field storage
   */
  private fieldTypeToExpression(fieldType: FieldType): Expression {
    if (fieldType.type === 'ExpressionType') {
      return fieldType.expression;
    }
    // Should not reach here if isComputedExpression returned true
    throw this.error(`Cannot convert field type to expression: ${fieldType.type}`);
  }

  // ============================================
  // Then blocks and mutations
  // ============================================

  private parseThenBlock(): ThenBlock {
    this.consume(TokenType.LBRACE, "Expected '{'");
    const mutations: Mutation[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      mutations.push(this.parseMutation());
      this.match(TokenType.COMMA);
    }

    this.consume(TokenType.RBRACE, "Expected '}'");
    return { type: 'ThenBlock', mutations };
  }

  // ============================================
  // Refine blocks
  // ============================================

  private parseRefineBlock(): RefineBlock {
    this.consume(TokenType.LBRACE, "Expected '{'");
    const refinements: RefineCondition[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      refinements.push(this.parseRefineCondition());
      this.match(TokenType.COMMA);
    }

    this.consume(TokenType.RBRACE, "Expected '}'");
    return { type: 'RefineBlock', refinements };
  }

  private parseRefineCondition(): RefineCondition {
    this.consume(TokenType.IF, "Expected 'if' in refine block");
    const condition = this.parseLogicalExpression();

    this.consume(TokenType.LBRACE, "Expected '{'");
    const fields: FieldDefinition[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      fields.push(this.parseFieldDefinition());
      this.match(TokenType.COMMA);
    }

    this.consume(TokenType.RBRACE, "Expected '}'");
    return { type: 'RefineCondition', condition, fields };
  }

  private parseMutation(): Mutation {
    const target = this.parseExpression();

    let operator: '=' | '+=' = '=';
    if (this.match(TokenType.PLUS_EQUALS)) {
      operator = '+=';
    } else {
      this.consume(TokenType.EQUALS, "Expected '=' or '+='");
    }

    const value = this.parseExpression();

    return { type: 'Mutation', target, operator, value };
  }

  // ============================================
  // Assume clauses
  // ============================================

  private parseAssumeClause(): AssumeClause {
    this.consume(TokenType.ASSUME, "Expected 'assume'");

    // Conditional: assume if condition { ... }
    if (this.match(TokenType.IF)) {
      const condition = this.parseLogicalExpression();
      this.consume(TokenType.LBRACE, "Expected '{'");

      const constraints: Expression[] = [];
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        constraints.push(this.parseLogicalExpression());
        this.match(TokenType.COMMA);
      }

      this.consume(TokenType.RBRACE, "Expected '}'");
      return { type: 'AssumeClause', condition, constraints };
    }

    // Simple: assume expr
    const constraint = this.parseLogicalExpression();
    return { type: 'AssumeClause', constraints: [constraint] };
  }

  // ============================================
  // Constraint blocks
  // ============================================

  private parseConstraintBlock(): ConstraintBlock {
    this.consume(TokenType.CONSTRAINTS, "Expected 'constraints'");
    this.consume(TokenType.LBRACE, "Expected '{'");

    const constraints: Expression[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      constraints.push(this.parseExpression());
      this.match(TokenType.COMMA);
    }

    this.consume(TokenType.RBRACE, "Expected '}'");
    return { type: 'ConstraintBlock', constraints };
  }

  // ============================================
  // Context definitions
  // ============================================

  private parseContext(): ContextDefinition {
    this.consume(TokenType.CONTEXT, "Expected 'context'");
    const name = this.consume(TokenType.IDENTIFIER, 'Expected context name').value;

    this.consume(TokenType.LBRACE, "Expected '{'");
    const { fields, affects } = this.parseContextBody();
    this.consume(TokenType.RBRACE, "Expected '}'");

    return { type: 'ContextDefinition', name, fields, affects };
  }

  private parseContextBody(): { fields: FieldDefinition[]; affects: AffectsClause[] } {
    const fields: FieldDefinition[] = [];
    const affects: AffectsClause[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.AFFECTS)) {
        affects.push(this.parseAffectsClause());
      } else {
        fields.push(this.parseFieldDefinition());
      }
      this.match(TokenType.COMMA);
    }

    return { fields, affects };
  }

  private parseAffectsClause(): AffectsClause {
    this.consume(TokenType.AFFECTS, "Expected 'affects'");
    const field = this.consume(TokenType.IDENTIFIER, 'Expected field name').value;
    this.consume(TokenType.ARROW, "Expected '=>'");
    const expression = this.parseExpression();

    return { type: 'AffectsClause', field, expression };
  }

  // ============================================
  // Context applications
  // ============================================

  parseContextApplications(): ContextApplication[] | undefined {
    if (!this.match(TokenType.WITH)) return undefined;

    const contexts: ContextApplication[] = [];
    do {
      contexts.push(this.parseContextApplication());
    } while (this.match(TokenType.COMMA));

    return contexts;
  }

  private parseContextApplication(): ContextApplication {
    const name = this.consume(TokenType.IDENTIFIER, 'Expected context name').value;
    const args: Expression[] = [];

    if (this.match(TokenType.LPAREN)) {
      if (!this.check(TokenType.RPAREN)) {
        do {
          args.push(this.parseExpression());
        } while (this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RPAREN, "Expected ')'");
    }

    return { type: 'ContextApplication', name, arguments: args };
  }

  // ============================================
  // Distribution definitions
  // ============================================

  private parseDistribution(): DistributionDefinition {
    this.consume(TokenType.DISTRIBUTION, "Expected 'distribution'");
    const name = this.consume(TokenType.IDENTIFIER, 'Expected distribution name').value;

    this.consume(TokenType.LBRACE, "Expected '{'");
    const buckets = this.parseDistributionBuckets();
    this.consume(TokenType.RBRACE, "Expected '}'");

    return { type: 'DistributionDefinition', name, buckets };
  }

  private parseDistributionBuckets(): DistributionBucket[] {
    const buckets: DistributionBucket[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const range = this.parseDistributionRange();
      this.consume(TokenType.COLON, "Expected ':'");
      const weightToken = this.consume(TokenType.NUMBER, 'Expected weight');
      this.consume(TokenType.PERCENT, "Expected '%'");

      const weight = parseFloat(weightToken.value) / 100;

      buckets.push({
        type: 'DistributionBucket',
        range: range as RangeExpression | Expression,
        weight,
      });

      this.match(TokenType.COMMA);
    }

    return buckets;
  }

  private parseDistributionRange(): Expression {
    if (this.check(TokenType.STRING)) {
      const value = this.advance().value;
      return { type: 'Literal', value, dataType: 'string' };
    }

    const min = this.parsePrimary();

    if (this.match(TokenType.DOTDOT)) {
      const max = this.check(TokenType.NUMBER) ? this.parsePrimary() : undefined;
      return { type: 'RangeExpression', min, max };
    }

    return min;
  }

  // ============================================
  // Dataset definitions
  // ============================================

  private parseDataset(): DatasetDefinition {
    this.consume(TokenType.DATASET, "Expected 'dataset'");
    const name = this.consume(TokenType.IDENTIFIER, 'Expected dataset name').value;

    // Check for 'violating' keyword for negative testing
    const violating = this.match(TokenType.VIOLATING);

    const contexts = this.parseContextApplications();

    this.consume(TokenType.LBRACE, "Expected '{'");
    const { collections, validation } = this.parseDatasetBody();
    this.consume(TokenType.RBRACE, "Expected '}'");

    return {
      type: 'DatasetDefinition',
      name,
      violating: violating || undefined,
      contexts,
      collections,
      validation,
    };
  }

  private parseDatasetBody(): {
    collections: CollectionDefinition[];
    validation?: ValidationBlock;
  } {
    const collections: CollectionDefinition[] = [];
    let validation: ValidationBlock | undefined;

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      if (this.check(TokenType.VALIDATE)) {
        validation = this.parseValidationBlock();
      } else {
        collections.push(this.parseCollectionDefinition());
      }
      this.match(TokenType.COMMA);
    }

    return { collections, validation };
  }

  private parseCollectionDefinition(): CollectionDefinition {
    const name = this.consume(TokenType.IDENTIFIER, 'Expected collection name').value;
    this.consume(TokenType.COLON, "Expected ':'");

    const cardinality = this.parseCardinalityOrDynamic();

    let perParent: string | undefined;
    if (this.match(TokenType.PER)) {
      perParent = this.consume(TokenType.IDENTIFIER, 'Expected parent name').value;
    }

    this.consume(TokenType.OF, "Expected 'of'");
    const schemaRef = this.consume(TokenType.IDENTIFIER, 'Expected schema name').value;

    const contexts = this.parseContextApplications();

    let overrides: FieldDefinition[] | undefined;
    if (this.match(TokenType.LBRACE)) {
      overrides = [];
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        overrides.push(this.parseFieldDefinition());
        this.match(TokenType.COMMA);
      }
      this.consume(TokenType.RBRACE, "Expected '}'");
    }

    return {
      type: 'CollectionDefinition',
      name,
      cardinality,
      perParent,
      schemaRef,
      contexts,
      overrides,
    };
  }

  // ============================================
  // Validation blocks
  // ============================================

  private parseValidationBlock(): ValidationBlock {
    this.consume(TokenType.VALIDATE, "Expected 'validate'");
    this.consume(TokenType.LBRACE, "Expected '{'");

    const validations: Expression[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      validations.push(this.parseExpression());
      this.match(TokenType.COMMA);
    }

    this.consume(TokenType.RBRACE, "Expected '}'");
    return { type: 'ValidationBlock', validations };
  }
}
