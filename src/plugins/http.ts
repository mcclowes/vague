/**
 * HTTP plugin for Vague
 *
 * Provides generators for HTTP-related data like status codes, methods,
 * headers, content types, and user agents. Useful for generating realistic
 * HTTP request/response test data and webhook payloads.
 *
 * Usage in .vague files:
 *   schema WebhookRequest {
 *     method: http.method()               // Weighted HTTP methods
 *     status: http.statusCode()           // Realistic status codes
 *     content_type: http.contentType()    // MIME types
 *     user_agent: http.userAgent()        // Browser/bot user agents
 *     accept: http.accept()               // Accept header values
 *     cache_control: http.cacheControl()  // Cache-Control directives
 *     cors_origin: http.corsOrigin()      // CORS origins
 *   }
 *
 * Or with simple names:
 *   schema Request {
 *     method: httpMethod()
 *     status: httpStatusCode()
 *   }
 */

import type { VaguePlugin, GeneratorFunction } from '../interpreter/generator.js';
import { random } from '../interpreter/random.js';

// Helper for weighted random selection
function weightedChoice<T>(choices: Array<{ value: T; weight: number }>): T {
  const totalWeight = choices.reduce((sum, c) => sum + c.weight, 0);
  let r = random() * totalWeight;
  for (const choice of choices) {
    r -= choice.weight;
    if (r <= 0) return choice.value;
  }
  return choices[choices.length - 1].value;
}

// Helper to create a generator from a function
function wrap<T>(fn: (...args: unknown[]) => T): GeneratorFunction {
  return (args) => fn(...args);
}

// Helper for no-arg generators
function wrapNoArgs<T>(fn: () => T): GeneratorFunction {
  return () => fn();
}

// ============================================
// HTTP Methods
// ============================================

const HTTP_METHODS = [
  { value: 'GET', weight: 0.4 },
  { value: 'POST', weight: 0.3 },
  { value: 'PUT', weight: 0.1 },
  { value: 'PATCH', weight: 0.08 },
  { value: 'DELETE', weight: 0.08 },
  { value: 'HEAD', weight: 0.02 },
  { value: 'OPTIONS', weight: 0.02 },
];

function generateMethod(): string {
  return weightedChoice(HTTP_METHODS);
}

// ============================================
// HTTP Status Codes
// ============================================

const STATUS_CODES = [
  // 2xx Success
  { value: 200, weight: 0.5 },
  { value: 201, weight: 0.1 },
  { value: 204, weight: 0.05 },
  { value: 202, weight: 0.02 },
  // 3xx Redirection
  { value: 301, weight: 0.02 },
  { value: 302, weight: 0.02 },
  { value: 304, weight: 0.02 },
  // 4xx Client Error
  { value: 400, weight: 0.08 },
  { value: 401, weight: 0.05 },
  { value: 403, weight: 0.03 },
  { value: 404, weight: 0.05 },
  { value: 422, weight: 0.02 },
  { value: 429, weight: 0.01 },
  // 5xx Server Error
  { value: 500, weight: 0.02 },
  { value: 502, weight: 0.005 },
  { value: 503, weight: 0.005 },
];

const STATUS_CODE_DESCRIPTIONS: Record<number, string> = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  204: 'No Content',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

function generateStatusCode(): number {
  return weightedChoice(STATUS_CODES);
}

function generateStatusText(code?: unknown): string {
  const statusCode = typeof code === 'number' ? code : generateStatusCode();
  return STATUS_CODE_DESCRIPTIONS[statusCode] || 'Unknown';
}

function generateStatus(): { code: number; text: string } {
  const code = generateStatusCode();
  return { code, text: STATUS_CODE_DESCRIPTIONS[code] || 'Unknown' };
}

// Category-specific generators
function generateSuccessCode(): number {
  const successCodes = [200, 201, 202, 204];
  return successCodes[Math.floor(random() * successCodes.length)];
}

