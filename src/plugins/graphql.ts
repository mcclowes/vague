/**
 * GraphQL plugin for Vague
 *
 * Generates GraphQL-related test data including field names, type names,
 * operation names, queries, mutations, errors, and more.
 *
 * Usage in .vague files:
 *   schema GraphQLTest {
 *     // Identifiers
 *     fieldName: graphql.fieldName()            // Valid GraphQL field name
 *     typeName: graphql.typeName()              // Valid GraphQL type name (PascalCase)
 *     operationName: graphql.operationName()    // Valid operation name
 *     enumValue: graphql.enumValue()            // SCREAMING_SNAKE_CASE enum value
 *     directiveName: graphql.directiveName()    // @directive name
 *
 *     // Scalar values
 *     id: graphql.id()                          // GraphQL ID scalar
 *     gqlString: graphql.string()               // GraphQL String with escaping
 *     gqlInt: graphql.integer()                 // GraphQL Int (32-bit signed)
 *     gqlFloat: graphql.float()                 // GraphQL Float
 *     gqlBoolean: graphql.boolean()             // GraphQL Boolean
 *
 *     // Operations
 *     query: graphql.query()                    // Simple query string
 *     mutation: graphql.mutation()              // Simple mutation string
 *     subscription: graphql.subscription()      // Simple subscription string
 *     fragment: graphql.fragment()              // Fragment definition
 *
 *     // Errors
 *     error: graphql.error()                    // GraphQL error object
 *     errorMessage: graphql.errorMessage()      // Error message string
 *     errorCode: graphql.errorCode()            // Error code (e.g., "UNAUTHENTICATED")
 *
 *     // Variables
 *     variableName: graphql.variableName()      // $variableName
 *     variables: graphql.variables()            // Variables object
 *
 *     // Schema introspection
 *     introspectionType: graphql.introspectionType()  // __Type, __Field, etc.
 *     builtinScalar: graphql.builtinScalar()    // ID, String, Int, Float, Boolean
 *     builtinDirective: graphql.builtinDirective()  // @skip, @include, @deprecated
 *   }
 *
 * Or with simple names (shorthand plugin):
 *   schema Test {
 *     field: gqlFieldName()
 *     type: gqlTypeName()
 *     query: gqlQuery()
 *   }
 */

import type { VaguePlugin, GeneratorFunction } from '../interpreter/generator.js';
import { random, randomInt } from '../interpreter/random.js';

// Helper for no-arg generators
function wrapNoArgs<T>(fn: () => T): GeneratorFunction {
  return () => fn();
}

// ============================================
// GraphQL Identifiers
// ============================================

// Common field name parts
const FIELD_PREFIXES = ['get', 'fetch', 'find', 'list', 'search', 'query', 'load', 'retrieve'];
const FIELD_NOUNS = [
  'user',
  'users',
  'post',
  'posts',
  'comment',
  'comments',
  'product',
  'products',
  'order',
  'orders',
  'item',
  'items',
  'category',
  'categories',
  'tag',
  'tags',
  'author',
  'authors',
  'article',
  'articles',
  'message',
  'messages',
  'notification',
  'notifications',
  'settings',
  'profile',
  'account',
  'payment',
  'subscription',
  'invoice',
];

const SIMPLE_FIELDS = [
  'id',
  'name',
  'title',
  'description',
  'email',
  'createdAt',
  'updatedAt',
  'status',
  'type',
  'count',
  'total',
  'price',
  'quantity',
  'isActive',
  'isPublished',
  'isDeleted',
  'content',
  'body',
  'slug',
  'url',
  'imageUrl',
  'avatarUrl',
  'firstName',
  'lastName',
  'fullName',
  'username',
  'password',
  'role',
  'permissions',
  'metadata',
  'data',
  'result',
  'results',
  'edges',
  'nodes',
  'pageInfo',
  'cursor',
  'hasNextPage',
  'hasPreviousPage',
  'totalCount',
];

