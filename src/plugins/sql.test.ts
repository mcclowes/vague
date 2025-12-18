import { describe, it, expect, beforeAll } from 'vitest';
import { compile, registerPlugin, setSeed } from '../index.js';
import { sqlPlugin, sqlShorthandPlugin } from './sql.js';

describe('SQL Plugin', () => {
  beforeAll(() => {
    registerPlugin(sqlPlugin);
    registerPlugin(sqlShorthandPlugin);
  });

  describe('Identifiers', () => {
    describe('sql.tableName()', () => {
      it('generates valid table names', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            table: sql.tableName()
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ table: string }>;
        expect(items).toHaveLength(10);
        for (const item of items) {
          expect(item.table).toMatch(/^[a-z_][a-z0-9_]*$/);
        }
      });

      it('supports shorthand tableName()', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            table: tableName()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ table: string }>;
        for (const item of items) {
          expect(item.table).toMatch(/^[a-z_][a-z0-9_]*$/);
        }
      });
    });

    describe('sql.columnName()', () => {
      it('generates valid column names', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            column: sql.columnName()
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ column: string }>;
        expect(items).toHaveLength(10);
        for (const item of items) {
          expect(item.column).toMatch(/^[a-z_][a-z0-9_]*$/);
        }
      });

      it('supports shorthand columnName()', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            column: columnName()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ column: string }>;
        for (const item of items) {
          expect(item.column).toMatch(/^[a-z_][a-z0-9_]*$/);
        }
      });
    });

    describe('sql.schemaName()', () => {
      it('generates valid schema names', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            schema_name: sql.schemaName()
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ schema_name: string }>;
        for (const item of items) {
          expect(item.schema_name).toMatch(/^[a-z][a-z0-9_]*$/);
        }
      });
    });

    describe('sql.identifier()', () => {
      it('generates various identifier types', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            id: sql.identifier()
          }
          dataset Output { items: 20 of Test }
        `);

        const items = result.items as Array<{ id: string }>;
        for (const item of items) {
          expect(item.id).toMatch(/^[a-z_][a-z0-9_]*$/);
        }
      });
    });

    describe('sql.alias()', () => {
      it('generates short aliases', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            alias: sql.alias()
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ alias: string }>;
        for (const item of items) {
          expect(item.alias.length).toBeLessThanOrEqual(4);
        }
      });
    });

    describe('sql.quoted()', () => {
      it('quotes identifiers with ANSI style by default', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            quoted: sql.quoted("user")
          }
          dataset Output { items: 1 of Test }
        `);

        const items = result.items as Array<{ quoted: string }>;
        expect(items[0].quoted).toBe('"user"');
      });

      it('quotes identifiers with MySQL style', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            quoted: sql.quoted("user", "mysql")
          }
          dataset Output { items: 1 of Test }
        `);

        const items = result.items as Array<{ quoted: string }>;
        expect(items[0].quoted).toBe('`user`');
      });

      it('quotes identifiers with MSSQL style', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            quoted: sql.quoted("user", "mssql")
          }
          dataset Output { items: 1 of Test }
        `);

        const items = result.items as Array<{ quoted: string }>;
        expect(items[0].quoted).toBe('[user]');
      });

      it('escapes embedded quotes', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            ansi: sql.quoted("col\\"name", "ansi"),
            mysql: sql.quoted("col\`name", "mysql"),
            mssql: sql.quoted("col]name", "mssql")
          }
          dataset Output { items: 1 of Test }
        `);

        const items = result.items as Array<{ ansi: string; mysql: string; mssql: string }>;
        expect(items[0].ansi).toBe('"col""name"');
        expect(items[0].mysql).toBe('`col``name`');
        expect(items[0].mssql).toBe('[col]]name]');
      });
    });
  });

  describe('Values', () => {
    describe('sql.string()', () => {
      it('escapes strings properly', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            simple: sql.string("hello"),
            quoted: sql.string("O'Brien"),
            double: sql.string("It''s fine")
          }
          dataset Output { items: 1 of Test }
        `);

        const items = result.items as Array<{ simple: string; quoted: string; double: string }>;
        expect(items[0].simple).toBe("'hello'");
        expect(items[0].quoted).toBe("'O''Brien'");
        expect(items[0].double).toBe("'It''''s fine'");
      });

      it('generates random strings without argument', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            value: sql.string()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ value: string }>;
        for (const item of items) {
          // SQL strings are single-quoted
          expect(item.value).toMatch(/^'.*'$/);
        }
      });
    });

    describe('sql.dateValue()', () => {
      it('formats specific dates', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            date_val: sql.dateValue("2024-06-15")
          }
          dataset Output { items: 1 of Test }
        `);

        const items = result.items as Array<{ date_val: string }>;
        expect(items[0].date_val).toBe("DATE '2024-06-15'");
      });

      it('generates random dates', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            date_val: sql.dateValue()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ date_val: string }>;
        for (const item of items) {
          expect(item.date_val).toMatch(/^DATE '\d{4}-\d{2}-\d{2}'$/);
        }
      });
    });

    describe('sql.timestamp()', () => {
      it('formats specific timestamps', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            ts: sql.timestamp("2024-06-15 14:30:00")
          }
          dataset Output { items: 1 of Test }
        `);

        const items = result.items as Array<{ ts: string }>;
        expect(items[0].ts).toBe("TIMESTAMP '2024-06-15 14:30:00'");
      });

      it('generates random timestamps', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            ts: sql.timestamp()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ ts: string }>;
        for (const item of items) {
          expect(item.ts).toMatch(/^TIMESTAMP '\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}'$/);
        }
      });
    });

    describe('sql.nullValue()', () => {
      it('returns NULL', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            null_val: sql.nullValue()
          }
          dataset Output { items: 1 of Test }
        `);

        const items = result.items as Array<{ null_val: string }>;
        expect(items[0].null_val).toBe('NULL');
      });
    });

    describe('sql.boolean()', () => {
      it('returns TRUE or FALSE', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            trueVal: sql.boolean(true),
            falseVal: sql.boolean(false)
          }
          dataset Output { items: 1 of Test }
        `);

        const items = result.items as Array<{ trueVal: string; falseVal: string }>;
        expect(items[0].trueVal).toBe('TRUE');
        expect(items[0].falseVal).toBe('FALSE');
      });

      it('generates random booleans', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            value: sql.boolean()
          }
          dataset Output { items: 20 of Test }
        `);

        const items = result.items as Array<{ value: string }>;
        const hasTrue = items.some((i) => i.value === 'TRUE');
        const hasFalse = items.some((i) => i.value === 'FALSE');
        expect(hasTrue).toBe(true);
        expect(hasFalse).toBe(true);
      });
    });

    describe('sql.integer()', () => {
      it('generates integers in default range', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            value: sql.integer()
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ value: string }>;
        for (const item of items) {
          const num = parseInt(item.value, 10);
          expect(num).toBeGreaterThanOrEqual(-1000);
          expect(num).toBeLessThanOrEqual(1000);
        }
      });

      it('generates integers in custom range', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            value: sql.integer(0, 100)
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ value: string }>;
        for (const item of items) {
          const num = parseInt(item.value, 10);
          expect(num).toBeGreaterThanOrEqual(0);
          expect(num).toBeLessThanOrEqual(100);
        }
      });
    });

    describe('sql.decimalValue()', () => {
      it('generates decimals with default precision', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            decimal_val: sql.decimalValue()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ decimal_val: string }>;
        for (const item of items) {
          expect(item.decimal_val).toMatch(/^-?\d+\.\d{2}$/);
        }
      });

      it('generates decimals with custom precision', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            decimal_val: sql.decimalValue(4)
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ decimal_val: string }>;
        for (const item of items) {
          expect(item.decimal_val).toMatch(/^-?\d+\.\d{4}$/);
        }
      });
    });
  });

  describe('Data Types', () => {
    describe('sql.dataType()', () => {
      it('generates random data types', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            type: sql.dataType()
          }
          dataset Output { items: 20 of Test }
        `);

        const items = result.items as Array<{ type: string }>;
        const validTypes = [
          'INTEGER',
          'BIGINT',
          'SMALLINT',
          'TINYINT',
          'DECIMAL',
          'NUMERIC',
          'FLOAT',
          'DOUBLE PRECISION',
          'REAL',
          'BOOLEAN',
          'CHAR',
          'VARCHAR',
          'TEXT',
          'DATE',
          'TIME',
          'TIMESTAMP',
          'UUID',
          'JSON',
          'JSONB',
          'BLOB',
          'BYTEA',
          'SERIAL',
          'BIGSERIAL',
        ];

        for (const item of items) {
          expect(validTypes.some((t) => item.type.startsWith(t))).toBe(true);
        }
      });

      it('generates numeric data types', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            type: sql.dataType("numeric")
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ type: string }>;
        const numericTypes = [
          'INTEGER',
          'BIGINT',
          'SMALLINT',
          'DECIMAL',
          'NUMERIC',
          'FLOAT',
          'DOUBLE PRECISION',
        ];
        for (const item of items) {
          expect(numericTypes.some((t) => item.type.startsWith(t))).toBe(true);
        }
      });

      it('generates string data types', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            type: sql.dataType("string")
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ type: string }>;
        const stringTypes = ['VARCHAR', 'CHAR', 'TEXT'];
        for (const item of items) {
          expect(stringTypes.some((t) => item.type.startsWith(t))).toBe(true);
        }
      });

      it('generates date data types', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            type: sql.dataType("date")
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ type: string }>;
        const dateTypes = ['DATE', 'TIME', 'TIMESTAMP'];
        for (const item of items) {
          expect(dateTypes.some((t) => item.type.startsWith(t))).toBe(true);
        }
      });
    });

    describe('sql.columnDefinition()', () => {
      it('generates valid column definitions', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            def: sql.columnDefinition()
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ def: string }>;
        for (const item of items) {
          // Should have column name followed by type
          expect(item.def).toMatch(/^[a-z_][a-z0-9_]* [A-Z]/);
        }
      });

      it('generates non-nullable columns', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            def: sql.columnDefinition(false)
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ def: string }>;
        for (const item of items) {
          expect(item.def).toContain('NOT NULL');
        }
      });
    });
  });

  describe('Connection Strings', () => {
    describe('sql.connectionString()', () => {
      it('generates PostgreSQL connection strings', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            conn: sql.connectionString("postgres")
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ conn: string }>;
        for (const item of items) {
          expect(item.conn).toMatch(/^postgresql:\/\/.+:.+@.+:\d+\/.+$/);
          expect(item.conn).toContain(':5432/');
        }
      });

      it('generates MySQL connection strings', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            conn: sql.connectionString("mysql")
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ conn: string }>;
        for (const item of items) {
          expect(item.conn).toMatch(/^mysql:\/\/.+:.+@.+:\d+\/.+$/);
          expect(item.conn).toContain(':3306/');
        }
      });

      it('generates MSSQL connection strings', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            conn: sql.connectionString("mssql")
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ conn: string }>;
        for (const item of items) {
          expect(item.conn).toMatch(/^Server=.+,\d+;Database=.+;User Id=.+;Password=.+;$/);
        }
      });

      it('generates SQLite connection strings', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            conn: sql.connectionString("sqlite")
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ conn: string }>;
        for (const item of items) {
          expect(item.conn).toMatch(/^sqlite:\/\/\/.+\.db$/);
        }
      });

      it('supports shorthand connectionString()', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            conn: connectionString("postgres")
          }
          dataset Output { items: 3 of Test }
        `);

        const items = result.items as Array<{ conn: string }>;
        for (const item of items) {
          expect(item.conn).toMatch(/^postgresql:\/\//);
        }
      });
    });
  });

  describe('Query Fragments', () => {
    describe('sql.select()', () => {
      it('generates SELECT statements', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            query: sql.select()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ query: string }>;
        for (const item of items) {
          expect(item.query).toMatch(/^SELECT .+ FROM [a-z_]+$/);
        }
      });
    });

    describe('sql.whereClause()', () => {
      it('generates WHERE clauses', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            clause: sql.whereClause()
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ clause: string }>;
        for (const item of items) {
          expect(item.clause).toMatch(/^WHERE /);
        }
      });
    });

    describe('sql.orderBy()', () => {
      it('generates ORDER BY clauses', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            clause: sql.orderBy()
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ clause: string }>;
        for (const item of items) {
          expect(item.clause).toMatch(/^ORDER BY .+ (ASC|DESC)/);
        }
      });
    });

    describe('sql.limit()', () => {
      it('generates LIMIT clauses', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            clause: sql.limit()
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ clause: string }>;
        for (const item of items) {
          expect(item.clause).toMatch(/^LIMIT \d+/);
        }
      });

      it('respects max parameter', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            clause: sql.limit(10)
          }
          dataset Output { items: 20 of Test }
        `);

        const items = result.items as Array<{ clause: string }>;
        for (const item of items) {
          const match = item.clause.match(/^LIMIT (\d+)/);
          expect(match).toBeTruthy();
          const limit = parseInt(match![1], 10);
          expect(limit).toBeLessThanOrEqual(10);
        }
      });
    });

    describe('sql.groupBy()', () => {
      it('generates GROUP BY clauses', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            clause: sql.groupBy()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ clause: string }>;
        for (const item of items) {
          expect(item.clause).toMatch(/^GROUP BY /);
        }
      });
    });

    describe('sql.join()', () => {
      it('generates JOIN clauses', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            clause: sql.join()
          }
          dataset Output { items: 10 of Test }
        `);

        const items = result.items as Array<{ clause: string }>;
        for (const item of items) {
          expect(item.clause).toMatch(/JOIN .+ ON|CROSS JOIN/);
        }
      });

      it('generates specific join types', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            inner: sql.join("inner"),
            left: sql.join("left"),
            cross: sql.join("cross")
          }
          dataset Output { items: 1 of Test }
        `);

        const items = result.items as Array<{ inner: string; left: string; cross: string }>;
        expect(items[0].inner).toMatch(/^INNER JOIN/);
        expect(items[0].left).toMatch(/^LEFT JOIN/);
        expect(items[0].cross).toMatch(/^CROSS JOIN/);
      });
    });
  });

  describe('Full Statements', () => {
    describe('sql.insert()', () => {
      it('generates INSERT statements', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            stmt: sql.insert()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ stmt: string }>;
        for (const item of items) {
          expect(item.stmt).toMatch(/^INSERT INTO [a-z_]+ \(.+\) VALUES \(.+\)$/);
        }
      });
    });

    describe('sql.update()', () => {
      it('generates UPDATE statements', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            stmt: sql.update()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ stmt: string }>;
        for (const item of items) {
          expect(item.stmt).toMatch(/^UPDATE [a-z_]+ SET .+ WHERE /);
        }
      });
    });

    describe('sql.delete()', () => {
      it('generates DELETE statements', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            stmt: sql.delete()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ stmt: string }>;
        for (const item of items) {
          expect(item.stmt).toMatch(/^DELETE FROM [a-z_]+ WHERE /);
        }
      });
    });

    describe('sql.createTable()', () => {
      it('generates CREATE TABLE statements', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            stmt: sql.createTable()
          }
          dataset Output { items: 3 of Test }
        `);

        const items = result.items as Array<{ stmt: string }>;
        for (const item of items) {
          expect(item.stmt).toMatch(/^CREATE TABLE [a-z_]+ \(/);
          expect(item.stmt).toContain('id SERIAL PRIMARY KEY');
        }
      });
    });
  });

  describe('Placeholders', () => {
    describe('sql.placeholder()', () => {
      it('generates PostgreSQL placeholders', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            p: sql.placeholder("postgres", 1)
          }
          dataset Output { items: 1 of Test }
        `);

        const items = result.items as Array<{ p: string }>;
        expect(items[0].p).toBe('$1');
      });

      it('generates MySQL placeholders', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            p: sql.placeholder("mysql")
          }
          dataset Output { items: 1 of Test }
        `);

        const items = result.items as Array<{ p: string }>;
        expect(items[0].p).toBe('?');
      });

      it('generates MSSQL placeholders', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            p: sql.placeholder("mssql", 5)
          }
          dataset Output { items: 1 of Test }
        `);

        const items = result.items as Array<{ p: string }>;
        expect(items[0].p).toBe('@p5');
      });

      it('generates named placeholders', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            p: sql.placeholder("named")
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ p: string }>;
        for (const item of items) {
          expect(item.p).toMatch(/^:[a-z_]+$/);
        }
      });
    });
  });

  describe('Comments', () => {
    describe('sql.comment()', () => {
      it('generates line comments by default', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            comment: sql.comment()
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ comment: string }>;
        for (const item of items) {
          expect(item.comment).toMatch(/^-- .+$/);
        }
      });

      it('generates block comments', async () => {
        setSeed(42);
        const result = await compile(`
          schema Test {
            comment: sql.comment("block")
          }
          dataset Output { items: 5 of Test }
        `);

        const items = result.items as Array<{ comment: string }>;
        for (const item of items) {
          expect(item.comment).toMatch(/^\/\* .+ \*\/$/);
        }
      });
    });
  });

  describe('Integration', () => {
    it('generates deterministic output with seed', async () => {
      setSeed(123);
      const result1 = await compile(`
        schema Test {
          table: sql.tableName(),
          column: sql.columnName()
        }
        dataset Output { items: 5 of Test }
      `);

      setSeed(123);
      const result2 = await compile(`
        schema Test {
          table: sql.tableName(),
          column: sql.columnName()
        }
        dataset Output { items: 5 of Test }
      `);

      expect(result1.items).toEqual(result2.items);
    });

    it('works with superposition', async () => {
      setSeed(42);
      const result = await compile(`
        schema Test {
          type: 0.5: sql.dataType("numeric") | 0.5: sql.dataType("string")
        }
        dataset Output { items: 50 of Test }
      `);

      const items = result.items as Array<{ type: string }>;
      const numericTypes = [
        'INTEGER',
        'BIGINT',
        'SMALLINT',
        'DECIMAL',
        'NUMERIC',
        'FLOAT',
        'DOUBLE',
      ];
      const stringTypes = ['VARCHAR', 'CHAR', 'TEXT'];

      const hasNumeric = items.some((i) => numericTypes.some((t) => i.type.startsWith(t)));
      const hasString = items.some((i) => stringTypes.some((t) => i.type.startsWith(t)));

      expect(hasNumeric).toBe(true);
      expect(hasString).toBe(true);
    });

    it('combines multiple SQL generators', async () => {
      setSeed(42);
      const result = await compile(`
        schema DatabaseSchema {
          table_name: sql.tableName(),
          columns: 3..5 of ColumnDef
        }
        schema ColumnDef {
          name: sql.columnName(),
          type: sql.dataType(),
          nullable: "true" | "false"
        }
        dataset Output { schemas: 3 of DatabaseSchema }
      `);

      const schemas = result.schemas as Array<{
        table_name: string;
        columns: Array<{ name: string; type: string; nullable: string }>;
      }>;

      expect(schemas).toHaveLength(3);
      for (const schema of schemas) {
        expect(schema.table_name).toMatch(/^[a-z_]+$/);
        expect(schema.columns.length).toBeGreaterThanOrEqual(3);
        expect(schema.columns.length).toBeLessThanOrEqual(5);
        for (const col of schema.columns) {
          expect(col.name).toMatch(/^[a-z_]+$/);
          expect(col.type.length).toBeGreaterThan(0);
          expect(['true', 'false']).toContain(col.nullable);
        }
      }
    });
  });
});
