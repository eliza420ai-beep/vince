# plugin-bankr-sdk

Bankr **SDK** integration for ElizaOS using [@bankr/sdk](https://docs.bankr.bot/sdk/installation). This plugin is for the **advanced path**: your agent uses its **own wallet** and pays via **x402** ($0.01 USDC per request on Base). The SDK returns **transaction data** — you (or your wallet infra) must submit transactions to the chain yourself.

**Contrast with [plugin-bankr](../plugin-bankr/):** plugin-bankr uses the **Agent API** (API key; Bankr executes for you). Use plugin-bankr for Otaku and most use cases. Use plugin-bankr-sdk when you want own-wallet control and x402 payment.

## Requirements

- `BANKR_PRIVATE_KEY` — wallet private key (0x-prefixed hex). Used for x402 payments and auth. **Never hardcode;** use env. Keep USDC on Base for payments.

## Env (optional)

- `BANKR_AGENT_URL` — default `https://api.bankr.bot`
- `BANKR_SDK_TIMEOUT` — request timeout in ms (optional)
- `BANKR_SDK_WALLET_ADDRESS` — override context wallet for operations (optional)

## Actions

| Action               | Description                                                                                                                                                                                                                                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **BANKR_SDK_PROMPT** | Send a natural-language prompt via @bankr/sdk. Same prompt types as Agent API (portfolio, transfers, swaps, limit/stop/DCA/TWAP, leveraged, token launch, NFTs, etc.). Returns `response` text; if the job produced transactions, returns them so **you can submit them yourself** (SDK does not execute). |

## Who loads it

This plugin is **not** added to Otaku by default. Otaku uses [plugin-bankr](../plugin-bankr/) (Agent API). Add plugin-bankr-sdk to an agent when you want SDK-based execution (e.g. a dedicated “SDK agent” or when `BANKR_PRIVATE_KEY` is set and you prefer x402 over the Agent API).

## Ingested knowledge

- [knowledge/bankr/docs-sdk.md](../../../knowledge/bankr/docs-sdk.md) — when to use SDK vs Agent API, install, client config, promptAndWait, handling transactions, examples.
- [knowledge/bankr/docs-claude-plugins.md](../../../knowledge/bankr/docs-claude-plugins.md) — bankr-x402-sdk-dev install, capabilities, limitations.

## References

- [docs.bankr.bot/sdk/installation](https://docs.bankr.bot/sdk/installation)
- [docs.bankr.bot/sdk/client-setup](https://docs.bankr.bot/sdk/client-setup)
- [docs.bankr.bot/sdk/prompt-and-poll](https://docs.bankr.bot/sdk/prompt-and-poll)
- [docs.bankr.bot/sdk/examples](https://docs.bankr.bot/sdk/examples)
- **Claude plugin:** [bankr-x402-sdk-dev](https://docs.bankr.bot/claude-plugins/bankr-x402-sdk-dev) — same @bankr/sdk + x402 model for Claude desktop/Claude Code; see [knowledge/bankr/docs-claude-plugins.md](../../../knowledge/bankr/docs-claude-plugins.md).
- [plugin-bankr](../plugin-bankr/) — Agent API plugin (recommended for most users)
