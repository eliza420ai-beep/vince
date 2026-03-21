import { useEffect, useMemo, useState } from "react";
import { resolveUsdMarksForTickers } from "@/shared/pasteTradeMarks";

const POLL_MS = 45_000;

/**
 * Poll Hyperliquid (+ CoinGecko fallback) for USD mids keyed by normalized ticker.
 */
export function usePasteTradeLiveMarksMap(
  enabled: boolean,
  tickers: string[],
): Record<string, number> | null {
  const key = useMemo(
    () =>
      [...new Set(tickers.map((t) => t.trim()).filter(Boolean))]
        .sort()
        .join(","),
    [tickers],
  );

  const [map, setMap] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    if (!enabled || !key) {
      setMap(null);
      return;
    }
    const list = key.split(",").filter(Boolean);
    let cancelled = false;
    const run = async () => {
      try {
        const m = await resolveUsdMarksForTickers(list);
        if (cancelled) return;
        const flat: Record<string, number> = {};
        for (const [k, v] of Object.entries(m)) flat[k] = v.usd;
        setMap(flat);
      } catch {
        if (!cancelled) setMap(null);
      }
    };
    void run();
    const id = setInterval(() => void run(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, key]);

  return map;
}
