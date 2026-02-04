#!/usr/bin/env bun
/**
 * Run improvement report → aggregator weights (dry-run or apply).
 *
 * Usage (from repo root):
 *   bun run src/plugins/plugin-vince/scripts/run-improvement-weights.ts
 *
 * Or from plugin-vince:
 *   bun run scripts/run-improvement-weights.ts
 *
 * Set VINCE_APPLY_IMPROVEMENT_WEIGHTS=true to actually update dynamicConfig
 * source weights; otherwise only logs top features and suggested weights.
 */
import { logAndApplyImprovementReportWeights } from "../src/utils/improvementReportWeights";

const apply = process.env.VINCE_APPLY_IMPROVEMENT_WEIGHTS === "true";
console.log(apply ? "[run-improvement-weights] Apply mode: will update weights." : "[run-improvement-weights] Dry-run: logging only.");

logAndApplyImprovementReportWeights(apply)
  .then(() => {
    console.log("[run-improvement-weights] Done.");
    process.exit(0);
  })
  .catch((e) => {
    console.error("[run-improvement-weights] Error:", e);
    process.exit(1);
  });
