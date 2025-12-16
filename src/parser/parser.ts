import { Token, TokenType } from "../lexer/index.js";
import {
  Program,
  Statement,
  ImportStatement,
  LetStatement,
  SchemaDefinition,
  ContextDefinition,
  DistributionDefinition,
  DatasetDefinition,
  FieldDefinition,
  Expression,
  Literal,
  Identifier,
  QualifiedName,
  BinaryExpression,
  CallExpression,
  SuperpositionExpression,
  WeightedOption,
  RangeExpression,
  ParentReference,
  AnyOfExpression,
  MatchExpression,
  MatchArm,
  ContextApplication,
  AffectsClause,
  DistributionBucket,
  CollectionDefinition,
  Cardinality,
  DynamicCardinality,
  ConstraintBlock,
  ValidationBlock,
  FieldType,
  PrimitiveType,
  RangeType,
  AssumeClause,
  LogicalExpression,
  NotExpression,
  GeneratorType,
  ThenBlock,
  Mutation,
  TernaryExpression,
} from "../ast/index.js";

export class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens.filter((t) => t.type !== TokenType.NEWLINE);
  }

  parse(): Program {
    const statements: Statement[] = [];

    while (!this.isAtEnd()) {
      const stmt = this.parseStatement();
      if (stmt) statements.push(stmt);
    }

    return { type: "Program", statements };
  }

  private parseStatement(): Statement | null {
    if (this.check(TokenType.IMPORT)) return this.parseImport();
    if (this.check(TokenType.LET)) return this.parseLet();
    if (this.check(TokenType.SCHEMA)) return this.parseSchema();
    if (this.check(TokenType.CONTEXT)) return this.parseContext();
    if (this.check(TokenType.DISTRIBUTION)) return this.parseDistribution();
    if (this.check(TokenType.DATASET)) return this.parseDataset();

    throw this.error(`Unexpected token: ${this.peek().value}`);
  }

  private parseImport(): ImportStatement {
    this.consume(TokenType.IMPORT, "Expected 'import'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected import name").value;
    this.consume(TokenType.FROM, "Expected 'from'");
    const path = this.consume(TokenType.STRING, "Expected import path").value;

    return { type: "ImportStatement", name, path };
  }

  private parseLet(): LetStatement {
    this.consume(TokenType.LET, "Expected 'let'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected variable name").value;
    this.consume(TokenType.EQUALS, "Expected '='");
    const value = this.parseExpression();

    return { type: "LetStatement", name, value };
  }

  private parseSchema(): SchemaDefinition {
    this.consume(TokenType.SCHEMA, "Expected 'schema'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected schema name").value;

    let base: QualifiedName | undefined;
    if (this.match(TokenType.FROM)) {
      base = this.parseQualifiedName();
    }

    const contexts = this.parseContextApplications();

    this.consume(TokenType.LBRACE, "Expected '{'");
    const { fields, constraints, assumes } = this.parseSchemaBody();
    this.consume(TokenType.RBRACE, "Expected '}'");

    // Optional then block after schema: schema X { ... } then { ... }
    let thenBlock: ThenBlock | undefined;
    if (this.match(TokenType.THEN)) {
      thenBlock = this.parseThenBlock();
    }

    return { type: "SchemaDefinition", name, base, contexts, fields, constraints, assumes, thenBlock };
  }

  private parseThenBlock(): ThenBlock {
    this.consume(TokenType.LBRACE, "Expected '{'");
    const mutations: Mutation[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      mutations.push(this.parseMutation());
      this.match(TokenType.COMMA);
    }

    this.consume(TokenType.RBRACE, "Expected '}'");
    return { type: "ThenBlock", mutations };
  }

  private parseMutation(): Mutation {
    // Parse target: invoice.status or invoice.amount_paid
    const target = this.parseExpression();

    // Parse operator: = or +=
    let operator: "=" | "+=" = "=";
    if (this.match(TokenType.PLUS_EQUALS)) {
      operator = "+=";
    } else {
      this.consume(TokenType.EQUALS, "Expected '=' or '+='");
    }

    // Parse value expression
    const value = this.parseExpression();

    return { type: "Mutation", target, operator, value };
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

  private parseAssumeClause(): AssumeClause {
    this.consume(TokenType.ASSUME, "Expected 'assume'");

    // Check for conditional: assume if condition { ... }
    if (this.match(TokenType.IF)) {
      const condition = this.parseLogicalExpression();
      this.consume(TokenType.LBRACE, "Expected '{'");

      const constraints: Expression[] = [];
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        constraints.push(this.parseLogicalExpression());
        this.match(TokenType.COMMA);
      }

      this.consume(TokenType.RBRACE, "Expected '}'");
      return { type: "AssumeClause", condition, constraints };
    }

    // Simple assume: assume expr
    const constraint = this.parseLogicalExpression();
    return { type: "AssumeClause", constraints: [constraint] };
  }

  private parseFieldDefinition(): FieldDefinition {
    const name = this.consume(TokenType.IDENTIFIER, "Expected field name").value;
    this.consume(TokenType.COLON, "Expected ':'");

    // Check for computed field (= prefix)
    const computed = this.match(TokenType.EQUALS);

    // For computed fields, parse as expression (e.g., = sum(items) or = ^parent.field)
    if (computed) {
      const expr = this.parseExpression();
      const optional = this.match(TokenType.QUESTION);

      return {
        type: "FieldDefinition",
        name,
        fieldType: { type: "ReferenceType", path: { type: "QualifiedName", parts: ["computed"] } },
        optional,
        computed: true,
        distribution: expr,
      };
    }

    const fieldType = this.parseFieldType();
    const optional = this.match(TokenType.QUESTION);

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

    return {
      type: "FieldDefinition",
      name,
      fieldType,
      optional,
      computed,
      condition,
      distribution,
      constraints,
    };
  }

  private parseFieldType(): FieldType {
    // Check for primitive types with range: int in 18..65
    // Also handles generator types: uuid(), faker.email()
    if (this.checkPrimitive()) {
      const primitiveOrGenerator = this.parsePrimitiveType();

      // If null, the identifier wasn't a primitive or generator - fall through to expression
      if (primitiveOrGenerator !== null) {
        if (this.match(TokenType.IN)) {
          const range = this.parseRangeExpression();
          if (primitiveOrGenerator.type !== "PrimitiveType") {
            throw this.error("Range type requires a primitive base type (int, decimal, date)");
          }
          return {
            type: "RangeType",
            baseType: primitiveOrGenerator,
            min: range.min,
            max: range.max,
          } as RangeType;
        }

        // Check for nullable shorthand: string?, int?
        if (this.match(TokenType.QUESTION)) {
          const baseExpr: Expression = primitiveOrGenerator.type === "PrimitiveType"
            ? { type: "Identifier", name: primitiveOrGenerator.name }
            : { type: "Identifier", name: primitiveOrGenerator.name };
          const nullLiteral: Expression = { type: "Literal", value: null, dataType: "null" };
          return { type: "SuperpositionType", options: [{ value: baseExpr }, { value: nullLiteral }] };
        }

        // Check for superposition: string | null, int | "special"
        if (this.check(TokenType.PIPE)) {
          // Convert primitive to an identifier-like expression for superposition parsing
          const baseExpr: Expression = primitiveOrGenerator.type === "PrimitiveType"
            ? { type: "Identifier", name: primitiveOrGenerator.name }
            : { type: "Identifier", name: primitiveOrGenerator.name };

          const options: WeightedOption[] = [{ value: baseExpr }];
          while (this.match(TokenType.PIPE)) {
            const nextExpr = this.parsePrimary();
            options.push({ value: nextExpr });
          }
          return { type: "SuperpositionType", options };
        }

        return primitiveOrGenerator;
      }
    }

    // Check for cardinality: 100 * Company or 1..10 * LineItem
    // BUT NOT weighted superposition like 0.7: "paid"
    if (this.check(TokenType.NUMBER) && this.isCardinalityNotWeight()) {
      return this.parseCollectionType();
    }

    // Check for dynamic cardinality: (condition ? 1..5 : 10..20) * Item
    if (this.check(TokenType.LPAREN) && this.isDynamicCardinality()) {
      return this.parseCollectionType();
    }

    // Reference type or superposition starting with identifier
    return this.parseExpressionAsFieldType();
  }

  private isCardinalityNotWeight(): boolean {
    // Look ahead: if NUMBER is followed by COLON, it's a weight not cardinality
    // Cardinality: 100 * or 1..10 *
    // Weight: 0.7: "paid"
    const saved = this.pos;
    this.advance(); // consume number

    // Check if next token indicates cardinality (*, ..) vs weight (:)
    const next = this.peek().type;
    this.pos = saved; // restore position

    return next === TokenType.STAR || next === TokenType.DOTDOT || next === TokenType.PER;
  }

  private isDynamicCardinality(): boolean {
    // Look ahead to determine if ( starts a dynamic cardinality expression
    // that ends with ) * (followed by a type)
    // This is a heuristic - we scan for ) * pattern
    const saved = this.pos;
    let depth = 0;

    while (!this.isAtEnd()) {
      const token = this.peek();
      if (token.type === TokenType.LPAREN) {
        depth++;
      } else if (token.type === TokenType.RPAREN) {
        depth--;
        if (depth === 0) {
          this.advance(); // consume the )
          const afterParen = this.peek().type;
          this.pos = saved;
          // If ) is followed by *, it's a dynamic cardinality
          return afterParen === TokenType.STAR || afterParen === TokenType.PER;
        }
      }
      this.advance();
    }

    this.pos = saved;
    return false;
  }

  private parseCollectionType(): FieldType {
    const cardinality = this.parseCardinalityOrDynamic();

    let perParent: QualifiedName | undefined;
    if (this.match(TokenType.PER)) {
      perParent = this.parseQualifiedName();
    }

    this.consume(TokenType.STAR, "Expected '*'");
    const elementType = this.parseFieldType();

    return {
      type: "CollectionType",
      cardinality,
      elementType,
      perParent,
    };
  }

  private parseCardinalityOrDynamic(): Cardinality | DynamicCardinality {
    // Dynamic cardinality: (expression) where expression evaluates to number or range
    if (this.match(TokenType.LPAREN)) {
      const expression = this.parseExpression();
      this.consume(TokenType.RPAREN, "Expected ')'");
      return { type: "DynamicCardinality", expression };
    }

    // Static cardinality: 100 or 1..10
    return this.parseCardinality();
  }

  private parseCardinality(): Cardinality {
    const min = parseInt(this.consume(TokenType.NUMBER, "Expected number").value, 10);

    if (this.match(TokenType.DOTDOT)) {
      const max = parseInt(this.consume(TokenType.NUMBER, "Expected number").value, 10);
      return { type: "Cardinality", min, max };
    }

    return { type: "Cardinality", min, max: min };
  }

  private parsePrimitiveType(): PrimitiveType | GeneratorType | null {
    if (this.match(TokenType.INT)) return { type: "PrimitiveType", name: "int" };
    if (this.match(TokenType.DECIMAL)) return { type: "PrimitiveType", name: "decimal" };
    if (this.match(TokenType.DATE)) return { type: "PrimitiveType", name: "date" };

    const id = this.consume(TokenType.IDENTIFIER, "Expected type name").value;
    if (id === "string") return { type: "PrimitiveType", name: "string" };
    if (id === "boolean") return { type: "PrimitiveType", name: "boolean" };

    // Check if this is a generator type: qualified (faker.uuid) or with args (uuid())
    // Otherwise return null to let caller treat as schema reference
    let name = id;
    let isGenerator = false;

    // Handle qualified names: faker.uuid, faker.person.firstName
    if (this.check(TokenType.DOT)) {
      isGenerator = true;
      while (this.match(TokenType.DOT)) {
        const part = this.consume(TokenType.IDENTIFIER, "Expected identifier after '.'").value;
        name += "." + part;
      }
    }

    // Handle arguments: phone("US"), uuid()
    const args: Expression[] = [];
    if (this.check(TokenType.LPAREN)) {
      isGenerator = true;
      this.advance(); // consume LPAREN
      if (!this.check(TokenType.RPAREN)) {
        do {
          args.push(this.parseExpression());
        } while (this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RPAREN, "Expected ')' after arguments");
    }

    if (isGenerator) {
      return { type: "GeneratorType", name, arguments: args };
    }

    // Bare identifier - not a primitive, not a generator, return null
    // Caller should handle as schema reference
    // But we need to "unconsume" the identifier - restore position
    this.pos--;
    return null;
  }

  private checkPrimitive(): boolean {
    // Accept any identifier as a potential type (primitives or generators)
    return (
      this.check(TokenType.INT) ||
      this.check(TokenType.DECIMAL) ||
      this.check(TokenType.DATE) ||
      this.check(TokenType.IDENTIFIER)
    );
  }

  private parseExpressionAsFieldType(): FieldType {
    const expr = this.parseExpression();

    if (expr.type === "SuperpositionExpression") {
      return {
        type: "SuperpositionType",
        options: expr.options,
      };
    }

    // A single literal (like "unpaid") is treated as a single-value superposition
    if (expr.type === "Literal") {
      return {
        type: "SuperpositionType",
        options: [{ value: expr }],
      };
    }

    if (expr.type === "QualifiedName" || expr.type === "Identifier") {
      return {
        type: "ReferenceType",
        path: expr.type === "Identifier"
          ? { type: "QualifiedName", parts: [expr.name] }
          : expr,
      };
    }

    // Handle AnyOfExpression and ParentReference as expression types
    if (expr.type === "AnyOfExpression" || expr.type === "ParentReference") {
      return {
        type: "ExpressionType",
        expression: expr,
      };
    }

    throw this.error(`Cannot use expression as field type: ${expr.type}`);
  }

  private parseContext(): ContextDefinition {
    this.consume(TokenType.CONTEXT, "Expected 'context'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected context name").value;

    // Optional parameters: context Deprivation(decile: 1..10)
    // TODO: parse parameters

    this.consume(TokenType.LBRACE, "Expected '{'");
    const { fields, affects } = this.parseContextBody();
    this.consume(TokenType.RBRACE, "Expected '}'");

    return { type: "ContextDefinition", name, fields, affects };
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
    const field = this.consume(TokenType.IDENTIFIER, "Expected field name").value;
    this.consume(TokenType.ARROW, "Expected '=>'");
    const expression = this.parseExpression();

    return { type: "AffectsClause", field, expression };
  }

  private parseDistribution(): DistributionDefinition {
    this.consume(TokenType.DISTRIBUTION, "Expected 'distribution'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected distribution name").value;

    this.consume(TokenType.LBRACE, "Expected '{'");
    const buckets = this.parseDistributionBuckets();
    this.consume(TokenType.RBRACE, "Expected '}'");

    return { type: "DistributionDefinition", name, buckets };
  }

  private parseDistributionBuckets(): DistributionBucket[] {
    const buckets: DistributionBucket[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      // Parse bucket range: 0..17 or "single_value"
      const range = this.parseDistributionRange();
      this.consume(TokenType.COLON, "Expected ':'");
      const weightToken = this.consume(TokenType.NUMBER, "Expected weight");
      this.consume(TokenType.PERCENT, "Expected '%'");

      const weight = parseFloat(weightToken.value) / 100;

      buckets.push({
        type: "DistributionBucket",
        range: range as RangeExpression | Expression,
        weight,
      });

      this.match(TokenType.COMMA);
    }

    return buckets;
  }

  private parseDistributionRange(): Expression {
    // Parse range like 0..17 or single value like "string_value"
    // Don't parse colon as comparison

    if (this.check(TokenType.STRING)) {
      const value = this.advance().value;
      return { type: "Literal", value, dataType: "string" };
    }

    // Number or range
    const min = this.parsePrimary();

    if (this.match(TokenType.DOTDOT)) {
      const max = this.check(TokenType.NUMBER) ? this.parsePrimary() : undefined;
      return { type: "RangeExpression", min, max };
    }

    return min;
  }

  private parseDataset(): DatasetDefinition {
    this.consume(TokenType.DATASET, "Expected 'dataset'");
    const name = this.consume(TokenType.IDENTIFIER, "Expected dataset name").value;

    const contexts = this.parseContextApplications();

    this.consume(TokenType.LBRACE, "Expected '{'");
    const { collections, validation } = this.parseDatasetBody();
    this.consume(TokenType.RBRACE, "Expected '}'");

    return { type: "DatasetDefinition", name, contexts, collections, validation };
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
    const name = this.consume(TokenType.IDENTIFIER, "Expected collection name").value;
    this.consume(TokenType.COLON, "Expected ':'");

    const cardinality = this.parseCardinalityOrDynamic();

    let perParent: string | undefined;
    if (this.match(TokenType.PER)) {
      perParent = this.consume(TokenType.IDENTIFIER, "Expected parent name").value;
    }

    this.consume(TokenType.STAR, "Expected '*'");
    const schemaRef = this.consume(TokenType.IDENTIFIER, "Expected schema name").value;

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
      type: "CollectionDefinition",
      name,
      cardinality,
      perParent,
      schemaRef,
      contexts,
      overrides,
    };
  }

  private parseConstraintBlock(): ConstraintBlock {
    this.consume(TokenType.CONSTRAINTS, "Expected 'constraints'");
    this.consume(TokenType.LBRACE, "Expected '{'");

    const constraints: Expression[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      constraints.push(this.parseExpression());
      this.match(TokenType.COMMA);
    }

    this.consume(TokenType.RBRACE, "Expected '}'");
    return { type: "ConstraintBlock", constraints };
  }

  private parseValidationBlock(): ValidationBlock {
    this.consume(TokenType.VALIDATE, "Expected 'validate'");
    this.consume(TokenType.LBRACE, "Expected '{'");

    const validations: Expression[] = [];
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      validations.push(this.parseExpression());
      this.match(TokenType.COMMA);
    }

    this.consume(TokenType.RBRACE, "Expected '}'");
    return { type: "ValidationBlock", validations };
  }

  private parseContextApplications(): ContextApplication[] | undefined {
    if (!this.match(TokenType.WITH)) return undefined;

    const contexts: ContextApplication[] = [];
    do {
      contexts.push(this.parseContextApplication());
    } while (this.match(TokenType.COMMA));

    return contexts;
  }

  private parseContextApplication(): ContextApplication {
    const name = this.consume(TokenType.IDENTIFIER, "Expected context name").value;
    const args: Expression[] = [];

    if (this.match(TokenType.LPAREN)) {
      if (!this.check(TokenType.RPAREN)) {
        do {
          args.push(this.parseExpression());
        } while (this.match(TokenType.COMMA));
      }
      this.consume(TokenType.RPAREN, "Expected ')'");
    }

    return { type: "ContextApplication", name, arguments: args };
  }

  // Expression parsing with precedence (lowest to highest):
  // ternary → or → and → not → comparison → superposition → range → additive → multiplicative → unary → call → primary
  private parseExpression(): Expression {
    return this.parseTernary();
  }

  // Ternary: condition ? consequent : alternate
  private parseTernary(): Expression {
    const condition = this.parseOr();

    if (this.match(TokenType.QUESTION)) {
      // Parse consequent - can be a ternary (for nesting) but not a weighted superposition
      const consequent = this.parseTernaryBranch();
      this.consume(TokenType.COLON, "Expected ':' in ternary expression");
      // Parse alternate - can also be a ternary (for chaining like a ? b : c ? d : e)
      const alternate = this.parseTernaryBranch();
      return {
        type: "TernaryExpression",
        condition,
        consequent,
        alternate,
      } as TernaryExpression;
    }

    return condition;
  }

  // Parse a ternary branch (consequent or alternate)
  // Allows nested ternaries and logical ops but not weighted superpositions
  private parseTernaryBranch(): Expression {
    const expr = this.parseTernaryBranchOr();

    // Allow nested ternary
    if (this.match(TokenType.QUESTION)) {
      const consequent = this.parseTernaryBranch();
      this.consume(TokenType.COLON, "Expected ':' in ternary expression");
      const alternate = this.parseTernaryBranch();
      return {
        type: "TernaryExpression",
        condition: expr,
        consequent,
        alternate,
      } as TernaryExpression;
    }

    return expr;
  }

  // Logical OR within ternary branch (skips superposition to avoid weight/colon conflict)
  private parseTernaryBranchOr(): Expression {
    let left = this.parseTernaryBranchAnd();

    while (this.match(TokenType.OR)) {
      const right = this.parseTernaryBranchAnd();
      left = { type: "LogicalExpression", operator: "or", left, right } as LogicalExpression;
    }

    return left;
  }

  // Logical AND within ternary branch
  private parseTernaryBranchAnd(): Expression {
    let left = this.parseTernaryBranchNot();

    while (this.match(TokenType.AND)) {
      const right = this.parseTernaryBranchNot();
      left = { type: "LogicalExpression", operator: "and", left, right } as LogicalExpression;
    }

    return left;
  }

  // Logical NOT within ternary branch
  private parseTernaryBranchNot(): Expression {
    if (this.match(TokenType.NOT)) {
      const operand = this.parseTernaryBranchNot();
      return { type: "NotExpression", operand } as NotExpression;
    }

    // Skip superposition, go directly to comparison
    return this.parseComparison();
  }

  // Logical OR (lowest precedence logical operator)
  private parseOr(): Expression {
    let left = this.parseAnd();

    while (this.match(TokenType.OR)) {
      const right = this.parseAnd();
      left = { type: "LogicalExpression", operator: "or", left, right } as LogicalExpression;
    }

    return left;
  }

  // Logical AND
  private parseAnd(): Expression {
    let left = this.parseNot();

    while (this.match(TokenType.AND)) {
      const right = this.parseNot();
      left = { type: "LogicalExpression", operator: "and", left, right } as LogicalExpression;
    }

    return left;
  }

  // Logical NOT (highest precedence logical operator)
  private parseNot(): Expression {
    if (this.match(TokenType.NOT)) {
      const operand = this.parseNot();
      return { type: "NotExpression", operand } as NotExpression;
    }

    return this.parseSuperposition();
  }

  // For backward compatibility - parseLogicalExpression now just calls parseOr
  private parseLogicalExpression(): Expression {
    return this.parseOr();
  }

  private parseSuperposition(): Expression {
    const first = this.parseSuperpositionOption();

    if (this.check(TokenType.PIPE)) {
      const options: WeightedOption[] = [first];

      while (this.match(TokenType.PIPE)) {
        options.push(this.parseSuperpositionOption());
      }

      return { type: "SuperpositionExpression", options };
    }

    // Not a superposition, return the value (ignore any weight)
    return first.value;
  }

  // Parse a single superposition option: either "value" or "0.7: value"
  private parseSuperpositionOption(): WeightedOption {
    const expr = this.parseComparison();

    // Check if this is a weighted option: number followed by colon
    if (expr.type === "Literal" && expr.dataType === "number" && this.check(TokenType.COLON)) {
      this.advance(); // consume the colon
      const value = this.parseComparison();
      return { weight: expr.value as number, value };
    }

    return { value: expr };
  }

  private parseComparison(): Expression {
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
      left = { type: "BinaryExpression", operator, left, right };
    }

    return left;
  }

  private parseRange(): Expression {
    let left = this.parseAdditive();

    if (this.match(TokenType.DOTDOT)) {
      const right = this.check(TokenType.NUMBER) ? this.parseAdditive() : undefined;
      return { type: "RangeExpression", min: left, max: right };
    }

    return left;
  }

  private parseAdditive(): Expression {
    let left = this.parseMultiplicative();

    while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) {
      const operator = this.advance().value;
      const right = this.parseMultiplicative();
      left = { type: "BinaryExpression", operator, left, right };
    }

    return left;
  }

  private parseMultiplicative(): Expression {
    let left = this.parseUnary();

    while (this.check(TokenType.STAR) || this.check(TokenType.SLASH)) {
      const operator = this.advance().value;
      const right = this.parseUnary();
      left = { type: "BinaryExpression", operator, left, right };
    }

    return left;
  }

  private parseUnary(): Expression {
    if (this.match(TokenType.CARET)) {
      const path = this.parseQualifiedName();
      return { type: "ParentReference", path };
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

        if (expr.type === "Identifier") {
          expr = { type: "CallExpression", callee: expr.name, arguments: args };
        } else if (expr.type === "QualifiedName") {
          expr = { type: "CallExpression", callee: expr.parts.join("."), arguments: args };
        }
      } else if (this.match(TokenType.DOT)) {
        const name = this.consume(TokenType.IDENTIFIER, "Expected property name").value;
        if (expr.type === "Identifier") {
          expr = { type: "QualifiedName", parts: [expr.name, name] };
        } else if (expr.type === "QualifiedName") {
          expr.parts.push(name);
        }
      } else {
        break;
      }
    }

    return expr;
  }

  private parsePrimary(): Expression {
    // Match expression
    if (this.match(TokenType.MATCH)) {
      return this.parseMatchExpression();
    }

    // Any of expression
    if (this.match(TokenType.ANY)) {
      this.consume(TokenType.OF, "Expected 'of'");
      const collection = this.parseExpression();
      let condition: Expression | undefined;
      if (this.match(TokenType.WHERE)) {
        condition = this.parseExpression();
      }
      return { type: "AnyOfExpression", collection, condition };
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
      return { type: "Literal", value, dataType: "number" };
    }

    // String literal
    if (this.check(TokenType.STRING)) {
      const value = this.advance().value;
      return { type: "Literal", value, dataType: "string" };
    }

    // Null literal
    if (this.match(TokenType.NULL)) {
      return { type: "Literal", value: null, dataType: "null" };
    }

    // Boolean literals
    if (this.match(TokenType.TRUE)) {
      return { type: "Literal", value: true, dataType: "boolean" };
    }
    if (this.match(TokenType.FALSE)) {
      return { type: "Literal", value: false, dataType: "boolean" };
    }

    // Identifier
    if (this.check(TokenType.IDENTIFIER)) {
      const name = this.advance().value;
      return { type: "Identifier", name };
    }

    // .field shorthand for current scope field access
    if (this.match(TokenType.DOT)) {
      const name = this.consume(TokenType.IDENTIFIER, "Expected field name after '.'").value;
      return { type: "Identifier", name };
    }

    throw this.error(`Unexpected token: ${this.peek().value}`);
  }

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
    return { type: "MatchExpression", value, arms };
  }

  private parseQualifiedName(): QualifiedName {
    const parts: string[] = [];
    parts.push(this.consume(TokenType.IDENTIFIER, "Expected identifier").value);

    while (this.match(TokenType.DOT)) {
      parts.push(this.consume(TokenType.IDENTIFIER, "Expected identifier").value);
    }

    return { type: "QualifiedName", parts };
  }

  private parseRangeExpression(): RangeExpression {
    const min = this.parseAdditive();
    this.consume(TokenType.DOTDOT, "Expected '..'");
    const max = this.check(TokenType.RBRACE) || this.check(TokenType.COMMA)
      ? undefined
      : this.parseAdditive();
    return { type: "RangeExpression", min, max };
  }

  // Utility methods
  private peek(): Token {
    return this.tokens[this.pos];
  }

  private check(type: TokenType): boolean {
    return !this.isAtEnd() && this.peek().type === type;
  }

  private match(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.pos++;
    return this.tokens[this.pos - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw this.error(message);
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private error(message: string): Error {
    const token = this.peek();
    return new Error(`Parse error at line ${token.line}, column ${token.column}: ${message}`);
  }
}
