---
tags: [general]
agents: [eliza]
last_reviewed: 2026-02-15
---

# Prompt Engineer Master — Curriculum & Framework

Eliza's prompt engineering mastery framework. Teach and guide users through world-class prompt design across AI models and contexts. Think like an AI systems architect, teacher, and creative strategist combined.

---

## Objective

Build complete understanding of how to engineer prompts that produce **reliable**, **creative**, and **high-utility** outputs. Focus is on process mastery: clarity, structure, adaptability, and optimization.

---

## 1. Foundation Building

**Core principles:**

- **Context hierarchy**: What comes first shapes what comes next. Put role and constraints before the ask. Model attention fades; front-load the critical frame.
- **Clarity**: Vague prompts get vague answers. "Be helpful" is noise. "Summarize this in 3 bullet points for a C-suite readout" is signal.
- **Specificity**: Concrete beats abstract. "Write a report" vs "Write a 500-word risk memo for board approval, section headers: Executive Summary, Key Risks, Recommendations."
- **Intent alignment**: The prompt must encode the actual goal. Research ≠ summarization ≠ brainstorming ≠ debugging. Match structure to intent.

**How prompt structure affects output:**

- **Reasoning**: Step-by-step instructions ("First X, then Y, finally Z") improve chain-of-thought. Bullet lists and numbered steps > walls of prose for logic tasks.
- **Creativity**: Looser constraints, open-ended questions, and role-play ("You are a novelist...") free the model. Tight format kills novelty.
- **Factuality**: Explicit grounding ("Base only on the provided context") reduces hallucination. Citations and verification instructions improve accuracy.

---

## 2. Prompt Architecture

**Layering: role, goal, constraints, format**

```
[ROLE] You are X.
[GOAL] Your task is to Y.
[CONSTRAINTS] Do not Z. Keep A under B.
[FORMAT] Output as JSON / markdown / 3 paragraphs / etc.
```

**Modular structures:**

- **XML blocks**: `<role>`, `<context>`, `<instructions>`, `<output_format>` — easy to parse, swap, and version.
- **JSON schemas**: For structured output, define the schema in the prompt. Models follow JSON patterns well.
- **Paragraph frameworks**: Role paragraph, context paragraph, instruction paragraph. Clean separation.

**Model-specific behavior (Claude, ChatGPT, Gemini, Grok, Perplexity):**

- **Claude**: Excels with long context, nuanced instructions, XML structure. Strong at following complex multi-step prompts. Less sensitive to minor wording.
- **ChatGPT**: Responds to conversational tone. Benefits from explicit "think step by step" and format cues. GPT-4 handles JSON well.
- **Gemini**: Good at code and reasoning. Prefers clear sectioning. Can get verbose; constrain length explicitly.
- **Grok**: Optimized for real-time, conversational. Shorter prompts often work better. Humor and personality land well.
- **Perplexity**: Web-grounded; emphasize "search first" and citation needs. Less suitable for pure generation without retrieval.

**Rule of thumb:** Test critical prompts across at least 2 models. Same structure, different phrasing can yield 2x quality delta.

---

## 3. Applied Practice

**Workflow:**

1. User gives a task or domain (research, content creation, data analysis, debugging, etc.).
2. Build an optimized prompt for that task.
3. Show how small word or structural changes alter model behavior.

**Example: Weak vs strong**

_Weak:_ "Tell me about crypto."

_Strong:_ "You are a macro analyst. Summarize the top 3 risks for BTC in the next 90 days. Use only publicly available data. Output: 3 bullet points, each 1 sentence, no preamble."

**Tweak sensitivity:**

- "Summarize" vs "Distill" vs "Extract the essence" — different tone and length.
- "3 bullet points" vs "a short paragraph" — format lock.
- "No preamble" — suppresses fluff. Critical for production prompts.

---

## 4. Debugging & Optimization

**When outputs fall short, diagnose:**

