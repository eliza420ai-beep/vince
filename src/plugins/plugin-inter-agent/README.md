# plugin-inter-agent

Lets agents ask other agents a question and report the answer back (ASK_AGENT). Used for "One Team, One Dream" flows (e.g. Kelly asking Vince, Solus, etc.).

## Room ID and multi-agent communication (ElizaOS docs)

Per [ElizaOS Core Runtime — Multi-Agent Communication](https://docs.elizaos.ai/runtime/core#multi-agent-communication):

- **Same room ID and entityId**: For agents to interact in the same conversation, send the **same `roomId`** and **same `entityId`** (the user) to the target agent. We pass `message.roomId` and `message.entityId` when calling `elizaOS.handleMessage(targetAgentId, userMsg)`, so the target (e.g. Vince) runs in the **same room** as the user’s chat with Kelly.
- **Async callbacks** ([Async Mode with Callbacks](https://docs.elizaos.ai/runtime/core#async-mode-with-callbacks)): `handleMessage(agentId, message, { onResponse(content) => content.text, onComplete })`. The core calls **onComplete** when `messageService.handleMessage`’s promise resolves, which can be **before** the REPLY action invokes the callback with the final text. We therefore **do not** settle “no reply” on onComplete; we only settle when **onResponse** receives content with `.text` or when the in-process timeout (95s) fires. That way a late callback with the real reply is still captured.
- **World ID**: A **world** is a container (e.g. a Discord server) that **contains** rooms. We pass `worldId` when ensuring connections; the room already belongs to a world.

So: **same roomId + entityId** = same conversation context. We wait for onResponse(text) or timeout, not onComplete.

## In-process vs job API

When **`runtime.elizaOS`** is set (same-process agent registry), ASK_AGENT calls `elizaOS.handleMessage` in-process (async first, then sync, then direct messageService). When it is not set, or when in-process does not deliver a reply, the action falls back to **POST /api/messaging/jobs**. The plugin logs `[ONE_TEAM] elizaOS on runtime` when **that agent’s runtime is initialized** (once per agent). The server often initializes agents lazily (on first use), so you may only see the log for agents you’ve already chatted with; open each agent’s chat once to “warm” all runtimes so ASK_AGENT can find everyone. If `hasElizaOS` is false, only the job API is used. Job timeout is 90s and we poll up to 100s so slow replies can complete.

## Job API contract (when in-process is not available)

When the in-process path is not used (no `runtime.elizaOS`), ASK_AGENT falls back to **POST /api/messaging/jobs**. For the job to complete successfully, the server must ensure that when the target agent sends a reply, the send handler emits **`new_message`** with:

- **`channel_id`** = the job’s channel id (the room/channel created for the job)
- **`author_id`** = the replying agent’s id

If the reply is emitted with a different channel (e.g. the user’s chat channel), the job’s `responseHandler` will never see it and the job will time out. Implementations (e.g. Direct plugin or server wrapper) can use message metadata such as `metadata.jobId` or `metadata.isJobMessage` to emit with the job’s `channelId` and the replying agent’s id when present.

## Troubleshooting (logs)

- **`[ASK_AGENT] onResponse called { hasText: false }` then `onComplete`**  
  The target agent ran and the core invoked `onResponse`, but the content had no (or empty) `text`. We also accept `message` as fallback. If both are empty, the agent may have errored before replying (e.g. downstream embedding or DB errors) or returned a different content shape; check for **OpenAI 400** or **SQL** errors in the same run.

- **`OpenAI API error: 400 - Bad Request` + `[PLUGIN:BOOTSTRAP:SERVICE:EMBEDDING] Failed to generate embedding`**  
  The embedding service is sending something the OpenAI embedding API rejects. Common causes: **empty input**, **control characters** in the text, or **token limit** exceeded. The same `memoryId` often appears repeatedly (retries). Fix: ensure memories are not empty; sanitize content (strip control chars); or reduce input length. Check `OPENAI_EMBEDDING_MODEL` and that the embedding provider is configured.

- **`MaxClientsInSessionMode: max clients reached`**  
  Postgres (e.g. Supabase) in session mode has hit the connection pool limit. Increase `pool_size` or use transaction/pooler mode so multiple agents don’t exhaust connections.
