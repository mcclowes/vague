import { describe, it, expect } from "vitest";
import { Lexer } from "./lexer.js";
import { TokenType } from "./tokens.js";

describe("Lexer", () => {
  it("tokenizes simple let statement", () => {
    const lexer = new Lexer('let x = 5');
    const tokens = lexer.tokenize();

    expect(tokens[0]).toMatchObject({ type: TokenType.LET, value: "let" });
    expect(tokens[1]).toMatchObject({ type: TokenType.IDENTIFIER, value: "x" });
    expect(tokens[2]).toMatchObject({ type: TokenType.EQUALS, value: "=" });
    expect(tokens[3]).toMatchObject({ type: TokenType.NUMBER, value: "5" });
    expect(tokens[4]).toMatchObject({ type: TokenType.EOF });
  });

  it("tokenizes superposition with pipe", () => {
    const lexer = new Lexer('"draft" | "sent" | "paid"');
    const tokens = lexer.tokenize();

    expect(tokens[0]).toMatchObject({ type: TokenType.STRING, value: "draft" });
    expect(tokens[1]).toMatchObject({ type: TokenType.PIPE });
    expect(tokens[2]).toMatchObject({ type: TokenType.STRING, value: "sent" });
    expect(tokens[3]).toMatchObject({ type: TokenType.PIPE });
    expect(tokens[4]).toMatchObject({ type: TokenType.STRING, value: "paid" });
  });

  it("tokenizes weighted superposition", () => {
    const lexer = new Lexer('0.7: "paid" | 0.3: "pending"');
    const tokens = lexer.tokenize();

    expect(tokens[0]).toMatchObject({ type: TokenType.NUMBER, value: "0.7" });
    expect(tokens[1]).toMatchObject({ type: TokenType.COLON });
    expect(tokens[2]).toMatchObject({ type: TokenType.STRING, value: "paid" });
    expect(tokens[3]).toMatchObject({ type: TokenType.PIPE });
    expect(tokens[4]).toMatchObject({ type: TokenType.NUMBER, value: "0.3" });
    expect(tokens[5]).toMatchObject({ type: TokenType.COLON });
    expect(tokens[6]).toMatchObject({ type: TokenType.STRING, value: "pending" });
  });

  it("tokenizes range", () => {
    const lexer = new Lexer("int in 18..65");
    const tokens = lexer.tokenize();

    expect(tokens[0]).toMatchObject({ type: TokenType.INT });
    expect(tokens[1]).toMatchObject({ type: TokenType.IN });
    expect(tokens[2]).toMatchObject({ type: TokenType.NUMBER, value: "18" });
    expect(tokens[3]).toMatchObject({ type: TokenType.DOTDOT });
    expect(tokens[4]).toMatchObject({ type: TokenType.NUMBER, value: "65" });
  });

  it("tokenizes schema definition", () => {
    const lexer = new Lexer("schema Invoice from codat.Invoice { }");
    const tokens = lexer.tokenize();

    expect(tokens[0]).toMatchObject({ type: TokenType.SCHEMA });
    expect(tokens[1]).toMatchObject({ type: TokenType.IDENTIFIER, value: "Invoice" });
    expect(tokens[2]).toMatchObject({ type: TokenType.FROM });
    expect(tokens[3]).toMatchObject({ type: TokenType.IDENTIFIER, value: "codat" });
    expect(tokens[4]).toMatchObject({ type: TokenType.DOT });
    expect(tokens[5]).toMatchObject({ type: TokenType.IDENTIFIER, value: "Invoice" });
    expect(tokens[6]).toMatchObject({ type: TokenType.LBRACE });
    expect(tokens[7]).toMatchObject({ type: TokenType.RBRACE });
  });

  it("tokenizes tilde operator", () => {
    const lexer = new Lexer("age: int ~ AgeStructure");
    const tokens = lexer.tokenize();

    expect(tokens[2]).toMatchObject({ type: TokenType.INT });
    expect(tokens[3]).toMatchObject({ type: TokenType.TILDE });
    expect(tokens[4]).toMatchObject({ type: TokenType.IDENTIFIER, value: "AgeStructure" });
  });

  it("tokenizes parent reference", () => {
    const lexer = new Lexer("currency: = ^company.currency");
    const tokens = lexer.tokenize();

    expect(tokens[3]).toMatchObject({ type: TokenType.CARET });
    expect(tokens[4]).toMatchObject({ type: TokenType.IDENTIFIER, value: "company" });
  });

  it("tokenizes cardinality", () => {
    const lexer = new Lexer("companies: 100 * Company");
    const tokens = lexer.tokenize();

    expect(tokens[2]).toMatchObject({ type: TokenType.NUMBER, value: "100" });
    expect(tokens[3]).toMatchObject({ type: TokenType.STAR });
    expect(tokens[4]).toMatchObject({ type: TokenType.IDENTIFIER, value: "Company" });
  });

  it("tokenizes comparison operators", () => {
    const lexer = new Lexer("a < b <= c == d >= e > f");
    const tokens = lexer.tokenize();

    expect(tokens[1]).toMatchObject({ type: TokenType.LT });
    expect(tokens[3]).toMatchObject({ type: TokenType.LTE });
    expect(tokens[5]).toMatchObject({ type: TokenType.DOUBLE_EQUALS });
    expect(tokens[7]).toMatchObject({ type: TokenType.GTE });
    expect(tokens[9]).toMatchObject({ type: TokenType.GT });
  });

  it("skips line comments", () => {
    const lexer = new Lexer("let x = 5 // this is a comment\nlet y = 10");
    const tokens = lexer.tokenize();

    const identifiers = tokens.filter((t) => t.type === TokenType.IDENTIFIER);
    expect(identifiers).toHaveLength(2);
    expect(identifiers[0].value).toBe("x");
    expect(identifiers[1].value).toBe("y");
  });

  it("handles string escapes", () => {
    const lexer = new Lexer('"hello\\nworld"');
    const tokens = lexer.tokenize();

    expect(tokens[0]).toMatchObject({ type: TokenType.STRING, value: "hello\nworld" });
  });

  it("tracks line and column numbers", () => {
    const lexer = new Lexer("let x = 5\nlet y = 10");
    const tokens = lexer.tokenize();

    expect(tokens[0]).toMatchObject({ line: 1, column: 1 });
    // After newline, "let" should be on line 2
    const secondLet = tokens.find(
      (t) => t.type === TokenType.LET && t.line === 2
    );
    expect(secondLet).toBeDefined();
  });
});