function generateFieldName(): string {
  // 70% chance of simple field, 30% chance of prefixed field
  if (random() < 0.7) {
    return SIMPLE_FIELDS[Math.floor(random() * SIMPLE_FIELDS.length)];
  }

  const prefix = FIELD_PREFIXES[Math.floor(random() * FIELD_PREFIXES.length)];
  const noun = FIELD_NOUNS[Math.floor(random() * FIELD_NOUNS.length)];
  // Capitalize first letter of noun for camelCase
  return prefix + noun.charAt(0).toUpperCase() + noun.slice(1);
}

// Type names (PascalCase)
const TYPE_NAMES = [
  'User',
  'Post',
  'Comment',
  'Product',
  'Order',
  'OrderItem',
  'Category',
  'Tag',
  'Author',
  'Article',
  'Message',
  'Notification',
  'Settings',
  'Profile',
  'Account',
  'Payment',
  'Subscription',
  'Invoice',
  'Customer',
  'Address',
  'Review',
  'Rating',
  'Media',
  'Image',
  'File',
  'Attachment',
  'Permission',
  'Role',
  'Session',
  'Token',
  'Connection',
  'Edge',
  'Node',
  'PageInfo',
  'Query',
  'Mutation',
  'Subscription',
];

const TYPE_SUFFIXES = [
  'Input',
  'Payload',
  'Response',
  'Result',
  'Connection',
  'Edge',
  'Filter',
  'Sort',
  'Where',
];

function generateTypeName(): string {
  const baseName = TYPE_NAMES[Math.floor(random() * TYPE_NAMES.length)];

  // 30% chance of adding a suffix
  if (random() < 0.3) {
    const suffix = TYPE_SUFFIXES[Math.floor(random() * TYPE_SUFFIXES.length)];
    return baseName + suffix;
  }

  return baseName;
}

// Operation names
const OPERATION_VERBS = [
  'Get',
  'Fetch',
  'Find',
  'List',
  'Search',
  'Create',
  'Update',
  'Delete',
  'Remove',
  'Add',
];

function generateOperationName(): string {
  const verb = OPERATION_VERBS[Math.floor(random() * OPERATION_VERBS.length)];
  const noun = FIELD_NOUNS[Math.floor(random() * FIELD_NOUNS.length)];
  return verb + noun.charAt(0).toUpperCase() + noun.slice(1);
}

// Enum values (SCREAMING_SNAKE_CASE)
const ENUM_VALUES = [
  'ACTIVE',
  'INACTIVE',
  'PENDING',
  'APPROVED',
  'REJECTED',
  'DRAFT',
  'PUBLISHED',
  'ARCHIVED',
  'DELETED',
  'PROCESSING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
  'SHIPPED',
  'DELIVERED',
  'RETURNED',
  'ASC',
  'DESC',
  'CREATED_AT',
  'UPDATED_AT',
  'NAME',
  'PRICE',
  'POPULARITY',
  'ADMIN',
  'USER',
  'GUEST',
  'MODERATOR',
  'SUPER_ADMIN',
  'READ',
  'WRITE',
  'EXECUTE',
  'FULL_ACCESS',
];

function generateEnumValue(): string {
  return ENUM_VALUES[Math.floor(random() * ENUM_VALUES.length)];
}

// Directive names
const DIRECTIVE_NAMES = [
  'deprecated',
  'skip',
  'include',
  'auth',
  'cacheControl',
  'rateLimit',
  'permission',
  'validate',
  'transform',
  'log',
  'trace',
  'timing',
  'computed',
  'external',
  'requires',
  'provides',
  'key',
  'shareable',
  'inaccessible',
  'override',
  'tag',
];

function generateDirectiveName(): string {
  const name = DIRECTIVE_NAMES[Math.floor(random() * DIRECTIVE_NAMES.length)];
  return '@' + name;
}

// ============================================
// GraphQL Scalar Values
// ============================================

