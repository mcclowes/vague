/**
 * SQL plugin for Vague
 *
 * Generates SQL-related test data including identifiers, values, connection strings,
 * and properly formatted SQL literals.
 *
 * Usage in .vague files:
 *   schema Database {
 *     // Identifiers
 *     tableName: sql.tableName()              // e.g., "users", "order_items"
 *     columnName: sql.columnName()            // e.g., "created_at", "user_id"
 *     schemaName: sql.schemaName()            // e.g., "public", "analytics"
 *     identifier: sql.identifier()            // Generic SQL identifier
 *
 *     // Quoted identifiers (for reserved words or special chars)
 *     quoted: sql.quoted("user")              // e.g., "\"user\"" or "`user`"
 *     quotedMySQL: sql.quoted("user", "mysql") // e.g., "`user`"
 *
 *     // SQL values (properly escaped)
 *     stringValue: sql.string("O'Brien")      // e.g., "'O''Brien'"
 *     dateVal: sql.dateValue("2024-01-15")    // e.g., "DATE '2024-01-15'"
 *     timestampVal: sql.timestamp()           // e.g., "TIMESTAMP '2024-01-15 10:30:00'"
 *     nullVal: sql.nullValue()                // "NULL"
 *     boolValue: sql.boolean(true)            // "TRUE" or "FALSE"
 *     intValue: sql.integer(0, 100)           // e.g., "42"
 *     decValue: sql.decimalValue(2)           // e.g., "123.45"
 *
 *     // Connection strings
 *     pgConn: sql.connectionString("postgres")
 *     mysqlConn: sql.connectionString("mysql")
 *
 *     // Data types
 *     dataType: sql.dataType()                // e.g., "VARCHAR(255)", "INTEGER"
 *     colDef: sql.columnDefinition()          // e.g., "name VARCHAR(255) NOT NULL"
 *
 *     // Query fragments (for testing parsers/validators)
 *     selectClause: sql.select()              // e.g., "SELECT id, name FROM users"
 *     whereClause: sql.whereClause()          // e.g., "WHERE status = 'active'"
 *     orderClause: sql.orderBy()              // e.g., "ORDER BY created_at DESC"
 *     limitClause: sql.limit(100)             // e.g., "LIMIT 50 OFFSET 10"
 *     groupClause: sql.groupBy()              // e.g., "GROUP BY category"
 *     joinClause: sql.join("left")            // e.g., "LEFT JOIN orders o ON o.id = order_id"
 *
 *     // Full statements
 *     insertStmt: sql.insert()                // e.g., "INSERT INTO users (...) VALUES (...)"
 *     updateStmt: sql.update()                // e.g., "UPDATE users SET ... WHERE ..."
 *     deleteStmt: sql.delete()                // e.g., "DELETE FROM users WHERE ..."
 *     createStmt: sql.createTable()           // e.g., "CREATE TABLE users (...)"
 *
 *     // Placeholders
 *     pgParam: sql.placeholder("postgres", 1) // e.g., "$1"
 *     mysqlParam: sql.placeholder("mysql")    // e.g., "?"
 *
 *     // Comments
 *     lineComment: sql.comment()              // e.g., "-- TODO: Add index"
 *     blockComment: sql.comment("block")      // e.g., block-style comment
 *   }
 *
 * Or with shorthand names:
 *   schema Test {
 *     table: tableName()
 *     column: columnName()
 *     conn: connectionString("postgres")
 *   }
 */

import type { VaguePlugin, GeneratorFunction } from '../interpreter/generator.js';
import { random, randomInt, randomChoice } from '../interpreter/random.js';

// Helper to create a generator from a function
function wrap<T>(fn: (...args: unknown[]) => T): GeneratorFunction {
  return (args) => fn(...args);
}

// Helper for no-arg generators
function wrapNoArgs<T>(fn: () => T): GeneratorFunction {
  return () => fn();
}

// ============================================
// SQL Identifiers
// ============================================

