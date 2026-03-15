---
paths: ["src/plugins/**/services/**", "src/plugins/**/services/*.ts"]
---

# Plugin Service Conventions

## Service Class Structure

Every service extends `Service` from `@elizaos/core` and must implement:

- `static serviceType = "kebab-case-name"` — unique identifier used by `runtime.getService()`.
- `constructor(protected runtime: IAgentRuntime)` — store the runtime reference.
- `static async start(runtime: IAgentRuntime)` — create and return the service instance. Log startup.
- `async stop()` — clean up caches, close connections. Log shutdown.

## Naming

- Class: `Vince<Feature>Service`, `Solus<Feature>Service`, etc.
- Service type: `vince-<feature>`, `solus-<feature>` (kebab-case, agent-prefixed).
- File: `<feature>.service.ts` (e.g., `coinglass.service.ts`).

## Caching

- Every service that calls an external API must cache results.
- Use a `Map<string, { data: T; timestamp: number }>` with a `cacheTTL` constant.
- Default TTL: 5 minutes for market data, 30 minutes for metadata, 24 hours for static reference data.
- Check cache before fetching. Return cached data if within TTL.

## Error Handling — Structured Responses

When a service method fails, return structured error context — not just `null` or `undefined`:

```typescript
return {
  error: true,
  errorCategory: "transient" | "validation" | "business" | "permission",
  isRetryable: boolean,
  description: "Human-readable explanation",
  partialData?: any
};
```

- **transient**: timeout, service unavailable. Retryable.
- **validation**: bad input (wrong asset ticker, missing param). Fix input and retry.
- **business**: policy violation (asset not supported, limit exceeded). Not retryable.
- **permission**: missing API key, auth failure. Needs config change.

Distinguish between "API returned empty results" (valid — the data doesn't exist) and "API call failed" (error — retry or escalate).

## Circuit Breakers

Services calling external APIs should implement circuit breakers:
- Track consecutive failures.
- After 3 failures, stop calling for 60 seconds.
- Log when the circuit opens and closes.

## Registration

Register services in the plugin's `index.ts` `services` array. The runtime instantiates them via `start()`.
