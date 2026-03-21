/**
 * Fails CI/local if @elizaos/server was not patched — the usual cause of paste.trade 404
 * ("API endpoint not found"). Run: `node scripts/patch-elizaos-server-plugin-routes.cjs`
 * (postinstall / predev). See pasteTradeElizaRouting.test.ts for URL shape.
 */

import { describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function repoRoot(): string {
  let d = __dirname;
  for (let i = 0; i < 12; i++) {
    const pkg = path.join(d, "package.json");
    if (fs.existsSync(pkg)) {
      try {
        const j = JSON.parse(fs.readFileSync(pkg, "utf8")) as { name?: string };
        if (j.name === "vince") return d;
      } catch {
        /* continue */
      }
    }
    d = path.dirname(d);
  }
  throw new Error("Could not find vince repo root");
}

const serverDist = path.join(
  repoRoot(),
  "node_modules",
  "@elizaos",
  "server",
  "dist",
  "index.js",
);

describe("@elizaos/server dist — paste.trade / plugin-route patches", () => {
  it("server bundle exists", () => {
    expect(fs.existsSync(serverDist)).toBe(true);
  });

  it("includes path-first plugin resolution (paste.trade 404 fix)", () => {
    const s = fs.readFileSync(serverDist, "utf8");
    expect(s).toContain("Plugin route try path agentId");
    expect(s).toContain("pathAgentIdFromUrlMatch");
  });

  it("strips (?:/api)?/agents/.../plugins for baseless path matching", () => {
    const s = fs.readFileSync(serverDist, "utf8");
    expect(s).toContain("(?:\\/api)?\\/agents\\/");
  });

  it("mounts createPluginRouteHandler before /agents in createApiRouter", () => {
    const s = fs.readFileSync(serverDist, "utf8");
    expect(s).toContain(
      'router.use("/auth", authRouter(serverInstance));\n  router.use(createPluginRouteHandler(elizaOS));\n  router.use("/agents"',
    );
  });

  it("does not leave duplicate trailing createPluginRouteHandler before return router", () => {
    const s = fs.readFileSync(serverDist, "utf8");
    const bad =
      'router.use("/system", systemRouter());\n  router.use(createPluginRouteHandler(elizaOS));\n  return router;';
    expect(s).not.toContain(bad);
  });

  it("SPA skip allows /agents/:id/plugins/* (any agent segment)", () => {
    const s = fs.readFileSync(serverDist, "utf8");
    expect(s).toContain("Skipping client-side /agents SPA in plugin handler");
    expect(s).toContain("[^/]+\\/plugins");
  });

  it("global plugin scan is standalone if (!handled), not stuck in else-if chain", () => {
    const s = fs.readFileSync(serverDist, "utf8");
    expect(s).toContain(
      'if (!handled) {\n      logger38.debug({ src: "http", path: reqPath }, "No valid agentId in query, trying global match");',
    );
  });
});
