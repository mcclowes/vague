---
sidebar_position: 5
title: HTTP Plugin
---

# HTTP Plugin

The HTTP plugin generates HTTP-related data like status codes, methods, headers, content types, and user agents. Useful for generating realistic HTTP request/response test data and webhook payloads.

## Basic Usage

```vague
schema WebhookRequest {
  method: http.method(),
  status: http.statusCode(),
  content_type: http.contentType(),
  user_agent: http.userAgent()
}
```

## HTTP Methods

Generate weighted HTTP methods (GET is most common):

```vague
schema Request {
  method: http.method()
}
// Output: "GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", or "OPTIONS"
```

## Status Codes

### Realistic Distribution

```vague
schema Response {
  // Weighted toward success codes
  status: http.statusCode()
}
```

### Category-Specific

```vague
schema Response {
  // Success responses (2xx)
  success_code: http.successCode(),

  // Client errors (4xx)
  client_error: http.clientErrorCode(),

  // Server errors (5xx)
  server_error: http.serverErrorCode(),

  // Get status text for a code
  status_text: http.statusText(200)
}
// success_code: 200, 201, 202, or 204
// client_error: 400, 401, 403, 404, 405, 409, 422, or 429
// server_error: 500, 501, 502, 503, or 504
// status_text: "OK"
```

### Full Status Object

```vague
schema Response {
  status: http.status()
}
// Output: { "code": 200, "text": "OK" }
```

## Headers

### Content Types

```vague
schema Request {
  content_type: http.contentType()
}
// Output: "application/json", "text/html", "multipart/form-data", etc.
```

### User Agents

```vague
schema Request {
  user_agent: http.userAgent()
}
// Output: Realistic browser, mobile, or bot user agents
```

### Accept Headers

```vague
schema Request {
  accept: http.accept()
}
// Output: "application/json", "*/*", "text/html,application/xhtml+xml", etc.
```

### Cache Control

```vague
schema Response {
  cache_control: http.cacheControl()
}
// Output: "no-cache", "max-age=3600", "private, no-cache", etc.
```

### Header Names

```vague
schema Metadata {
  request_header: http.requestHeader(),
  response_header: http.responseHeader()
}
// request_header: "Content-Type", "Authorization", "User-Agent", etc.
// response_header: "Cache-Control", "ETag", "X-Request-Id", etc.
```

## CORS Headers

```vague
schema CORSConfig {
  origin: http.corsOrigin(),
  methods: http.corsMethods(),
  headers: http.corsHeaders()
}
// origin: "*", "https://example.com", "http://localhost:3000"
// methods: "GET, POST, OPTIONS", "GET, POST, PUT, DELETE, OPTIONS"
// headers: "Content-Type, Authorization", "*"
```

## Authentication

```vague
schema Auth {
  // Bearer token with 32-char random string
  bearer: http.bearerToken(),

  // Basic auth with base64 encoding
  basic: http.basicAuth(),

  // API key with optional prefix
  api_key: http.apiKey()
}
// bearer: "Bearer xK9mN3pQ7rS1tU5vW2xY4zA6bC8dE0fG"
// basic: "Basic YWRtaW46cGFzc3dvcmQxMjM="
// api_key: "api_xK9mN3pQ7rS1tU5vW2xY4zA6bC8dE0fG"
```

## Webhooks

```vague
schema Webhook {
  event: http.webhookEvent()
}
// Output: "payment.succeeded", "order.created", "user.updated", etc.
```

Common webhook events include:
- Payment: `payment.created`, `payment.succeeded`, `payment.failed`, `payment.refunded`
- Orders: `order.created`, `order.updated`, `order.completed`, `order.cancelled`
- Users: `user.created`, `user.updated`, `user.deleted`
- Subscriptions: `subscription.created`, `subscription.cancelled`, `subscription.renewed`
- Invoices: `invoice.created`, `invoice.paid`, `invoice.overdue`

## Environment Variables

Read environment variables at generation time:

```vague
schema Config {
  // Read env var (empty string if not set)
  api_url: env("API_URL"),

  // With default value
  timeout: env("TIMEOUT", "30")
}
```

## Shorthand Functions

These generators are available without the `http.` prefix:

| Function | Description |
|----------|-------------|
| `httpMethod()` | HTTP method |
| `httpStatusCode()` | Status code |
| `httpStatusText(code)` | Status text for code |
| `httpContentType()` | Content type |
| `httpUserAgent()` | User agent string |
| `httpAccept()` | Accept header |
| `httpCacheControl()` | Cache-Control value |
| `bearerToken()` | Bearer auth token |
| `basicAuth()` | Basic auth header |
| `apiKey()` | API key |
| `webhookEvent()` | Webhook event type |
| `env(name, default?)` | Environment variable |

## Practical Examples

### API Request Logging

```vague
schema RequestLog {
  timestamp: now(),
  method: http.method(),
  path: regex("/api/v[12]/[a-z]+"),
  status: http.statusCode(),
  user_agent: http.userAgent(),
  duration_ms: int in 10..2000
}
```

### Webhook Payload

```vague
schema WebhookPayload {
  id: uuid(),
  event: http.webhookEvent(),
  created_at: now(),
  data: {
    object_id: uuid(),
    status: "active" | "inactive"
  }
}
```

### Load Balancer Health Check

```vague
schema HealthCheck {
  service: "api" | "web" | "worker",
  status: http.successCode(),
  latency_ms: int in 1..100,
  cache_status: "HIT" | "MISS"
}
```

### CORS Configuration Test

```vague
schema CORSTest {
  origin: http.corsOrigin(),
  method: http.method(),
  allowed_headers: http.corsHeaders(),
  exposed_headers: http.responseHeader(),
  max_age: int in 0..86400
}
```

## See Also

- [Regex Plugin](/docs/plugins/regex) for custom identifier patterns
- [Faker Plugin](/docs/plugins/faker) for realistic user data
- [Custom Plugins](/docs/plugins/custom-plugins) for extending generators
