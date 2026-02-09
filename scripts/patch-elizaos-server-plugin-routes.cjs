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

if (!alreadyPatched && s.includes(unpatched)) {
  s = s.replace(unpatched, patched);
  console.log("patch-elizaos-server-plugin-routes: plugin route fix applied");
} else if (alreadyPatched) {
  // plugin route already applied, continue to other patches
}

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

// Submit fallback: when central_messages insert fails, broadcast via socket and return 201 so reply reaches UI
const submitCatchUnpatched =
  '} catch (error) {\n      logger11.error({\n        src: "http",\n        path: "/submit",\n        channelId: channel_id,\n        error: error instanceof Error ? error.message : String(error)\n      }, "Error submitting agent message");\n      res.status(500).json({ success: false, error: "Failed to submit agent message" });\n    }';
const submitCatchPatched = `} catch (error) {
      const fallbackId = messageId || crypto.randomUUID();
      if (serverInstance.socketIO) {
        serverInstance.socketIO.to(channel_id).emit("messageBroadcast", {
          senderId: author_id,
          senderName: metadata?.agentName || "Agent",
          text: content,
          roomId: channel_id,
          serverId: message_server_id,
          createdAt: Date.now(),
          source: source_type || "agent_response",
          id: fallbackId,
          thought: raw_message?.thought,
          actions: raw_message?.actions,
          attachments: transformedAttachments
        });
      }
      res.status(201).json({ success: true, data: { id: fallbackId, createdAt: new Date().toISOString(), sourceType: source_type || "agent_response" } });
      logger11.error({
        src: "http",
        path: "/submit",
        channelId: channel_id,
        error: error instanceof Error ? error.message : String(error)
      }, "Error submitting agent message");
    }`;
if (s.includes("submit central_messages fallback") || s.includes("const fallbackId = messageId || crypto.randomUUID()")) {
  // already applied
} else if (s.includes('res.status(500).json({ success: false, error: "Failed to submit agent message" });')) {
  s = s.replace(submitCatchUnpatched, submitCatchPatched);
  const attBeforeTry = 'return res.status(400).json({ success: false, error: "Invalid messageId format" });\n    }\n    try {';
  const attMoved = 'return res.status(400).json({ success: false, error: "Invalid messageId format" });\n    }\n    const transformedAttachments = attachmentsToApiUrls(metadata?.attachments ?? raw_message?.attachments);\n    try {';
  const attRemove = "const createdMessage = await serverInstance.createMessage(newRootMessageData);\n      const transformedAttachments = attachmentsToApiUrls(metadata?.attachments ?? raw_message?.attachments);";
  const attKeep = "const createdMessage = await serverInstance.createMessage(newRootMessageData);";
  if (s.includes(attRemove)) {
    s = s.replace(attBeforeTry, attMoved).replace(attRemove, attKeep);
  }
  console.log("patch-elizaos-server-plugin-routes: submit central_messages fallback applied");
}

fs.writeFileSync(file, s);
console.log("patch-elizaos-server-plugin-routes: applied");
