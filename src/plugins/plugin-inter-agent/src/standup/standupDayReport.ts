/**
 * Shared Day Report prompt and generation.
 * Used by STANDUP_FACILITATE (manual wrap-up) and by the scheduled standup task.
 */

import { getEssentialStandupQuestion } from "./standup.constants";
import { formatReportDate } from "./standupReports";

/**
 * Build the core Day Report prompt from conversation context.
 * Single source of truth for the Day Report format (essential question, Solus's call, TL;DR, Signals, Actions).
 */
export function buildDayReportPrompt(conversationContext: string): string {
  const essentialQ = getEssentialStandupQuestion();
  return `You are Kelly. Synthesize the standup into a CONCISE Day Report.

CONVERSATION:
${conversationContext}

OUTPUT FORMAT (follow EXACTLY):

## 📋 Day Report — ${formatReportDate()}

**Essential question:** ${essentialQ}

**Solus's call:** [Above/Below/Uncertain] — [one sentence from Solus's answer, e.g. "No — chop or downside in $60K–$70K range next week."]

**TL;DR:** [ONE sentence: Asset + Direction + Action. Example: "BTC neutral, SOL bullish — size SOL long at $198."]

### Signals
| Asset | Call | Confidence | Key Data |
|-------|------|------------|----------|
| BTC | Bull/Bear/Flat | H/M/L | [one metric] |
| SOL | Bull/Bear/Flat | H/M/L | [one metric] |
| HYPE | Bull/Bear/Flat | H/M/L | [one metric] |

### Actions
1. **[ACTION]** — @Owner — [specific entry/size/invalidation]
2. **[ACTION]** — @Owner — [specific entry/size/invalidation]
3. **[ACTION]** — @Owner — [specific entry/size/invalidation]

### Decisions (Yves review if not HIGH confidence)
- [ ] [Decision] — Confidence: H/M/L

### Risks
[One line or "Clear"]

---
*Ship it.*

RULES:
- TL;DR = ONE sentence, no more
- Max 3 actions, each with @Owner
- No fluff, no "consider", no "monitor" — specific trades only
- Total output under 300 words`;
}
