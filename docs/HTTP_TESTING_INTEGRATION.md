# HTTP Testing Tool Integration Analysis

This document analyzes how Vague can better integrate with HTTP testing tools like [Reqon](https://github.com/aschmelyun/reqon), an HTTP request interceptor for webhook testing.

## Current Capabilities

Vague already excels at API payload modeling:

- Rich examples for Twilio, Slack, Shopify, Stripe APIs
- Webhook URL and callback fields via `faker.internet.url()`
- HTTP methods: `request_method: 0.8: "POST" | 0.2: "GET"`
- Constraint validation: `assume if status == "failed" { error_code != null }`
- Strong OpenAPI integration (import, validation, example population)

## Implemented Improvements

### 1. HTTP Plugin (`src/plugins/http.ts`)

Built-in generators for HTTP-related data:

```vague
schema WebhookRequest {
  method: http.method(),              // Weighted HTTP methods
  status: http.statusCode(),          // Realistic status codes
  content_type: http.contentType(),   // MIME types
  user_agent: http.userAgent(),       // Browser/bot user agents
  accept: http.accept(),              // Accept headers
  cache_control: http.cacheControl(), // Cache-Control values
  cors_origin: http.corsOrigin(),     // CORS origins
}
```

### 2. NDJSON Streaming Output

Newline-delimited JSON for streaming and large datasets:

```bash
vague schema.vague --format ndjson -o output.jsonl
```

Each record outputs on a single line, ideal for:
- Streaming to HTTP testing tools
- Processing large datasets line-by-line
- Log aggregation systems

### 3. Environment Variable Support

Read configuration from environment:

```vague
schema Config {
  api_key: env("API_KEY"),
  base_url: env("BASE_URL", "http://localhost:3000"),  // with default
}
```

### 4. HTTP Testing Examples

See `examples/http-testing/` for patterns:
- `webhooks.vague` - Webhook payload generation
- Complete request/response modeling

### 5. Mock Server Mode

Start an HTTP server that serves generated data at REST endpoints:

```bash
vague schema.vague --serve              # http://localhost:3000
vague schema.vague --serve 8080         # http://localhost:8080
vague schema.vague --serve --seed 42    # Reproducible data
```

Each collection becomes an endpoint:
- `GET /` - List available endpoints
- `GET /{collection}` - All items in collection
- `GET /{collection}/{index}` - Single item by index

Example output:
```bash
$ vague invoices.vague --serve 3000

Vague mock server running at http://localhost:3000

Available endpoints:
  GET /invoices        (100 items)
  GET /invoices/{index} (0-99)
  GET /payments        (50 items)
  GET /payments/{index} (0-49)
```

Programmatic API:
```typescript
import { createMockServer } from 'vague';

const server = await createMockServer(`
  schema User { id: int, name: string }
  dataset Test { users: 10 of User }
`, { port: 3000, seed: 42 });

await server.listen();
// GET http://localhost:3000/users
await server.close();
```

## Future Improvements

### High Priority

| Feature | Description |
|---------|-------------|
| Signature/HMAC | `hmac.sha256(payload, secret)` for webhook auth |
| cURL/HAR Export | `--format curl` or `--format har` |

### Medium Priority

| Feature | Description |
|---------|-------------|
| Webhook Sequences | Ordered event generation with cross-references |
| Ordered Timestamps | `ordered by timestamp` clause |
| Request/Response Pairs | Matched request/response schema patterns |

### Proposed Syntax Examples

#### Webhook Sequences
```vague
sequence OrderLifecycle {
  created: WebhookEvent where .type == "order.created",
  paid: WebhookEvent where .type == "order.paid" and .order_id == created.order_id,
}
```

#### Signature Generation
```vague
schema StripeWebhook {
  payload: PayloadData,
  signature: hmac.sha256(^payload, env("STRIPE_SECRET"))
}
```

## Integration Patterns

### With Reqon

1. Generate webhook payloads with Vague
2. POST to Reqon's interceptor endpoint
3. Inspect captured payloads in Reqon's dashboard

```bash
# Generate and send to Reqon
vague webhooks.vague --format ndjson | while read line; do
  curl -X POST http://localhost:8080 -d "$line" -H "Content-Type: application/json"
done
```

### With Vague Mock Server

Use Vague's built-in mock server:

```bash
vague api.vague --serve 3000
# Your app can now hit http://localhost:3000/{collection}
```

### With External Mock Servers

1. Generate API responses with Vague
2. Serve via external mock server (json-server, Mockoon, etc.)
3. Point application under test to mock endpoints

## References

- [Reqon GitHub](https://github.com/aschmelyun/reqon)
- [Vague Syntax Reference](../SYNTAX.md)
- [Vague TODO](../TODO.md)
