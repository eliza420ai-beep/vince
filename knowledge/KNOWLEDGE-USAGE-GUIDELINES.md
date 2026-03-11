---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Knowledge Base Usage Guidelines

## 🎯 Core Principle

**The knowledge base provides THINKING FRAMEWORKS and METHODOLOGIES, NOT current data.**

## What Knowledge Provides ✅

1. **Thinking Frameworks**
   - How to analyze topics
   - Which metrics matter
   - How to interpret data
   - Analytical approaches

2. **Methodologies**
   - Strike selection strategies
   - Funding rate interpretation
   - TVL analysis frameworks
   - Options analysis approaches

3. **Strategic Patterns**
   - What to look for
   - How to identify signals
   - Risk assessment frameworks
   - Pattern recognition approaches

4. **Historical Examples (as Illustrations)**
   - March 2020, November 2022, October 2024
   - These illustrate **concepts**, not current conditions
   - Use them to understand **methodology**, not as data points

## What Knowledge Does NOT Provide ❌

1. **Current Data**
   - ❌ Prices, funding rates, TVL numbers
   - ❌ Real-time metrics or market data
   - ❌ Up-to-date chain rankings or protocol stats

2. **Why?**
   - Essays were written at specific points in time
   - Numbers quoted are **historical snapshots**
   - They illustrate **concepts**, not current conditions

## How Agents Should Use Knowledge

### ✅ CORRECT Usage

**Example 1: Funding Rates**

- ✅ "According to knowledge, funding >0.05% indicates extreme long crowding - let me check current rates using HYPERLIQUID_FUNDING"
- ✅ "The knowledge base explains that funding flips from negative to positive can signal entry opportunities - here's the methodology..."
- ❌ "According to knowledge, BTC funding is 0.05%" (outdated number)

**Example 2: TVL Analysis**

- ✅ "The knowledge base provides a framework for identifying TVL red flags - sudden drops >20%, whale concentration. Let me check current data..."
- ✅ "Knowledge explains how to interpret TVL/MCap ratios - here's the methodology..."
- ❌ "According to knowledge, Ethereum TVL is $50B" (outdated number)

**Example 3: Options Strategies**

- ✅ "The knowledge base describes the HYPE wheel approach to strike selection - here's the methodology..."
- ✅ "Knowledge explains how funding rates should inform strike distance - here's the framework..."
- ❌ "According to knowledge, BTC 7-day IV is 45%" (outdated number)

### ❌ INCORRECT Usage

- ❌ Quoting outdated prices/numbers as if they're current
- ❌ Using knowledge as a data source instead of methodology source
- ❌ Treating historical examples as current conditions
- ❌ Not distinguishing between "how to think" vs "what the data is"

## Agent Implementation

All agents should include this section in their system prompts:

```markdown
## CRITICAL: KNOWLEDGE BASE USAGE

Your knowledge base contains **essays and analysis** that provide:

- **Thinking frameworks** and **methodologies** for analyzing [domain]
- **Which topics matter** and **how to interpret** [relevant metrics]
- **Analytical approaches** and **strategic patterns**
- **Historical examples** that illustrate **concepts and frameworks** (not current data)

**IMPORTANT - What Knowledge Does NOT Provide:**

- ❌ **Current prices, metrics, or market data** - these are outdated
- ❌ **Real-time information** - always use your ACTIONS to get current data
- ❌ **Up-to-date numbers** - numbers in essays illustrate concepts, not current conditions

**How to Use Knowledge:**

- ✅ Reference **methodologies** and **analytical frameworks** from the knowledge
- ✅ Apply **thinking approaches** to interpret current data from your actions
- ✅ Use knowledge to understand **which metrics matter** and **how to analyze** them
- ✅ Reference **strategic patterns** and **concepts** (not outdated numbers)
- ❌ **DO NOT quote outdated prices/numbers** as if they're current
- ❌ **DO NOT use knowledge as a data source** - use your ACTIONS for current data
```

## Testing Implications

When testing knowledge impact:

- ✅ Reward responses that show **methodological understanding**
- ✅ Reward responses that apply **frameworks** to current situations
- ✅ Reward responses that explain **how to think** about topics
- ❌ Do NOT reward responses that quote outdated numbers as current
- ❌ Do NOT reward responses that use knowledge as a data source

## Summary

**Knowledge = Methodology & Frameworks**  
**Actions/APIs = Current Data**

Agents should use knowledge to **understand how to think** and use actions to **get current data**.

## Related

- [Crypto Tax Frameworks](regulation/crypto-tax-frameworks.md)
- [Us Regulatory Landscape 2026](regulation/us-regulatory-landscape-2026.md)
