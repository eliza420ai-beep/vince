import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { VincePostMortemPolicyLoopService } from "../services/vincePostMortemPolicyLoop.service";

let tmpDir: string;
let prevCwd: string;

function makePostmortemRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    date: "2026-03-04",
    file: "docs/standup/post-mortems/2026-03-04-BTC-post-mortem.md",
    adaptationEligible: true,
    proposedPolicyDelta: {
      confidence: 0.8,
      sampleSizeHint: 20,
      maxStepChangePct: 20,
      expiresAtUtc: new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      riskIntent: {
        stopToAtrMin: 1.2,
        maxLeverageByAssetClass: { crypto: 8 },
        maxSingleTradeUsd: 4000,
        enforcePreTradeRiskCheck: true,
      },
      validationPlan: {
        windowTrades: 2,
        targetMetrics: {
          maxBudgetBreachRate: 0.5,
          minExpectancyUsd: -100,
          maxDrawdownPct: 25,
        },
        rollbackTriggers: ["expectancy_usd_degrades"],
      },
    },
    ...overrides,
  };
}

function writePostmortemsJsonl(rows: Array<Record<string, unknown>>): void {
  const outDir = path.join(
    process.cwd(),
    ".elizadb",
    "vince-paper-bot",
    "postmortems",
  );
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, "postmortems.jsonl"),
    rows.map((r) => JSON.stringify(r)).join("\n") + "\n",
    "utf-8",
  );
}

beforeEach(() => {
  prevCwd = process.cwd();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "pm-policy-loop-test-"));
  process.chdir(tmpDir);
});

afterEach(() => {
  process.chdir(prevCwd);
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("VincePostMortemPolicyLoopService", () => {
  it("creates and promotes a candidate after validation window passes", () => {
    writePostmortemsJsonl([makePostmortemRow()]);
    const svc = new VincePostMortemPolicyLoopService({} as any);

    svc.refreshFromPostMortems();
    expect(svc.getStatus().hasCandidate).toBe(true);
    expect(svc.getEffectiveOverlay().maxSingleTradeUsd).toBe(4000);

    svc.recordClosedTrade({ realizedPnlUsd: 25, budgetBreach: false });
    svc.recordClosedTrade({ realizedPnlUsd: 30, budgetBreach: false });
    svc.recordClosedTrade({ realizedPnlUsd: 15, budgetBreach: false });
    svc.recordClosedTrade({ realizedPnlUsd: 20, budgetBreach: false });
    svc.recordClosedTrade({ realizedPnlUsd: 10, budgetBreach: false });

    expect(svc.getStatus().hasCandidate).toBe(false);
    expect(svc.getPolicyVersionTag()).not.toBe("baseline");
  });

  it("rolls back candidate when target metrics fail", () => {
    const row = makePostmortemRow({
      proposedPolicyDelta: {
        confidence: 0.8,
        sampleSizeHint: 20,
        maxStepChangePct: 20,
        expiresAtUtc: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        riskIntent: {
          maxLeverageByAssetClass: { crypto: 8 },
          enforcePreTradeRiskCheck: true,
        },
        validationPlan: {
          windowTrades: 2,
          targetMetrics: {
            minExpectancyUsd: 10,
          },
          rollbackTriggers: ["expectancy_below_target"],
        },
      },
    });
    writePostmortemsJsonl([row]);
    const svc = new VincePostMortemPolicyLoopService({} as any);

    svc.refreshFromPostMortems();
    expect(svc.getStatus().hasCandidate).toBe(true);

    svc.recordClosedTrade({ realizedPnlUsd: -50, budgetBreach: true });
    svc.recordClosedTrade({ realizedPnlUsd: -20, budgetBreach: false });
    svc.recordClosedTrade({ realizedPnlUsd: -15, budgetBreach: false });
    svc.recordClosedTrade({ realizedPnlUsd: -10, budgetBreach: false });
    svc.recordClosedTrade({ realizedPnlUsd: -8, budgetBreach: false });

    expect(svc.getStatus().hasCandidate).toBe(false);
    expect(svc.getPolicyVersionTag()).toBe("baseline");
  });

  it("tightens overlay when repeated equity sizing_too_aggressive is present", () => {
    const baseRow = makePostmortemRow({
      asset: "CRCL",
      assetClass: "equity",
      primaryCause: "sizing_too_aggressive",
      proposedPolicyDelta: {
        confidence: 0.8,
        sampleSizeHint: 20,
        maxStepChangePct: 20,
        expiresAtUtc: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        riskIntent: {
          maxLeverageByAssetClass: { equity: 8 },
          maxSingleTradeUsd: 5000,
          stopToAtrMin: 1.2,
          enforcePreTradeRiskCheck: true,
        },
        validationPlan: {
          windowTrades: 5,
          targetMetrics: {},
          rollbackTriggers: [],
        },
      },
    });
    writePostmortemsJsonl([baseRow, { ...baseRow }]);
    const svc = new VincePostMortemPolicyLoopService({} as any);

    svc.refreshFromPostMortems();
    const overlay = svc.getEffectiveOverlay();

    expect(overlay.maxLeverageByAssetClass?.equity).toBeLessThanOrEqual(8);
    if (overlay.maxSingleTradeUsd != null) {
      expect(overlay.maxSingleTradeUsd).toBeLessThanOrEqual(5000);
    }
  });
});
