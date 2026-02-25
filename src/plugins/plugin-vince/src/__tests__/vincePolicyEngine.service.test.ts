/**
 * Tests for VincePolicyEngineService — policy evaluation.
 * PRD: One Dream Phase 12 — Task #73
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  VincePolicyEngineService,
  type PolicyContext,
} from "../services/vincePolicyEngine.service";

let tmpDir: string;
let policyPath: string;

const POLICY_YAML = `version: "1.0"
policyId: "trading-v1"
effectiveDate: "2026-02-25"

rules:
  - id: "max-single-trade-usd"
    description: "Maximum single trade size regardless of signal strength"
    condition: "tradeSize > 500"
    action: "block"
    level: "hard"

  - id: "min-confidence-live"
    description: "Minimum signal confidence for any live trade"
    condition: "executionType == live AND confidence < 65"
    action: "block"
    level: "hard"

  - id: "circuit-breaker-check"
    description: "Halt all live trades when circuit breaker is active"
    condition: "circuitBreakerActive == true AND executionType == live"
    action: "block"
    level: "hard"

  - id: "paper-sentiment-gate"
    description: "Reduce size in paper mode when sentiment is bearish"
    condition: "sentimentScore < 4 AND direction == long"
    action: "reduce-size-50pct"
    level: "soft"

  - id: "max-drawdown-warning"
    description: "Warn when portfolio drawdown exceeds 10%"
    condition: "portfolioDrawdownPct > 10"
    action: "warn"
    level: "soft"
`;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "policy-engine-test-"));
  const policiesDir = path.join(tmpDir, "policies");
  fs.mkdirSync(policiesDir, { recursive: true });
  policyPath = path.join(policiesDir, "trading-policy.yaml");
  fs.writeFileSync(policyPath, POLICY_YAML, "utf-8");
  // Reset singleton
  VincePolicyEngineService.setInstance(
    new VincePolicyEngineService(policyPath),
  );
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  VincePolicyEngineService.setInstance(new VincePolicyEngineService());
});

// ─────────────────────────────────────────────────────────────────────────────

describe("VincePolicyEngineService.evaluate — all rules pass", () => {
  it("returns passed=true when no rules are triggered", () => {
    const engine = new VincePolicyEngineService(policyPath);
    const ctx: PolicyContext = {
      tradeSize: 100,
      confidence: 80,
      executionType: "paper",
      circuitBreakerActive: false,
      sentimentScore: 6,
      direction: "long",
      portfolioDrawdownPct: 5,
    };
    const result = engine.evaluate(ctx);
    expect(result.passed).toBe(true);
    expect(result.hardBlocks).toHaveLength(0);
    expect(result.softWarnings).toHaveLength(0);
    expect(result.sizeModifier).toBe(1.0);
    expect(result.policyId).toBe("trading-v1");
    expect(result.policyVersion).toBe("1.0");
    expect(result.auditRef).toMatch(/^policy-trading-v1-\d+-[A-Z0-9]{4}$/);
  });
});

describe("VincePolicyEngineService.evaluate — hard block triggered", () => {
  it("blocks on max-single-trade-usd when tradeSize > 500", () => {
    const engine = new VincePolicyEngineService(policyPath);
    const ctx: PolicyContext = { tradeSize: 750 };
    const result = engine.evaluate(ctx);
    expect(result.passed).toBe(false);
    expect(result.hardBlocks).toContain("max-single-trade-usd");
    expect(result.sizeModifier).toBe(0);
  });

  it("blocks on min-confidence-live for live trade with low confidence", () => {
    const engine = new VincePolicyEngineService(policyPath);
    const ctx: PolicyContext = {
      executionType: "live",
      confidence: 50,
      circuitBreakerActive: false,
    };
    const result = engine.evaluate(ctx);
    expect(result.passed).toBe(false);
    expect(result.hardBlocks).toContain("min-confidence-live");
  });

  it("blocks on circuit-breaker-check when CB active + live", () => {
    const engine = new VincePolicyEngineService(policyPath);
    const ctx: PolicyContext = {
      circuitBreakerActive: true,
      executionType: "live",
      confidence: 80,
    };
    const result = engine.evaluate(ctx);
    expect(result.passed).toBe(false);
    expect(result.hardBlocks).toContain("circuit-breaker-check");
  });
});

describe("VincePolicyEngineService.evaluate — soft warn triggered", () => {
  it("adds to softWarnings on max-drawdown-warning", () => {
    const engine = new VincePolicyEngineService(policyPath);
    const ctx: PolicyContext = {
      tradeSize: 100,
      portfolioDrawdownPct: 15,
      sentimentScore: 6,
      direction: "long",
    };
    const result = engine.evaluate(ctx);
    expect(result.passed).toBe(true);
    expect(result.softWarnings).toContain("max-drawdown-warning");
    expect(result.sizeModifier).toBe(1.0); // warn doesn't change size
  });
});

describe("VincePolicyEngineService.evaluate — size reduction", () => {
  it("reduces sizeModifier to 0.5 on paper-sentiment-gate", () => {
    const engine = new VincePolicyEngineService(policyPath);
    const ctx: PolicyContext = {
      tradeSize: 100,
      sentimentScore: 2,
      direction: "long",
      executionType: "paper",
    };
    const result = engine.evaluate(ctx);
    expect(result.passed).toBe(true);
    expect(result.sizeModifier).toBe(0.5);
    expect(result.hardBlocks).toHaveLength(0);
  });
});

describe("VincePolicyEngineService — helpers", () => {
  it("getActivePolicyId returns policyId from file", () => {
    const engine = new VincePolicyEngineService(policyPath);
    expect(engine.getActivePolicyId()).toBe("trading-v1");
  });

  it("getPolicyVersion returns version from file", () => {
    const engine = new VincePolicyEngineService(policyPath);
    expect(engine.getPolicyVersion()).toBe("1.0");
  });

  it("appliedRules lists all rules with triggered flag", () => {
    const engine = new VincePolicyEngineService(policyPath);
    const ctx: PolicyContext = { tradeSize: 750 };
    const result = engine.evaluate(ctx);
    expect(result.appliedRules.length).toBeGreaterThan(0);
    const blocked = result.appliedRules.find(
      (r) => r.ruleId === "max-single-trade-usd",
    );
    expect(blocked?.triggered).toBe(true);
    expect(blocked?.level).toBe("hard");
  });
});