function generateId(): string {
  // Generate various ID formats
  const format = Math.floor(random() * 4);
  switch (format) {
    case 0: {
      // UUID
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.floor(random() * 16);
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    }
    case 1:
      // Numeric string
      return String(randomInt(1, 999999999));
    case 2: {
      // Base64-like
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      const len = randomInt(8, 24);
      for (let i = 0; i < len; i++) {
        result += chars[Math.floor(random() * chars.length)];
      }
      return result;
    }
    default: {
      // Prefixed ID
      const prefixes = ['usr_', 'ord_', 'prod_', 'cust_', 'inv_', 'sub_'];
      const prefix = prefixes[Math.floor(random() * prefixes.length)];
      return prefix + randomInt(100000, 999999);
    }
  }
}

function generateGraphQLString(): string {
  const strings = [
    'Hello, World!',
    'This is a test string',
    'GraphQL is awesome',
    'String with "quotes"',
    "String with 'apostrophes'",
    'Line 1\\nLine 2',
    'Tab\\there',
    'Unicode: café ñ 日本語',
    'Emoji: 🚀 💻 🎉',
    '',
    ' ',
    'a',
    'A very long string that contains many words and characters to test how the system handles lengthy text content in GraphQL responses',
  ];
  return strings[Math.floor(random() * strings.length)];
}

function generateGraphQLInt(): number {
  // GraphQL Int is 32-bit signed integer
  const ranges = [
    [0, 100],
    [-100, 100],
    [0, 1000],
    [1, 10],
    [0, 1],
    [-2147483648, -1], // Negative range
    [1000000, 2147483647], // Large positive
  ] as const;

  const range = ranges[Math.floor(random() * ranges.length)];
  return randomInt(range[0], range[1]);
}

function generateGraphQLFloat(): number {
  const floats = [
    0.0,
    1.0,
    -1.0,
    3.14159,
    2.71828,
    0.5,
    0.001,
    99.99,
    -99.99,
    1234.5678,
    0.123456789,
    1e10,
    1e-10,
    Number.parseFloat((random() * 1000).toFixed(2)),
    Number.parseFloat((random() * 100 - 50).toFixed(4)),
  ];
  return floats[Math.floor(random() * floats.length)];
}

function generateGraphQLBoolean(): boolean {
  return random() < 0.5;
}

// ============================================
// GraphQL Operations
// ============================================

function generateQuery(): string {
  const queries = [
    `query { user(id: "1") { id name email } }`,
    `query GetUsers { users { id name } }`,
    `query { products(first: 10) { edges { node { id title price } } } }`,
    `query SearchProducts($query: String!) { search(query: $query) { id name } }`,
    `query { viewer { id username profile { bio avatarUrl } } }`,
    `query { posts(orderBy: CREATED_AT, first: 5) { id title createdAt } }`,
    `query { __schema { types { name } } }`,
    `query { node(id: "abc123") { ... on User { name } ... on Post { title } } }`,
    `query { orders(status: PENDING) { id total items { productId quantity } } }`,
    `query ($id: ID!) { user(id: $id) { id name posts { title } } }`,
  ];
  return queries[Math.floor(random() * queries.length)];
}

function generateMutation(): string {
  const mutations = [
    `mutation { createUser(input: { name: "John", email: "john@example.com" }) { id } }`,
    `mutation UpdateUser($id: ID!, $input: UserInput!) { updateUser(id: $id, input: $input) { id name } }`,
    `mutation { deletePost(id: "123") { success } }`,
    `mutation CreateOrder($input: OrderInput!) { createOrder(input: $input) { id total } }`,
    `mutation { login(email: "user@example.com", password: "secret") { token user { id } } }`,
    `mutation { logout { success } }`,
    `mutation AddToCart($productId: ID!, $quantity: Int!) { addToCart(productId: $productId, quantity: $quantity) { id items { id } } }`,
    `mutation { publishPost(id: "123") { id status publishedAt } }`,
    `mutation { updateSettings(input: { theme: DARK, notifications: true }) { id } }`,
    `mutation { resetPassword(email: "user@example.com") { success message } }`,
  ];
  return mutations[Math.floor(random() * mutations.length)];
}