function generateClientErrorCode(): number {
  const clientErrors = [400, 401, 403, 404, 405, 409, 422, 429];
  return clientErrors[Math.floor(random() * clientErrors.length)];
}

function generateServerErrorCode(): number {
  const serverErrors = [500, 501, 502, 503, 504];
  return serverErrors[Math.floor(random() * serverErrors.length)];
}

// ============================================
// Content Types
// ============================================

const CONTENT_TYPES = [
  { value: 'application/json', weight: 0.5 },
  { value: 'application/json; charset=utf-8', weight: 0.15 },
  { value: 'text/html', weight: 0.08 },
  { value: 'text/html; charset=utf-8', weight: 0.05 },
  { value: 'text/plain', weight: 0.05 },
  { value: 'application/xml', weight: 0.03 },
  { value: 'application/x-www-form-urlencoded', weight: 0.05 },
  { value: 'multipart/form-data', weight: 0.03 },
  { value: 'application/octet-stream', weight: 0.02 },
  { value: 'image/png', weight: 0.01 },
  { value: 'image/jpeg', weight: 0.01 },
  { value: 'application/pdf', weight: 0.01 },
  { value: 'application/javascript', weight: 0.005 },
  { value: 'text/css', weight: 0.005 },
];

function generateContentType(): string {
  return weightedChoice(CONTENT_TYPES);
}

// ============================================
// User Agents
// ============================================

const USER_AGENTS = [
  // Chrome
  {
    value:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    weight: 0.3,
  },
  {
    value:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    weight: 0.15,
  },
  // Firefox
  {
    value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    weight: 0.1,
  },
  {
    value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.2; rv:121.0) Gecko/20100101 Firefox/121.0',
    weight: 0.05,
  },
  // Safari
  {
    value:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    weight: 0.08,
  },
  // Edge
  {
    value:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
    weight: 0.05,
  },
  // Mobile
  {
    value:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    weight: 0.08,
  },
  {
    value:
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    weight: 0.05,
  },
  // Bots
  { value: 'Googlebot/2.1 (+http://www.google.com/bot.html)', weight: 0.03 },
  {
    value: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    weight: 0.02,
  },
  {
    value: 'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    weight: 0.02,
  },
  { value: 'curl/8.4.0', weight: 0.02 },
  { value: 'PostmanRuntime/7.35.0', weight: 0.02 },
  { value: 'axios/1.6.2', weight: 0.02 },
  { value: 'node-fetch/3.3.2', weight: 0.01 },
];

function generateUserAgent(): string {
  return weightedChoice(USER_AGENTS);
}

// ============================================
// Accept Headers
// ============================================

const ACCEPT_HEADERS = [
  {
    value: 'application/json',
    weight: 0.4,
  },
  {
    value: '*/*',
    weight: 0.2,
  },
  {
    value: 'application/json, text/plain, */*',
    weight: 0.15,
  },
  {
    value: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    weight: 0.1,
  },
  {
    value: 'application/json;charset=UTF-8',
    weight: 0.05,
  },
  {
    value: 'text/html',
    weight: 0.05,
  },
  {
    value: 'application/xml',
    weight: 0.03,
  },
  {
    value: 'image/*',
    weight: 0.02,
  },
];

function generateAccept(): string {
  return weightedChoice(ACCEPT_HEADERS);
}

// ============================================
// Cache Control
// ============================================

const CACHE_CONTROL_VALUES = [
  { value: 'no-cache', weight: 0.2 },
  { value: 'no-store', weight: 0.15 },
  { value: 'max-age=0', weight: 0.1 },
  { value: 'max-age=3600', weight: 0.15 },
  { value: 'max-age=86400', weight: 0.1 },
  { value: 'max-age=604800', weight: 0.05 },
  { value: 'private, max-age=3600', weight: 0.08 },
  { value: 'public, max-age=86400', weight: 0.07 },
  { value: 'no-cache, no-store, must-revalidate', weight: 0.05 },
  { value: 'private, no-cache', weight: 0.03 },
  { value: 's-maxage=3600', weight: 0.02 },
];

