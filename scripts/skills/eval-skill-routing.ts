#!/usr/bin/env tsx
/**
 * Eval Skill Routing
 *
 * Evaluates skill routing accuracy against test cases.
 * Runs getSkillRoutingHint(message) on each test case and checks if
 * the hint matches the expected skill.
 *
 * Reports: total cases, correct, accuracy %.
 * Exit 1 if accuracy < 75%.
 *
 * Usage: bun run skills:eval-routing
 */

import { getSkillRoutingHint } from "../../src/plugins/plugin-inter-agent/src/skillRouting";

interface TestCase {
  message: string;
  expectedSkill: string | null; // skill keyword expected in hint, or null for no routing
}

export const TEST_CASES: TestCase[] = [
  { message: "search x for BTC bullish accounts", expectedSkill: "x-research" },
  { message: "run x research on SOL narrative", expectedSkill: "x-research" },
  { message: "what's the trading agent EVClaw setup", expectedSkill: "trading-agent" },
  { message: "hyperliquid live perps execution guide", expectedSkill: "trading-agent" },
  { message: "what skills are available", expectedSkill: "registry" },
  { message: "show me available skills", expectedSkill: "registry" },
  { message: "what's the weather", expectedSkill: null },
  { message: "summarize this article", expectedSkill: null },
];

export interface EvalResult {
  message: string;
  expectedSkill: string | null;
  hint: string | null;
  correct: boolean;
}

/**
 * Check if a routing hint matches the expected skill keyword.
 */
export function hintMatchesExpected(
  hint: string | null,
  expected: string | null,
): boolean {
  if (expected === null) {
    // Expect no routing
    return hint === null;
  }
  if (hint === null) {
    // Expected routing but got none
    return false;
  }
  return hint.toLowerCase().includes(expected.toLowerCase());
}

/**
 * Run all test cases and return results.
 */
export function runEval(testCases: TestCase[] = TEST_CASES): EvalResult[] {
  return testCases.map((tc) => {
    const hint = getSkillRoutingHint(tc.message);
    const correct = hintMatchesExpected(hint, tc.expectedSkill);
    return {
      message: tc.message,
      expectedSkill: tc.expectedSkill,
      hint,
      correct,
    };
  });
}

// Main execution — only when run directly (not when imported by tests)
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] != null &&
  (process.argv[1].endsWith("eval-skill-routing.ts") ||
    process.argv[1].endsWith("eval-skill-routing.js"));

if (isMain) {
  const results = runEval();
  const total = results.length;
  const correct = results.filter((r) => r.correct).length;
  const accuracy = total > 0 ? (correct / total) * 100 : 0;

  console.log("Skill Routing Eval\n==================");
  for (const r of results) {
    const icon = r.correct ? "✓" : "✗";
    const expected =
      r.expectedSkill === null ? "null (no routing)" : r.expectedSkill;
    const got =
      r.hint === null
        ? "null (no routing)"
        : r.hint.length > 60
          ? r.hint.slice(0, 60) + "..."
          : r.hint;
    console.log(`${icon} "${r.message}"`);
    console.log(`    expected: ${expected}`);
    if (!r.correct) {
      console.log(`    got:      ${got}`);
    }
  }

  console.log(`\nResults: ${correct}/${total} correct — ${accuracy.toFixed(1)}% accuracy`);

  if (accuracy < 75) {
    console.log(`\n❌ Accuracy ${accuracy.toFixed(1)}% is below the 75% threshold.`);
    process.exit(1);
  } else {
    console.log(`\n✅ Accuracy ${accuracy.toFixed(1)}% meets the 75% threshold.`);
    process.exit(0);
  }
}
