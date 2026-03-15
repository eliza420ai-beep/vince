---
paths: ["src/plugins/**/providers/**", "src/plugins/**/providers/*.ts"]
---

# Plugin Provider Conventions

## Provider Interface

Providers supply context to the agent before it decides what action to take. They return `{ text, values, data }`.

### Required Fields

- `name`: lowercase, descriptive (e.g., `vinceContext`, `trenchKnowledge`).
- `description`: one sentence explaining what context this provider supplies.
- `get(runtime, message, state)`: async function returning `ProviderResult`.

### Return Shape

```typescript
{
  text: string;      // Injected into agent context — keep concise
  values: {};        // Merged into state.values — structured data for other providers
  data: {};          // Stored in state.data — not directly visible to agent
}
```

## Context Budget

- Providers run on every message. Keep `text` output under 500 tokens.
- Trim verbose API responses to only the fields the agent needs.
- Cache expensive computations — don't re-fetch on every message.

## Positioning

- Use `position: -10` for foundational context (time, market state).
- Use `position: 0` (default) for standard context.
- Use `position: 10` for context that depends on other providers.

## Dynamic and Private Providers

- Mark providers `dynamic: true` if they are expensive and only needed for specific actions.
- Mark providers `private: true` if they should only be included when explicitly requested via `composeState(message, null, ["providerName"])`.

## Error Handling

- Never throw from a provider. Return `{ text: "", values: {}, data: {} }` on failure.
- Log the error with `logger.warn()` — not `logger.error()` — since a missing provider is non-fatal.
