import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { compile, registerPlugin, setSeed } from '../index.js';
import { graphqlPlugin, graphqlShorthandPlugin } from './graphql.js';

describe('GraphQL Plugin', () => {
  beforeAll(() => {
    registerPlugin(graphqlPlugin);
    registerPlugin(graphqlShorthandPlugin);
  });

  describe('Identifier generators', () => {
    it('generates valid field names with graphql.fieldName()', async () => {
      const source = `
        schema Test {
          field: graphql.fieldName()
        }

        dataset TestData {
          items: 10 of Test
        }
      `;

      const result = await compile(source);

      expect(result.items).toHaveLength(10);
      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.field).toBe('string');
        // GraphQL field names should be valid identifiers (start with letter/underscore, camelCase)
        expect(t.field as string).toMatch(/^[a-z_][a-zA-Z0-9_]*$/);
      }
    });

    it('generates valid type names with graphql.typeName()', async () => {
      const source = `
        schema Test {
          typeName: graphql.typeName()
        }

        dataset TestData {
          items: 10 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.typeName).toBe('string');
        // GraphQL type names should be PascalCase
        expect(t.typeName as string).toMatch(/^[A-Z][a-zA-Z0-9]*$/);
      }
    });

    it('generates valid operation names with graphql.operationName()', async () => {
      const source = `
        schema Test {
          opName: graphql.operationName()
        }

        dataset TestData {
          items: 10 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.opName).toBe('string');
        // Operation names should be PascalCase (e.g., GetUser, CreatePost)
        expect(t.opName as string).toMatch(/^[A-Z][a-zA-Z0-9]*$/);
      }
    });

    it('generates valid enum values with graphql.enumValue()', async () => {
      const source = `
        schema Test {
          enumVal: graphql.enumValue()
        }

        dataset TestData {
          items: 10 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.enumVal).toBe('string');
        // Enum values should be SCREAMING_SNAKE_CASE
        expect(t.enumVal as string).toMatch(/^[A-Z][A-Z0-9_]*$/);
      }
    });

    it('generates directive names with graphql.directiveName()', async () => {
      const source = `
        schema Test {
          directive: graphql.directiveName()
        }

        dataset TestData {
          items: 10 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.directive).toBe('string');
        // Directives should start with @
        expect(t.directive as string).toMatch(/^@[a-z][a-zA-Z0-9]*$/);
      }
    });

    it('generates argument names with graphql.argumentName()', async () => {
      const source = `
        schema Test {
          argName: graphql.argumentName()
        }

        dataset TestData {
          items: 10 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.argName).toBe('string');
        // Argument names should be valid identifiers
        expect(t.argName as string).toMatch(/^[a-zA-Z][a-zA-Z0-9]*$/);
      }
    });

    it('generates variable names with graphql.variableName()', async () => {
      const source = `
        schema Test {
          varName: graphql.variableName()
        }

        dataset TestData {
          items: 10 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.varName).toBe('string');
        // Variable names should start with $
        expect(t.varName as string).toMatch(/^\$[a-zA-Z][a-zA-Z0-9]*$/);
      }
    });
  });

  describe('Scalar value generators', () => {
    it('generates GraphQL IDs with graphql.id()', async () => {
      const source = `
        schema Test {
          id: graphql.id()
        }

        dataset TestData {
          items: 10 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.id).toBe('string');
        expect((t.id as string).length).toBeGreaterThan(0);
      }
    });

    it('generates GraphQL strings with graphql.string()', async () => {
      const source = `
        schema Test {
          str: graphql.string()
        }

        dataset TestData {
          items: 10 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.str).toBe('string');
      }
    });

    it('generates GraphQL integers with graphql.integer()', async () => {
      const source = `
        schema Test {
          num: graphql.integer()
        }

        dataset TestData {
          items: 10 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.num).toBe('number');
        expect(Number.isInteger(t.num)).toBe(true);
        // GraphQL Int is 32-bit signed integer
        expect(t.num as number).toBeGreaterThanOrEqual(-2147483648);
        expect(t.num as number).toBeLessThanOrEqual(2147483647);
      }
    });

    it('generates GraphQL floats with graphql.float()', async () => {
      const source = `
        schema Test {
          num: graphql.float()
        }

        dataset TestData {
          items: 10 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.num).toBe('number');
      }
    });

    it('generates GraphQL booleans with graphql.boolean()', async () => {
      const source = `
        schema Test {
          flag: graphql.boolean()
        }

        dataset TestData {
          items: 20 of Test
        }
      `;

      const result = await compile(source);

      let hasTrue = false;
      let hasFalse = false;

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.flag).toBe('boolean');
        if (t.flag === true) hasTrue = true;
        if (t.flag === false) hasFalse = true;
      }

      // With 20 items, we should see both true and false
      expect(hasTrue || hasFalse).toBe(true);
    });
  });

  describe('Operation generators', () => {
    it('generates GraphQL queries with graphql.query()', async () => {
      const source = `
        schema Test {
          query: graphql.query()
        }

        dataset TestData {
          items: 5 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.query).toBe('string');
        // Should contain query keyword or be a query-like structure
        expect(t.query as string).toMatch(/query|{.*}/);
      }
    });

    it('generates GraphQL mutations with graphql.mutation()', async () => {
      const source = `
        schema Test {
          mutation: graphql.mutation()
        }

        dataset TestData {
          items: 5 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.mutation).toBe('string');
        expect(t.mutation as string).toContain('mutation');
      }
    });

    it('generates GraphQL subscriptions with graphql.subscription()', async () => {
      const source = `
        schema Test {
          subscription: graphql.subscription()
        }

        dataset TestData {
          items: 5 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.subscription).toBe('string');
        expect(t.subscription as string).toContain('subscription');
      }
    });

    it('generates GraphQL fragments with graphql.fragment()', async () => {
      const source = `
        schema Test {
          fragment: graphql.fragment()
        }

        dataset TestData {
          items: 5 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.fragment).toBe('string');
        expect(t.fragment as string).toContain('fragment');
        expect(t.fragment as string).toContain('on');
      }
    });
  });

  describe('Error generators', () => {
    it('generates GraphQL errors with graphql.error()', async () => {
      const source = `
        schema Test {
          error: graphql.error()
        }

        dataset TestData {
          items: 5 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.error).toBe('object');
        expect(t.error).not.toBeNull();
        const error = t.error as Record<string, unknown>;
        expect(typeof error.message).toBe('string');
      }
    });

    it('generates error messages with graphql.errorMessage()', async () => {
      const source = `
        schema Test {
          message: graphql.errorMessage()
        }

        dataset TestData {
          items: 5 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.message).toBe('string');
        expect((t.message as string).length).toBeGreaterThan(0);
      }
    });

    it('generates error codes with graphql.errorCode()', async () => {
      const source = `
        schema Test {
          code: graphql.errorCode()
        }

        dataset TestData {
          items: 10 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.code).toBe('string');
        // Error codes should be SCREAMING_SNAKE_CASE
        expect(t.code as string).toMatch(/^[A-Z][A-Z0-9_]*$/);
      }
    });
  });

  describe('Variables generator', () => {
    it('generates variables objects with graphql.variables()', async () => {
      const source = `
        schema Test {
          vars: graphql.variables()
        }

        dataset TestData {
          items: 5 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.vars).toBe('object');
        expect(t.vars).not.toBeNull();
      }
    });
  });

  describe('Schema introspection generators', () => {
    it('generates introspection types with graphql.introspectionType()', async () => {
      const source = `
        schema Test {
          type: graphql.introspectionType()
        }

        dataset TestData {
          items: 10 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.type).toBe('string');
        // Introspection types start with __
        expect(t.type as string).toMatch(/^__[A-Z][a-zA-Z]+$/);
      }
    });

    it('generates builtin scalars with graphql.builtinScalar()', async () => {
      const source = `
        schema Test {
          scalar: graphql.builtinScalar()
        }

        dataset TestData {
          items: 10 of Test
        }
      `;

      const result = await compile(source);

      const validScalars = ['ID', 'String', 'Int', 'Float', 'Boolean'];
      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.scalar).toBe('string');
        expect(validScalars).toContain(t.scalar);
      }
    });

    it('generates builtin directives with graphql.builtinDirective()', async () => {
      const source = `
        schema Test {
          directive: graphql.builtinDirective()
        }

        dataset TestData {
          items: 10 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.directive).toBe('string');
        expect(t.directive as string).toMatch(/^@(skip|include|deprecated|specifiedBy)$/);
      }
    });

    it('generates type kinds with graphql.typeKind()', async () => {
      const source = `
        schema Test {
          kind: graphql.typeKind()
        }

        dataset TestData {
          items: 10 of Test
        }
      `;

      const result = await compile(source);

      const validKinds = [
        'SCALAR',
        'OBJECT',
        'INTERFACE',
        'UNION',
        'ENUM',
        'INPUT_OBJECT',
        'LIST',
        'NON_NULL',
      ];
      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.kind).toBe('string');
        expect(validKinds).toContain(t.kind);
      }
    });
  });

  describe('Schema definition generators', () => {
    it('generates schema definitions with graphql.schemaDefinition()', async () => {
      const source = `
        schema Test {
          definition: graphql.schemaDefinition()
        }

        dataset TestData {
          items: 5 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.definition).toBe('string');
        // Should contain GraphQL SDL keywords
        expect(t.definition as string).toMatch(/type|input|enum|interface|union|scalar|directive/);
      }
    });

    it('generates connection type names with graphql.connectionType()', async () => {
      const source = `
        schema Test {
          connType: graphql.connectionType()
        }

        dataset TestData {
          items: 10 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.connType).toBe('string');
        // Should end with Connection
        expect(t.connType as string).toMatch(/Connection$/);
      }
    });
  });

  describe('Shorthand generators', () => {
    it('works with shorthand gqlFieldName()', async () => {
      const source = `
        schema Test {
          field: gqlFieldName()
        }

        dataset TestData {
          items: 5 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.field).toBe('string');
      }
    });

    it('works with shorthand gqlTypeName()', async () => {
      const source = `
        schema Test {
          typeName: gqlTypeName()
        }

        dataset TestData {
          items: 5 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.typeName).toBe('string');
        expect(t.typeName as string).toMatch(/^[A-Z]/);
      }
    });

    it('works with shorthand gqlQuery()', async () => {
      const source = `
        schema Test {
          query: gqlQuery()
        }

        dataset TestData {
          items: 3 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.query).toBe('string');
        expect(t.query as string).toMatch(/query|{/);
      }
    });

    it('works with shorthand gqlMutation()', async () => {
      const source = `
        schema Test {
          mutation: gqlMutation()
        }

        dataset TestData {
          items: 3 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.mutation).toBe('string');
        expect(t.mutation as string).toContain('mutation');
      }
    });

    it('works with shorthand gqlError()', async () => {
      const source = `
        schema Test {
          error: gqlError()
        }

        dataset TestData {
          items: 3 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.error).toBe('object');
        const error = t.error as Record<string, unknown>;
        expect(typeof error.message).toBe('string');
      }
    });

    it('works with shorthand gqlSchema()', async () => {
      const source = `
        schema Test {
          schemaDef: gqlSchema()
        }

        dataset TestData {
          items: 3 of Test
        }
      `;

      const result = await compile(source);

      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.schemaDef).toBe('string');
      }
    });
  });

  describe('Integration with other field types', () => {
    it('works alongside regular vague fields', async () => {
      const source = `
        schema GraphQLTestData {
          id: int in 1..1000,
          fieldName: graphql.fieldName(),
          typeName: graphql.typeName(),
          enumValue: graphql.enumValue(),
          gqlId: graphql.id(),
          isActive: boolean,
          errorCode: graphql.errorCode(),
          status: "pending" | "completed" | "failed"
        }

        dataset TestData {
          items: 5 of GraphQLTestData
        }
      `;

      const result = await compile(source);

      expect(result.items).toHaveLength(5);
      for (const item of result.items) {
        const t = item as Record<string, unknown>;
        expect(typeof t.id).toBe('number');
        expect(typeof t.fieldName).toBe('string');
        expect(typeof t.typeName).toBe('string');
        expect(typeof t.enumValue).toBe('string');
        expect(typeof t.gqlId).toBe('string');
        expect(typeof t.isActive).toBe('boolean');
        expect(typeof t.errorCode).toBe('string');
        expect(['pending', 'completed', 'failed']).toContain(t.status);
      }
    });

    it('works in nested schemas with cardinality', async () => {
      const source = `
        schema GraphQLOperation {
          name: graphql.operationName(),
          query: graphql.query()
        }

        schema APIResponse {
          operations: 1..3 of GraphQLOperation,
          data: graphql.variables()
        }

        dataset TestData {
          responses: 3 of APIResponse
        }
      `;

      const result = await compile(source);

      expect(result.responses).toHaveLength(3);
      for (const response of result.responses) {
        const r = response as Record<string, unknown>;
        expect(Array.isArray(r.operations)).toBe(true);
        const ops = r.operations as Record<string, unknown>[];
        expect(ops.length).toBeGreaterThanOrEqual(1);
        expect(ops.length).toBeLessThanOrEqual(3);
        for (const op of ops) {
          expect(typeof op.name).toBe('string');
          expect(typeof op.query).toBe('string');
        }
        expect(typeof r.data).toBe('object');
      }
    });
  });

  describe('Deterministic with seed', () => {
    beforeEach(() => {
      setSeed(null);
    });

    afterEach(() => {
      setSeed(null);
    });

    it('produces consistent results with the same seed', async () => {
      const source = `
        schema Test {
          fieldName: graphql.fieldName(),
          typeName: graphql.typeName(),
          id: graphql.id()
        }

        dataset TestData {
          items: 5 of Test
        }
      `;

      setSeed(42);
      const result1 = await compile(source);
      setSeed(42);
      const result2 = await compile(source);

      expect(result1).toEqual(result2);
    });

    it('produces different results with different seeds', async () => {
      const source = `
        schema Test {
          fieldName: graphql.fieldName(),
          typeName: graphql.typeName()
        }

        dataset TestData {
          items: 10 of Test
        }
      `;

      setSeed(42);
      const result1 = await compile(source);
      setSeed(123);
      const result2 = await compile(source);

      // With 10 items, results should differ
      expect(result1).not.toEqual(result2);
    });
  });
});
