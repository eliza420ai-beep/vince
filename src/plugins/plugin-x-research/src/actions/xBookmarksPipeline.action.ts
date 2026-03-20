/**
 * X bookmarks → classified → planned → Pine Script v6 (Rust pipeline).
 * Bridges CT bookmarks to actionable TradingView artifacts under data/x-bookmarks-pipeline/output.
 */

import type {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import path from "node:path";
import { sendActionResponse } from "./helpers/actionResponse";
import {
  assertPipelineCheckout,
  buildPipelineArgs,
  cargoAvailable,
  defaultDigestPath,
  defaultOutputDir,
  ensureDigestDir,
  isBookmarkPipelineAgent,
  isBookmarkPipelineEnabled,
  parseFetchLimitFromMessage,
  pipelineChildEnv,
  resolvePipelineRoot,
  runCargoPipeline,
} from "../services/xBookmarksPipelineRunner";
import {
  readCostReportHead,
  summarizeOutputDirectory,
  writeDigestFile,
} from "../utils/xBookmarksDigest";
import { ingestPipelineOutputToPaperQueue } from "../../../plugin-vince/src/utils/xBookmarksPaperQueue.ts";

function matchesTrigger(text: string): boolean {
  const t = text.toLowerCase();
  if (t.includes("x bookmarks pipeline")) return true;
  if (t.includes("bookmark pipeline")) return true;
  if (t.includes("bookmarks to pine")) return true;
  if (t.includes("run bookmark") && t.includes("pine")) return true;
  if (t.includes("fetch my bookmarks") && t.includes("trading")) return true;
  if (t.includes("bookmark") && t.includes("tradingview")) return true;
  return false;
}

export const xBookmarksPipelineAction: Action = {
  name: "X_BOOKMARKS_PIPELINE",
  description:
    "Run the Rust X bookmarks pipeline: fetch your X bookmarks (bookmark.read), classify, plan trades/indicators, emit validated Pine Script v6 under data/x-bookmarks-pipeline/output. Requires X_BOOKMARKS_PIPELINE_ENABLED=true, Rust/cargo, CEREBRAS_API_KEY + XAI_API_KEY + ANTHROPIC + OPENAI, X_BEARER_TOKEN, X_FETCH_USER_ID. VINCE-only by default.",
  similes: [
    "RUN_X_BOOKMARKS_PIPELINE",
    "BOOKMARKS_TO_PINE",
    "X_BOOKMARK_TRADE_PIPELINE",
  ],

  validate: async (runtime: IAgentRuntime, message: Memory) => {
    if (!isBookmarkPipelineEnabled()) return false;
    if (!isBookmarkPipelineAgent(runtime)) return false;
    const text = message.content?.text ?? "";
    return matchesTrigger(text);
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: unknown,
    callback?: HandlerCallback,
  ): Promise<ActionResult | undefined> => {
    const cwd = process.cwd();
    const text = message.content?.text ?? "";

    try {
      if (!(await cargoAvailable())) {
        await sendActionResponse(callback, "X_BOOKMARKS_PIPELINE", {
          text: "Rust `cargo` is not on PATH. Install Rust (https://rustup.rs), then `cd packages/x-bookmarks-pipeline && cargo build --release`.",
        });
        return { success: false, error: "no_cargo" };
      }

      await assertPipelineCheckout(cwd);
      const pipelineRoot = resolvePipelineRoot(cwd);
      const verbose = /\bverbose\b/i.test(text);
      const limit = parseFetchLimitFromMessage(text);

      const oneOff = text.match(
        /(?:pipeline\s+(?:on|for)\s+[`"'])([^`"']+)(?:[`"'])/i,
      );
      const mode = oneOff ? ("text" as const) : ("fetch" as const);

      const extraArgs = buildPipelineArgs({
        mode,
        cwd,
        verbose,
        fetchLimit: limit,
        textSnippet: oneOff?.[1]?.trim(),
      });

      const timeoutMs = Number(
        process.env.X_BOOKMARKS_PIPELINE_TIMEOUT_MS ?? 1_800_000,
      );
      const env = pipelineChildEnv(runtime);

      const { code, stdout, stderr } = await runCargoPipeline({
        cwd,
        pipelineRoot,
        extraArgs,
        env,
        timeoutMs,
      });

      const outputDir = defaultOutputDir(cwd);
      const { lines, metaCount } = await summarizeOutputDirectory(
        outputDir,
        12,
      );
      const costHead = await readCostReportHead(outputDir, 40);

      const tailOut = stdout.length > 6000 ? stdout.slice(-6000) : stdout;
      const tailErr = stderr.length > 4000 ? stderr.slice(-4000) : stderr;

      if (code !== 0) {
        await sendActionResponse(callback, "X_BOOKMARKS_PIPELINE", {
          text: `Pipeline exited with code ${code}.\n\n**stderr (tail)**\n\`\`\`\n${tailErr}\n\`\`\`\n\n**stdout (tail)**\n\`\`\`\n${tailOut}\n\`\`\``,
        });
        return { success: false, error: `exit_${code}` };
      }

      const digestSections = [
        `# X bookmarks pipeline — ${new Date().toISOString()}`,
        "",
        `Mode: ${mode}`,
        `Meta files under output tree: ${metaCount}`,
        "",
        "## Recent items",
        ...lines,
        "",
      ];
      if (costHead) {
        digestSections.push(
          "## cost_report.md (head)",
          "",
          "```",
          costHead,
          "```",
          "",
        );
      }
      const digestBody = digestSections.join("\n");
      await ensureDigestDir(cwd);
      const digestPath = defaultDigestPath(cwd);
      await writeDigestFile(digestPath, digestBody);

      let paperIngest = { appended: 0, skipped: 0 };
      try {
        paperIngest = await ingestPipelineOutputToPaperQueue({
          cwd,
          outputDir,
        });
      } catch (e) {
        logger.warn(
          { error: e },
          "[X_BOOKMARKS_PIPELINE] paper queue ingest skipped",
        );
      }

      const reply = [
        "Pipeline finished OK.",
        "",
        `Artifacts: \`${path.relative(cwd, outputDir)}\``,
        `Digest: \`${path.relative(cwd, digestPath)}\` (copy slices into your RAG corpus if you use local knowledge/)`,
        `Paper bot overlay: **+${paperIngest.appended}** new row(s) in \`data/x-bookmarks-pipeline/paper-signals.jsonl\` (${paperIngest.skipped} meta files skipped or duplicate).`,
        "",
        lines.length
          ? "**Latest signals**\n" + lines.join("\n")
          : "_No new meta files found; check cache or bookmark volume._",
        "",
        costHead ? `**Cost report (head)**\n\`\`\`\n${costHead}\n\`\`\`` : "",
      ]
        .filter(Boolean)
        .join("\n");

      await sendActionResponse(callback, "X_BOOKMARKS_PIPELINE", {
        text: reply,
      });
      return { success: true };
    } catch (error) {
      logger.error({ error }, "[X_BOOKMARKS_PIPELINE] failed");
      await sendActionResponse(callback, "X_BOOKMARKS_PIPELINE", {
        text: `Pipeline failed: ${(error as Error).message}. See docs/X-BOOKMARKS-PIPELINE.md for setup.`,
      });
      return { success: false, error: (error as Error).message };
    }
  },

  examples: [
    [
      {
        name: "{{user1}}",
        content: {
          text: "Run the X bookmarks pipeline — fetch my bookmarks and turn finance ones into Pine.",
        },
      },
      {
        name: "VINCE",
        content: {
          text: "Starting the Rust pipeline… Output under data/x-bookmarks-pipeline/output; digest at data/x-bookmarks-pipeline/digest/latest.md.",
          actions: ["X_BOOKMARKS_PIPELINE"],
        },
      },
    ],
  ],
};
