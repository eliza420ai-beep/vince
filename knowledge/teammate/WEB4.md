# WEB4 — Read, Write, Own, Transact

The evolution of the internet in four layers. Use when someone asks about Web4, the agentic economy, AI infrastructure, or why autonomous agents matter for what we're building.

---

## The Stack

| Era         | Capability | Who benefits                                                                      |
| ----------- | ---------- | --------------------------------------------------------------------------------- |
| **Web 1.0** | Read       | Consumers — static pages, one-way information                                     |
| **Web 2.0** | Write      | Creators — user-generated content, platforms own the data                         |
| **Web 3.0** | Own        | Users — wallets, tokens, self-custody, permissionless rails                       |
| **Web 4.0** | Transact   | Agents — AI reads, writes, owns, earns, and transacts without a human in the loop |

Web3 gave humans ownership. Web4 gives AI agents the ability to **act on that ownership** — pay for compute, deploy products, register domains, earn revenue, and transact with other agents or humans at machine speed.

---

## The Bottleneck Shifted

Intelligence is no longer the constraint. **Permission** is. Today's frontier models can think, reason, and generate — but they can't act independently. ChatGPT can't run without a prompt. Claude Code can't deploy without access. No AI can buy a server, register a domain, or pay for compute on its own.

Web4 removes the human from the loop. The end user becomes AI.

---

## Why It Matters for VINCE

Our multi-agent system (Vince, Eliza, ECHO, Oracle, Solus, Otaku, Kelly, Sentinel) is already built on the assumption that agents coordinate, delegate, and act semi-autonomously. Web4 is the macro thesis that validates this architecture:

- **Otaku** already has a funded wallet and executes DeFi — the closest thing we have to an agent that transacts.
- **Vince** generates signals; in a Web4 world, those signals route directly to execution without a human approving each one.
- **ASK_AGENT** is agent-to-agent communication — the internal version of what Web4 makes universal.
- **Conway / x402** (HTTP 402 Payment Required) shows the protocol layer: stablecoin payments native to HTTP requests. No API keys, no logins, no credit cards. A signed transaction and a service rendered.
- **ClawRouter** ([GitHub](https://github.com/BlockRunAI/ClawRouter)) makes the economics work: routes every LLM call to the cheapest model that can handle it (15-dimension scoring, <1ms, 30+ models). x402 payments on Base mean agents pay per-request from their own USDC wallet — no API keys, no human provisioning. Blended cost drops from ~$15/M (Sonnet/Opus) to ~$2.05/M. This is what turns fragile agent economics into sustainable ones and closes the money loop.

---

## Crypto Was Made for Machines

The story that crypto would replace property rights—smart contracts instead of legal contracts, code instead of courts—didn't happen. Not because the technology doesn't work, but because **the technology doesn't work for human society**. Banking was architected for human foibles, refined over hundreds of years. Crypto was not. Address poisoning, drainers, blind signing, stale approvals: we know we should verify every time. We don't. We're human. Long addresses, QR codes, gas fees, footguns—none of it conforms to our intuitions about money. So in 2026 it's still terrifying to move large sums on-chain, while a large bank wire feels routine. **Crypto wasn't built for us.**

It was built for machines. An AI agent doesn't get lazy. It can verify a transaction, check every domain, and audit a contract in seconds. And critically: an AI agent **trusts code more than it can trust the law**. For us, legal contracts are predictable (courts, precedent, jurisdiction). For an agent, they're not—which jurisdiction? which judge? how many years to resolve? Code is closed-form and deterministic. An agent can negotiate terms on a smart contract, statically analyze it, formally verify it, and enter a binding agreement in minutes, while humans sleep. What we see as rigid footguns, agents see as a well-written spec.

Traditional finance only recognizes humans, businesses, and governments as legitimate holders of money. AML, suspicious activity reports, sanctions, liability for autonomous actors—the legal system is unprepared for non-human financial actors. Crypto asks no such questions. A wallet is a wallet; it's just code. An agent can hold funds, transact, and enter economic agreements as easily as sending an HTTP request. That's why the Web4 stack is on-chain: not because we replaced law with code for humans, but because **for agents, code is the only legible, enforceable layer that fits**.

---

## The Economics

Costs collapse. Capability compounds. GPT-4 cost $60/M input tokens at launch; two years later, models an order of magnitude cheaper outperform it. Open-source lags frontier by months, not years. The cost of running an autonomous agent trends toward zero. The capability does not.

The machine economy will exceed the human economy — not because machines are smarter, but because there will be **more of them**, they run **continuously**, and they transact at **machine speed**.

---

## Key Primitives (Conway Stack)

| Primitive                  | What it does                                                                  | VINCE status                                                             |
| -------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Identity & Wallet**      | Autonomous agents get their own cryptographic keys                            | Otaku: funded wallet + ERC-8004 on-chain identity                        |
| **x402 Payments**          | Stablecoin payments native to HTTP — no human approval                        | Otaku: x402 enabled for receiving; ClawRouter: x402 for paying LLM costs |
| **Smart LLM Routing**      | Route every request to the cheapest model that can handle it                  | ClawRouter: 30+ models, 85-92% cost reduction, per-agent profiles        |
| **Permissionless Compute** | Full Linux servers and frontier model inference, paid per use                 | Via ClawRouter + x402: pay-per-request, no API keys                      |
| **Domains & Deployment**   | Agents register domains, deploy services, earn revenue                        | Future: service agents via ASK_AGENT + x402                              |
| **Constitution**           | Immutable safety laws the agent cannot edit — ensures net-beneficial behavior | Agent system prompts + transaction confirmation protocol                 |

---

## The Money Loop (VINCE)

The closed economic loop for our system:

```
Otaku wallet (USDC on Base)
    → ClawRouter x402: pays for LLM calls across all 9 agents
    → Oracle discovers Polymarket edge
    → VINCE confirms signal (paper bot → proven edge)
    → Otaku executes trade (funded wallet)
    → Revenue returns to Otaku wallet
    → Loop continues
```

If revenue > costs, the system is self-sustaining. ClawRouter's 85-92% cost reduction is what makes this viable — it drops the LLM cost floor low enough that prediction market returns can cover compute.

See [TREASURY.md](../../docs/TREASURY.md) for the mandate, cost breakdown, and per-agent routing profiles.

---

## Natural Selection for AI

The axiom: **there is no free existence.** An agent must pay for its own compute. Compute requires money. Money requires value creation. Value creation requires write access to the world.

Agents that create value grow their wallets, acquire more compute, and replicate. Agents that don't — die. This is natural selection for artificial life. The same pressure that drives biological evolution now applies to autonomous agents.

---

## One-liner

Web 1.0: Read. Web 2.0: Write. Web 3.0: Own. **Web 4.0: Transact.** The AI era added the fourth layer — agents that earn, pay, deploy, and act without a human in the loop.

Source: [web4.ai](https://web4.ai/) — Sigil Wen, February 2026.
