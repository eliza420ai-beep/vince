# BANKR Repos Analysis - Fresh Ideas for VINCE

Analysis of three BANKR repositories for improvement opportunities:

- https://github.com/BankrBot/bankr-api-examples
- https://github.com/BankrBot/trading-engine-api-example
- https://github.com/BankrBot/x402-cli-example

## Executive Summary

BANKR has **three distinct APIs**:

1. **Agent API** - AI-mediated natural language trading ($0.10/request via x402)
2. **Trading Engine API** - Direct EIP-712 signed orders (no AI, programmatic)
3. **SDK** - Wrapper around Agent API for easier integration

**Biggest Opportunity:** Trading Engine API for direct programmatic orders (DCA, TWAP, scheduled buys) without AI overhead.

---

## 1. Agent API Examples

### CLI Interface (`examples/agent-api/cli`)

```typescript
// Job-based async flow with real-time status updates
const response = await submitPrompt(content);
const finalStatus = await pollJobStatus(response.jobId, onStatusUpdate, {
  onAgentStatusUpdate: (message) => updateUI(message),
});
```

**Key Features:**

- Submit prompt → Get jobId → Poll until complete
- Real-time agent status updates (thinking, processing, etc.)
- Job cancellation support
- Rich data (images, transactions) in response

**Gap in VINCE:** Our `BankrSdkService.promptAndWait()` doesn't expose streaming status updates. We could add:

```typescript
await bankrSdk.promptAndWait({
  prompt: "buy 0.1 ETH",
  onStatusUpdate: (status, msg) => console.log(msg),
  onAgentStatusUpdate: (msg) => showProgress(msg), // ← Add this
});
```

### Telegram Trader (`examples/agent-api/telegram-trader`)

**Pattern:** Monitor Telegram groups → Extract EVM addresses → Auto-trade

```typescript
class EVMTrustedUserHandler {
  async decide(context: MessageContext): Promise<TradeDecision> {
    if (context.sender.username !== this.trustedUsername) {
      return { shouldTrade: false, reason: "Not trusted user" };
    }

    const evmTokens = this.evmExtractor.extract(context);
    return {
      shouldTrade: evmTokens.length > 0,
      executionContext: { token: evmTokens[0], amount: 0.5 },
    };
  }

  async execute({ executionContext, bankrClient }) {
    // Auto compound order: buy + limit sell at 2x + stop loss at -50%
    const prompt = `Buy $${amount} of ${token}. 
      Set a limit order to sell it all if price doubles.
      Set a stop loss to sell it all if price drops by 50%.`;

    await bankrClient.executePrompt(prompt);
  }
}
```

**Key Ideas:**

- Trusted user filtering (only trade on signals from specific accounts)
- EVM address extraction from messages
- Compound orders in one prompt (buy + SL + TP)
- Group-based trading strategies

**Opportunity for VINCE:** Signal follower system for Discord CT channels.

---

## 2. Trading Engine API (Direct Orders)

**This is the biggest opportunity.** Direct programmatic trading without AI.

### Order Types Supported

| Type         | Description                            | Config                      |
| ------------ | -------------------------------------- | --------------------------- |
| `limit-buy`  | Buy when price drops to X              | `triggerPrice`              |
| `limit-sell` | Sell when price rises to X             | `triggerPrice`              |
| `stop-buy`   | Buy when price rises to X (breakout)   | `triggerPrice`, `trailing?` |
| `stop-sell`  | Sell when price drops to X (stop-loss) | `triggerPrice`, `trailing?` |
| `dca`        | Dollar cost average                    | `interval`, `maxExecutions` |
| `twap`       | Time-weighted average price            | `interval`, `maxExecutions` |

### Quote → Sign → Submit Flow

```typescript
// 1. Get quote (includes approval tx + EIP-712 typed data)
const quote = await createQuote({
  maker: walletAddress,
  orderType: "limit-buy",
  config: { triggerPrice: "1800" },
  chainId: 8453,
  sellToken: USDC,
  buyToken: WETH,
  sellAmount: parseUnits("1000", 6).toString(),
  slippageBps: 100,
  expirationDate: Math.floor(Date.now() / 1000) + 86400,
  appFeeBps: 50, // 0.5% affiliate fee
  appFeeRecipient: VINCE_FEE_ADDRESS,
});

// 2. Execute approval if needed
if (quote.actions.find((a) => a.type === "approval")) {
  await sendTransaction(approval);
}

// 3. Sign EIP-712 typed data
const signature = await signTypedData(quote.typedData);

// 4. Submit signed order
const order = await submitOrder({
  quoteId: quote.quoteId,
  orderSignature: signature,
});
```

### Why This Matters