function generateCacheControl(): string {
  return weightedChoice(CACHE_CONTROL_VALUES);
}

// ============================================
// CORS Headers
// ============================================

const CORS_ORIGINS = [
  { value: '*', weight: 0.3 },
  { value: 'https://example.com', weight: 0.15 },
  { value: 'https://app.example.com', weight: 0.1 },
  { value: 'http://localhost:3000', weight: 0.15 },
  { value: 'http://localhost:8080', weight: 0.1 },
  { value: 'https://api.example.com', weight: 0.1 },
  { value: 'null', weight: 0.05 },
  { value: 'https://staging.example.com', weight: 0.05 },
];

function generateCorsOrigin(): string {
  return weightedChoice(CORS_ORIGINS);
}

const CORS_METHODS = [
  { value: 'GET, POST, OPTIONS', weight: 0.3 },
  { value: 'GET, POST, PUT, DELETE, OPTIONS', weight: 0.25 },
  { value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS', weight: 0.2 },
  { value: '*', weight: 0.15 },
  { value: 'GET, OPTIONS', weight: 0.1 },
];

function generateCorsMethods(): string {
  return weightedChoice(CORS_METHODS);
}

const CORS_HEADERS_VALUES = [
  { value: 'Content-Type, Authorization', weight: 0.3 },
  { value: 'Content-Type, Authorization, X-Requested-With', weight: 0.2 },
  { value: 'Content-Type', weight: 0.15 },
  { value: '*', weight: 0.15 },
  { value: 'Content-Type, Authorization, X-API-Key', weight: 0.1 },
  { value: 'Accept, Content-Type, Authorization', weight: 0.1 },
];

function generateCorsHeaders(): string {
  return weightedChoice(CORS_HEADERS_VALUES);
}

// ============================================
// Authorization Headers
// ============================================

function generateBearerToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(random() * chars.length)];
  }
  return `Bearer ${token}`;
}

function generateBasicAuth(): string {
  const users = ['admin', 'user', 'api', 'service', 'test'];
  const user = users[Math.floor(random() * users.length)];
  const pass = Math.random().toString(36).substring(2, 10);
  return `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`;
}

function generateApiKey(): string {
  const prefixes = ['sk_live_', 'pk_test_', 'api_', 'key_', ''];
  const prefix = prefixes[Math.floor(random() * prefixes.length)];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < 32; i++) {
    key += chars[Math.floor(random() * chars.length)];
  }
  return `${prefix}${key}`;
}

// ============================================
// Request/Response Headers
// ============================================

const REQUEST_HEADERS = [
  'Accept',
  'Accept-Encoding',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Connection',
  'Content-Length',
  'Content-Type',
  'Cookie',
  'Host',
  'Origin',
  'Referer',
  'User-Agent',
  'X-Requested-With',
  'X-Forwarded-For',
  'X-Real-IP',
];

function generateRequestHeader(): string {
  return REQUEST_HEADERS[Math.floor(random() * REQUEST_HEADERS.length)];
}

const RESPONSE_HEADERS = [
  'Cache-Control',
  'Content-Encoding',
  'Content-Length',
  'Content-Type',
  'Date',
  'ETag',
  'Expires',
  'Last-Modified',
  'Server',
  'Set-Cookie',
  'Vary',
  'X-Content-Type-Options',
  'X-Frame-Options',
  'X-Request-Id',
  'X-RateLimit-Limit',
  'X-RateLimit-Remaining',
];

function generateResponseHeader(): string {
  return RESPONSE_HEADERS[Math.floor(random() * RESPONSE_HEADERS.length)];
}

// ============================================
// Webhook-specific generators
// ============================================

