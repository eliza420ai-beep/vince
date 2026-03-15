---
paths: ["src/plugins/**/actions/**", "src/plugins/**/actions/*.ts"]
---

# Plugin Action Conventions

## Action Interface

Every action must define: `name`, `description`, `similes`, `validate`, `handler`, `examples`.

### name

- ALL_CAPS with agent prefix: `VINCE_PERPS`, `SOLUS_STRIKE`, `OTAKU_SWAP`.
- Must be unique across the entire plugin ecosystem. Check `src/plugins/*/src/actions/` before naming.

### description

- One sentence, benefit-led. State what the user gets, not what the system does.
- Good: "Shows paper trading portfolio with open positions and daily P&L."
- Bad: "Retrieves portfolio data from the position manager service."
- This is the primary mechanism the LLM uses for action selection. Vague or overlapping descriptions cause misrouting.

### similes

- 3-8 trigger phrases a user might say. Lowercase, no punctuation.
- Include the most natural phrasings first.
- Do not overlap with similes from other actions in the same plugin.

### validate

- Return `true` only when the message clearly matches this action's intent.
- Check `message.content.text?.toLowerCase()` for trigger keywords.
- Keep validation fast — no API calls, no service lookups.

### handler

- Get services via `runtime.getService("service-name")`. Handle the case where the service is null (plugin not loaded).
- Call `callback({ text: response })` exactly once with the formatted response.
- Return `{ success: true }` or `{ success: false }` — never throw.
- Include a `thought` field in the callback when the action involves reasoning the user doesn't see.

### examples

- At least 2 example conversations showing trigger → response.
- Use `{{name1}}` and `{{name2}}` placeholders for user/agent names.
- Include the `actions: ["ACTION_NAME"]` field in the agent response.

## Error Handling

- When a required service is missing, return a user-friendly message explaining what's needed (e.g., "CoinGlass API key required for this feature").
- When an API call fails, distinguish between transient errors (retry-worthy) and permanent errors (missing config). Tell the user which it is.
- Never return raw error objects or stack traces in the callback text.

## Brand Voice

- Benefit-led, confident, no AI-slop. See `knowledge/teammate/NO-AI-SLOP.md`.
- Lead with what the user gets. Not "the system retrieved" but "here's your signal."
