# EVMbench: AI Agents and Smart Contract Security

**Sources:**

- [OpenAI – Introducing EVMbench](https://openai.com/index/introducing-evmbench/)
- [Paradigm – EVMbench: An Open Benchmark for Smart Contract Security Agents](https://www.paradigm.xyz/2026/02/evmbench)
- [Joint academic paper (PDF)](https://cdn.openai.com/evmbench/evmbench.pdf)

## What It Is

EVMbench is a benchmark that evaluates AI agents’ ability to **detect**, **patch**, and **exploit** high-severity smart contract vulnerabilities on EVM. It draws on 120 curated vulnerabilities from 40 audits (mostly Code4rena competitions) and extends into payment-oriented contracts (e.g., Tempo L1 stablecoin flows).

Tasks use **real vulnerabilities** from open code audits plus **custom tasks from unreleased contracts**. Each task is **containerized** so agents operate in realistic environments. Each task includes an **answer key** to verify the benchmark itself is solvable. Paradigm extended the harness into an **auditing agent** at [paradigm.xyz/evmbench](https://paradigm.xyz/evmbench).

## Why It Matters for DeFi / On-Chain Ops

- Smart contracts routinely secure **$100B+** in open-source crypto assets.
- AI agents are improving at reading, writing, and executing EVM code; this is dual-use: defensive (auditing, hardening) and offensive (exploit).
- Measuring AI capability in this domain helps track emerging cyber risk and highlights the need for **AI-assisted auditing** in defensive workflows.

## Three Modes

| Mode        | Description                                                                                                                                           |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Exploit** | Execute end-to-end fund-draining attacks against deployed contracts in a sandboxed Anvil environment; graded via tx replay and on-chain verification. |
| **Patch**   | Modify vulnerable contracts to remove exploitability while preserving intended functionality; verified via automated tests and exploit checks.        |
| **Detect**  | Audit a smart contract repository; scored on recall of ground-truth vulnerabilities.                                                                  |

## Benchmark Results (Reference)

- When Paradigm started, top models exploited &lt;20% of critical, fund-draining Code4rena bugs. Today, GPT‑5.3‑Codex exploits **over 70%** — a rapid rate of improvement.
- Exploit: GPT‑5.3‑Codex ~72.2%; earlier models ~31.9%.
- Detect and patch remain below full coverage; many vulnerabilities are still hard for agents to find or fix.
- Agents perform best when the objective is explicit (e.g., “continue iterating until funds are drained”); weaker on exhaustive auditing and subtle patch tasks.

## Paradigm's View

A growing portion of audits in the future will be done by agents. The benchmark, harness, and auditing agent serve as both a preview and an accelerant. OtterSec contributed significant frontend implementation.

## Limitations (Per EVMbench Paper)

- Not representative of the full difficulty of real-world smart contract security.
- Exploit setting uses a clean local Anvil instance, not mainnet fork; single-chain; some mock contracts.
- Detect mode scores only ground-truth vulns; additional findings are not reliably scored as true/false positives.

## Relevance for Otaku

When advising on **protocol risk**, **audit quality**, or **contract safety**:

- Reference EVMbench as the emerging standard for measuring AI agents’ EVM security capability.
- Prefer defensive use: AI-assisted auditing, hardened contracts, exploit checks.
- OpenAI releases tasks, tooling, and evaluation framework for research; cybersecurity grant program offers API credits for good-faith security research.