function generateSubscription(): string {
  const subscriptions = [
    `subscription { messageAdded(channelId: "general") { id content author { name } } }`,
    `subscription OnNewPost { postCreated { id title author { id name } } }`,
    `subscription { orderStatusChanged(orderId: "123") { id status updatedAt } }`,
    `subscription { notificationReceived { id type message createdAt } }`,
    `subscription ($userId: ID!) { userStatusChanged(userId: $userId) { id status lastSeen } }`,
    `subscription { newComment(postId: "456") { id body author { name } } }`,
    `subscription { priceUpdate(productIds: ["1", "2", "3"]) { productId price } }`,
    `subscription { typingIndicator(conversationId: "abc") { userId isTyping } }`,
  ];
  return subscriptions[Math.floor(random() * subscriptions.length)];
}

function generateFragment(): string {
  const fragments = [
    `fragment UserFields on User { id name email createdAt }`,
    `fragment PostPreview on Post { id title excerpt author { name } }`,
    `fragment AddressFields on Address { street city state zipCode country }`,
    `fragment PaginationInfo on PageInfo { hasNextPage hasPreviousPage startCursor endCursor }`,
    `fragment ProductCard on Product { id name price imageUrl rating }`,
    `fragment OrderSummary on Order { id total status items { id quantity } }`,
    `fragment CommentFields on Comment { id body createdAt author { ...UserFields } }`,
    `fragment MediaFields on Media { id url type width height }`,
  ];
  return fragments[Math.floor(random() * fragments.length)];
}

// ============================================
// GraphQL Errors
// ============================================

const ERROR_CODES = [
  'UNAUTHENTICATED',
  'FORBIDDEN',
  'NOT_FOUND',
  'BAD_USER_INPUT',
  'VALIDATION_ERROR',
  'INTERNAL_SERVER_ERROR',
  'GRAPHQL_PARSE_FAILED',
  'GRAPHQL_VALIDATION_FAILED',
  'PERSISTED_QUERY_NOT_FOUND',
  'PERSISTED_QUERY_NOT_SUPPORTED',
  'RATE_LIMITED',
  'CONFLICT',
  'GONE',
  'SERVICE_UNAVAILABLE',
];

const ERROR_MESSAGES = [
  'You must be logged in to perform this action',
  'You do not have permission to access this resource',
  'The requested resource was not found',
  'Invalid input provided',
  'Validation failed for field "email"',
  'An internal server error occurred',
  'Syntax error in GraphQL query',
  'Cannot query field "foo" on type "Bar"',
  'Variable "$id" is not defined',
  'Argument "id" of required type "ID!" was not provided',
  'Field "user" argument "id" of type "ID!" is required but not provided',
  'Expected type Int!, found "abc"',
  'Rate limit exceeded. Please try again later.',
  'Resource already exists',
  'The requested operation is no longer available',
  'Service temporarily unavailable',
];

function generateErrorCode(): string {
  return ERROR_CODES[Math.floor(random() * ERROR_CODES.length)];
}

function generateErrorMessage(): string {
  return ERROR_MESSAGES[Math.floor(random() * ERROR_MESSAGES.length)];
}

interface GraphQLErrorLocation {
  line: number;
  column: number;
}

interface GraphQLError {
  message: string;
  locations?: GraphQLErrorLocation[];
  path?: (string | number)[];
  extensions?: {
    code: string;
    [key: string]: unknown;
  };
}

