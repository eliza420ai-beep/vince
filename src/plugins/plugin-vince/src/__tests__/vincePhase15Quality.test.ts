import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { VinceXSourceAttributionService } from "../services/vinceXSourceAttribution.service";

function mkTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "vince-p15-"));
}

describe("Phase 15 quality hardening", () => {
  it("emits sufficiency blockers as machine-readable tasks", () => {
    const dir = mkTempDir();
    const svc = new VinceXSourceAttributionService(dir);
    const now = Date.now();
    const records = Array.from({ length: 6 }).map((_, i) => ({
      tradeId: `t-${i}`,
      asset: "BTC",
      direction: "long",
      openedAt: new Date(now - i * 60_000).toISOString(),
      openedAtMs: now - i * 60_000,
      sourceClusters: ["x_research"],
      confidence: 70,
      regime: "trending",
      gateStack: {
        ruleBased: true,
        onnxEnabled: true,
        swarmEnabled: false,
        adversaryEnabled: false,
      },
      closedAt: new Date(now - i * 60_000 + 30_000).toISOString(),
      closedAtMs: now - i * 60_000 + 30_000,
      pnl: i % 2 === 0 ? 20 : -10,
      pnlPct: i % 2 === 0 ? 0.2 : -0.1,
      outcome: i % 2 === 0 ? "win" : "loss",
    }));
    fs.writeFileSync(
      path.join(dir, "trade-attribution.jsonl"),
      records.map((r) => JSON.stringify(r)).join("\n") + "\n",
      "utf-8",
    );

    const suff = svc.getSufficiencySnapshot(30);
    expect(suff.grade).toBe("LOW");
    const tasks = svc.getSufficiencyTasks(30);
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks[0]).toHaveProperty("blocker");
  });

  it("keeps source-quality recommendations stable across noisy windows", () => {
    const dir = mkTempDir();
    const svc = new VinceXSourceAttributionService(dir);
    for (let i = 0; i < 24; i += 1) {
      svc.recordOpen(
        `t${i}`,
        i % 2 === 0 ? "BTC" : "ETH",
        "long",
        ["x_research"],
        70,
        {
          sourceLineage: ["x_research"],
          regime: i % 3 === 0 ? "trending" : "range",
          gateStack: {
            ruleBased: true,
            onnxEnabled: true,
            swarmEnabled: true,
            adversaryEnabled: false,
          },
        },
      );
      svc.recordClose(
        `t${i}`,
        i % 4 === 0 ? 30 : -5,
        i % 4 === 0 ? "win" : "loss",
        {
          pnlPct: i % 4 === 0 ? 0.3 : -0.05,
        },
      );
    }
    const snapA = svc.getSourceQualitySnapshot(30);
    const snapB = svc.getSourceQualitySnapshot(30);
    expect(snapA.sources[0]?.recommendedWeightMultiplier).toBe(
      snapB.sources[0]?.recommendedWeightMultiplier,
    );
  });
});
