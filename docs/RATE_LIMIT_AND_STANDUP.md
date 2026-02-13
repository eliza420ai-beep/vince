# Rate limits and standup

When many agents share one LLM org (e.g. Anthropic 200K input tokens/min), a single human message in a shared channel can trigger every agent to call the model and quickly hit the limit. This doc describes the knobs we use to stay under rate limits and keep standup useful.

## Standup single-responder (A2A_CONTEXT)

In channels identified as "standup" (e.g. `#daily-standup`), **only one agent** is allowed to respond to human messages. That agent is the standup facilitator (default: **Kelly**). All other agents receive an instruction to IGNORE human messages in that channel.

- **Env:** `A2A_STANDUP_SINGLE_RESPONDER` — agent name that may respond to humans in standup (default: `STANDUP_COORDINATOR_AGENT` or `"Kelly"`).
- **Env:** `A2A_STANDUP_CHANNEL_NAMES` — comma-separated substrings that identify standup rooms (default: `standup,daily-standup`). Room name is matched case-insensitively.

**Standup room detection:** Detection uses `room.name`; if that is empty (e.g. some Discord adapters), the code falls back to `room.metadata.channelName`, `room.metadata.name`, and then `message.content.channelName` when the room record has no name. The Discord plugin should set `message.content.channelName` when building messages from channel events so standup is detected even when the room object is not yet populated. Ensure your standup channel’s name (in Discord or in the room object) contains one of the substrings in `A2A_STANDUP_CHANNEL_NAMES` (e.g. `standup` or `daily-standup`). If it doesn’t, every agent will call the LLM on every message and rate limits will spike.

Outside standup channels, all agents still get priority response to human messages (no change).

## GROK daily pulse (plugin-vince)

The Grok Expert daily pulse task (`GROK_EXPERT_DAILY_PULSE`) is registered **only for the VINCE agent**. Other agents that load plugin-vince (e.g. Solus) do not register this task, avoiding duplicate runs and extra token use.

## Reflection evaluator

The reflection evaluator runs after replies and also calls the LLM. In standup, that can double token use. You can skip reflection in standup channels and/or run it less often.

- Reflection is **skipped in standup channels by default**. Set `REFLECTION_RUN_IN_STANDUP=true` to run reflection there (not recommended when standup is heavy).
- **Env:** `REFLECTION_STANDUP_CHANNEL_NAMES` — comma-separated substrings for standup (default: `standup,daily-standup`).
- **Env:** `REFLECTION_INTERVAL_DIVISOR` — divisor for how often reflection runs (default: 4). e.g. `8` = half as often.

## Conversation length (optional)

To reduce input tokens per request, lower the number of recent messages included in context. ElizaOS runtime accepts `conversationLength` in its constructor (default is often 32). If your deployment or ElizaOS version supports passing this (e.g. via project/agent config or env), set it to a lower value (e.g. 16) so more requests fit within the org rate limit. See your framework docs for how to set runtime options when starting agents.

## Summary

- In standup: only the facilitator responds to humans; set `REFLECTION_SKIP_STANDUP=true` to save tokens.
- Lower conversation length if the framework allows it.
- See `.env.example` for all A2A and reflection env vars.