function generateError(): GraphQLError {
  const error: GraphQLError = {
    message: generateErrorMessage(),
  };

  // 70% chance to include locations
  if (random() < 0.7) {
    error.locations = [
      {
        line: randomInt(1, 50),
        column: randomInt(1, 100),
      },
    ];
  }

  // 60% chance to include path
  if (random() < 0.6) {
    const pathParts: (string | number)[] = [];
    const depth = randomInt(1, 4);
    for (let i = 0; i < depth; i++) {
      if (random() < 0.3 && i > 0) {
        pathParts.push(randomInt(0, 10));
      } else {
        pathParts.push(generateFieldName());
      }
    }
    error.path = pathParts;
  }

  // 80% chance to include extensions
  if (random() < 0.8) {
    error.extensions = {
      code: generateErrorCode(),
    };
  }

  return error;
}

// ============================================
// GraphQL Variables
// ============================================

function generateVariableName(): string {
  const names = [
    '$id',
    '$input',
    '$first',
    '$after',
    '$last',
    '$before',
    '$query',
    '$filter',
    '$orderBy',
    '$where',
    '$userId',
    '$email',
    '$password',
    '$data',
    '$options',
    '$skip',
    '$take',
    '$limit',
    '$offset',
    '$cursor',
  ];
  return names[Math.floor(random() * names.length)];
}

function generateVariables(): Record<string, unknown> {
  const templates = [
    { id: generateId() },
    { id: generateId(), input: { name: 'Test', email: 'test@example.com' } },
    { first: randomInt(5, 50), after: generateId() },
    { query: 'search term', limit: randomInt(10, 100) },
    { filter: { status: generateEnumValue(), createdAfter: '2024-01-01' } },
    { userId: generateId(), data: { active: generateGraphQLBoolean() } },
    { input: { title: 'New Item', description: 'Description', price: generateGraphQLFloat() } },
    { where: { id: { equals: generateId() } } },
    { orderBy: [{ createdAt: 'desc' }], take: randomInt(1, 20) },
    {},
  ];
  return templates[Math.floor(random() * templates.length)];
}

// ============================================
// Schema Introspection
// ============================================

const INTROSPECTION_TYPES = [
  '__Schema',
  '__Type',
  '__TypeKind',
  '__Field',
  '__InputValue',
  '__EnumValue',
  '__Directive',
  '__DirectiveLocation',
];

function generateIntrospectionType(): string {
  return INTROSPECTION_TYPES[Math.floor(random() * INTROSPECTION_TYPES.length)];
}

const BUILTIN_SCALARS = ['ID', 'String', 'Int', 'Float', 'Boolean'];

function generateBuiltinScalar(): string {
  return BUILTIN_SCALARS[Math.floor(random() * BUILTIN_SCALARS.length)];
}

const BUILTIN_DIRECTIVES = ['@skip', '@include', '@deprecated', '@specifiedBy'];

function generateBuiltinDirective(): string {
  return BUILTIN_DIRECTIVES[Math.floor(random() * BUILTIN_DIRECTIVES.length)];
}

// ============================================
// Additional Utilities
// ============================================

// Type kind values
const TYPE_KINDS = [
  'SCALAR',
  'OBJECT',
  'INTERFACE',
  'UNION',
  'ENUM',
  'INPUT_OBJECT',
  'LIST',
  'NON_NULL',
];

function generateTypeKind(): string {
  return TYPE_KINDS[Math.floor(random() * TYPE_KINDS.length)];
}

// Argument name
function generateArgumentName(): string {
  const names = [
    'id',
    'input',
    'data',
    'where',
    'filter',
    'orderBy',
    'first',
    'last',
    'after',
    'before',
    'skip',
    'take',
    'limit',
    'offset',
    'query',
    'search',
    'ids',
    'includeArchived',
    'format',
    'locale',
  ];
  return names[Math.floor(random() * names.length)];
}