const WEBHOOK_EVENTS = [
  // Payment events
  { value: 'payment.created', weight: 0.1 },
  { value: 'payment.succeeded', weight: 0.15 },
  { value: 'payment.failed', weight: 0.05 },
  { value: 'payment.refunded', weight: 0.03 },
  // Order events
  { value: 'order.created', weight: 0.1 },
  { value: 'order.updated', weight: 0.08 },
  { value: 'order.completed', weight: 0.08 },
  { value: 'order.cancelled', weight: 0.03 },
  // User events
  { value: 'user.created', weight: 0.08 },
  { value: 'user.updated', weight: 0.05 },
  { value: 'user.deleted', weight: 0.02 },
  // Subscription events
  { value: 'subscription.created', weight: 0.05 },
  { value: 'subscription.updated', weight: 0.03 },
  { value: 'subscription.cancelled', weight: 0.02 },
  { value: 'subscription.renewed', weight: 0.03 },
  // Invoice events
  { value: 'invoice.created', weight: 0.05 },
  { value: 'invoice.paid', weight: 0.04 },
  { value: 'invoice.overdue', weight: 0.02 },
];

function generateWebhookEvent(): string {
  return weightedChoice(WEBHOOK_EVENTS);
}

// ============================================
// Environment Function
// ============================================

function generateEnv(varName?: unknown, defaultValue?: unknown): string {
  if (typeof varName !== 'string') {
    throw new Error('env() requires a variable name as the first argument');
  }
  const value = process.env[varName];
  if (value !== undefined) {
    return value;
  }
  if (defaultValue !== undefined) {
    return String(defaultValue);
  }
  return '';
}

// ============================================
// Plugin Definition
// ============================================

export const httpPlugin: VaguePlugin = {
  name: 'http',
  generators: {
    // Methods
    method: wrapNoArgs(generateMethod),

    // Status codes
    statusCode: wrapNoArgs(generateStatusCode),
    statusText: wrap(generateStatusText),
    status: wrapNoArgs(generateStatus),
    successCode: wrapNoArgs(generateSuccessCode),
    clientErrorCode: wrapNoArgs(generateClientErrorCode),
    serverErrorCode: wrapNoArgs(generateServerErrorCode),

    // Content types
    contentType: wrapNoArgs(generateContentType),

    // User agents
    userAgent: wrapNoArgs(generateUserAgent),

    // Accept headers
    accept: wrapNoArgs(generateAccept),

    // Cache control
    cacheControl: wrapNoArgs(generateCacheControl),

    // CORS
    corsOrigin: wrapNoArgs(generateCorsOrigin),
    corsMethods: wrapNoArgs(generateCorsMethods),
    corsHeaders: wrapNoArgs(generateCorsHeaders),

    // Authorization
    bearerToken: wrapNoArgs(generateBearerToken),
    basicAuth: wrapNoArgs(generateBasicAuth),
    apiKey: wrapNoArgs(generateApiKey),

    // Headers
    requestHeader: wrapNoArgs(generateRequestHeader),
    responseHeader: wrapNoArgs(generateResponseHeader),

    // Webhooks
    webhookEvent: wrapNoArgs(generateWebhookEvent),

    // Environment
    env: wrap(generateEnv),
  },
};

/**
 * Shorthand generators that don't require the "http." prefix
 */
export const httpShorthandPlugin: VaguePlugin = {
  name: 'http-shorthand',
  generators: {
    httpMethod: wrapNoArgs(generateMethod),
    httpStatusCode: wrapNoArgs(generateStatusCode),
    httpStatusText: wrap(generateStatusText),
    httpContentType: wrapNoArgs(generateContentType),
    httpUserAgent: wrapNoArgs(generateUserAgent),
    httpAccept: wrapNoArgs(generateAccept),
    httpCacheControl: wrapNoArgs(generateCacheControl),
    bearerToken: wrapNoArgs(generateBearerToken),
    basicAuth: wrapNoArgs(generateBasicAuth),
    apiKey: wrapNoArgs(generateApiKey),
    webhookEvent: wrapNoArgs(generateWebhookEvent),
    env: wrap(generateEnv),
  },
};

export default httpPlugin;
