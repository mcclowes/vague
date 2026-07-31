---
sidebar_position: 6
title: SQL Plugin
---

# SQL Plugin

The SQL plugin generates SQL-related test data including identifiers, values, connection strings, and query fragments. Useful for testing database-related code, query builders, and ORMs.

## Basic Usage

```vague
schema DatabaseTest {
  table: sql.tableName(),
  column: sql.columnName(),
  value: sql.string("O'Brien")
}
// table: "users", "order_items", "tbl_products"
// column: "created_at", "user_id", "c_email"
// value: "'O''Brien'"
```

## SQL Identifiers

### Table Names

```vague
schema Migration {
  table: sql.tableName()
}
// Output: "users", "orders", "product_categories", "tbl_logs", etc.
```

### Column Names

```vague
schema Schema {
  column: sql.columnName()
}
// Output: "id", "created_at", "user_id", "is_active", "col_name", etc.
```

### Schema Names

```vague
schema Database {
  schema_name: sql.schemaName()
}
// Output: "public", "analytics", "staging", "dbo", "auth"
```

### Generic Identifiers

```vague
schema Query {
  identifier: sql.identifier(),
  alias: sql.alias()
}
// identifier: Random table, column, schema, or alias name
// alias: "a", "t1", "src", "tmp"
```

### Quoted Identifiers

```vague
schema Reserved {
  // ANSI standard (default)
  ansi: sql.quoted("user"),

  // MySQL backticks
  mysql: sql.quoted("user", "mysql"),

  // SQL Server brackets
  mssql: sql.quoted("user", "mssql")
}
// ansi: "\"user\""
// mysql: "`user`"
// mssql: "[user]"
```

## SQL Values

### String Literals

```vague
schema Data {
  // Properly escaped SQL string
  name: sql.string("O'Brien")
}
// Output: "'O''Brien'"
```

### Date and Timestamp

```vague
schema Dates {
  // SQL date literal
  date_val: sql.dateValue("2024-01-15"),

  // Random date if no argument
  random_date: sql.dateValue(),

  // SQL timestamp literal
  ts: sql.timestamp()
}
// date_val: "DATE '2024-01-15'"
// ts: "TIMESTAMP '2024-03-15 14:30:45'"
```

### Other Values

```vague
schema Values {
  null_val: sql.nullValue(),
  bool_val: sql.boolean(true),
  int_val: sql.integer(0, 100),
  decimal_val: sql.decimalValue(2)
}
// null_val: "NULL"
// bool_val: "TRUE"
// int_val: "42"
// decimal_val: "123.45"
```

## Data Types

```vague
schema Column {
  // Random data type
  type: sql.dataType(),

  // Category-specific
  numeric_type: sql.dataType("numeric"),
  string_type: sql.dataType("string"),
  date_type: sql.dataType("date"),

  // Full column definition
  definition: sql.columnDefinition()
}
// type: "VARCHAR(255)", "INTEGER", "TIMESTAMP", etc.
// definition: "email VARCHAR(255) NOT NULL DEFAULT ''"
```

## Connection Strings

```vague
schema Config {
  postgres: sql.connectionString("postgres"),
  mysql: sql.connectionString("mysql"),
  mssql: sql.connectionString("mssql"),
  sqlite: sql.connectionString("sqlite")
}
// postgres: "postgresql://admin:password123@localhost:5432/myapp"
// mysql: "mysql://root:password123@db.example.com:3306/production"
// sqlite: "sqlite:///development.db"
```

## Query Fragments

### SELECT Clause

```vague
schema Query {
  select: sql.select()
}
// Output: "SELECT DISTINCT id, name, email FROM users"
```

### WHERE Clause

```vague
schema Filter {
  where: sql.whereClause()
}
// Output: "WHERE status = 'active'"
// Output: "WHERE created_at >= DATE '2024-01-01'"
// Output: "WHERE id IN ('a', 'b', 'c')"
```

### ORDER BY

```vague
schema Sort {
  order: sql.orderBy()
}
// Output: "ORDER BY created_at DESC, name ASC NULLS LAST"
```

### LIMIT and OFFSET

