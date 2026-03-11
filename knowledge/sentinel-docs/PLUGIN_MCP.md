# plugin-mcp — Model Context Protocol for ElizaOS

[plugin-mcp](https://github.com/elizaos-plugins/plugin-mcp) lets ElizaOS agents connect to MCP servers and use their **resources** (context/data) and **tools** (callable functions). Sentinel should suggest it when the agent needs external tools, data sources, or MCP integrations.

## What it does

- **MCP (Model Context Protocol):** Open protocol for connecting LLM apps to external data and tools.
- **Provider:** `MCP` — injects available servers and their tools/resources into agent context.
- **Actions:** `CALL_MCP_TOOL` (run MCP tools), `READ_MCP_RESOURCE` (read MCP resources).

Agents can use multiple MCP servers at once (e.g. GitHub, Puppeteer, Google Maps, custom servers).

## Configuration

In character `settings.mcp`:

- **`servers`** — Map of server names to configs:
  - **HTTP:** `type: "streamable-http"` or `"http"` or `"sse"`, `url`, optional `timeout`.
  - **stdio:** `type: "stdio"`, optional `command`, `args`, `env`, `cwd`, `timeoutInMillis`.
- **`maxRetries`** — Optional retry count.

Example:

```json
"mcp": {
  "servers": {
    "github": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "<TOKEN>" }
    }
  },
  "maxRetries": 2
}
```

Add to character: `"plugins": ["@elizaos/plugin-mcp"]`.

## When to suggest it

- **External tools:** User wants the agent to call APIs, run scripts, or use third-party capabilities (e.g. GitHub, filesystem, browser automation). MCP servers expose tools the agent can invoke.
- **External context/data:** User wants the agent to read from external sources (docs, DBs, APIs) as “resources” in context. MCP resources feed into the agent’s context.
- **MCP / Cursor / IDE tooling:** User mentions MCP, Cursor MCP servers, or “agent tools” — plugin-mcp is the ElizaOS bridge to MCP.
- **Multi-server tooling:** Need several tool backends (e.g. GitHub + Puppeteer + custom) in one agent; plugin-mcp supports multiple servers in one config.

**Security:** MCP servers can run arbitrary code. Only suggest connecting to trusted servers; mention that in recommendations.

Ref: https://github.com/elizaos-plugins/plugin-mcp (branch 1.x).
