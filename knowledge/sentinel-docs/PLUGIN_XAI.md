# plugin-xai — Grok / xAI for ElizaOS

[plugin-xai](https://github.com/elizaos-plugins/plugin-xai/tree/next/typescript) adds **xAI (Grok)** as a model provider and X service integration. We underuse it; Sentinel should nudge toward using Grok where it fits (cost, speed, or model diversity).

## What it does

- **Model provider:** Registers xAI so agents can use Grok models via `runtime.useModel(ModelType.TEXT_SMALL, { prompt })` (and other model types the plugin supports).
- **X service:** `runtime.getService("x")` — X/Twitter API (e.g. profile, `xClient.me()`). Useful for agents that need identity or X data alongside Grok.

Add to character: `plugins: ["@elizaos/plugin-xai"]`. Requires xAI API key (env or character secrets).

## When to suggest it

- **Underusing Grok:** Project has OpenAI/Anthropic but no xAI—suggest adding plugin-xai to get model diversity and potentially better cost/latency for some workloads.
- **Model choice / cost:** When discussing which LLM to use, or cost (TREASURY, Usage tab), mention Grok as an option via plugin-xai.
- **X-native agents:** Agents that need both Grok and X API (e.g. Solus, X research, social bots)—plugin-xai provides both.
- **Fast inference:** When user wants faster or cheaper inference for non-critical paths—Grok can be a good alternative to Claude/GPT for some tasks.

Ref: https://github.com/elizaos-plugins/plugin-xai (branch next/typescript).