const TABLE_PREFIXES = ['', 'tbl_', 't_'];
const TABLE_NAMES = [
  'users',
  'accounts',
  'orders',
  'products',
  'customers',
  'invoices',
  'payments',
  'transactions',
  'items',
  'categories',
  'sessions',
  'logs',
  'events',
  'messages',
  'notifications',
  'settings',
  'permissions',
  'roles',
  'addresses',
  'comments',
  'posts',
  'articles',
  'tags',
  'files',
  'images',
  'audit_logs',
  'order_items',
  'line_items',
  'user_roles',
  'product_categories',
];

const COLUMN_PREFIXES = ['', 'col_', 'c_'];
const COLUMN_NAMES = [
  'id',
  'uuid',
  'name',
  'title',
  'description',
  'status',
  'type',
  'email',
  'phone',
  'address',
  'city',
  'country',
  'created_at',
  'updated_at',
  'deleted_at',
  'is_active',
  'is_deleted',
  'user_id',
  'account_id',
  'order_id',
  'product_id',
  'customer_id',
  'amount',
  'price',
  'quantity',
  'total',
  'subtotal',
  'tax',
  'discount',
  'first_name',
  'last_name',
  'full_name',
  'username',
  'password_hash',
  'api_key',
  'token',
  'expires_at',
  'verified_at',
  'version',
  'sort_order',
  'parent_id',
  'metadata',
  'config',
  'options',
];

const SCHEMA_NAMES = [
  'public',
  'private',
  'internal',
  'analytics',
  'reporting',
  'staging',
  'archive',
  'audit',
  'temp',
  'dbo',
  'app',
  'core',
  'auth',
  'billing',
  'inventory',
];

/**
 * Generate a realistic SQL table name.
 */
function generateTableName(): string {
  const prefix = randomChoice(TABLE_PREFIXES);
  const name = randomChoice(TABLE_NAMES);
  return prefix + name;
}

/**
 * Generate a realistic SQL column name.
 */
function generateColumnName(): string {
  const prefix = randomChoice(COLUMN_PREFIXES);
  const name = randomChoice(COLUMN_NAMES);
  return prefix + name;
}

/**
 * Generate a SQL schema name.
 */
function generateSchemaName(): string {
  return randomChoice(SCHEMA_NAMES);
}

/**
 * Generate a generic SQL identifier.
 * Can be used for table, column, schema, or alias names.
 */
function generateIdentifier(): string {
  const types = ['table', 'column', 'schema', 'alias'];
  const type = randomChoice(types);

  switch (type) {
    case 'table':
      return generateTableName();
    case 'column':
      return generateColumnName();
    case 'schema':
      return generateSchemaName();
    case 'alias':
      return generateAlias();
    default:
      return generateTableName();
  }
}

/**
 * Generate a SQL alias (short identifier).
 */
function generateAlias(): string {
  const aliases = ['a', 'b', 'c', 't', 'u', 'o', 'p', 't1', 't2', 'src', 'dst', 'tmp', 'sub'];
  return randomChoice(aliases);
}

/**
 * Quote an identifier for safe use in SQL.
 * @param identifier - The identifier to quote
 * @param dialect - SQL dialect: 'ansi' ("), 'mysql' (`), 'mssql' ([])
 */
