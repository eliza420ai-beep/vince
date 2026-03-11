---
tags: [bankr, trading, protocol]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# Bankr Docs — LLM Gateway Overview (Ingested)

Source: https://docs.bankr.bot/llm-gateway/overview

---

# LLM Gateway

A unified interface for LLMs — pay with your launch fees or wallet balance. Access Claude, Gemini, and GPT models through a single API. Every request is tracked; you can fund usage from your token launch fees or authorize payments in ETH, USDC, or BANKR.

## What It Is

- **Unified LLM interface** — One API for multiple providers.
- **Pay with launch fees or wallet** — Allocate token launch fees to AI, or pay with ETH, USDC, or BANKR.

## Base URL

```
https://llm.bankr.bot
```

## Features

| Feature            | Benefit                                                     |
| ------------------ | ----------------------------------------------------------- |
| Cost Tracking      | Full visibility into token usage and costs per request      |
| Launch Fee Funding | Allocate a portion of token launch fees to AI automatically |
| Flexible Payments  | Pay with ETH, USDC, or BANKR                                |
| Multi-Provider     | Anthropic, Google, OpenAI, Moonshot AI, Alibaba             |
| High Availability  | Automatic failover so agents stay online                    |
| SDK Compatible     | Works with OpenAI and Anthropic SDKs — no code changes      |

## Supported Models

### Claude (Anthropic)

| Model             | Context | Input       | Best For                         |
| ----------------- | ------- | ----------- | -------------------------------- |
| claude-opus-4.6   | 200K    | text, image | Most capable, advanced reasoning |
| claude-opus-4.5   | 200K    | text, image | Complex reasoning, analysis      |
| claude-sonnet-4.5 | 200K    | text, image | Balanced speed and quality       |
| claude-haiku-4.5  | 200K    | text, image | Fast, cost-effective             |

### Gemini (Google)

| Model            | Context | Input       | Best For                     |
| ---------------- | ------- | ----------- | ---------------------------- |
| gemini-2.5-pro   | 1M      | text, image | Long context, multimodal     |
| gemini-2.5-flash | 1M      | text, image | Speed, high throughput       |
| gemini-3-pro     | 2M      | text, image | Advanced reasoning (preview) |
| gemini-3-flash   | 1M      | text, image | Fast, preview models         |

### GPT (OpenAI)

| Model         | Context | Input | Best For                |
| ------------- | ------- | ----- | ----------------------- |
| gpt-5.2       | 262K    | text  | Advanced reasoning      |
| gpt-5.2-codex | 262K    | text  | Code generation         |
| gpt-5-mini    | 128K    | text  | Fast, economical        |
| gpt-5-nano    | 128K    | text  | Ultra-fast, lowest cost |

### Kimi (Moonshot AI)

| Model     | Context | Input | Best For               |
| --------- | ------- | ----- | ---------------------- |
| kimi-k2.5 | 128K    | text  | Long-context reasoning |

### Qwen (Alibaba)

| Model       | Context | Input | Best For                   |
| ----------- | ------- | ----- | -------------------------- |
| qwen3-coder | 128K    | text  | Code generation, debugging |

## How It Works

**Routing:**

- **Gemini / Claude** → Vertex AI (primary), OpenRouter (fallback)
- **GPT / Kimi / Qwen** → OpenRouter only

Clients (OpenClaw, Claude Code, custom apps) send requests to the LLM Gateway; the gateway routes to Vertex AI or OpenRouter by model.

## Quick Start

1. **Get your API key** — https://bankr.bot/api (or docs).
2. **Base URL:** `https://llm.bankr.bot`
3. **Example request:**

```bash
curl https://llm.bankr.bot/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: bk_YOUR_API_KEY" \
  -d '{
    "model": "claude-sonnet-4.5",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Bankr CLI Setup

The Bankr CLI can configure tools to use the LLM Gateway:

```bash
bun install -g @bankr/cli
bankr login
bankr llm setup openclaw --install   # OpenClaw
bankr llm setup opencode --install   # OpenCode
bankr llm setup claude               # Claude Code
bankr llm setup cursor               # Cursor
```

See [AI Coding Tools](https://docs.bankr.bot/llm-gateway/ai-coding-tools) for full details.

## Next Steps (docs)

- [API Reference](https://docs.bankr.bot/llm-gateway/api-reference)
- [OpenClaw](https://docs.bankr.bot/llm-gateway/openclaw)
- [AI Coding Tools](https://docs.bankr.bot/llm-gateway/ai-coding-tools)

## Related

- [Docs Features Prompts](docs-features-prompts.md)
- [Docs Features Table](docs-features-table.md)
- [Openclaw Skill Bankr](openclaw-skill-bankr.md)
