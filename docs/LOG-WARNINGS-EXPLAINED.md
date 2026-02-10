# Why You See These Log Warnings

## 1. `[PLUGIN:BOOTSTRAP:PROVIDER:ROLES] User has no name or username, skipping (entityId=...)`

**What it is:** The ROLES provider (from `@elizaos/plugin-bootstrap`) builds a list of server roles (OWNER, ADMIN, MEMBER) by reading `world.metadata.roles` and then loading each entity from the DB. For each entity it expects `name`, `username`, or `names` to be set.

**Why it happens:** An entity (Discord user) has a role stored in the world (e.g. from when they joined or were assigned a role), but that entity row in the DB was never filled with name/username—e.g. the user was added to the role list before their profile was synced from Discord, or the connection/entity sync didn’t persist names.

**Impact:** That user is skipped when formatting the role list for the LLM. The rest of the role list is still correct. No functional failure.

**If you want to fix it:** Ensure entities get names when they’re created/updated (e.g. in Discord `ensureConnection` / entity update). You can also ignore it; the log is informational.

---

## 2. `[PLUGIN:SQL] Database operation failed, retrying (attempt=1, maxRetries=3, error=Failed query: select ... from "rooms" where ... agent_id = $2)`

**What it is:** The SQL plugin (Drizzle) is running a query that selects from `rooms` by `id` and `agent_id`. The query is failing (often after 0 rows or due to contention), so the plugin retries.

**Why it happens (multi-agent):**

- Rooms are **per-agent**: each room row has an `agent_id` (the bot that created/owns that room). So the same Discord channel can have two room rows if both VINCE and Eliza are in the server—one with VINCE’s `agent_id`, one with Eliza’s.
- When the ROLES provider (or any code) runs, it uses **the current runtime’s** `message.roomId`. That `roomId` is often the **channel’s** logical id (e.g. same UUID for the channel). But `getRoom(roomId)` is implemented as “get room with this id **and** this runtime’s `agent_id`.” So when VINCE’s runtime asks for a room that was actually created by Eliza’s runtime (different `agent_id`), the query returns 0 rows. In some code paths that condition is treated as an error and triggers a retry.
- So you get: “Database operation failed, retrying” with a `rooms` select that filters by `agent_id`. Retries usually succeed when the right agent is hitting its own room, or the failure is transient (e.g. lock).

**Impact:** The plugin retries (e.g. up to 3 times). Often a retry succeeds or the operation is skipped; sometimes you see a short burst of these warnings. No data corruption.

**If you want to reduce noise:** The log-filter plugin is configured to suppress these (they’re in `SUPPRESS_ERROR_PATTERNS`). If they still appear, the SQL plugin may be using a child logger that isn’t patched; you can leave them as-is or tighten suppression. They’re safe to ignore when they’re rare and retries succeed.

---

## 3. `[CORE:UTILS] No entity found for message (entityId=...)`

**What it is:** When formatting recent messages for the LLM, core's `formatPosts` looks up each message's `entityId` in the list of entities for the room. If the sender isn't in that list, it logs this warning once per message (so you can see many in a row).

**Why it happens:** `getEntityDetails({ runtime, roomId })` returns room participants. For Direct / web chat, the user's entity may not be in that list yet when the provider runs.

**Impact:** The message is still formatted (core uses "Unknown User"). No functional failure; the reply is sent correctly. The spam is log noise.

**Mitigation (in this repo):** In RECENT_MESSAGES we now add any message sender missing from the entity list (by fetching with `getEntityById` or a minimal stub) before calling `formatPosts`, so the warning no longer fires.
