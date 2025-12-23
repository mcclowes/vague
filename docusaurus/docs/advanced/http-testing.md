---
sidebar_position: 7
title: HTTP Testing Integration
---

# HTTP Testing Integration

Vague integrates well with HTTP testing tools for generating webhook payloads, API responses, and request/response test data.

## Mock Server Mode

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

Example:

```bash
$ vague invoices.vague --serve 3000

Vague mock server running at http://localhost:3000

Available endpoints:
  GET /invoices        (100 items)
  GET /invoices/{index} (0-99)
  GET /payments        (50 items)
  GET /payments/{index} (0-49)
```

### Programmatic API

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

## NDJSON Streaming Output

Newline-delimited JSON for streaming and large datasets:

```bash
vague schema.vague --format ndjson -o output.jsonl
```

Each record outputs on a single line, ideal for:
- Streaming to HTTP testing tools
- Processing large datasets line-by-line
- Log aggregation systems

## Webhook Payloads

Use the [HTTP Plugin](/docs/plugins/http) for webhook-specific generators:

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

The `http.webhookEvent()` generator produces common webhook events like:
- `payment.succeeded`, `payment.failed`
- `order.created`, `order.completed`
- `user.created`, `user.updated`
- `subscription.renewed`, `subscription.cancelled`

## HTTP Request/Response Modeling

```vague
schema RequestLog {
  timestamp: now(),
  method: http.method(),
  path: regex("/api/v[12]/[a-z]+"),
  status: http.statusCode(),
  user_agent: http.userAgent(),
  content_type: http.contentType(),
  duration_ms: int in 10..2000
}
```

## Environment Variables

Read configuration from environment at generation time:

```vague
schema Config {
  api_key: env("API_KEY"),
  base_url: env("BASE_URL", "http://localhost:3000")
}
```

## Integration Patterns

### With External Mock Servers

Generate data and serve via json-server, Mockoon, or similar:

```bash
# Generate JSON file
vague api.vague -o db.json --pretty

# Serve with json-server
npx json-server db.json --port 3000
```

### With Request Interceptors

Stream payloads to webhook testing tools:

```bash
# Generate and send to interceptor
vague webhooks.vague --format ndjson | while read line; do
  curl -X POST http://localhost:8080 \
    -d "$line" \
    -H "Content-Type: application/json"
done
```

### Load Testing

Generate large datasets for load testing:

```vague
schema Request {
  method: http.method(),
  path: regex("/api/[a-z]+/[0-9]+"),
  body: { data: sentence() }
}

dataset LoadTest {
  requests: 10000 of Request
}
```

```bash
vague load-test.vague --format ndjson -o requests.jsonl
# Use with k6, wrk, or other load testing tools
```

## Complete Webhook Example

```vague
import stripe from "stripe-openapi.json"

schema StripeWebhook {
  id: regex("evt_[A-Za-z0-9]{24}"),
  object: "event",
  api_version: "2024-01-01",
  created: int in 1700000000..1750000000,
  type: http.webhookEvent(),
  livemode: boolean,
  data: {
    object: {
      id: uuid(),
      amount: int in 100..100000,
      currency: "usd" | "eur" | "gbp",
      status: "succeeded" | "pending" | "failed"
    }
  }
}

dataset WebhookTests {
  events: 50 of StripeWebhook
}
```

## See Also

- [HTTP Plugin](/docs/plugins/http) for HTTP-related generators
- [CLI Reference](/docs/cli) for all CLI options
