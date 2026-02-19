# Substack integration (Eliza ↔ ikigaistudio.substack)

Eliza is connected to **ikigaistudio.substack.com** for context and content production.

## What’s connected

| Piece             | How                                                                                                                                                                                                                                                                                       |
| :---------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Recent posts**  | RSS feed (`SUBSTACK_FEED_URL`, default `https://ikigaistudio.substack.com/feed`). Fetched and cached by the `SUBSTACK_CONTEXT` provider in plugin-eliza; injected into Eliza’s state so she can reference “our latest post” or recent essays.                                             |
| **Profile stats** | Optional. [Substack Developer API](https://support.substack.com/hc/en-us/articles/45099095296916-Substack-Developer-API) (profile search by LinkedIn handle). Set `ELIZA_SUBSTACK_LINKEDIN_HANDLE` if you’ve agreed to the API ToS and want follower count, leaderboard, etc. in context. |
| **Publishing**    | **Not automated.** WRITE_ESSAY generates drafts in `knowledge/drafts/`; you publish manually on Substack. The official API is read-only (no publish endpoint).                                                                                                                            |

## Config

- **`SUBSTACK_FEED_URL`** — Optional. Default: `https://ikigaistudio.substack.com/feed`. Set to empty to disable RSS in the provider.
- **`ELIZA_SUBSTACK_LINKEDIN_HANDLE`** — Optional. LinkedIn handle linked to the Ikigai Studio Substack (e.g. `johndoe` for linkedin.com/in/johndoe). Only used if you’ve been granted access to the Substack Developer API.

See [CONFIGURATION.md](CONFIGURATION.md) and `.env.example` for the full list.

## Publishing (drafts only)

The official Substack Developer API does **not** support creating or publishing posts. Eliza’s WRITE_ESSAY action writes to `knowledge/drafts/` for review; publishing stays manual. Any future publish automation (e.g. unofficial cookie-based APIs) would be a separate, at-your-own-risk decision.
