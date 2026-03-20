import { describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  ingestPipelineOutputToPaperQueue,
  loadRecentXBookmarkPaperSignals,
  latestXBookmarkSignalByAsset,
  parseBookmarkDirection,
  stripPipelineTickerSymbol,
  xBookmarkAgeDecay,
} from "../utils/xBookmarksPaperQueue";

describe("xBookmarksPaperQueue", () => {
  it("stripPipelineTickerSymbol removes USDT and PERP", () => {
    expect(stripPipelineTickerSymbol("BTCUSDT")).toBe("BTC");
    expect(stripPipelineTickerSymbol("ETH-PERP")).toBe("ETH");
  });

  it("parseBookmarkDirection", () => {
    expect(parseBookmarkDirection("long")).toBe("long");
    expect(parseBookmarkDirection("SHORT")).toBe("short");
    expect(parseBookmarkDirection("buy")).toBe("long");
    expect(parseBookmarkDirection("flat")).toBeNull();
  });

  it("ingestPipelineOutputToPaperQueue appends finance meta", async () => {
    const tmp = path.join(process.cwd(), ".tmp-xbm-test-" + Date.now());
    const out = path.join(tmp, "out");
    const financeDir = path.join(out, "finance", "equities");
    await fs.mkdir(financeDir, { recursive: true });
    const meta = {
      tweet_id: "test-tweet-1",
      tweet_url: "https://x.com/x/status/1",
      category: "finance",
      subcategory: "equities",
      is_finance: true,
      ticker: "BTCUSDT",
      direction: "long",
      rationale: "Breakout retest",
      validation_passed: true,
      confidence: 0.9,
    };
    await fs.writeFile(
      path.join(financeDir, "u_2026-01-01_test-twee.meta.json"),
      JSON.stringify(meta),
      "utf-8",
    );
    const queue = path.join(tmp, "paper-signals.jsonl");
    const r = await ingestPipelineOutputToPaperQueue({
      cwd: process.cwd(),
      outputDir: out,
      queuePath: queue,
    });
    expect(r.appended).toBe(1);
    const raw = await fs.readFile(queue, "utf-8");
    const row = JSON.parse(raw.trim());
    expect(row.asset).toBe("BTC");
    expect(row.direction).toBe("long");
    expect(row.schemaVersion).toBe(1);

    const r2 = await ingestPipelineOutputToPaperQueue({
      cwd: process.cwd(),
      outputDir: out,
      queuePath: queue,
    });
    expect(r2.appended).toBe(0);

    await fs.rm(tmp, { recursive: true, force: true });
  });

  it("latestXBookmarkSignalByAsset picks newest", () => {
    const rows = [
      {
        schemaVersion: 1 as const,
        tweet_id: "a",
        asset: "ETH",
        direction: "short" as const,
        strength: 50,
        confidence: 50,
        rationale: "old",
        ingestedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        schemaVersion: 1 as const,
        tweet_id: "b",
        asset: "ETH",
        direction: "long" as const,
        strength: 55,
        confidence: 55,
        rationale: "new",
        ingestedAt: "2026-01-02T00:00:00.000Z",
      },
    ];
    const m = latestXBookmarkSignalByAsset(rows);
    expect(m.get("ETH")?.tweet_id).toBe("b");
  });

  it("xBookmarkAgeDecay fades toward TTL", () => {
    const now = Date.now();
    const fresh = new Date(now - 60_000).toISOString();
    expect(xBookmarkAgeDecay(fresh, 3600_000)).toBeGreaterThan(0.9);
    const stale = new Date(now - 3600_000).toISOString();
    expect(xBookmarkAgeDecay(stale, 3600_000)).toBe(0);
  });

  it("loadRecentXBookmarkPaperSignals filters by age", async () => {
    const tmp = path.join(process.cwd(), ".tmp-xbm-read-" + Date.now());
    const queue = path.join(tmp, "q.jsonl");
    await fs.mkdir(tmp, { recursive: true });
    const old = {
      schemaVersion: 1,
      tweet_id: "o",
      asset: "SOL",
      direction: "long",
      strength: 50,
      confidence: 50,
      rationale: "x",
      ingestedAt: "2020-01-01T00:00:00.000Z",
    };
    const neu = {
      schemaVersion: 1,
      tweet_id: "n",
      asset: "SOL",
      direction: "short",
      strength: 50,
      confidence: 50,
      rationale: "y",
      ingestedAt: new Date().toISOString(),
    };
    await fs.writeFile(
      queue,
      `${JSON.stringify(old)}\n${JSON.stringify(neu)}\n`,
      "utf-8",
    );
    const rows = await loadRecentXBookmarkPaperSignals({
      cwd: process.cwd(),
      maxAgeMs: 24 * 3600 * 1000,
      queuePath: queue,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.tweet_id).toBe("n");
    await fs.rm(tmp, { recursive: true, force: true });
  });
});