```vague
schema Pagination {
  limit: sql.limit(100)
}
// Output: "LIMIT 50 OFFSET 25"
```

### GROUP BY

```vague
schema Aggregate {
  group: sql.groupBy()
}
// Output: "GROUP BY category, status"
```

### JOIN Clauses

```vague
schema Joins {
  inner: sql.join("inner"),
  left: sql.join("left"),
  cross: sql.join("cross")
}
// inner: "INNER JOIN orders o ON o.user_id = id"
// left: "LEFT JOIN products p ON p.category_id = category_id"
// cross: "CROSS JOIN settings s"
```

## Full Statements

### INSERT

```vague
schema Insert {
  stmt: sql.insert()
}
// Output: "INSERT INTO users (name, email, status) VALUES ('sample', 'test@example.com', TRUE)"
```

### UPDATE

```vague
schema Update {
  stmt: sql.update()
}
// Output: "UPDATE products SET price = 99, status = 'active' WHERE id = 123"
```

### DELETE

```vague
schema Delete {
  stmt: sql.delete()
}
// Output: "DELETE FROM sessions WHERE expires_at < TIMESTAMP '2024-01-01 00:00:00'"
```

### CREATE TABLE

```vague
schema DDL {
  stmt: sql.createTable()
}
// Output:
// CREATE TABLE orders (
//   id SERIAL PRIMARY KEY,
//   user_id INTEGER NOT NULL,
//   total DECIMAL(10,2) DEFAULT 0,
//   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// )
```

## Placeholders

```vague
schema Prepared {
  // PostgreSQL style
  pg: sql.placeholder("postgres", 1),

  // MySQL style
  mysql: sql.placeholder("mysql"),

  // MSSQL style
  mssql: sql.placeholder("mssql", 3),

  // Named parameters
  named: sql.placeholder("named")
}
// pg: "$1"
// mysql: "?"
// mssql: "@p3"
// named: ":user_id"
```

## Comments

```vague
schema Annotated {
  line_comment: sql.comment(),
  block_comment: sql.comment("block")
}
// line_comment: "-- TODO: Add index"
// block_comment: "/* Performance optimization needed */"
```

## Shorthand Functions

These are available without the `sql.` prefix:

| Function | Description |
|----------|-------------|
| `tableName()` | SQL table name |
| `columnName()` | SQL column name |
| `schemaName()` | SQL schema name |
| `sqlIdentifier()` | Generic SQL identifier |
| `connectionString(dialect)` | Database connection string |
| `sqlString(value)` | Escaped SQL string literal |
| `sqlDateValue(date?)` | SQL date literal |
| `sqlTimestamp(ts?)` | SQL timestamp literal |
| `sqlNullValue()` | NULL literal |
| `sqlBoolean(value?)` | TRUE/FALSE literal |
| `sqlDataType(category?)` | SQL data type |

## Practical Examples

### Database Migration Test

```vague
schema Migration {
  id: int in 1..100,
  name: regex("[a-z_]+"),
  table_name: sql.tableName(),
  column_added: sql.columnDefinition(),
  executed_at: sql.timestamp()
}

dataset Migrations {
  migrations: 20 of Migration
}
```

### Query Builder Test

```vague
schema QueryTest {
  base: sql.select(),
  filter: sql.whereClause(),
  sort: sql.orderBy(),
  pagination: sql.limit(50)
}
```

### Connection Pool Config

```vague
schema PoolConfig {
  connection_string: sql.connectionString("postgres"),
  min_connections: int in 1..5,
  max_connections: int in 10..50,
  idle_timeout_ms: int in 10000..60000
}
```

### Database Backup Metadata

```vague
schema Backup {
  id: uuid(),
  database: sql.schemaName(),
  tables: 5..20 of sql.tableName(),
  started_at: sql.timestamp(),
  size_bytes: int in 1000000..10000000000,
  status: "pending" | "in_progress" | "completed" | "failed"
}
```

## See Also

- [GraphQL Plugin](/docs/plugins/graphql) for GraphQL-specific data
- [HTTP Plugin](/docs/plugins/http) for API testing data
- [Regex Plugin](/docs/plugins/regex) for pattern-based identifiers
