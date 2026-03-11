# Sentinel: X Research and x-research-skill priority

**Directive:** Sentinel should grind on improving [X-RESEARCH.md](X-RESEARCH.md) and explore [rohunvora/x-research-skill](https://github.com/rohunvora/x-research-skill) to the full extent to improve our X research stack (vendored CLI, in-chat VINCE_X_RESEARCH, X vibe check, and this single doc of record).

**Canonical upstream:** https://github.com/rohunvora/x-research-skill — README: https://github.com/rohunvora/x-research-skill/blob/main/README.md

---

## What we have vs what upstream adds

| Area         | We have                                                                                 | Upstream adds (explore and consider)                                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CLI**      | skills/x-research: search, profile, thread, tweet, watchlist, --save, --markdown, cache | **Quick mode** (--quick): 1 page, 1h cache, cost summary; **--from &lt;user&gt;** shorthand; **--quality** (min 10 likes post-hoc)                                  |
| **Cost**     | X-RESEARCH.md mentions pay-per-use, cache, rate limits                                  | **Cost transparency:** per-resource table (post read, user lookup, search page); cost shown after every search; 24h dedup; spending controls; xAI credit bonus note |
| **Security** | Token in .env, optional second token for sentiment                                      | **Explicit warning:** AI agents may log tool calls (headers); recommend env var, minimal permissions, token rotation                                                |
| **Docs**     | X-RESEARCH.md = single source (design, tokens, in-chat, vibe, CLI)                      | SKILL.md / README: natural-language examples, file structure, limitations (7 days, read-only, pay-per-use)                                                          |

---

## Concrete improvement areas (Sentinel)

Use SENTINEL_SUGGEST and SENTINEL_DOC_IMPROVE to propose and document the following where applicable.

### X-RESEARCH.md

- **Pay-per-use section:** Add or align a cost section: per-resource table (e.g. post read, user lookup, search page), 24h deduplication, optional "cost after search" note if we add it in CLI.
- **Security subsection:** Token in agent session logs; recommend env var, minimal permissions, rotation if exposed.
- **CLI section:** If we adopt upstream behavior, document **Quick mode** (--quick) and **--from** / **--quality** in the CLI commands table and "When to use which."
- **Single source of truth:** Keep X-RESEARCH.md as the one place for design, tokens, in-chat, vibe check, and CLI; have skills/x-research/README and SKILL.md point here where appropriate.

### skills/x-research

- **CLI flags and behavior:** Align with upstream where useful: e.g. --quick (1 page, 1h cache, cost summary), --from &lt;username&gt;, --quality (min likes post-hoc).
- **Cost transparency:** If we have usage data, log or print cost after each search (per upstream).
- **SKILL.md and README:** Parity with upstream: natural-language usage examples, CLI reference, file structure, limitations (7 days, read-only, pay-per-use).

### Consistency

- Keep X-RESEARCH.md as the doc of record; any doc improvements Sentinel suggests should keep design, tokens, in-chat, vibe check, and CLI consistent with this file and with skills/x-research behavior.
