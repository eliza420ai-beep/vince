/**
 * Locks paste.trade HTTP shape to @elizaos/server plugin matching (baseless path + path-to-regexp).
 * Run: bun test src/plugins/plugin-vince/src/__tests__/pasteTradeElizaRouting.test.ts
 */

import { describe, expect, it } from "bun:test";
import { match } from "path-to-regexp";
import { vincePlugin } from "../index.ts";
import {
  ELIZA_STRIP_AGENTS_PLUGINS_PREFIX_RE,
  PASTE_TRADE_PLUGINS_PATH_PREFIX,
  buildPasteTradeApiPathname,
  elizaPluginBaselessPath,
} from "@/shared/pasteTradeElizaRouting";
import { handlePostPasteTradeRuns } from "../../../plugin-paste-trade/src/routes/pasteTradeRoutes.ts";
import type { IAgentRuntime } from "@elizaos/core";

const SAMPLE_AGENT_ID = "aaaaaaaa-bbbb-4ccc-dddd-eeeeeeeeeeee";

/** Runtime path after ElizaOS prefixes `/${plugin.name}` (plugin-vince). */
function runtimePasteRoutePath(sourcePath: string): string {
  return `/plugin-vince${sourcePath}`;
}

/**
 * After `scripts/patch-elizaos-server-plugin-routes.cjs`, matches createPluginRouteHandler:
 * /agents/:id/plugins/* must NOT be skipped (inner /api router uses req.path without /api prefix).
 * Agent segment is any non-empty path segment (`[^/]+`), not only strict UUID length.
 */
function pluginHandlerWouldSkipForSpa(reqPath: string): boolean {
  const clientRoutePattern =
    /^\/(chat|settings|profile|dashboard|login|register|admin|home|about)\b/i;
  if (clientRoutePattern.test(reqPath)) return true;
  if (
    /^\/agents\b/i.test(reqPath) &&
    !/^\/agents\/[^/]+\/plugins\//i.test(reqPath)
  ) {
    return true;
  }
  return false;
}

function findPasteTradeRoutes() {
  const routes = vincePlugin.routes ?? [];
  return routes.filter((r) => String(r.name).startsWith("vince-paste-trade-"));
}

function mockRes(): {
  statusCode: number;
  body: object | undefined;
  status: (n: number) => { json: (o: object) => void };
  json: (o: object) => void;
} {
  const res: {
    statusCode: number;
    body: object | undefined;
    status: (n: number) => { json: (o: object) => void };
    json: (o: object) => void;
  } = {
    statusCode: 0,
    body: undefined,
    status: (n: number) => ({
      json: (o: object) => {
        res.statusCode = n;
        res.body = o;
      },
    }),
    json: (o: object) => {
      res.body = o;
    },
  };
  return res;
}

function serverWouldMatchRoute(opts: {
  fullReqPath: string;
  method: string;
  routePath: string;
  routeType: string;
}): boolean {
  if (opts.method.toLowerCase() !== opts.routeType.toLowerCase()) return false;
  const baseless = elizaPluginBaselessPath(opts.fullReqPath);
  const matcher = match(opts.routePath, { decode: decodeURIComponent });
  return Boolean(matcher(baseless));
}

