export { Lexer, Token, TokenType } from "./lexer/index.js";
export { Parser } from "./parser/index.js";
export * from "./ast/index.js";
export { Generator } from "./interpreter/index.js";
export { OpenAPILoader, ImportedSchema } from "./openapi/index.js";

import { Lexer } from "./lexer/index.js";
import { Parser } from "./parser/index.js";
import { Generator } from "./interpreter/index.js";

export async function compile(source: string): Promise<Record<string, unknown[]>> {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();

  const parser = new Parser(tokens);
  const ast = parser.parse();

  const generator = new Generator();
  return generator.generate(ast);
}

export function parse(source: string) {
  const lexer = new Lexer(source);
  const tokens = lexer.tokenize();
  const parser = new Parser(tokens);
  return parser.parse();
}
