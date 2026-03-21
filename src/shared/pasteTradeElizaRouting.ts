/**
 * Contract for paste.trade URLs vs @elizaos/server plugin routing.
 *
 * createPluginRouteHandler sets:
 *   baselessReqPath = reqPath.replace(/(?:\/api)?\/agents\/[^/]+\/plugins/, "")
 * then matches baselessReqPath to each **runtime** route.path (path-to-regexp).
 *
 * ElizaOS core registers plugin routes as `/${plugin.name}${route.path}` (see AgentRuntime.registerPlugin).
 * plugin-vince defines `path: "/vince/paste-trade/runs"` → runtime path is
 * `/plugin-vince/vince/paste-trade/runs`. HTTP must therefore be:
 *   /api/agents/:id/plugins/plugin-vince/vince/paste-trade/runs
 * not `.../plugins/vince/paste-trade/...` (that baseless path never matches).
 *
 * Inner Express router: req.path is /agents/:id/plugins/... (no /api). Repo patch:
 * scripts/patch-elizaos-server-plugin-routes.cjs — SPA skip + plugin handler order, etc.
 */

/** Same pattern as @elizaos/server dist (createPluginRouteHandler baselessReqPath). */
export const ELIZA_STRIP_AGENTS_PLUGINS_PREFIX_RE =
  /(?:\/api)?\/agents\/[^/]+\/plugins/;

/** Path only (Express req.path has no ?query); strips ?/# if present for tests. */
export function elizaPluginBaselessPath(reqPath: string): string {
  const pathOnly = reqPath.split("?")[0]?.split("#")[0] ?? reqPath;
  return pathOnly.replace(ELIZA_STRIP_AGENTS_PLUGINS_PREFIX_RE, "");
}

/** Path between /api/agents/:agentId and /runs, /run, /handoff (matches runtime route prefix). */
export const PASTE_TRADE_PLUGINS_PATH_PREFIX =
  "/plugins/plugin-vince/vince/paste-trade" as const;

/**
 * Pathname (no origin, no query) for a paste.trade API call.
 * @param subpath e.g. "/runs", "/run?runId=x", "/handoff?runId=x"
 */
export function buildPasteTradeApiPathname(
  agentId: string,
  subpath: string,
): string {
  const s = subpath.startsWith("/") ? subpath : `/${subpath}`;
  return `/api/agents/${agentId}${PASTE_TRADE_PLUGINS_PATH_PREFIX}${s}`;
}
