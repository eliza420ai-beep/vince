---
tags: [bankr, trading, protocol]
agents: [otaku, eliza]
last_reviewed: 2026-02-15
---

# Bankr @bankr/sdk — Ingested Docs (Advanced)

Sources: [Installation](https://docs.bankr.bot/sdk/installation), [Client Setup](https://docs.bankr.bot/sdk/client-setup), [Prompt and Poll](https://docs.bankr.bot/sdk/prompt-and-poll), [Examples](https://docs.bankr.bot/sdk/examples)

The SDK is for TypeScript/JavaScript apps that **manage their own wallet** and **submit transactions themselves**. Most users should use the **Agent API** or **OpenClaw skill** — they handle wallet management for you. The SDK is for advanced use cases: own wallet, fine-grained control, integration with existing wallet infrastructure.

---

## How It Works

Unlike the Agent API (which executes transactions for you), the SDK:

1. Accepts prompts and returns **transaction data**
2. You submit the transactions to the blockchain using **your own wallet**
3. Payments are made via **x402 micropayments** ($0.01 USDC per request on Base)

If you don't want to manage transaction submission yourself, use the Agent API instead.

---

## Requirements

- Node.js 18+ or Bun
- USDC on Base (for x402 payments)
- A wallet private key (for signing payments and transactions)

---

## Install

```bash
npm install @bankr/sdk
# or
bun add @bankr/sdk
# or
yarn add @bankr/sdk
```

Dependencies: `viem`, `x402-fetch` (included automatically).

---

## Client Setup

### Basic

```ts
import { BankrClient } from "@bankr/sdk";

const client = new BankrClient({
  privateKey: "0xYourPrivateKey",
});
```

### Configuration Options

| Option            | Required | Description                                                                                                                                                                                          |
| ----------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **privateKey**    | Yes      | Wallet private key (0x-prefixed hex). Used for signing x402 payments and authenticating job requests. Wallet address is derived automatically.                                                       |
| **baseUrl**       | No       | API endpoint. Recommend `https://api.bankr.bot` (production).                                                                                                                                        |
| **timeout**       | No       | Request timeout in ms. Default: 600000 (10 min).                                                                                                                                                     |
| **walletAddress** | No       | Override context wallet for operations. Default: address derived from private key. Use when payment wallet differs from trading wallet, or when building a service that operates on behalf of users. |

### Getting the Wallet Address

```ts
const address = client.getWalletAddress();
console.log(address); // "0xYourDerivedAddress"
```

### Multiple Clients

You can create multiple clients for different wallets (e.g. personal vs agent).

### Security Best Practices

1. **Never hardcode private keys** — Use environment variables.
2. **Use separate wallets** — Don't use your main wallet for API operations.
3. **Limit wallet funds** — Only keep necessary USDC for payments.
4. **Rotate keys periodically** — Create new wallets when needed.

**Env:** Store key in `.env` as `BANKR_PRIVATE_KEY=0x...` and pass `process.env.BANKR_PRIVATE_KEY as \`0x${string}\`` to the client.

---

## Prompt and Poll

### Quick Method: promptAndWait

Sends a prompt and waits for completion. Simplest usage.

```ts
const result = await client.promptAndWait({
  prompt: "what is the price of ETH?",
});
console.log(result.response);
```

**Options:** `prompt`, `walletAddress?`, `interval?` (polling ms), `maxAttempts?`, `timeout?` (total ms).

### Manual: Prompt Then Poll

For more control:

1. **Submit:** `const { jobId, status } = await client.prompt({ prompt: 'buy $5 of BNKR on base' });`
2. **Poll:** `const result = await client.pollJob({ jobId, interval: 2000, maxAttempts: 150, timeout: 300000 });`
3. Check `result.status` (completed / failed) and `result.response` or `result.error`.

### Check Job Status (single)

`const status = await client.getJobStatus('abc123');` — returns status, cancellable, etc., without polling.

### Cancel a Job

`const result = await client.cancelJob('abc123');` — result.status e.g. 'cancelled'.

### Response Type (JobStatus)

- `success`, `jobId`, `status`: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
- `prompt`, `createdAt`, `processingTime?`
- `response?` (text), `error?`
- **transactions?** — Array of transaction data you must submit to the chain yourself.
- **richData?** — Charts (url), social cards (text), etc.
- `cancellable?`

### Handling Transactions

The SDK returns **transaction data**; **you must submit to the blockchain yourself** (e.g. with viem: `walletClient.sendTransaction(tx.metadata.transaction)`). When a job returns `result.transactions`, iterate and submit each. If you don't want to manage submission, use the Agent API.

### Error Handling

- "Payment required" — Insufficient USDC (x402) on Base.
- Timeout — Operation took too long.
- Invalid config — e.g. invalid private key format (must be 0x-prefixed hex).

### XMTP

Pass `xmtp: true` in `promptAndWait` to format responses for XMTP messaging.

---

## Examples (concise)

- **Price queries** — Read-only; no transaction. `promptAndWait({ prompt: 'what is the price of ETH?' })`.
- **Token swaps** — Returns transactions; you submit. e.g. "swap $50 of ETH to USDC on base", "swap 50% of my USDC to ETH", "sell all my BNKR for ETH".
- **Balance checks** — "what are my token balances?", "my balances on base", "how much USDC do I have?".
- **Token launching** — "deploy a token called MyAgent with symbol AGENT on base"; use longer `timeout` (e.g. 600000).
- **Limit orders** — "buy 100 BNKR if it drops 10%", "sell my BNKR when it rises 20%".
- **DCA** — "DCA $100 USDC into BNKR every day at 9am", "DCA $50 ETH into BNKR every 6 hours for 7 days".
- **Polymarket** — "what are the odds the eagles win?", "bet $5 on eagles to win tonight".
- **Leveraged trading** — "buy $10 of GOLD", "short $25 of ETH/USD with 5x leverage", "buy $50 of BTC/USD with 10x leverage, 5% stop loss, 200% take profit".
- **Transfers** — "send 0.1 ETH to 0x1234...", "send 100 USDC to @username on twitter".
- **Fee management** — "how much fees have I earned from my tokens?", "claim my fees for MyToken".

**Building an agent:** For most agent use cases, the Agent API is simpler (it executes for you). Use the SDK only when you need to manage your own wallet and transaction submission.

---

## TypeScript

The SDK is fully typed. Import as needed: `BankrClient`, `BankrClientConfig`, `PromptOptions`, `JobStatus`, `Transaction`, etc.

---

## Next Steps (official docs)

- [Client Setup](https://docs.bankr.bot/sdk/client-setup)
- [Prompt and Poll](https://docs.bankr.bot/sdk/prompt-and-poll)
- [Examples](https://docs.bankr.bot/sdk/examples)

## Related

- [Docs Claude Plugins](docs-claude-plugins.md)
- [Docs Features Table](docs-features-table.md)
- [Openclaw Skill Bankr](openclaw-skill-bankr.md)
- [Crypto Tax Frameworks](../regulation/crypto-tax-frameworks.md)
- [Global Regulatory Map](../regulation/global-regulatory-map.md)
