# Content Audit / “Film Study” — Implementation Plan

**Inspired by:** “Content is not a Slot Machine” — study your top-performing content with AI to find patterns (emotional triggers, hooks, topics, format) and build a repeatable playbook.

**Product terminology:** We use "content audit" and "top posts analysis" in the product; "film study" was from the inspiration article.

**Scope:** plugin-x-research only. No new dependencies; uses existing X client, accounts service, runtime LLM, and save flow.

**Rate limits:** When Eliza and ECHO both use plugin-x-research, they must not share one X bearer token or they hit rate limits. Use `ELIZA_X_BEARER_TOKEN` for Eliza and `X_BEARER_TOKEN` for ECHO; the client is keyed by token so each agent gets the correct client.

---

## Goal

- Let users (or the agent) run a **content audit** on an X account: “Analyze my top posts,” “What’s working on my X,” “Content audit for @user.”
- **Input:** Top N tweets by engagement (not just recent).
- **Output:** A structured **playbook** (hooks that work, topics that land, formats that engage, what to avoid), optionally savable via “save that.”

---

## Contract

| Item | Detail |
|------|--------|
| **New action** | `X_CONTENT_AUDIT` |
| **Triggers** | “Analyze my top posts,” “content audit,” “what’s working on my X,” “my best performing tweets,” “content playbook for @user” |
| **Input** | @username (required). Optional: N = number of top posts (default 20). |
| **Data** | Fetch enough tweets to sort by engagement; take top N. Engagement score = e.g. `likeCount + 2*retweetCount + replyCount` (configurable). |
| **LLM** | Single `runtime.useModel(ModelType.TEXT_LARGE, { prompt })` with a **fixed structured prompt** (see below). |
| **Output** | Playbook text (markdown or structured bullets). Same store as pulse/vibe for “save that” (optional). |

---

## Implementation

### 1. Top tweets by engagement (service layer)

**File:** `src/plugins/plugin-x-research/src/services/xAccounts.service.ts` (or xClient if pagination lives there).

- **Option A — Client returns pagination:** Extend `getUserTweets` in `xClient.service.ts` to return `{ data: XTweet[], nextToken?: string }` when we need pagination (X API returns `meta.next_token`). Then in xAccounts, loop until we have enough tweets (e.g. 200) or no more pages.
- **Option B — Single large request:** X API user timeline allows `max_results` up to 100. Call `getUserTweets(userId, { maxResults: 100, excludeReplies: true, excludeRetweets: true })`, then sort by engagement and take top 20. If we need more than 100 tweets to get a good “top 20,” add pagination (Option A).

**Recommendation:** Start with **Option B** (single request, max 100). Sort by engagement score and return top 20. If product later needs “top 50” or deeper analysis, add pagination in a follow-up.

**New method:** `getTopTweetsByEngagement(username: string, count = 20): Promise<XTweet[]>`  
- Resolve user; fetch up to 100 tweets (exclude retweets, optionally exclude replies).  
- Sort by `(t.metrics?.likeCount ?? 0) + 2 * (t.metrics?.retweetCount ?? 0) + (t.metrics?.replyCount ?? 0)`.  
- Return first `count` (default 20).  
- If fewer than 5 tweets, return as-is (caller can show “need more posts” message).

**File:** `src/plugins/plugin-x-research/src/services/xClient.service.ts`  
- Ensure `getUserTweets` requests `public_metrics` (already in `DEFAULT_TWEET_FIELDS`). No change if already present.  
- If we later need pagination: have `getUserTweets` return `{ data, nextToken }` and add a small loop in xAccounts to aggregate pages.

---

### 2. Structured prompt template

**File:** `src/plugins/plugin-x-research/src/constants/contentAuditPrompt.ts` (new).

- Export a function or constant that builds the analysis prompt:
  - **System/context:** “You are analyzing a creator’s top-performing X posts to extract a repeatable content playbook.”
  - **Input:** Numbered list of the top N posts (full text; optionally include like/RT/reply counts for context).
  - **Instructions:**  
    “Identify: (1) Emotional triggers shared by top performers (fear, aspiration, outrage, validation, etc.). (2) Hook patterns — how do the best posts open (first line)? (3) Topics that consistently outperformed. (4) Personal story vs data-driven — which performed better? (5) What underperformers or weaker posts did differently (to avoid).”
  - **Output format:**  
    “Return a concise playbook in markdown with sections: **Hooks that work**, **Topics that land**, **Formats that engage**, **Avoid**. Keep each section to 3–5 bullets. No preamble.”
- So: one template, used every time — “prompt magic” from the article.

---

