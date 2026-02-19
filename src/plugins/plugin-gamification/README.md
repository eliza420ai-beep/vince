# plugin-gamification

Ranking and points for engagement—swaps, bridges, chat, referrals. Powers the Rebels leaderboard and invite links on the dashboard.

## Purpose

Part of the Leaderboard/Usage surface. Tracks who shows up: points for swaps, bridges, transfers, meaningful chat, referrals. Level progression: Scout → Operator → Architect → Sovereign.

## Config

| Setting / Env                    | Required                   | Description                                                                                           |
| -------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------- |
| `JWT_SECRET`                     | Yes (for protected routes) | Used to verify Bearer tokens for `/summary` and `/referral`. Generate with `openssl rand -base64 32`. |
| `GAMIFICATION_REFERRAL_BASE_URL` | No                         | Base URL for referral links (default `https://otaku.so`). No trailing slash.                          |

## Routes

| Path           | Method | Auth     | Description                                                          |
| -------------- | ------ | -------- | -------------------------------------------------------------------- |
| `/leaderboard` | GET    | Optional | Public. Top ranks (weekly or all_time). No raw user IDs exposed.     |
| `/summary`     | GET    | Required | User's points, level, streak, next milestone.                        |
| `/referral`    | GET    | Required | User's invite code, stats, and referral link (base URL from config). |

## Level names

- **Scout** — 0–999 pts
- **Operator** — 1,000–4,999
- **Architect** — 5,000–19,999
- **Sovereign** — 20,000+

## Migrations and pg_cron

Scheduled jobs (leaderboard snapshots, weekly reset, daily stats) use PostgreSQL `pg_cron`. See [migrations/README.md](migrations/README.md) for setup and fallback when pg_cron is not available.
