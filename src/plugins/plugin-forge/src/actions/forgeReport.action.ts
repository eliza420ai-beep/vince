/**
 * FORGE_REPORT — Show Forge status and last run results.
 *
 * Usage: "forge report", "forge status", "forge results", "@Forge what happened"
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import * as fs from "node:fs";
import * as path from "node:path";
import { ForgeGitService } from "../services/forgeGit.service.ts";
import { ForgeMlxService } from "../services/forgeMlx.service.ts";
import { ForgePythonService } from "../services/forgePython.service.ts";

const REPO_ROOT = process.cwd();
const POLICY_PATH = path.join(REPO_ROOT, "policies", "trading-policy.yaml");
const FEATURE_STORE_DIR = path.join(
  REPO_ROOT,
  ".elizadb",
  "vince-paper-bot",
  "features",
);

export const forgeReportAction: Action = {
  name: "FORGE_REPORT",
  similes: [
    "FORGE_STATUS",
    "FORGE_RESULTS",
    "FORGE_SUMMARY",
    "FORGE_CHECK",
    "SHOW_FORGE",
    "FORGE_WHAT",
  ],
  description:
    "Show Forge status: runtime availability, feature-store row count, committed branches, and policy version.",

  validate: async (_runtime: IAgentRuntime, message: Memory) => {
    const text = (message.content.text ?? "").toLowerCase();
    return (
      text.includes("forge") &&
      (text.includes("report") ||
        text.includes("status") ||
        text.includes("result") ||
        text.includes("summary") ||
        text.includes("what") ||
        text.includes("check"))
    );
  },

  handler: async (
    runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
    _options?: any,
    callback?: HandlerCallback,
  ) => {
    const lines: string[] = ["**Forge status**"];

    // Feature store
    let rowCount = 0;
    if (fs.existsSync(FEATURE_STORE_DIR)) {
      try {
        const files = fs
          .readdirSync(FEATURE_STORE_DIR)
          .filter((f) => f.endsWith(".jsonl"));
        for (const f of files) {
          const content = fs.readFileSync(
            path.join(FEATURE_STORE_DIR, f),
            "utf-8",
          );
          rowCount += content.split("\n").filter((l) => l.trim()).length;
        }
      } catch {
        rowCount = -1;
      }
    }
    lines.push(
      `Feature store: ${rowCount >= 0 ? rowCount + " rows" : "unreadable"} (need ≥50 for replay)`,
    );

    // Policy file
    const policyExists = fs.existsSync(POLICY_PATH);
    if (policyExists) {
      const policyRaw = fs.readFileSync(POLICY_PATH, "utf-8");
      const versionMatch = policyRaw.match(/^version:\s+"?([^"\n]+)"?/m);
      lines.push(
        `Policy: policies/trading-policy.yaml (version ${versionMatch?.[1] ?? "unknown"})`,
      );
    } else {
      lines.push("Policy: ⚠ policies/trading-policy.yaml not found");
    }

    // Runtime availability
    const mlxSvc = await ForgeMlxService.start(runtime);
    const mlxAvail = await mlxSvc.isAvailable();
    const pythonSvc = await ForgePythonService.start(runtime);
    const pythonAvail = await pythonSvc.isAvailable();
    lines.push(
      `Runtime: ${mlxAvail ? "MLX available (Apple Silicon)" : "MLX unavailable"}, Python ${pythonAvail ? "available" : "unavailable"}`,
    );
    await mlxSvc.stop();
    await pythonSvc.stop();

    // Experiment branches
    const gitSvc = await ForgeGitService.start(runtime);
    const branches = await gitSvc.listExperimentBranches();
    const currentBranch = await gitSvc.getCurrentBranch();
    await gitSvc.stop();
    lines.push(`Current branch: ${currentBranch}`);
    lines.push(
      branches.length > 0
        ? `Experiment branches (${branches.length}): ${branches.slice(-3).join(", ")}${branches.length > 3 ? "…" : ""}`
        : "No experiment branches yet",
    );

    // Env config
    const enabled = process.env.FORGE_ENABLED !== "false";
    const nightlyHour = process.env.FORGE_NIGHTLY_HOUR_UTC ?? "2";
    const budget = process.env.FORGE_BUDGET_MINUTES ?? "120";
    const rt = process.env.FORGE_RUNTIME ?? "mlx";
    lines.push(
      `Config: ${enabled ? "enabled" : "DISABLED"}, nightly at ${nightlyHour}:00 UTC, budget ${budget}min, runtime ${rt}`,
    );

    const text = lines.join("\n");
    logger.debug("[ForgeReport]", text);

    await callback?.({
      thought: "Assembling Forge status report.",
      text,
      actions: ["FORGE_REPORT"],
    });
  },

  examples: [
    [
      { name: "user", content: { text: "forge status" } },
      {
        name: "Forge",
        content: {
          text: "**Forge status**\nFeature store: 0 rows...",
          actions: ["FORGE_REPORT"],
        },
      },
    ],
  ],
};