### 3. New action: X_CONTENT_AUDIT

**File:** `src/plugins/plugin-x-research/src/actions/xContentAudit.action.ts` (new).

- **name:** `X_CONTENT_AUDIT`.  
- **similes:** `CONTENT_AUDIT`, `TOP_PERFORMERS_ANALYSIS`, `CONTENT_PLAYBOOK`.  
- **description:** “Run a content audit on an X account: fetches top posts by engagement and uses AI to produce a playbook (hooks, topics, formats). Use when the user says ‘analyze my top posts,’ ‘content audit for @user,’ ‘what’s working on my X.’”  
- **validate:** Message contains @username (or “my”/“me” with a convention for “current user” if we have it) and audit-like intent (e.g. “analyze my top posts,” “content audit,” “what’s working,” “best performing,” “playbook”).  
- **handler:**  
  1. Resolve @username from message (require @mention or “my”/“me” → if “me” we might need linked account; for MVP only support explicit @user).  
  2. Call `accountsService.getTopTweetsByEngagement(username, 20)`.  
  3. If fewer than 5 tweets, callback with “Need at least 5 posts to run a useful audit. @user has only N.” Return true.  
  4. Build prompt using the template from `contentAuditPrompt.ts` (pass the list of tweet texts + optional metrics).  
  5. `const playbook = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });` (or TEXT_SMALL if we prefer speed).  
  6. Optional: strip any markdown code fences if the model wrapped the answer.  
  7. Callback with the playbook (e.g. “📋 **Content playbook for @user**\n\n” + playbook).  
  8. Optional: `setLastResearch(roomId, playbook)` so “save that” saves the playbook (reuse existing store).  

**File:** `src/plugins/plugin-x-research/src/actions/index.ts`  
- Export and register `xContentAuditAction`.

**File:** `src/plugins/plugin-x-research/src/index.ts`  
- Add `xContentAuditAction` to the plugin’s `actions` array.

---

### 4. Playbook in “save that”

- **Current:** `lastResearchStore` holds last pulse/vibe/news text; X_SAVE_RESEARCH saves it.  
- **Change:** When X_CONTENT_AUDIT runs, call `setLastResearch(message.roomId, fullResponseText)` (same as pulse/vibe). Then “save that” after a content audit saves the playbook. No new store; same TTL (5 min).  
- Optional: In X_SAVE_RESEARCH, if the stored text starts with “📋 **Content playbook**,” save with filename like `content-playbook-@user-YYYY-MM-DD-HHmm.md` for clarity.

---

### 5. Docs and agent instructions

**File:** `src/plugins/plugin-x-research/AGENT_INSTRUCTIONS.md`  
- Add a short section:  
  **Content audit:** “Analyze my top posts,” “content audit for @user,” “what’s working on my X,” “my best performing tweets” → Use **X_CONTENT_AUDIT**. Returns a data-driven playbook (hooks, topics, formats). User can say “save that” to save the playbook.

**File:** `src/plugins/plugin-x-research/README.md` (if present)  
- Add one line: Content audit (film study): run X_CONTENT_AUDIT to get a playbook from an account’s top-performing posts; optionally save with “save that.”

---

## Summary

| Step | Component | Change |
|------|-----------|--------|
| 1 | xAccounts.service | Add `getTopTweetsByEngagement(username, count)` — fetch up to 100 tweets, sort by engagement, return top `count`. |
| 2 | contentAuditPrompt.ts (new) | Structured prompt template: input = top N posts, output = playbook (hooks, topics, formats, avoid). |
| 3 | xContentAudit.action.ts (new) | New action: resolve @user, get top tweets, run prompt, return playbook; optionally setLastResearch. |
| 4 | actions/index.ts + plugin index | Register X_CONTENT_AUDIT. |
| 5 | lastResearchStore | Use existing: setLastResearch after audit so “save that” saves playbook. |
| 6 | AGENT_INSTRUCTIONS + README | Document when to use X_CONTENT_AUDIT and that playbook can be saved. |

---

## Out of scope (later)

- Pagination beyond 100 tweets (if we want “top 50” from large accounts).  
- “Me” / linked-account resolution (MVP: explicit @username only).  
- Separate “save playbook” action (reuse “save that”).  
- A/B or underperformer comparison in the prompt (can be added to the same template later).

---

## Testing

- Unit test: `getTopTweetsByEngagement` with mocked client returning tweets with metrics; assert order and count.  
- Unit test: prompt builder produces a string containing the tweet texts and instructions.  
- Integration/manual: “Analyze my top posts @myhandle” → action runs, returns playbook; “save that” → file contains playbook.