function quoteIdentifier(identifier?: unknown, dialect?: unknown): string {
  const id = String(identifier ?? generateIdentifier());
  const d = String(dialect ?? 'ansi');

  switch (d) {
    case 'mysql':
      return '`' + id.replace(/`/g, '``') + '`';
    case 'mssql':
      return '[' + id.replace(/\]/g, ']]') + ']';
    case 'ansi':
    case 'postgres':
    case 'postgresql':
    default:
      return '"' + id.replace(/"/g, '""') + '"';
  }
}

// ============================================
// SQL Values
// ============================================

/**
 * Generate a properly escaped SQL string literal.
 * @param value - The string value to escape
 */
function escapeString(value?: unknown): string {
  const str = String(value ?? generateRandomString());
  // Standard SQL escaping: single quotes doubled
  const escaped = str.replace(/'/g, "''");
  return "'" + escaped + "'";
}

/**
 * Generate a random string for SQL values.
 */
function generateRandomString(): string {
  const words = [
    'test',
    'sample',
    'example',
    'demo',
    'data',
    'value',
    'item',
    'record',
    'entry',
    'object',
  ];
  const count = randomInt(1, 3);
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(randomChoice(words));
  }
  return result.join(' ');
}

/**
 * Generate a SQL date literal.
 * @param date - Optional date string (YYYY-MM-DD format)
 */
function generateDate(date?: unknown): string {
  if (date) {
    return `DATE '${String(date)}'`;
  }

  const year = randomInt(2020, 2025);
  const month = String(randomInt(1, 12)).padStart(2, '0');
  const day = String(randomInt(1, 28)).padStart(2, '0');
  return `DATE '${year}-${month}-${day}'`;
}

/**
 * Generate a SQL timestamp literal.
 * @param timestamp - Optional timestamp string
 */
function generateTimestamp(timestamp?: unknown): string {
  if (timestamp) {
    return `TIMESTAMP '${String(timestamp)}'`;
  }

  const year = randomInt(2020, 2025);
  const month = String(randomInt(1, 12)).padStart(2, '0');
  const day = String(randomInt(1, 28)).padStart(2, '0');
  const hour = String(randomInt(0, 23)).padStart(2, '0');
  const minute = String(randomInt(0, 59)).padStart(2, '0');
  const second = String(randomInt(0, 59)).padStart(2, '0');
  return `TIMESTAMP '${year}-${month}-${day} ${hour}:${minute}:${second}'`;
}

/**
 * Generate SQL NULL literal.
 */
function generateNull(): string {
  return 'NULL';
}

/**
 * Generate SQL boolean literal.
 * @param value - Optional boolean value (random if not provided)
 */
function generateBoolean(value?: unknown): string {
  const boolVal = typeof value === 'boolean' ? value : random() > 0.5;
  return boolVal ? 'TRUE' : 'FALSE';
}

/**
 * Generate a SQL integer literal.
 * @param min - Minimum value (default: -1000)
 * @param max - Maximum value (default: 1000)
 */
function generateInteger(min?: unknown, max?: unknown): string {
  const minVal = typeof min === 'number' ? min : -1000;
  const maxVal = typeof max === 'number' ? max : 1000;
  return String(randomInt(minVal, maxVal));
}

/**
 * Generate a SQL decimal/numeric literal.
 * @param precision - Number of decimal places (default: 2)
 */
function generateDecimal(precision?: unknown): string {
  const prec = typeof precision === 'number' ? precision : 2;
  const whole = randomInt(-10000, 10000);
  const decimal = randomInt(0, Math.pow(10, prec) - 1);
  return `${whole}.${String(decimal).padStart(prec, '0')}`;
}

// ============================================
// SQL Data Types
// ============================================

const DATA_TYPES = [
  'INTEGER',
  'BIGINT',
  'SMALLINT',
  'TINYINT',
  'DECIMAL(10,2)',
  'NUMERIC(10,2)',
  'FLOAT',
  'DOUBLE PRECISION',
  'REAL',
  'BOOLEAN',
  'CHAR(10)',
  'VARCHAR(255)',
  'VARCHAR(50)',
  'TEXT',
  'DATE',
  'TIME',
  'TIMESTAMP',
  'TIMESTAMP WITH TIME ZONE',
  'UUID',
  'JSON',
  'JSONB',
  'BLOB',
  'BYTEA',
  'SERIAL',
  'BIGSERIAL',
];

/**
 * Generate a SQL data type definition.
 * @param category - Optional category: 'numeric', 'string', 'date', 'boolean', 'binary'
 */
function generateDataType(category?: unknown): string {
  const cat = typeof category === 'string' ? category : null;

  if (cat === 'numeric') {
    return randomChoice([
      'INTEGER',
      'BIGINT',
      'SMALLINT',
      'DECIMAL(10,2)',
      'NUMERIC(10,2)',
      'FLOAT',
      'DOUBLE PRECISION',
    ]);
  }
  if (cat === 'string') {
    return randomChoice(['VARCHAR(255)', 'VARCHAR(50)', 'CHAR(10)', 'TEXT']);
  }
  if (cat === 'date') {
    return randomChoice(['DATE', 'TIME', 'TIMESTAMP', 'TIMESTAMP WITH TIME ZONE']);
  }
  if (cat === 'boolean') {
    return 'BOOLEAN';
  }
  if (cat === 'binary') {
    return randomChoice(['BLOB', 'BYTEA']);
  }

  return randomChoice(DATA_TYPES);
}

/**
 * Generate a column definition with name and type.
 * @param nullable - Whether column can be NULL (random if not provided)
 */
function generateColumnDefinition(nullable?: unknown): string {
  const name = generateColumnName();
  const type = generateDataType();
  const isNullable = typeof nullable === 'boolean' ? nullable : random() > 0.5;

  let def = `${name} ${type}`;
  if (!isNullable) {
    def += ' NOT NULL';
  }

  // Occasionally add default value
  if (random() > 0.7) {
    if (type.includes('INT') || type.includes('SERIAL')) {
      def += ' DEFAULT 0';
    } else if (type === 'BOOLEAN') {
      def += ' DEFAULT FALSE';
    } else if (type.includes('CHAR') || type === 'TEXT') {
      def += " DEFAULT ''";
    } else if (type.includes('TIMESTAMP')) {
      def += ' DEFAULT CURRENT_TIMESTAMP';
    }
  }

  return def;
}

// ============================================
// Connection Strings
// ============================================

/**
 * Generate a database connection string.
 * @param dialect - Database type: 'postgres', 'mysql', 'mssql', 'sqlite', 'oracle'
 */
function generateConnectionString(dialect?: unknown): string {
  const d = String(dialect ?? 'postgres');
  const user = randomChoice(['admin', 'root', 'app_user', 'db_user', 'service']);
  const password = 'password123';
  const host = randomChoice(['localhost', '127.0.0.1', 'db.example.com', 'database']);
  const port = getDefaultPort(d);
  const dbName = randomChoice([
    'myapp',
    'production',
    'development',
    'test',
    'app_db',
    'main',
    'data',
  ]);

  switch (d) {
    case 'postgres':
    case 'postgresql':
      return `postgresql://${user}:${password}@${host}:${port}/${dbName}`;
    case 'mysql':
      return `mysql://${user}:${password}@${host}:${port}/${dbName}`;
    case 'mssql':
    case 'sqlserver':
      return `Server=${host},${port};Database=${dbName};User Id=${user};Password=${password};`;
    case 'sqlite':
      return `sqlite:///${dbName}.db`;
    case 'oracle':
      return `oracle://${user}:${password}@${host}:${port}/${dbName}`;
    default:
      return `${d}://${user}:${password}@${host}:${port}/${dbName}`;
  }
}

function getDefaultPort(dialect: string): number {
  switch (dialect) {
    case 'postgres':
    case 'postgresql':
      return 5432;
    case 'mysql':
      return 3306;
    case 'mssql':
    case 'sqlserver':
      return 1433;
    case 'oracle':
      return 1521;
    default:
      return 5432;
  }
}

// ============================================
// SQL Query Fragments
// ============================================

/**
 * Generate a SELECT clause.
 */
function generateSelect(): string {
  const table = generateTableName();
  const columns: string[] = [];
  const numCols = randomInt(1, 5);

  for (let i = 0; i < numCols; i++) {
    columns.push(generateColumnName());
  }

  const distinct = random() > 0.8 ? 'DISTINCT ' : '';
  return `SELECT ${distinct}${columns.join(', ')} FROM ${table}`;
}

/**
 * Generate a WHERE clause.
 */
function generateWhere(): string {
  const column = generateColumnName();
  const operators = ['=', '!=', '<', '>', '<=', '>=', 'LIKE', 'IN', 'IS NULL', 'IS NOT NULL'];
  const op = randomChoice(operators);

  if (op === 'IS NULL' || op === 'IS NOT NULL') {
    return `WHERE ${column} ${op}`;
  }
  if (op === 'IN') {
    const values = [escapeString(), escapeString(), escapeString()];
    return `WHERE ${column} IN (${values.join(', ')})`;
  }
  if (op === 'LIKE') {
    return `WHERE ${column} LIKE '%${generateRandomString()}%'`;
  }

  // For comparison operators
  const valueType = random();
  if (valueType > 0.6) {
    return `WHERE ${column} ${op} ${escapeString()}`;
  } else if (valueType > 0.3) {
    return `WHERE ${column} ${op} ${generateInteger()}`;
  } else {
    return `WHERE ${column} ${op} ${generateBoolean()}`;
  }
}

/**
 * Generate an ORDER BY clause.
 */
function generateOrderBy(): string {
  const columns: string[] = [];
  const numCols = randomInt(1, 3);

  for (let i = 0; i < numCols; i++) {
    const col = generateColumnName();
    const dir = random() > 0.5 ? 'ASC' : 'DESC';
    const nulls = random() > 0.8 ? (random() > 0.5 ? ' NULLS FIRST' : ' NULLS LAST') : '';
    columns.push(`${col} ${dir}${nulls}`);
  }

  return `ORDER BY ${columns.join(', ')}`;
}

/**
 * Generate a LIMIT clause.
 * @param max - Maximum limit value (default: 100)
 */
function generateLimit(max?: unknown): string {
  const maxVal = typeof max === 'number' ? max : 100;
  const limit = randomInt(1, maxVal);
  const offset = random() > 0.5 ? ` OFFSET ${randomInt(0, 100)}` : '';
  return `LIMIT ${limit}${offset}`;
}

/**
 * Generate a GROUP BY clause.
 */
function generateGroupBy(): string {
  const columns: string[] = [];
  const numCols = randomInt(1, 3);

  for (let i = 0; i < numCols; i++) {
    columns.push(generateColumnName());
  }

  return `GROUP BY ${columns.join(', ')}`;
}

/**
 * Generate a JOIN clause.
 * @param type - Join type: 'inner', 'left', 'right', 'full', 'cross'
 */
function generateJoin(type?: unknown): string {
  const joinType =
    typeof type === 'string'
      ? type.toUpperCase()
      : randomChoice(['INNER', 'LEFT', 'LEFT OUTER', 'RIGHT', 'FULL OUTER', 'CROSS']);

  const table = generateTableName();
  const alias = generateAlias();

  if (joinType === 'CROSS') {
    return `CROSS JOIN ${table} ${alias}`;
  }

  const leftCol = generateColumnName();
  const rightCol = generateColumnName();

  return `${joinType} JOIN ${table} ${alias} ON ${alias}.${leftCol} = ${rightCol}`;
}

/**
 * Generate a simple INSERT statement.
 */
function generateInsert(): string {
  const table = generateTableName();
  const columns: string[] = [];
  const values: string[] = [];
  const numCols = randomInt(2, 5);

  for (let i = 0; i < numCols; i++) {
    columns.push(generateColumnName());
    const valType = random();
    if (valType > 0.6) {
      values.push(escapeString());
    } else if (valType > 0.3) {
      values.push(generateInteger());
    } else {
      values.push(generateBoolean());
    }
  }

  return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')})`;
}

/**
 * Generate a simple UPDATE statement.
 */
function generateUpdate(): string {
  const table = generateTableName();
  const sets: string[] = [];
  const numSets = randomInt(1, 4);

  for (let i = 0; i < numSets; i++) {
    const col = generateColumnName();
    const valType = random();
    let val: string;
    if (valType > 0.6) {
      val = escapeString();
    } else if (valType > 0.3) {
      val = generateInteger();
    } else {
      val = generateBoolean();
    }
    sets.push(`${col} = ${val}`);
  }

  return `UPDATE ${table} SET ${sets.join(', ')} ${generateWhere()}`;
}

/**
 * Generate a simple DELETE statement.
 */
function generateDelete(): string {
  const table = generateTableName();
  return `DELETE FROM ${table} ${generateWhere()}`;
}

/**
 * Generate a CREATE TABLE statement.
 */
function generateCreateTable(): string {
  const table = generateTableName();
  const columns: string[] = [];
  const numCols = randomInt(3, 8);

  // Always start with an ID column
  columns.push('id SERIAL PRIMARY KEY');

  for (let i = 0; i < numCols - 1; i++) {
    columns.push(generateColumnDefinition());
  }

  return `CREATE TABLE ${table} (\n  ${columns.join(',\n  ')}\n)`;
}

// ============================================
// SQL Placeholders
// ============================================

/**
 * Generate a SQL placeholder/parameter marker.
 * @param dialect - SQL dialect: 'postgres' ($1), 'mysql' (?), 'named' (:name)
 * @param index - Parameter index for positional placeholders
 */
function generatePlaceholder(dialect?: unknown, index?: unknown): string {
  const d = String(dialect ?? 'postgres');
  const idx = typeof index === 'number' ? index : randomInt(1, 10);

  switch (d) {
    case 'postgres':
    case 'postgresql':
      return `$${idx}`;
    case 'mysql':
    case 'sqlite':
      return '?';
    case 'mssql':
      return `@p${idx}`;
    case 'oracle':
      return `:${idx}`;
    case 'named':
      return `:${generateColumnName()}`;
    default:
      return `$${idx}`;
  }
}

// ============================================
// SQL Comments
// ============================================

/**
 * Generate a SQL comment.
 * @param style - Comment style: 'line' (--) or 'block' (/* *\/)
 */
function generateComment(style?: unknown): string {
  const comments = [
    'TODO: Add index',
    'FIXME: Performance issue',
    'NOTE: Legacy code',
    'Author: developer',
    'Date: 2024-01-15',
    'Version: 1.0',
    'This query needs optimization',
    'Temporary workaround',
  ];
  const comment = randomChoice(comments);
  const s = String(style ?? 'line');

  if (s === 'block') {
    return `/* ${comment} */`;
  }
  return `-- ${comment}`;
}

// ============================================
// Plugin Definition
// ============================================

export const sqlPlugin: VaguePlugin = {
  name: 'sql',
  generators: {
    // Identifiers
    tableName: wrapNoArgs(generateTableName),
    columnName: wrapNoArgs(generateColumnName),
    schemaName: wrapNoArgs(generateSchemaName),
    identifier: wrapNoArgs(generateIdentifier),
    alias: wrapNoArgs(generateAlias),
    quoted: wrap(quoteIdentifier),

    // Values
    string: wrap(escapeString),
    dateValue: wrap(generateDate),
    timestamp: wrap(generateTimestamp),
    nullValue: wrapNoArgs(generateNull),
    boolean: wrap(generateBoolean),
    integer: wrap(generateInteger),
    decimalValue: wrap(generateDecimal),

    // Data types
    dataType: wrap(generateDataType),
    columnDefinition: wrap(generateColumnDefinition),

    // Connection strings
    connectionString: wrap(generateConnectionString),

    // Query fragments
    select: wrapNoArgs(generateSelect),
    whereClause: wrapNoArgs(generateWhere),
    orderBy: wrapNoArgs(generateOrderBy),
    limit: wrap(generateLimit),
    groupBy: wrapNoArgs(generateGroupBy),
    join: wrap(generateJoin),

    // Full statements
    insert: wrapNoArgs(generateInsert),
    update: wrapNoArgs(generateUpdate),
    delete: wrapNoArgs(generateDelete),
    createTable: wrapNoArgs(generateCreateTable),

    // Placeholders
    placeholder: wrap(generatePlaceholder),

    // Comments
    comment: wrap(generateComment),
  },
};

/**
 * Shorthand generators that don't require the "sql." prefix
 */
export const sqlShorthandPlugin: VaguePlugin = {
  name: 'sql-shorthand',
  generators: {
    // Most commonly used identifiers
    tableName: wrapNoArgs(generateTableName),
    columnName: wrapNoArgs(generateColumnName),
    schemaName: wrapNoArgs(generateSchemaName),
    sqlIdentifier: wrapNoArgs(generateIdentifier),

    // Values
    sqlString: wrap(escapeString),
    sqlDateValue: wrap(generateDate),
    sqlTimestamp: wrap(generateTimestamp),
    sqlNullValue: wrapNoArgs(generateNull),
    sqlBoolean: wrap(generateBoolean),

    // Data types
    sqlDataType: wrap(generateDataType),

    // Connection strings
    connectionString: wrap(generateConnectionString),
  },
};

export default sqlPlugin;