// Schema definition snippets
function generateSchemaDefinition(): string {
  const definitions = [
    `type User { id: ID!, name: String!, email: String!, posts: [Post!]! }`,
    `type Post { id: ID!, title: String!, content: String, author: User!, createdAt: DateTime! }`,
    `input CreateUserInput { name: String!, email: String!, password: String! }`,
    `enum Status { DRAFT, PUBLISHED, ARCHIVED }`,
    `interface Node { id: ID! }`,
    `union SearchResult = User | Post | Comment`,
    `scalar DateTime`,
    `type Query { user(id: ID!): User, users(first: Int, after: String): UserConnection! }`,
    `type Mutation { createUser(input: CreateUserInput!): User!, deleteUser(id: ID!): Boolean! }`,
    `directive @auth(requires: Role!) on FIELD_DEFINITION`,
  ];
  return definitions[Math.floor(random() * definitions.length)];
}

// Connection type (Relay-style pagination)
function generateConnectionType(): string {
  const types = TYPE_NAMES.filter(
    (t) => !['Connection', 'Edge', 'PageInfo'].some((s) => t.includes(s))
  );
  const baseType = types[Math.floor(random() * types.length)];
  return baseType + 'Connection';
}

// ============================================
// Plugin Definition
// ============================================

export const graphqlPlugin: VaguePlugin = {
  name: 'graphql',
  generators: {
    // Identifiers
    fieldName: wrapNoArgs(generateFieldName),
    typeName: wrapNoArgs(generateTypeName),
    operationName: wrapNoArgs(generateOperationName),
    enumValue: wrapNoArgs(generateEnumValue),
    directiveName: wrapNoArgs(generateDirectiveName),
    argumentName: wrapNoArgs(generateArgumentName),
    variableName: wrapNoArgs(generateVariableName),

    // Scalar values
    id: wrapNoArgs(generateId),
    string: wrapNoArgs(generateGraphQLString),
    integer: wrapNoArgs(generateGraphQLInt),
    float: wrapNoArgs(generateGraphQLFloat),
    boolean: wrapNoArgs(generateGraphQLBoolean),

    // Operations
    query: wrapNoArgs(generateQuery),
    mutation: wrapNoArgs(generateMutation),
    subscription: wrapNoArgs(generateSubscription),
    fragment: wrapNoArgs(generateFragment),

    // Errors
    error: wrapNoArgs(generateError),
    errorMessage: wrapNoArgs(generateErrorMessage),
    errorCode: wrapNoArgs(generateErrorCode),

    // Variables
    variables: wrapNoArgs(generateVariables),

    // Schema introspection
    introspectionType: wrapNoArgs(generateIntrospectionType),
    builtinScalar: wrapNoArgs(generateBuiltinScalar),
    builtinDirective: wrapNoArgs(generateBuiltinDirective),
    typeKind: wrapNoArgs(generateTypeKind),

    // Schema definition
    schemaDefinition: wrapNoArgs(generateSchemaDefinition),
    connectionType: wrapNoArgs(generateConnectionType),
  },
};

/**
 * Shorthand generators that don't require the "graphql." prefix
 * Prefixed with "gql" to avoid conflicts with other plugins
 */
export const graphqlShorthandPlugin: VaguePlugin = {
  name: 'graphql-shorthand',
  generators: {
    // Most commonly used - prefixed with 'gql' to avoid conflicts
    gqlFieldName: wrapNoArgs(generateFieldName),
    gqlTypeName: wrapNoArgs(generateTypeName),
    gqlOperationName: wrapNoArgs(generateOperationName),
    gqlEnumValue: wrapNoArgs(generateEnumValue),
    gqlDirective: wrapNoArgs(generateDirectiveName),
    gqlId: wrapNoArgs(generateId),
    gqlQuery: wrapNoArgs(generateQuery),
    gqlMutation: wrapNoArgs(generateMutation),
    gqlSubscription: wrapNoArgs(generateSubscription),
    gqlFragment: wrapNoArgs(generateFragment),
    gqlError: wrapNoArgs(generateError),
    gqlErrorCode: wrapNoArgs(generateErrorCode),
    gqlVariables: wrapNoArgs(generateVariables),
    gqlSchema: wrapNoArgs(generateSchemaDefinition),
  },
};

export default graphqlPlugin;
