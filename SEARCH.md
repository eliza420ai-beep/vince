# Search API Strategy for AI Agents

> Your agent is only as good as its search. The LLM handles reasoning. The search handles reality. Get both right.

Five search APIs, five different philosophies. Brave just dropped the LLM Context API. Tavily ships agent skills. Exa hit sub-200ms. Perplexity Sonar does multi-step research. Here's which one to use for what.

## Table of Contents

- [Why Search Is the Bottleneck](#why-search-is-the-bottleneck)
- [The Five APIs](#the-five-apis)
  - [Brave LLM Context API](#brave-llm-context-api)
  - [Tavily](#tavily)
  - [Exa](#exa)
  - [Perplexity Sonar](#perplexity-sonar)
  - [Firecrawl](#firecrawl)
- [Comparison](#comparison)
- [Routing by Use Case](#routing-by-use-case)
- [Why the Brave Announcement Matters](#why-the-brave-announcement-matters)
- [What This Means for Agent Builders](#what-this-means-for-agent-builders)
- [The OpenClaw Connection](#the-openclaw-connection)
- [The Cheat Sheet](#the-cheat-sheet)

---

## Why Search Is the Bottleneck

Everyone's debating which LLM to use for their agent — Claude vs GPT vs Gemini vs the new open-weights models. But there's a more fundamental question most builders skip: where does your agent get its information?

An agent that can't search well can't reason well. It doesn't matter if you're running Opus 4.6 or M2.5 if the search results feeding your model are stale, shallow, or poorly formatted. The model hallucinates. The agent loops. The user gets garbage.

Microsoft killed the Bing Search API in August 2025. That left a gap. Brave, Tavily, Exa, Perplexity, and Firecrawl all rushed in with different answers to the same question: how do you get the web into an LLM efficiently?

The timing of Brave's announcement is worth noting. They dropped the LLM Context API on February 12, the same day MiniMax released M2.5. When open-weight models hit frontier performance at $0.15/task, the quality of search context feeding those models becomes the actual differentiator. Brave's own research backs this up: they showed that a weaker open-weight model (Qwen3) with high-quality search context outperformed ChatGPT, Perplexity, and Google AI Mode.

In a head-to-head evaluation of 1,500 queries, Ask Brave (powered by Qwen3 + LLM Context API) scored a **4.66/5** absolute category rating, beating ChatGPT (4.32), Google AI Mode (4.39), and Perplexity (4.01). Only Grok (4.71) scored higher. Their conclusion: **context quality matters more than model capability.**

---

## The Five APIs

### Brave LLM Context API

This is the big one that triggered this breakdown. Brave isn't wrapping Google or Bing. They own an independent search index of **35+ billion pages**, refreshed with 100+ million daily changes. The new LLM Context endpoint goes beyond standard web results. It performs a full search, then extracts "smart chunks" from each page in real-time: clean text, structured data, JSON-LD schemas, table extraction, code context, forum discussions, YouTube captions. These chunks get ranked by relevance and compiled into a token-efficient format optimized for LLM consumption.

- **Latency:** Under 600ms at p90 for the full pipeline (search + extraction + ranking), with less than 130ms overhead on top of normal search
- **Token control:** Set a token budget per request to control costs
- **Filtering:** Goggles support lets you filter, boost, or downrank results by domain
- **Compliance:** SOC 2 Type II attested, Zero Data Retention, no conflicts of interest (they don't train their own LLMs on your queries)

### Tavily

[Tavily](https://tavily.com) has become the default search API in the LangChain/LlamaIndex ecosystem, used by 800,000+ developers. It's purpose-built for AI agents with four endpoints:

- **Search** — web discovery
- **Extract** — pull content from URLs
- **Map** — understand site structure
- **Crawl** — navigate and extract from entire sites

In January 2026 they shipped agent skills, a Vercel AI SDK integration, the `/research` endpoint for multi-step automated research, and domain governance controls for regulated industries.

The credit-based pricing takes some understanding. Basic search costs 1 credit, advanced costs 2. Crawling stacks mapping + extraction costs. The `/research` endpoint uses dynamic pricing with min/max boundaries. Credits don't roll over month to month.

### Exa

[Exa](https://exa.ai) (formerly Metaphor) is the contrarian play. While everyone else does keyword matching or wraps Google, Exa uses **neural embeddings** trained on their own index of tens of billions of pages. You search by meaning, not words. Ask "find articles explaining quantum computing like I'm five" and it understands the intent.

In October 2025 they launched Exa 2.0 with three tiers:

- **Exa Fast** — sub-350ms p50 (fastest at the time)
- **Exa Auto** — default, balances latency and quality
- **Exa Deep** — agentic multi-search, ~3.5s p50, highest quality

Then on February 12, 2026 they shipped **Exa Instant**, pushing latency below 200ms for real-time applications. The index is refreshed every minute. They built an in-house vector database trained for over a month on a 144x H200 cluster. For research agents making 50+ search calls, the 200ms savings per call from Exa Instant adds up to 10+ seconds of total savings.

### Perplexity Sonar

Perplexity's API bundles search and LLM together. You don't just get results — you get synthesized answers with citations.

| Model | Cost | Use Case |
|-------|------|----------|
| **Sonar** | $1/M in+out tokens + per-request fee | Fast answers |
| **Sonar Pro** | $3/M input + $15/M output + per-request fee | Deeper reasoning |
| **Sonar Reasoning Pro** | Separate reasoning token costs | Chain-of-thought |
| **Sonar Deep Research** | Per search query made | Autonomous multi-step |
| **Raw Search API** | $5/1K requests, no token costs | Just results |

The trade-off is clear: you give up control over the LLM layer in exchange for a complete answer pipeline. If you want to use your own model (running M2.5 or Opus), Perplexity is the wrong choice. If you want the fastest path to grounded answers, it might be the right one. Citation tokens are now free on standard Sonar and Sonar Pro, which meaningfully reduces per-query costs. But total cost per query depends on model choice + context size + token volume, making it harder to predict than flat-rate APIs.

### Firecrawl

[Firecrawl](https://firecrawl.dev) is the extraction specialist. Where the others start with search, Firecrawl starts with "give me a URL and I'll get you everything on that page." Their agent handles JavaScript rendering, pagination, authentication, CAPTCHAs, and multi-page workflows automatically. Open source and self-hostable.

In Firecrawl's own comparison testing, they reported 77.2% coverage and 0.638 F1 quality versus Exa's 69.2% coverage and 0.508 F1. (Note: these are vendor-published benchmarks, not independently audited.)

It's not a search engine — it's what you use *after* your search engine finds the right URLs. Pricing is flat and predictable: one credit per page, always. No depth multipliers, no variable consumption. At 100K pages monthly, Firecrawl costs $83 versus Tavily's $500–800 for equivalent extraction.

---

## Comparison

| Feature | Brave | Tavily | Exa | Perplexity | Firecrawl |
|---------|-------|--------|-----|------------|-----------|
| **Type** | Search + extraction | Search + crawl | Semantic search | Search + LLM | Extraction only |
| **Index** | Own (35B pages) | Wraps multiple | Own (neural) | Own + web | N/A (URL input) |
| **Latency (p50)** | ~500ms | ~800ms | <200ms (Instant) | ~1-3s | ~2-5s |
| **LLM-ready output** | Yes (smart chunks) | Yes | Yes | Yes (full answers) | Yes (markdown) |
| **Token budget control** | Yes | No | No | Via model choice | No |
| **Self-hostable** | No | No | No | No | Yes |
| **Pricing model** | $5/1K requests | Credits (1-2/search) | Per request | Tokens + requests | $1/page |
| **Independence** | Full (own index) | Partial | Full (own index) | Full | N/A |
| **ZDR / SOC 2** | Yes | No | No | No | Self-host option |

---

## Routing by Use Case

The smart move isn't picking one. It's routing different query types to different APIs based on what each does best.

| Use Case | Best API | Why |
|----------|----------|-----|
| **Factual grounding** (prices, stats, current events) | Brave | Fastest general-purpose, token-budget control, fresh index |
| **Research discovery** ("find articles like this") | Exa | Neural embeddings understand meaning, not just keywords |
| **Deep page extraction** (full article content, tables) | Firecrawl | Best extraction quality, handles JS/auth/pagination |
| **Quick synthesized answers** | Perplexity Sonar | No model integration needed, citations included |
| **Multi-step research** (automated deep dives) | Tavily `/research` or Perplexity Deep Research | Purpose-built for agentic multi-hop queries |
| **Site mapping / crawling** | Tavily or Firecrawl | Both handle structure; Firecrawl better at scale |
| **Regulated / enterprise** | Brave (ZDR) or Firecrawl (self-host) | Data sovereignty requirements |

---

## Why the Brave Announcement Matters

Brave's LLM Context API is interesting because of what it isn't:

- **Not a wrapper** around Google or Bing (like SerpAPI, which Google is suing)
- **Not bundled with an LLM** you're forced to use (like Perplexity)
- **Not just a search endpoint** (like their previous API)

What it is: a purpose-built pipeline that takes a query, searches an independent 35B-page index, extracts smart chunks from each result page in real-time, ranks those chunks for relevance, and delivers them in a token-budget-controlled format ready for any LLM. All in under 600ms.

Three things stand out:

1. **Skills for developer environments.** They open-sourced Brave Search API Skills that work in Cursor, OpenCode, Claude Code, and OpenClaw. The 200,000+ developers who signed up through the OpenClaw release are exactly the target audience.

2. **Pricing simplification.** Everything under Search (Web, LLM Context, Images, News, Videos) is **$5/1K requests** with $5 free monthly credit. No per-token costs on the search side. The Answers plan is separate at $4/1K searches + $5/M tokens. Meaningfully simpler than Tavily's credit system or Perplexity's token + request + search stacking.

3. **The independence argument.** Brave makes the case that scrapers are legally risky (Google v. SerpAPI), can be shut off arbitrarily, and can't offer true Zero Data Retention since queries pass through a third party. As the only western independent search index at scale outside Big Tech, they're positioning as the safe infrastructure choice for enterprise AI.

---

## What This Means for Agent Builders

### 1. The search layer is becoming the real moat

LLMs are commoditizing. Brave's evaluation showed an open-weight model with good search context beating frontier models with worse context. As model performance converges (M2.5 is 0.6 points from Opus), the quality of information flowing into those models becomes the primary differentiator. The search API you choose is now a product decision, not just an infrastructure one.

### 2. The hybrid approach is winning

The most effective agent stacks route different query types to different APIs. Simple factual lookups go to Brave (cheap, fast, high quality context). Research discovery goes to Exa (semantic understanding). Deep extraction goes to Firecrawl (best quality, self-hostable). Quick synthesized answers go to Sonar (no model integration needed). This multi-API approach reduces costs **40–60%** compared to using one provider for everything.

### 3. Privacy and independence actually matter now

Enterprise AI teams are asking where their queries go. Wrapped APIs send queries to Google or Bing. Brave's ZDR policy and SOC 2 attestation aren't just compliance checkboxes — they're competitive advantages for regulated industries where query content is sensitive. Firecrawl's open-source self-hosting is the nuclear option for teams that need full data sovereignty.

---

## The OpenClaw Connection

Brave specifically mentioned the 200,000+ developers who signed up through OpenClaw. The Brave Search MCP server is already integrated. For anyone running agents on OpenClaw, the LLM Context API is the path of least resistance for high-quality web grounding. But don't sleep on combining it with Exa for research tasks and Firecrawl for deep extraction. The stack is more powerful than any single tool.

---

## The Cheat Sheet

**If you pick one:** Brave LLM Context API. Independent index, LLM-optimized chunks, clean pricing, ZDR, MCP server ready. The best general-purpose search for agents in February 2026.

**If you pick two:** Add Exa for semantic research discovery. Brave handles factual grounding, Exa handles "find me things like this." Together they cover 90% of agent search needs.

**If you go all-in:** Brave for grounding + Exa for discovery + Firecrawl for extraction + Perplexity Sonar for quick answers. Route by query type. Budget $50–100/month for a comprehensive search stack that outperforms any single provider.
