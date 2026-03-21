/**
 * paste.trade API snapshots include `theses` + `trades` with P&amp;L. Local-only
 * runs never poll the API, so we persist a compatible shape for leaderboard UI.
 */
export function buildLocalLeaderboardSnapshot(
  thesesForSave: Record<string, unknown>[],
): Record<string, unknown> {
  const trades: Record<string, unknown>[] = [];
  for (const th of thesesForSave) {
    const who = Array.isArray(th.who) ? th.who : [];
    for (const w of who) {
      if (!w || typeof w !== "object") continue;
      const o = w as Record<string, unknown>;
      const ticker = typeof o.ticker === "string" ? o.ticker.trim() : "";
      const direction =
        typeof o.direction === "string" ? o.direction.trim() : "";
      if (!ticker && !direction) continue;
      trades.push({
        ticker,
        direction,
        local_extract_only: true,
      });
    }
  }
  return {
    local_only: true,
    theses: thesesForSave,
    trades,
  };
}
