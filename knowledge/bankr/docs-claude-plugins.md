---
tags: [bankr, trading, protocol]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# Bankr Claude Plugins — bankr-x402-sdk-dev (Ingested)

Source: https://docs.bankr.bot/claude-plugins/bankr-x402-sdk-dev

---

# bankr-x402-sdk-dev Plugin

Web3 development integration with **@bankr/sdk** for advanced use cases. This is a **Claude plugin** (Claude desktop / Claude Code), not an ElizaOS plugin.

**Note:** The SDK returns transaction data for you to submit using your own wallet infrastructure. If you want Bankr to handle transactions, use the Agent API or the **bankr-agent** Claude plugin instead.

## What It Is

- **Claude plugin** for Web3 dev using @bankr/sdk (advanced / x402 path).
- Same model as the SDK: you get **transaction data**; you submit with your own wallet.
- For Bankr to execute transactions for you, use the **Agent API** or **bankr-agent** plugin instead.

## Installation

```bash
claude plugin install bankr-x402-sdk-dev
```

## Capabilities (example prompts)

### Market analysis

- "get token prices for my dashboard"
- "implement trending tokens display"
- "add technical analysis charts"

### Portfolio tracking

- "fetch user balances across chains"
- "calculate portfolio value in USD"
- "track position P&L"

### Token swaps

- "add swap feature with 0x routing"
- "implement cross-chain bridging"
- "handle approval transactions"

### Leveraged trading

- "implement leveraged positions"
- "add stop-loss and take-profit"
- "track open positions"

## SDK features (by chain)

| Feature             | Supported chains |
| ------------------- | ---------------- |
| Prices & charts     | All              |
| Token swaps         | EVM chains       |
| Cross-chain bridges | EVM chains       |
| Leveraged trading   | Base (Avantis)   |
| Portfolio tracking  | All              |
| NFT operations      | EVM chains       |

## x402 micropayments

The SDK uses **x402 micropayments** ($0.01 USDC per request on Base). Your wallet signs payment transactions automatically; USDC is deducted from your wallet on Base.

- "how do x402 payments work?"
- "implement payment handling"
- "handle 402 responses"

## Example: portfolio dashboard

```ts
import { BankrClient } from "@bankr/sdk";

const client = new BankrClient({
  privateKey: process.env.PRIVATE_KEY as `0x${string}`,
});

async function getPortfolio() {
  const result = await client.promptAndWait({
    prompt: "what are my token balances on all chains?",
  });
  return result.response;
}

async function getTokenPrice(token: string) {
  const result = await client.promptAndWait({
    prompt: `what is the price of ${token}?`,
  });
  return result.response;
}

async function executeSwap(amount: number, from: string, to: string) {
  const result = await client.promptAndWait({
    prompt: `swap $${amount} of ${from} to ${to}`,
  });
  // SDK returns transaction data — you must submit it yourself
  if (result.transactions?.length) {
    for (const tx of result.transactions) {
      // Submit using your wallet (e.g. viem walletClient)
    }
  }
  return { response: result.response, transactions: result.transactions };
}
```

## Limitations

Via the SDK, the following are **not** supported:

- **Solana operations** — use the Agent API (or bankr-agent plugin) directly.
- **Polymarket betting** — use the Agent API (or bankr-agent plugin) directly.

For full feature access, use the Agent API or the bankr-agent plugin.

## Relation to VINCE / ElizaOS

- **ElizaOS / Cursor:** We use **plugin-bankr-sdk** (action BANKR_SDK_PROMPT, env BANKR_PRIVATE_KEY). Same @bankr/sdk + x402 model.
- **Claude desktop / Claude Code:** Use this Claude plugin (**bankr-x402-sdk-dev**).

---

## Links

- [bankr-x402-sdk-dev](https://docs.bankr.bot/claude-plugins/bankr-x402-sdk-dev)
- [@bankr/sdk docs](https://docs.bankr.bot/sdk/installation)
- [Agent API](https://docs.bankr.bot/agent-api/overview)

## Related

- [Docs Agent Api](docs-agent-api.md)
- [Docs Features Table](docs-features-table.md)
- [Docs Token Launching](docs-token-launching.md)
