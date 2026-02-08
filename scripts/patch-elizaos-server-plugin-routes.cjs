#!/usr/bin/env node
/**
 * Apply plugin-route path fix to @elizaos/server so GET /api/agents/:id/plugins/vince/pulse works
 * when Express passes req.path without the /api prefix. Run after bun install (e.g. in Dockerfile).
 */
const fs = require("fs");
const path = require("path");

const file = path.join(
  __dirname,
  "..",
  "node_modules",
  "@elizaos",
  "server",
  "dist",
  "index.js"
);

if (!fs.existsSync(file)) {
  console.warn("patch-elizaos-server-plugin-routes: file not found, skipping");
  process.exit(0);
}

let s = fs.readFileSync(file, "utf8");
const alreadyPatched = s.includes("(?:\\/api)?\\/agents\\/");
const unpatched =
  'reqPath.replace(/\\/api\\/agents\\/[^\\/]+\\/plugins/, "")';
const patched =
  'reqPath.replace(/(?:\\/api)?\\/agents\\/[^\\/]+\\/plugins/, "")';

if (alreadyPatched) {
  console.log("patch-elizaos-server-plugin-routes: already patched");
  process.exit(0);
}
if (!s.includes(unpatched)) {
  console.warn("patch-elizaos-server-plugin-routes: pattern not found, skipping");
  process.exit(0);
}

s = s.replace(unpatched, patched);

// Include all running runtimes in GET /api/agents (e.g. Kelly) even if not yet in DB
const agentsListUnpatched =
  "const allAgents = await db.getAgents();\n      const runtimes = elizaOS.getAgents().map((a) => a.agentId);\n      const response = allAgents.map((agent) => ({";
const agentsListPatched =
  "const allAgents = await db.getAgents();\n      const runtimesList = elizaOS.getAgents();\n      const runtimes = runtimesList.map((a) => a.agentId);\n      const dbIds = new Set(allAgents.map((a) => a.id));\n      for (const r of runtimesList) {\n        if (r.agentId && !dbIds.has(r.agentId)) {\n          allAgents.push({\n            id: r.agentId,\n            name: r.character?.name ?? \"\",\n            bio: r.character?.bio ?? []\n          });\n          dbIds.add(r.agentId);\n        }\n      }\n      const response = allAgents.map((agent) => ({";
if (s.includes(agentsListPatched)) {
  // already applied
} else if (s.includes(agentsListUnpatched)) {
  s = s.replace(agentsListUnpatched, agentsListPatched);
  console.log("patch-elizaos-server-plugin-routes: agents-list merge applied");
}

// Pre-create all agent records in DB so they appear in GET /api/agents even if runtime fails to start (e.g. Kelly)
const startAgentsUnpatched =
  "});\n    const agentIds = await this.elizaOS.addAgents(agentConfigs, options);";
const startAgentsPatched =
  "});\n    if (this.database) {\n      for (const cfg of agentConfigs) {\n        const id = cfg.character.id;\n        try {\n          const existing = await this.database.getAgent(id);\n          if (!existing) {\n            await this.database.createAgent({\n              id,\n              name: cfg.character.name || \"\",\n              bio: cfg.character.bio ?? []\n            });\n            logger34.debug({ src: \"db\", agentId: id, agentName: cfg.character.name }, \"Agent pre-created in database\");\n          }\n        } catch (e) {\n          logger34.warn({ src: \"db\", agentId: id, error: e?.message }, \"Pre-create agent in DB skipped\");\n        }\n      }\n    }\n    const agentIds = await this.elizaOS.addAgents(agentConfigs, options);";
if (s.includes(startAgentsPatched)) {
  // already applied
} else if (s.includes(startAgentsUnpatched)) {
  s = s.replace(startAgentsUnpatched, startAgentsPatched);
  console.log("patch-elizaos-server-plugin-routes: startAgents pre-create applied");
}

fs.writeFileSync(file, s);
console.log("patch-elizaos-server-plugin-routes: applied");
