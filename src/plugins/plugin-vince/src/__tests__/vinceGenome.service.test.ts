import { describe, it, expect } from "vitest";
import { VinceGenomeService } from "../services/vinceGenome.service";
import { createMockRuntime } from "./test-utils";

describe("VinceGenomeService integration", () => {
  it("blocks promotion when War Room tail gate fails", async () => {
    const runtime = createMockRuntime({
      services: {
        VINCE_WAR_ROOM_SERVICE: {
          compareIncumbentVsCandidate: () => ({
            pass: false,
            incumbentP05: -5,
            candidateP05: -8,
            incumbent: {
              p01: -9,
              p05: -5,
              median: 3,
              sampleSize: 20,
              runs: 1000,
            },
            candidate: {
              p01: -11,
              p05: -8,
              median: 5,
              sampleSize: 20,
              runs: 1000,
            },
            rationale: "candidate tail worse",
          }),
        },
        VINCE_DEVILS_ADVOCATE_SERVICE: {
          challengeGenome: () => ({
            pass: false,
            robustnessScore: 0.4,
            rationale: "fragile across dimensions",
          }),
        },
      },
    });

    const svc = await VinceGenomeService.start(runtime);
    (svc as any).loadFeatureHistory = async () => new Array(20).fill({}); // >= MIN_TRADES_FOR_EVAL
    (svc as any).generateMutations = () => [
      {
        id: "cand-1",
        generation: 1,
        params: { ...(svc as any).state.currentGenome.params },
        regimeOverrides: {},
        parentId: "genesis",
        mutationDescription: "test",
        createdAt: Date.now(),
      },
    ];
    (svc as any).replay = (genome: { id: string }) =>
      genome.id === "genesis"
        ? {
            genomeId: "genesis",
            totalTrades: 20,
            wins: 10,
            losses: 10,
            winRate: 50,
            totalPnlPct: 2,
            sharpe: 1,
            maxDrawdownPct: 5,
            avgHoldingMinutes: 60,
            fitness: 1,
          }
        : {
            genomeId: "cand-1",
            totalTrades: 20,
            wins: 14,
            losses: 6,
            winRate: 70,
            totalPnlPct: 8,
            sharpe: 2,
            maxDrawdownPct: 4,
            avgHoldingMinutes: 55,
            fitness: 2,
          };
    (svc as any).save = async () => {};
    (svc as any).appendHistoryLine = async () => {};

    const result = await svc.evolve();
    expect(result.promoted).toBe(false);
    expect(result.warRoom?.pass).toBe(false);
    expect(result.devilAdvocate?.pass).toBe(false);
    expect(result.promotionReason).toContain("war-room rejection");
  });

  it("promotes when fitness passes and War Room tail gate passes", async () => {
    const runtime = createMockRuntime({
      services: {
        VINCE_WAR_ROOM_SERVICE: {
          compareIncumbentVsCandidate: () => ({
            pass: true,
            incumbentP05: -6,
            candidateP05: -4,
            incumbent: {
              p01: -10,
              p05: -6,
              median: 2,
              sampleSize: 20,
              runs: 1000,
            },
            candidate: {
              p01: -8,
              p05: -4,
              median: 5,
              sampleSize: 20,
              runs: 1000,
            },
            rationale: "candidate tail better",
          }),
        },
        VINCE_DEVILS_ADVOCATE_SERVICE: {
          challengeGenome: () => ({
            pass: true,
            robustnessScore: 0.8,
            rationale: "candidate robust enough",
          }),
        },
      },
    });

    const svc = await VinceGenomeService.start(runtime);
    (svc as any).loadFeatureHistory = async () => new Array(20).fill({});
    (svc as any).generateMutations = () => [
      {
        id: "cand-2",
        generation: 1,
        params: { ...(svc as any).state.currentGenome.params },
        regimeOverrides: {},
        parentId: "genesis",
        mutationDescription: "test",
        createdAt: Date.now(),
      },
    ];
    (svc as any).replay = (genome: { id: string }) =>
      genome.id === "genesis"
        ? {
            genomeId: "genesis",
            totalTrades: 20,
            wins: 10,
            losses: 10,
            winRate: 50,
            totalPnlPct: 2,
            sharpe: 1,
            maxDrawdownPct: 5,
            avgHoldingMinutes: 60,
            fitness: 1,
          }
        : {
            genomeId: "cand-2",
            totalTrades: 20,
            wins: 14,
            losses: 6,
            winRate: 70,
            totalPnlPct: 8,
            sharpe: 2,
            maxDrawdownPct: 4,
            avgHoldingMinutes: 55,
            fitness: 2,
          };
    (svc as any).save = async () => {};
    (svc as any).appendHistoryLine = async () => {};

    const result = await svc.evolve();
    expect(result.promoted).toBe(true);
    expect(result.promotedGenomeId).toBe("cand-2");
    expect(result.warRoom?.pass).toBe(true);
    expect(result.devilAdvocate?.pass).toBe(true);
  });
});