| Feature     | Agent API              | Trading Engine API     |
| ----------- | ---------------------- | ---------------------- |
| Speed       | ~3-10s (AI processing) | <1s (direct submit)    |
| Cost        | $0.10/request          | Gas only               |
| Flexibility | Natural language       | Structured params      |
| Use case    | Interactive trading    | Programmatic/scheduled |
| TWAP/DCA    | Via prompt             | Native support         |

**Big Win:** Use Trading Engine API for scheduled operations (DCA, rebalancing) while keeping Agent API for interactive user commands.

---

## 3. x402 CLI Example

Confirms our implementation is aligned:

```typescript
const client = new BankrClient({
  privateKey,
  walletAddress, // Optional: context wallet for prompts
});

const result = await client.promptAndWait({ prompt: input });
// Returns: { response, status, transactions, richData }
```

**Note:** Payment is $0.10 per request in USDC on Base.

---

## Improvement Recommendations

### Priority 1: Add Trading Engine API Support

Create `plugin-bankr-trading-engine`:

```typescript
// New service for direct order management
export class BankrTradingEngineService extends Service {
  static serviceType = "bankr_trading_engine";

  async createLimitOrder(params: {
    orderType: "limit-buy" | "limit-sell";
    sellToken: string;
    buyToken: string;
    amount: string;
    triggerPrice: string;
    expirationHours?: number;
  }): Promise<ExternalOrder>;

  async createDCAOrder(params: {
    sellToken: string;
    buyToken: string;
    totalAmount: string;
    intervals: number;
    intervalSeconds: number;
  }): Promise<ExternalOrder>;

  async createTWAPOrder(params: {
    sellToken: string;
    buyToken: string;
    totalAmount: string;
    durationHours: number;
    slicesCount: number;
  }): Promise<ExternalOrder>;

  async listOrders(status?: OrderStatus): Promise<ExternalOrder[]>;
  async cancelOrder(orderId: string): Promise<void>;
}
```

**New actions:**

- `OTAKU_DCA` - "DCA $500 into ETH over 7 days"
- `OTAKU_TWAP` - "TWAP sell 10 ETH over 4 hours"
- `OTAKU_ORDERS` - "Show my open orders"
- `OTAKU_CANCEL_ORDER` - "Cancel order xyz123"

### Priority 2: Signal Follower System

Create configurable CT signal following:

```typescript
// In plugin-inter-agent or new plugin-signal-follower
interface SignalConfig {
  channel: string; // Discord channel ID
  trustedUsers: string[]; // Discord user IDs
  strategy: "mirror" | "paper" | "notify";
  maxSize: number; // Max position size
  autoSL: number; // Auto stop-loss %
  autoTP: number; // Auto take-profit %
}

// Evaluator that detects CT alpha calls
const ctSignalEvaluator: Evaluator = {
  name: "CT_SIGNAL_DETECTOR",
  async evaluate(runtime, message) {
    const evmAddresses = extractEVMAddresses(message.content.text);
    const isTrusted = checkTrustedUser(message.authorId);

    if (evmAddresses.length > 0 && isTrusted) {
      return {
        shouldAct: true,
        signal: {
          type: "TOKEN_CALL",
          token: evmAddresses[0],
          source: message.authorId,
        },
      };
    }
    return { shouldAct: false };
  },
};
```

### Priority 3: Enhanced Status Feedback

Add streaming status to BankrSdkService:

```typescript
interface PromptOptions {
  prompt: string;
  walletAddress?: string;
  onJobStatusChange?: (status: JobStatus, message: string) => void;
  onAgentUpdate?: (message: string) => void; // ← Real-time thinking feedback
}
```

This enables:

```
User: "Buy 0.1 ETH"
Agent: "🤔 Checking best route..."      (status update)
Agent: "💱 Found quote: 1 ETH = $2,000"  (status update)
Agent: "📝 Preparing transaction..."     (status update)
Agent: "✅ Bought 0.1 ETH for $200"      (final response)
```

### Priority 4: App Fees for Revenue

Add `appFeeBps` + `appFeeRecipient` to Otaku trading routes:

```typescript
const VINCE_FEE_ADDRESS = "0x..."; // Team multisig
const APP_FEE_BPS = 50; // 0.5% on trades

// In Trading Engine API calls
const quote = await createQuote({
  ...orderParams,
  appFeeBps: APP_FEE_BPS,
  appFeeRecipient: VINCE_FEE_ADDRESS,
});
```

**Revenue model:** 0.25-0.5% on trading volume.

---

## Implementation Roadmap