describe("paste.trade Eliza routing contract", () => {
  it("registers four vince paste-trade routes with /vince/paste-trade paths", () => {
    const paste = findPasteTradeRoutes();
    expect(paste.length).toBe(4);
    const paths = new Set(paste.map((r) => r.path));
    expect(paths.has("/vince/paste-trade/runs")).toBe(true);
    expect(paths.has("/vince/paste-trade/run")).toBe(true);
    expect(paths.has("/vince/paste-trade/handoff")).toBe(true);
  });

  it("strip regex matches @elizaos/server (optional /api, one agent segment, /plugins)", () => {
    const p = `/api/agents/${SAMPLE_AGENT_ID}/plugins/plugin-vince/vince/paste-trade/runs`;
    expect(ELIZA_STRIP_AGENTS_PLUGINS_PREFIX_RE.test(p)).toBe(true);
    expect(elizaPluginBaselessPath(p)).toBe(
      "/plugin-vince/vince/paste-trade/runs",
    );
  });

  it("buildPasteTradeApiPathname + baseless matches runtime route.path for each method", () => {
    const paste = findPasteTradeRoutes();
    for (const r of paste) {
      const subpath =
        r.path === "/vince/paste-trade/runs"
          ? "/runs"
          : r.path === "/vince/paste-trade/run"
            ? "/run?runId=test"
            : r.path === "/vince/paste-trade/handoff"
              ? "/handoff?runId=test"
              : (() => {
                  throw new Error(`unexpected route ${r.name} ${r.path}`);
                })();
      const pathname = buildPasteTradeApiPathname(SAMPLE_AGENT_ID, subpath);
      const baseless = elizaPluginBaselessPath(pathname);
      const runtimePath = runtimePasteRoutePath(r.path);
      const matcher = match(runtimePath, { decode: decodeURIComponent });
      expect(matcher(baseless)).not.toBe(false);
    }
  });

  it("rejects wrong .../plugins/vince/paste-trade/... (missing plugin-vince prefix)", () => {
    const wrong = `/api/agents/${SAMPLE_AGENT_ID}/plugins/vince/paste-trade/runs`;
    expect(elizaPluginBaselessPath(wrong)).toBe("/vince/paste-trade/runs");
    const m = match("/plugin-vince/vince/paste-trade/runs", {
      decode: decodeURIComponent,
    });
    expect(m("/vince/paste-trade/runs")).toBe(false);
  });

  it("simulates server route loop: correct URL matches POST runtime paste-trade runs", () => {
    const full = buildPasteTradeApiPathname(SAMPLE_AGENT_ID, "/runs");
    const paste = findPasteTradeRoutes();
    const postRuns = paste.find(
      (r) => r.path === "/vince/paste-trade/runs" && r.type === "POST",
    );
    expect(postRuns).toBeDefined();
    expect(
      serverWouldMatchRoute({
        fullReqPath: full,
        method: "POST",
        routePath: runtimePasteRoutePath(postRuns!.path),
        routeType: postRuns!.type,
      }),
    ).toBe(true);
  });

  it("root plugin req.path /api/... is not skipped by patched SPA logic", () => {
    const full = buildPasteTradeApiPathname(SAMPLE_AGENT_ID, "/runs");
    expect(pluginHandlerWouldSkipForSpa(full)).toBe(false);
  });

  it("inner /api router req.path /agents/:id/plugins/... is not skipped (patch-elizaos-server-plugin-routes)", () => {
    const innerPath = `/agents/${SAMPLE_AGENT_ID}/plugins/plugin-vince/vince/paste-trade/runs`;
    expect(pluginHandlerWouldSkipForSpa(innerPath)).toBe(false);
  });

  it("inner /agents/.../plugins/... is not skipped even when agent segment is not 36-char uuid", () => {
    const innerPath =
      "/agents/short-id/plugins/plugin-vince/vince/paste-trade/runs";
    expect(pluginHandlerWouldSkipForSpa(innerPath)).toBe(false);
  });

  it("bare /agents SPA paths are still skipped", () => {
    expect(pluginHandlerWouldSkipForSpa("/agents")).toBe(true);
    expect(pluginHandlerWouldSkipForSpa("/agents/")).toBe(true);
    expect(pluginHandlerWouldSkipForSpa("/agents/foo/bar")).toBe(true);
  });

  it("PASTE_TRADE_PLUGINS_PATH_PREFIX is stable", () => {
    expect(PASTE_TRADE_PLUGINS_PATH_PREFIX).toBe(
      "/plugins/plugin-vince/vince/paste-trade",
    );
  });

  it("handlePostPasteTradeRuns returns 503 when key missing (not a 404 / missing route)", async () => {
    const prevK = process.env.PASTE_TRADE_KEY;
    const prevA = process.env.PASTE_TRADE_API_KEY;
    try {
      delete process.env.PASTE_TRADE_KEY;
      delete process.env.PASTE_TRADE_API_KEY;
      const res = mockRes();
      const req = {
        body: { url: "https://example.com" },
        query: {},
        params: {},
      };
      const runtime = {
        agentId: SAMPLE_AGENT_ID,
        getSetting: () => null,
        getTaskWorker: () => null,
      } as unknown as IAgentRuntime;
      await handlePostPasteTradeRuns(req as never, res as never, runtime);
      expect(res.statusCode).toBe(503);
      expect(String((res.body as { error?: string }).error ?? "")).toContain(
        "PASTE_TRADE_KEY",
      );
    } finally {
      if (prevK !== undefined) process.env.PASTE_TRADE_KEY = prevK;
      else delete process.env.PASTE_TRADE_KEY;
      if (prevA !== undefined) process.env.PASTE_TRADE_API_KEY = prevA;
      else delete process.env.PASTE_TRADE_API_KEY;
    }
  });
});
