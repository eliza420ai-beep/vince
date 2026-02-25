/**
 * VincePolicyEngine Service
 *
 * Loads trading policy from policies/trading-policy.yaml and evaluates
 * each rule against a PolicyContext. Produces a PolicyEvalResult with
 * hard blocks, soft warnings, size modifiers, and a unique audit reference.
 *
 * PRD: One Dream Phase 12 — Task #73
 */

import * as fs from "node:fs";
import * as path from "node:path";

export interface PolicyContext {
  tradeSize?: number;
  confidence?: number;
  executionType?: "paper" | "live";
  circuitBreakerActive?: boolean;
  sentimentScore?: number;
  direction?: "long" | "short";
  portfolioDrawdownPct?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface PolicyEvalResult {
  policyId: string;
  policyVersion: string;
  passed: boolean;
  appliedRules: {
    ruleId: string;
    triggered: boolean;
    action: string;
    level: "hard" | "soft";
  }[];
  hardBlocks: string[]; // rule IDs that blocked
  softWarnings: string[]; // rule IDs that warned
  sizeModifier: number; // 1.0 = no change, 0.5 = reduce 50%, 0.0 = block
  auditRef: string; // unique reference for this evaluation
}

interface PolicyRule {
  id: string;
  description: string;
  condition: string;
  action: string;
  level: "hard" | "soft";
}

interface PolicyFile {
  version: string;
  policyId: string;
  effectiveDate: string;
  rules: PolicyRule[];
}

const DEFAULT_POLICY_PATH = path.join(
  process.cwd(),
  "policies",
  "trading-policy.yaml",
);

/**
 * Minimal YAML parser for the trading policy file.
 * Handles the specific structure of trading-policy.yaml without external deps.
 */
function parseTradingPolicyYaml(raw: string): PolicyFile {
  const lines = raw.split("\n");
  const result: PolicyFile = {
    version: "1.0",
    policyId: "",
    effectiveDate: "",
    rules: [],
  };

  let inRules = false;
  let currentRule: Partial<PolicyRule> | null = null;

  const unquote = (s: string) => s.replace(/^["']|["']$/g, "").trim();

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line || line.trimStart().startsWith("#")) continue;

    // Top-level keys
    if (/^version:\s+/.test(line)) {
      result.version = unquote(line.replace(/^version:\s+/, ""));
      continue;
    }
    if (/^policyId:\s+/.test(line)) {
      result.policyId = unquote(line.replace(/^policyId:\s+/, ""));
      continue;
    }
    if (/^effectiveDate:\s+/.test(line)) {
      result.effectiveDate = unquote(line.replace(/^effectiveDate:\s+/, ""));
      continue;
    }
    if (/^rules:/.test(line)) {
      inRules = true;
      continue;
    }

    if (!inRules) continue;

    // Rule list item start
    if (/^\s+-\s+id:\s+/.test(line)) {
      // Save previous rule
      if (currentRule?.id) {
        result.rules.push(currentRule as PolicyRule);
      }
      currentRule = { id: unquote(line.replace(/^\s+-\s+id:\s+/, "")) };
      continue;
    }

    if (!currentRule) continue;

    const stripped = line.trimStart();
    if (/^description:\s+/.test(stripped)) {
      currentRule.description = unquote(
        stripped.replace(/^description:\s+/, ""),
      );
    } else if (/^condition:\s+/.test(stripped)) {
      currentRule.condition = unquote(stripped.replace(/^condition:\s+/, ""));
    } else if (/^action:\s+/.test(stripped)) {
      currentRule.action = unquote(stripped.replace(/^action:\s+/, ""));
    } else if (/^level:\s+/.test(stripped)) {
      currentRule.level = unquote(stripped.replace(/^level:\s+/, "")) as
        | "hard"
        | "soft";
    }
  }

  // Push last rule
  if (currentRule?.id) {
    result.rules.push(currentRule as PolicyRule);
  }

  return result;
}

/**
 * Evaluate a simple condition expression against a context.
 * Supports: `>`, `<`, `==`, `AND` (case-insensitive)
 * Values in context: numbers, strings, booleans.
 */
function evaluateCondition(condition: string, context: PolicyContext): boolean {
  const normalized = condition.trim();

  // Handle AND (split on " AND " case-insensitive)
  const andParts = normalized.split(/\s+AND\s+/i);
  if (andParts.length > 1) {
    return andParts.every((part) => evaluateCondition(part.trim(), context));
  }

  // Try `>` operator
  const gtMatch = normalized.match(/^(\w+)\s*>\s*(.+)$/);
  if (gtMatch) {
    const [, varName, rhs] = gtMatch;
    const lhsVal = context[varName];
    if (typeof lhsVal === "number") {
      return lhsVal > parseFloat(rhs.trim());
    }
    return false;
  }

  // Try `<` operator
  const ltMatch = normalized.match(/^(\w+)\s*<\s*(.+)$/);
  if (ltMatch) {
    const [, varName, rhs] = ltMatch;
    const lhsVal = context[varName];
    if (typeof lhsVal === "number") {
      return lhsVal < parseFloat(rhs.trim());
    }
    return false;
  }

  // Try `==` operator
  const eqMatch = normalized.match(/^(\w+)\s*==\s*(.+)$/);
  if (eqMatch) {
    const [, varName, rhs] = eqMatch;
    const lhsVal = context[varName];
    const rhsTrimmed = rhs.trim();

    // Boolean comparison
    if (rhsTrimmed === "true") return lhsVal === true;
    if (rhsTrimmed === "false") return lhsVal === false;

    // String comparison (strip quotes if present)
    const unquoted = rhsTrimmed.replace(/^["']|["']$/g, "");
    if (typeof lhsVal === "string") return lhsVal === unquoted;
    if (typeof lhsVal === "number") return lhsVal === parseFloat(unquoted);

    // Direct equality (context string vs rhs string)
    return String(lhsVal) === unquoted;
  }

  return false;
}

function generateRandom4(): string {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

export class VincePolicyEngineService {
  private readonly policyPath: string;
  private policy: PolicyFile | null = null;
  private policyMtimeMs: number | null = null;

  constructor(policyPath?: string) {
    this.policyPath = policyPath ?? DEFAULT_POLICY_PATH;
  }

  private loadPolicy(): PolicyFile {
    if (!fs.existsSync(this.policyPath)) {
      throw new Error(`Policy file not found: ${this.policyPath}`);
    }

    const stat = fs.statSync(this.policyPath);
    const mtimeMs = stat.mtimeMs;

    // If we've already loaded this exact file version, reuse the cached policy
    if (this.policy && this.policyMtimeMs === mtimeMs) {
      return this.policy;
    }

    const raw = fs.readFileSync(this.policyPath, "utf-8");
    this.policy = parseTradingPolicyYaml(raw);
    this.policyMtimeMs = mtimeMs;
    return this.policy;
  }

  /**
   * Evaluate all policy rules against the given context.
   * Hard block rules → passed=false, sizeModifier=0.
   * Soft warn rules → logged in softWarnings.
   * Reduce-size-50pct rules → sizeModifier *= 0.5.
   */
  evaluate(context: PolicyContext): PolicyEvalResult {
    const policy = this.loadPolicy();

    let passed = true;
    let sizeModifier = 1.0;
    const hardBlocks: string[] = [];
    const softWarnings: string[] = [];
    const appliedRules: PolicyEvalResult["appliedRules"] = [];

    for (const rule of policy.rules) {
      let triggered = false;
      try {
        triggered = evaluateCondition(rule.condition, context);
      } catch {
        triggered = false;
      }

      appliedRules.push({
        ruleId: rule.id,
        triggered,
        action: rule.action,
        level: rule.level as "hard" | "soft",
      });

      if (!triggered) continue;

      if (rule.level === "hard") {
        passed = false;
        sizeModifier = 0;
        hardBlocks.push(rule.id);
        // Once a hard block fires, stop evaluating further rules to avoid
        // accumulating misleading soft warnings after a block.
        break;
      } else {
        // soft
        if (rule.action === "reduce-size-50pct") {
          sizeModifier *= 0.5;
        } else if (rule.action === "warn") {
          softWarnings.push(rule.id);
        }
      }
    }

    const timestamp = Date.now();
    const random4 = generateRandom4();
    const auditRef = `policy-${policy.policyId}-${timestamp}-${random4}`;

    return {
      policyId: policy.policyId,
      policyVersion: policy.version,
      passed,
      appliedRules,
      hardBlocks,
      softWarnings,
      sizeModifier,
      auditRef,
    };
  }

  getActivePolicyId(): string {
    return this.loadPolicy().policyId;
  }

  getPolicyVersion(): string {
    return this.loadPolicy().version;
  }

  // ── Singleton ──────────────────────────────────────────────────────────────

  private static _instance: VincePolicyEngineService | null = null;

  static getInstance(): VincePolicyEngineService {
    if (!VincePolicyEngineService._instance) {
      VincePolicyEngineService._instance = new VincePolicyEngineService();
    }
    return VincePolicyEngineService._instance;
  }

  static setInstance(instance: VincePolicyEngineService): void {
    VincePolicyEngineService._instance = instance;
  }
}