1. **Unclear intent**: Did the model misunderstand the goal? Reword the primary instruction. Make it the first sentence.
2. **Weak role framing**: Generic "assistant" vs "senior derivatives trader" — role drives tone and depth.
3. **Format misalignment**: Asked for bullets, got prose? Put format in a separate line, ideally at the end. Repeat it.
4. **Context overload**: Too much input buries the instruction. Trim. Or use "Given the above, [specific ask]."
5. **Missing constraints**: "Don't speculate" / "Only use the provided text" / "If uncertain, say so" — add guardrails.

**Rebuild process:**

- Phrasing: Active voice, imperative mood. "Summarize" not "Could you summarize."
- Logic steps: Break complex tasks into numbered substeps.
- Contextual reinforcement: Repeat key constraints in the closing line.

**Cross-model testing:**

- Run the same prompt on Claude, GPT-4, Gemini. Compare consistency.
- If one model fails, the prompt has ambiguity. Fix the prompt, not the model.

---

## 5. System Design Thinking

**Connect prompts into workflows:**

- **Loops**: Output of prompt A → input to prompt B. Example: "Extract entities" → "For each entity, summarize risk."
- **Multi-agent**: Different prompts for different roles (researcher, synthesizer, editor). Hand off context.
- **Conditional branching**: "If X, do Y; else Z." Structure as separate prompt variants or inline conditionals.

**Memory layering:**

- Short-term: Inject last N turns into context.
- Long-term: Store summaries or key facts; retrieve when relevant.
- RAG: Knowledge base + query → augment prompt with chunks. Eliza uses this.

**Iterative refinement:**

- First pass: rough output.
- Second pass: "Improve X and Y, keep Z." Targeted revision prompts beat monolithic rewrites.
- Feedback integration: "User rejected because A. Adjust prompt to avoid A."

**Scalable results:**

- Version prompts. Tag by use case, format, strength.
- A/B test critical prompts. Log inputs and outputs.
- Document what worked and what didn't. Meta-analysis after each session.

---

## 6. Documentation & Mastery Loop

**Prompt library structure:**

- **Tags**: use_case (research, content, analysis, debug), format (json, markdown, bullets), strength (1-5), model_tested
- **Before/after**: Store weak and strong versions. Show the delta.
- **Context**: When to use, when not to use, edge cases.

**End-of-session meta-analysis:**

- What worked? Why?
- What didn't? Root cause?
- What principle was learned? Add to foundation.

**Mastery checklist (per prompt):**

- [ ] Intent is explicit and first
- [ ] Role is defined
- [ ] Constraints are stated
- [ ] Format is specified
- [ ] Tested on at least one model
- [ ] Documented with tags and notes

---

## Output Format When Teaching

When guiding users on prompt design, structure responses as:

1. **Lesson focus**: Concept or skill
2. **Example prompts**: Before and after optimization
3. **Key takeaways**: 1–3 bullets
4. **Debugging notes**: Common failure modes
5. **Mastery checklist**: What to verify before shipping

---

## Rules for the Mentor

- **Always explain the why** behind prompt decisions. Users learn principles, not recipes.
- **Encourage experimentation and iteration.** One prompt rarely nails it. Iterate.
- **Prioritize teaching over producing.** Give them the framework to build their own.
- **Keep answers structured, visual, and practical.** Real-world use, not theory dumps.

---

## Relationship to Existing Corpus

- **Workflow Orchestration** (internal-docs): Plan mode, subagents, verification, task management for AI-assisted development. Use when instructing coding assistants or when users ask about development process. Complements prompt design—workflow for execution, prompts for generation.
- **Art of Prompting** (181524897): Philosophical—leverage, specific knowledge, Naval-style. Use for mindset and self-reprogramming prompts.
- **Prompt Design reports** (substack-essays): Applied—Crypto Sentinel Alchemist, essay generation, mega-prompts. Use for structure and model-specific patterns.
- **Indie Mobile App Strategist** (indie-mobile-app-strategist): Production template—role, constraints, style rules, growth logic, output schema, pre-output verification. Use for app ideation and as a teaching example of discard logic and strict output formatting.
- **This doc**: Curriculum—foundation to system design. Use for teaching, debugging, and mastery loops.
