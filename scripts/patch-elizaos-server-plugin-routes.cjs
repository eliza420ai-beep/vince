#!/usr/bin/env node
/**
 * Apply plugin-route fixes to @elizaos/server:
 * 1) Strip (?:/api)?/agents/:id/plugins for baseless path matching (inner /api router has no /api on req.path).
 * 2) Do not treat /agents/:uuid/plugins/... as an SPA skip — clientRoutePattern used to match /^\/agents\b/
 *    on those paths and next() before any plugin route ran → generic "API endpoint not found" 404
 *    (paste.trade, vince/*, etc.).
 * 3) In createApiRouter, run createPluginRouteHandler immediately after /auth and before /agents, and
 *    remove the duplicate handler that was at the end of the router — otherwise /agents/* requests may
 *    never reach the trailing plugin middleware.
 * 4) Plugin handler: prefer agent id from URL .../agents/:id/plugins/... before ?agentId=; decouple
 *    else-if chain so a query-scoped agent with no matching route still runs the global runtime scan.
 * 5) SPA skip for /agents uses /agents/[^/]+/plugins/ (not only 36-char uuid-shaped ids).
 * Run after bun install (postinstall / predev / Dockerfile).
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

// Fix bcrypt: @elizaos/server bundle has hardcoded Linux path from build machine; resolve from actual node_modules (hoisted at root)
const bcryptBad =
  'var __dirname = "/home/runner/work/eliza/eliza/node_modules/bcrypt";\n  var path7 = __require("path");\n  var bindings = require_node_gyp_build2()(path7.resolve(__dirname));';
const bcryptGood =
  'var path7 = __require("path");\n  var __dirname = path7.join(path7.dirname(__require("url").fileURLToPath(import.meta.url)), "../../../bcrypt");\n  var bindings = require_node_gyp_build2()(path7.resolve(__dirname));';
const bcryptWrongDepth = 'path7.join(path7.dirname(__require("url").fileURLToPath(import.meta.url)), "../../bcrypt")';
const bcryptRightDepth = 'path7.join(path7.dirname(__require("url").fileURLToPath(import.meta.url)), "../../../bcrypt")';
if (s.includes(bcryptGood)) {
  // already applied with correct depth
} else if (s.includes(bcryptBad)) {
  s = s.replace(bcryptBad, bcryptGood);
  console.log("patch-elizaos-server-plugin-routes: bcrypt path fix applied");
} else if (s.includes(bcryptWrongDepth)) {
  s = s.replace(bcryptWrongDepth, bcryptRightDepth);
  console.log("patch-elizaos-server-plugin-routes: bcrypt path depth fix applied");
}

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

// If DB-backed getAgents() fails, fall back to the live runtime registry so the
// frontend can still leave the loading screen.
const agentsListDbFallbackUnpatched =
  'const allAgents = await db.getAgents();\n      const runtimesList = elizaOS.getAgents();';
const agentsListDbFallbackPatched =
  'let allAgents = [];\n      try {\n        allAgents = await db.getAgents();\n      } catch (error) {\n        logger.error({ src: "http", error }, "DB getAgents failed, falling back to runtime agents");\n      }\n      const runtimesList = elizaOS.getAgents();';
if (s.includes(agentsListDbFallbackPatched)) {
  // already applied
} else if (s.includes(agentsListDbFallbackUnpatched)) {
  s = s.replace(agentsListDbFallbackUnpatched, agentsListDbFallbackPatched);
  console.log("patch-elizaos-server-plugin-routes: agents-list DB fallback applied");
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

// Plugin handler: inner createApiRouter uses req.path like /agents/:uuid/plugins/... (no /api).
// clientRoutePattern included "agents" and /^\/agents\b/ matched those API paths → skip → 404.
const clientRouteOld =
  'const clientRoutePattern = /^\\/(chat|settings|agents|profile|dashboard|login|register|admin|home|about)\\b/i;\n    if (clientRoutePattern.test(req.path)) {\n      logger38.debug({ src: "http", path: req.path }, "Skipping client-side route in plugin handler");\n      return next();\n    }';
const clientRouteNew =
  'const clientRoutePattern = /^\\/(chat|settings|profile|dashboard|login|register|admin|home|about)\\b/i;\n    if (clientRoutePattern.test(req.path)) {\n      logger38.debug({ src: "http", path: req.path }, "Skipping client-side route in plugin handler");\n      return next();\n    }\n    if (/^\\/agents\\b/i.test(req.path) && !/^\\/agents\\/[^/]+\\/plugins\\//i.test(req.path)) {\n      logger38.debug({ src: "http", path: req.path }, "Skipping client-side /agents SPA in plugin handler");\n      return next();\n    }';
if (s.includes("Skipping client-side /agents SPA in plugin handler")) {
  // already applied
} else if (s.includes(clientRouteOld)) {
  s = s.replace(clientRouteOld, clientRouteNew);
  console.log("patch-elizaos-server-plugin-routes: clientRoutePattern /agents+plugins fix applied");
}

// createApiRouter registered createPluginRouteHandler AFTER router.use("/agents", ...). Unmatched
// /agents/:id/plugins/* requests may never reach that handler → generic 404. Run the plugin handler
// right after /auth so plugin URLs are matched before the agents subtree.
const apiRouterAuthThenAgents =
  '  router.use("/auth", authRouter(serverInstance));\n  router.use("/agents", agentsRouter(elizaOS, serverInstance));';
const apiRouterAuthPluginAgents =
  '  router.use("/auth", authRouter(serverInstance));\n  router.use(createPluginRouteHandler(elizaOS));\n  router.use("/agents", agentsRouter(elizaOS, serverInstance));';
const apiRouterEndDuplicate =
  '  router.use("/system", systemRouter());\n  router.use(createPluginRouteHandler(elizaOS));\n  return router;';
const apiRouterEndSystemOnly =
  '  router.use("/system", systemRouter());\n  return router;';
const alreadyPluginBeforeAgents = s.includes(
  'router.use("/auth", authRouter(serverInstance));\n  router.use(createPluginRouteHandler(elizaOS));\n  router.use("/agents"',
);
if (!alreadyPluginBeforeAgents && s.includes(apiRouterAuthThenAgents)) {
  s = s.replace(apiRouterAuthThenAgents, apiRouterAuthPluginAgents);
  console.log(
    "patch-elizaos-server-plugin-routes: api router plugin-before-agents reorder applied",
  );
}
if (s.includes(apiRouterEndDuplicate)) {
  s = s.replace(apiRouterEndDuplicate, apiRouterEndSystemOnly);
  console.log(
    "patch-elizaos-server-plugin-routes: removed trailing duplicate plugin handler in api router",
  );
}

// Widen /agents/:id/plugins/ detection (SPA skip): agent ids are not always strict [a-f0-9-]{36}.
const spaSkipStrict =
  "!/^\\/agents\\/[a-f0-9-]{36}\\/plugins\\//i.test(req.path)";
const spaSkipLoose =
  "!/^\\/agents\\/[^/]+\\/plugins\\//i.test(req.path)";
if (s.includes(spaSkipStrict) && !s.includes(spaSkipLoose)) {
  s = s.replace(spaSkipStrict, spaSkipLoose);
  console.log(
    "patch-elizaos-server-plugin-routes: SPA skip uses any agent segment for /plugins/ paths",
  );
}

// Prefer agent id from URL path .../agents/:id/plugins/... before ?agentId=.
// Stock handler only consulted query first: wrong/stale ?agentId= (non-VINCE) skipped the route
// on the path agent and never fell through → generic "API endpoint not found" 404.
//
// Run global/invalid `!handled` fixes before inserting pathAgentMarker so fresh installs apply them
// (they used to be gated on !pathAgentMarker and never ran after resolution patch).

// Stock: final branch is `} else {` global match — gate with !handled before we decouple the chain.
const pluginGlobalElseLegacy =
  '    } else {\n      logger38.debug({ src: "http", path: reqPath }, "No valid agentId in query, trying global match");';
const pluginElseIfGlobalOnly =
  '    } else if (!handled) {\n      logger38.debug({ src: "http", path: reqPath }, "No valid agentId in query, trying global match");';
if (s.includes(pluginGlobalElseLegacy)) {
  s = s.replace(pluginGlobalElseLegacy, pluginElseIfGlobalOnly);
  console.log(
    "patch-elizaos-server-plugin-routes: plugin handler global branch gated with !handled",
  );
}

// Stock invalid branch: add !handled so path-first match does not run invalid branch incorrectly.
const pluginElseInvalidLegacy =
  '    } else if (agentIdFromQuery && !validateUuid25(agentIdFromQuery)) {\n      logger38.warn({ src: "http", agentId: agentIdFromQuery, path: reqPath }, "Invalid agent ID format");';
const pluginElseInvalidWithHandled =
  '    } else if (!handled && agentIdFromQuery && !validateUuid25(agentIdFromQuery)) {\n      logger38.warn({ src: "http", agentId: agentIdFromQuery, path: reqPath }, "Invalid agent ID format");';
if (s.includes(pluginElseInvalidLegacy)) {
  s = s.replace(pluginElseInvalidLegacy, pluginElseInvalidWithHandled);
  console.log(
    "patch-elizaos-server-plugin-routes: plugin handler invalid agentId branch gated with !handled",
  );
}

const pathAgentMarker = "Plugin route try path agentId";
const pluginHandlerPathVarsUnpatched =
  '    const reqPath = req.path;\n    const baselessReqPath = reqPath.replace(/(?:\\/api)?\\/agents\\/[^\\/]+\\/plugins/, "");';
const pluginHandlerPathVarsPatched =
  '    const reqPath = req.path;\n    const pathAgentIdFromUrlMatch = reqPath.match(/(?:\\/api)?\\/agents\\/([^\\/]+)\\/plugins\\//);\n    const pathAgentIdFromUrl = pathAgentIdFromUrlMatch?.[1];\n    const baselessReqPath = reqPath.replace(/(?:\\/api)?\\/agents\\/[^\\/]+\\/plugins/, "");';
if (!s.includes(pathAgentMarker) && s.includes(pluginHandlerPathVarsUnpatched)) {
  s = s.replace(pluginHandlerPathVarsUnpatched, pluginHandlerPathVarsPatched);
}

const pluginAgentResolutionUnpatched =
  '      return handled;\n    }\n    if (agentIdFromQuery && validateUuid25(agentIdFromQuery)) {\n      const runtime = elizaOS.getAgent(agentIdFromQuery);\n      if (runtime) {\n        logger38.debug({ src: "http", agentId: agentIdFromQuery, path: reqPath }, "Agent-scoped request from query");\n        handled = findRouteInRuntime(runtime);';
const pluginAgentResolutionPatched =
  '      return handled;\n    }\n    if (!handled && pathAgentIdFromUrl && validateUuid25(pathAgentIdFromUrl)) {\n      const runtimePathAgent = elizaOS.getAgent(pathAgentIdFromUrl);\n      if (runtimePathAgent) {\n        logger38.debug({ src: "http", agentId: pathAgentIdFromUrl, path: reqPath }, "Plugin route try path agentId");\n        handled = findRouteInRuntime(runtimePathAgent);\n      }\n    }\n    if (!handled && agentIdFromQuery && validateUuid25(agentIdFromQuery)) {\n      const runtime = elizaOS.getAgent(agentIdFromQuery);\n      if (runtime) {\n        logger38.debug({ src: "http", agentId: agentIdFromQuery, path: reqPath }, "Agent-scoped request from query");\n        handled = findRouteInRuntime(runtime);';

if (!s.includes(pathAgentMarker) && s.includes(pluginAgentResolutionUnpatched)) {
  s = s.replace(pluginAgentResolutionUnpatched, pluginAgentResolutionPatched);
  console.log(
    "patch-elizaos-server-plugin-routes: plugin handler prefers path agentId before query",
  );
}

// Break else-if chain so query-scoped agent with no matching route still runs global scan.
const pluginElseIfInvalidChained =
  '    } else if (!handled && agentIdFromQuery && !validateUuid25(agentIdFromQuery)) {\n      logger38.warn({ src: "http", agentId: agentIdFromQuery, path: reqPath }, "Invalid agent ID format");';
const pluginIfInvalidStandalone =
  '    }\n    if (!handled && agentIdFromQuery && !validateUuid25(agentIdFromQuery)) {\n      logger38.warn({ src: "http", agentId: agentIdFromQuery, path: reqPath }, "Invalid agent ID format");';
if (s.includes(pluginElseIfInvalidChained)) {
  s = s.replace(pluginElseIfInvalidChained, pluginIfInvalidStandalone);
  console.log(
    "patch-elizaos-server-plugin-routes: decoupled invalid agentId branch for global fallback",
  );
}

const pluginElseIfGlobalChained =
  '    } else if (!handled) {\n      logger38.debug({ src: "http", path: reqPath }, "No valid agentId in query, trying global match");';
const pluginIfGlobalStandalone =
  '    }\n    if (!handled) {\n      logger38.debug({ src: "http", path: reqPath }, "No valid agentId in query, trying global match");';
if (s.includes(pluginElseIfGlobalChained)) {
  s = s.replace(pluginElseIfGlobalChained, pluginIfGlobalStandalone);
  console.log(
    "patch-elizaos-server-plugin-routes: decoupled global plugin scan after query branch",
  );
}

fs.writeFileSync(file, s);
console.log("patch-elizaos-server-plugin-routes: applied");
