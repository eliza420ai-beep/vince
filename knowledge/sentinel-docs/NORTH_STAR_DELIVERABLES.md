# North Star Deliverables

These deliverable types define **success** for the standup and content pipeline. When the system produces them, that's the north star.

| #   | Deliverable                         | Owner(s)     | Output location                          | Purpose                                                                                                                                                                                                               |
| --- | ----------------------------------- | ------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Long-form essay**                 | Eliza, Solus | `docs/standup/essays/`                   | Ikigai Studio Substack - benefit-led, one clear idea, no AI slop.                                                                                                                                                     |
| 2   | **Banger tweet suggestions**        | Eliza, Solus | `docs/standup/tweets/`                   | Viral-potential tweets; short, punchy, on-brand.                                                                                                                                                                      |
| 3   | **Long-form X article**             | Eliza, Solus | `docs/standup/x-articles/`               | Story to publish on X as an article (long-form post).                                                                                                                                                                 |
| 4   | **Suggested trades**                | VINCE        | `docs/standup/trades/`                   | Perps on Hyperliquid (BTC, SOL, ETH, HYPE); onchain options on HypeSurface (same).                                                                                                                                    |
| 5   | **Founder good-life suggestions**   | Kelly        | `docs/standup/good-life/`                | Things for founders to do to live well: travel, dining, wine, health, fitness, touch grass - what Kelly knows best.                                                                                                   |
| 6   | **PRD for Cursor**                  | Sentinel     | `docs/standup/prds/`                     | Product requirements document for implementation in Cursor: goal, acceptance criteria, architecture rules, pasteable spec.                                                                                            |
| 7   | **Milaidy / OpenClaw instructions** | Sentinel     | `docs/standup/integration-instructions/` | Setup and integration instructions for [Milaidy](https://github.com/milady-ai/milaidy) and [OpenClaw](https://github.com/openclaw/openclaw); how to run them and how VINCE connects (e.g. standup → Milaidy Gateway). |

## 1. Long-form essay (Ikigai Studio Substack)

- **Format:** Markdown, ready to paste into Substack.
- **Voice:** Benefit-led (Apple-style), confident and craft-focused (Porsche OG), zero AI-slop jargon. One clear idea per piece.
- **Source:** Draw from `knowledge/substack-essays`, `knowledge/marketing-gtm`, and standup context.
- **Filename pattern:** `YYYY-MM-DD-essay-<slug>.md`.

## 2. Banger tweet suggestions

- **Format:** One file per batch; each tweet on its own line or numbered list. Optional: short note on why it has viral potential.
- **Voice:** Punchy, memorable, on-brand for Ikigai / crypto / the-good-life.
- **Filename pattern:** `YYYY-MM-DD-tweets-<topic>.md`.

## 3. Long-form X article

- **Format:** Markdown or plain text suitable for X's long-form "article" feature.
- **Voice:** Same as Substack essays; narrative, one clear thread, shareable.
- **Filename pattern:** `YYYY-MM-DD-x-article-<slug>.md`.

## 4. Suggested trades

- **Perps (Hyperliquid):** BTC, SOL, ETH, HYPE - direction, size, rationale (from data when available).
- **Options (HypeSurface):** Same underlyings - suggested strikes/expiry and rationale.
- **Format:** Structured (e.g. markdown table or bullets); no execution, suggestions only. Disclaimers: not financial advice.
- **Filename pattern:** `YYYY-MM-DD-trades-<source>.md` (e.g. `-hyperliquid.md`, `-hypesurface.md`, or combined).

## 5. Founder good-life suggestions (Kelly)

- **Format:** Markdown list or short paragraphs. Concrete, actionable.
- **Content:** Travel ideas, dining (Michelin, sommelier-level wine), health, fitness, "touch grass," relocation/UHNW bases - whatever fits "live the good life" for founders.
- **Voice:** Kelly's lane: luxury without fluff, benefit-led, no trading advice.
- **Filename pattern:** `YYYY-MM-DD-good-life-<theme>.md`.

## 6. PRD for Cursor (Sentinel)

- **Format:** Markdown PRD: goal, scope, user story, acceptance criteria, technical constraints, architecture rules ("keep the architecture as good as it gets"), optional out-of-scope.
- **Purpose:** Paste or save in Cursor so the AI (or dev) has a clear spec when implementing. Complements "task brief for Claude 4.6" from SENTINEL_SUGGEST.
- **Filename pattern:** `YYYY-MM-DD-prd-<slug>.md`.

## 7. Milaidy / OpenClaw instructions (Sentinel)

- **Format:** Markdown: what each project is, how to install/run, how VINCE integrates (e.g. `MILAIDY_GATEWAY_URL` + `POST /api/standup-action` for standup build items; openclaw-adapter for Eliza↔OpenClaw), links to repos.
- **Links:** [Milaidy](https://github.com/milady-ai/milaidy) (personal AI on ElizaOS; Gateway default `localhost:18789`), [OpenClaw](https://github.com/openclaw/openclaw) (personal AI assistant, multi-channel).
- **Filename pattern:** `YYYY-MM-DD-integration-milaidy.md` or `...-openclaw.md` or combined.

---

## How they're produced

- **Standup:** When the standup parse identifies an action item as one of these types (`essay`, `tweets`, `x_article`, `trades`, `good_life`, `prd`, `integration_instructions`), the action-item worker runs the north-star generator instead of the code-build path. Output is written to the paths above and announced like other standup deliverables.
- **Code/build:** Standard "build" type still goes through Milaidy or in-VINCE code gen; see [STANDUP_DELIVERABLES.md](STANDUP_DELIVERABLES.md).
- **Env:** Same as standup deliverables: `STANDUP_DELIVERABLES_DIR` (default `./docs/standup`). North-star subdirs are created under that directory.

## Success = these seven

A successful run delivers toward:

1. At least one Substack-ready essay.
2. A set of tweet suggestions with viral potential.
3. At least one X-ready long-form article.
4. Suggested perps (Hyperliquid) and options (HypeSurface) for BTC, SOL, ETH, HYPE.
5. Founder good-life suggestions in Kelly's voice.
6. PRDs for Cursor (Sentinel): pasteable specs for implementation.
7. Milaidy / OpenClaw instructions (Sentinel): how to run and integrate with VINCE.

Prioritize and roadmap so the system can produce each of these on a cadence that fits the team (e.g. daily standup → daily or weekly batches).
