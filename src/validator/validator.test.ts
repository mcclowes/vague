import { describe, it, expect } from "vitest";
import { SchemaValidator } from "./validator.js";
import { compile } from "../index.js";
import { resolve } from "node:path";

describe("SchemaValidator", () => {
  describe("basic validation", () => {
    it("validates a simple object against a JSON schema", () => {
      const validator = new SchemaValidator();
      validator.loadSchema("Person", {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "integer" },
        },
        required: ["name"],
      });

      const result = validator.validateItem({ name: "John", age: 30 }, "Person");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("detects validation errors", () => {
      const validator = new SchemaValidator();
      validator.loadSchema("Person", {
        type: "object",
        properties: {
          name: { type: "string" },
          age: { type: "integer" },
        },
        required: ["name"],
      });

      const result = validator.validateItem({ age: "not a number" }, "Person");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("returns error for unknown schema", () => {
      const validator = new SchemaValidator();
      const result = validator.validateItem({}, "NonExistent");
      expect(result.valid).toBe(false);
      expect(result.errors[0].message).toContain("not found");
    });
  });

  describe("collection validation", () => {
    it("validates all items in a collection", () => {
      const validator = new SchemaValidator();
      validator.loadSchema("Item", {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
      });

      const result = validator.validateCollection(
        [{ id: "1" }, { id: "2" }, { id: "3" }],
        "Item"
      );
      expect(result.valid).toBe(true);
      expect(result.itemsValidated).toBe(3);
      expect(result.itemsFailed).toBe(0);
    });

    it("reports failures with item indices", () => {
      const validator = new SchemaValidator();
      validator.loadSchema("Item", {
        type: "object",
        properties: {
          id: { type: "string" },
        },
        required: ["id"],
      });

      const result = validator.validateCollection(
        [{ id: "1" }, { noId: true }, { id: "3" }],
        "Item"
      );
      expect(result.valid).toBe(false);
      expect(result.itemsValidated).toBe(3);
      expect(result.itemsFailed).toBe(1);
      expect(result.errors[0].path).toContain("[1]");
    });
  });

  describe("dataset validation", () => {
    it("validates multiple collections with schema mapping", () => {
      const validator = new SchemaValidator();
      validator.loadSchema("User", {
        type: "object",
        properties: {
          username: { type: "string" },
        },
        required: ["username"],
      });
      validator.loadSchema("Product", {
        type: "object",
        properties: {
          sku: { type: "string" },
        },
        required: ["sku"],
      });

      const data = {
        users: [{ username: "alice" }, { username: "bob" }],
        products: [{ sku: "ABC123" }],
      };

      const results = validator.validateDataset(data, {
        users: "User",
        products: "Product",
      });

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.result.valid)).toBe(true);
    });

    it("reports missing collections", () => {
      const validator = new SchemaValidator();
      validator.loadSchema("User", {
        type: "object",
        properties: {},
      });

      const results = validator.validateDataset({}, { users: "User" });

      expect(results[0].result.valid).toBe(false);
      expect(results[0].result.errors[0].message).toContain("not found in data");
    });
  });

  describe("OpenAPI schema loading", () => {
    it("loads schemas from OpenAPI 3.1 spec", async () => {
      const validator = new SchemaValidator();
      const specPath = resolve(__dirname, "../../examples/codat/Codat-Lending.json");

      const schemas = await validator.loadOpenAPISchemas(specPath);

      expect(schemas.length).toBeGreaterThan(0);
      expect(schemas).toContain("AccountingAccount");
      expect(schemas).toContain("AccountingCustomer");
    });

    it("validates generated data against OpenAPI schemas", async () => {
      const validator = new SchemaValidator();
      const specPath = resolve(__dirname, "../../examples/codat/Codat-Lending.json");

      await validator.loadOpenAPISchemas(specPath);

      // Generate test data using vague DSL
      const source = `
        schema TestAccount {
          id: string
          name: string
          currency: "USD" | "EUR" | "GBP"
          type: "Asset" | "Liability" | "Income" | "Expense" | "Equity"
          status: "Active" | "Archived"
        }

        dataset TestData {
          accounts: 5 * TestAccount
        }
      `;
      const data = await compile(source);

      const result = validator.validateCollection(
        data.accounts as unknown[],
        "AccountingAccount"
      );

      expect(result.valid).toBe(true);
      expect(result.itemsValidated).toBe(5);
    });
  });

  describe("format validation", () => {
    it("validates date-time format", () => {
      const validator = new SchemaValidator();
      validator.loadSchema("Event", {
        type: "object",
        properties: {
          timestamp: { type: "string", format: "date-time" },
        },
        required: ["timestamp"],
      });

      const validResult = validator.validateItem(
        { timestamp: "2024-01-15T10:30:00Z" },
        "Event"
      );
      expect(validResult.valid).toBe(true);

      const invalidResult = validator.validateItem(
        { timestamp: "not-a-date" },
        "Event"
      );
      expect(invalidResult.valid).toBe(false);
    });

    it("validates email format", () => {
      const validator = new SchemaValidator();
      validator.loadSchema("Contact", {
        type: "object",
        properties: {
          email: { type: "string", format: "email" },
        },
        required: ["email"],
      });

      const validResult = validator.validateItem(
        { email: "test@example.com" },
        "Contact"
      );
      expect(validResult.valid).toBe(true);

      const invalidResult = validator.validateItem(
        { email: "not-an-email" },
        "Contact"
      );
      expect(invalidResult.valid).toBe(false);
    });
  });
});
