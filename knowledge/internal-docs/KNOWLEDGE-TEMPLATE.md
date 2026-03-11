# Knowledge File Template

Use this template when creating new knowledge files. Files that follow this structure score significantly higher in Knowledge Integration tests (+30-50 improvement vs +2 for narrative essays).

---

## Template Structure

```markdown
## Methodology and Framework

**Key Concepts:**

- [3-7 core concepts as bullets - the essential ideas]
- [Each concept should be a transferable insight]
- [Focus on "how to think" not "what happened"]

**Analytical Approach:**

- [The mental model for analyzing this topic]
- [What questions to ask first]
- [How to structure your thinking]

**Decision Framework:**

- [Step-by-step process for making decisions]
- [When to do X vs Y - clear conditions]
- [Thresholds and ranges, NOT absolute numbers]
- Example: "If funding > 0.05%, position is crowded" (good)
- Example: "If BTC is $85,000" (bad - becomes outdated)

**Pattern Recognition:**

- [What signals indicate opportunity]
- [What signals indicate danger]
- [Red flags and warning signs]
- [How to interpret conflicting signals]

**Important Notes:**

- Focus on methodology, not historical data
- Extract frameworks, not specific numbers
- This is HOW TO THINK, not what happened

---

> **Knowledge Base Note**
> Numbers, prices, and dates in this file may be outdated.
> Use the METHODOLOGY and FRAMEWORKS, not specific data points.
> The value is in the analytical approach, not historical examples.

# [Title - Clear and Descriptive]

## Context

[Why this matters - 2-3 paragraphs max]
[What problem does this framework solve?]
[When would someone need this knowledge?]

## Core Framework

[The main analytical framework - THIS IS THE KEY VALUE]
[Make this section work standalone when retrieved by RAG]
[Include clear if/then logic where possible]

### [Sub-framework 1]

[Detailed explanation]

### [Sub-framework 2]

[Detailed explanation]

## Application

[How to apply the framework in practice]
[Step-by-step process]
[Real examples using the framework (not the prices)]

## Signals and Patterns

[What to look for in practice]
[Leading vs lagging indicators]
[How different signals combine]

## Common Mistakes

[What NOT to do - anti-patterns]
[Traps that catch beginners]
[How to avoid common errors]

## Conclusion

- [Key takeaway 1]
- [Key takeaway 2]
- [Key takeaway 3]
- [Maximum 5 bullets]
```

---

## What Makes Files Score High

### DO: Framework-First Content

- Lead with transferable thinking patterns
- Provide decision trees and step-by-step processes
- Use relative thresholds ("high IV" not "IV = 45%")
- Explain WHY before WHAT

### DON'T: Narrative Essays

- Avoid personal stories without extractable frameworks
- Don't list definitions without analytical guidance
- Skip content a generic LLM already knows
- Avoid specific prices/dates that become stale

---

## Examples of Good vs Bad Content

### BAD: Generic Information

```markdown
## What is Funding Rate?

Funding rate is a mechanism in perpetual futures...
```

(LLM already knows this - adds no value)

### GOOD: Unique Framework

```markdown
## Funding Rate Interpretation Framework

**When funding is positive and rising:**

- Indicates crowded long positioning
- Consider: Are longs paying to stay in?
- Red flag if funding > 0.05% for 3+ days

**Decision tree:**

1. If funding flips negative after extended positive period → potential long squeeze
2. If funding stays negative for 2-3 days → accumulation opportunity
3. If funding spikes > 0.1% → extreme crowding, expect mean reversion
```

(Unique framework with actionable thresholds)

---

## RAG Optimization Checklist

- [ ] Clear `##` headers for chunking
- [ ] Methodology section works standalone when retrieved
- [ ] Concepts defined before they're used
- [ ] Front-load the most valuable frameworks
- [ ] Each section is independently useful

---

## Before Adding Any File, Ask:

1. **Would a generic LLM know this?** If yes → make it more specific or don't add it
2. **Is there a decision framework?** If no → add one or restructure
3. **Can someone act on this?** If no → add actionable guidance
4. **Will this be useful in 6 months?** If no (price-dependent) → abstract to methodology