| Phase | Task                           | Effort | Impact |
| ----- | ------------------------------ | ------ | ------ |
| 1     | Trading Engine types + service | 2h     | High   |
| 2     | OTAKU_DCA / OTAKU_TWAP actions | 2h     | High   |
| 3     | Order management (list/cancel) | 1h     | Medium |
| 4     | CT signal detector evaluator   | 3h     | High   |
| 5     | Status streaming in SDK        | 1h     | Medium |
| 6     | App fees integration           | 1h     | Medium |

**Total:** ~10h of dev work for significant trading capability upgrade.

---

## Already Aligned ✅

What we already have that matches these repos:

- `BankrSdkService` - Uses `@bankr/sdk` with `promptAndWait()` ✅
- `OTAKU_STOP_LOSS` - Stop-loss/take-profit actions ✅
- x402 payment receiving on Otaku routes ✅
- Trailing stop support in OTAKU_STOP_LOSS ✅

---

## 4. Token Launching Analysis (Feb 2026)

### Can we launch tokens via the API?

**Yes.** [Bankr token launching](https://docs.bankr.bot/token-launching/overview) uses the same natural-language prompt system our plugins already wrap. No separate REST endpoint exists — it all flows through `POST /agent/prompt`.

### What we have today

| Plugin             | Action               | How token launch works                                      |
| ------------------ | -------------------- | ----------------------------------------------------------- |
| `plugin-bankr`     | `BANKR_AGENT_PROMPT` | Prompt → Bankr executes deploy + LP + fee setup (custodial) |
| `plugin-bankr-sdk` | `BANKR_SDK_PROMPT`   | Prompt → SDK returns tx data → you sign + submit            |

Both support prompts like:

```
"deploy a token called MyAgent with symbol AGENT on base"
"launch a token on solana with 20% vaulted for 30 days"
```

### Token launching specifics

| Feature                      | Base                      | Solana                           |
| ---------------------------- | ------------------------- | -------------------------------- |
| Deploy                       | Yes                       | Yes                              |
| Vaulting (lock supply %)     | Yes                       | Yes                              |
| Vesting (time-based release) | Yes                       | Yes                              |
| Fee splitting                | Yes                       | Yes                              |
| Claiming fees                | Yes                       | Yes                              |
| Supply                       | Fixed 100B (not mintable) | Configurable, default 6 decimals |

**Fee structure — Base:** 1% fee LP; deployer 60% / Bankr 40%. Accumulates in token + WETH.

**Fee structure — Solana:**

- Bonding curve: 1% platform (Bankr) + 0.5% creator
- After CPMM migration: 50% LP to creator, 40% to Bankr, 10% burned; ongoing trading fees from locked LP

**Limits:** 1 token/day (standard), 10/day (Bankr Club). Gas sponsored within limits.

### Do we need [bankr.bot/launches](https://bankr.bot/launches)?

**No.** The web UI is for manual browser-based launching. Our agents do the same thing programmatically via `BANKR_AGENT_PROMPT`. The API path is strictly better for automation.

### Recommendation

**Use `plugin-bankr` (Agent API) through Otaku.** Already works, zero new code needed.

**Optional enhancement:** A dedicated `BANKR_DEPLOY_TOKEN` action that wraps `BANKR_AGENT_PROMPT` with:

- Structured params: name, symbol, chain, vault %, vest days, fee-split addresses
- Input validation before hitting the API
- Structured response parsing (deployed token address, LP info, fee config)
- Cleaner inter-agent handoff (VINCE signal → Otaku deploy)

### Plugin comparison for token launching

| Aspect     | plugin-bankr            | plugin-bankr-sdk                |
| ---------- | ----------------------- | ------------------------------- |
| Complexity | Prompt and done         | Prompt → sign → submit yourself |
| Wallet     | Bankr custodial         | Your own wallet                 |
| Cost       | Free (API key)          | $0.01 USDC/request (x402)       |
| Best for   | Fire-and-forget deploys | Control over signing            |
| Loaded by  | Otaku (default)         | No agent yet                    |

**Winner for token launching: `plugin-bankr`.** Custodial execution is fine for a deploy — you want Bankr to handle the transaction. Own-wallet control (SDK) matters more for ongoing trading, not one-time deploys.

---

## Conclusion

The Trading Engine API is the **killer feature** we should integrate. It enables:

1. **DCA** - Automated dollar cost averaging without AI costs
2. **TWAP** - Institutional-grade execution for larger orders
3. **Programmatic rebalancing** - Scheduled portfolio adjustments
4. **Lower costs** - No $0.10/request for routine operations

Token launching is **already covered** by `BANKR_AGENT_PROMPT` — no new integration needed, just an optional structured action wrapper for cleaner UX and inter-agent handoff.

Combined with our existing Agent API integration for interactive trading, VINCE would have the most complete BANKR integration in the elizaOS ecosystem.
