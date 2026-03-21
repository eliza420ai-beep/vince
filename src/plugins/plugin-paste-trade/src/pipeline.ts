import { spawn } from "node:child_process";
import { join } from "node:path";
import { logger } from "@elizaos/core";
import type { IAgentRuntime } from "@elizaos/core";
import { ModelType } from "@elizaos/core";
import { getPasteTradePackageRoot, getPasteTradePollMs } from "./config.ts";
import {
  PasteTradeClient,
  type CreateSourcePayload,
} from "./pasteTradeClient.ts";
import {
  appendRunEvent,
  getRun,
  updateRun,
  type PasteTradeRunRecord,
} from "./runRegistry.ts";
import { emitPasteTradeEvent } from "./socketEmit.ts";
import { ensureThesesPassBatchValidation } from "./thesisNormalize.ts";
import { resolveBodyTextFromExtractOutput } from "./extractBodyText.ts";
import { buildLocalLeaderboardSnapshot } from "./localLeaderboardSnapshot.ts";
import { enrichLocalSnapshotWithMarks } from "@/shared/pasteTradeMarks.ts";

/** Compact thesis rows for UI (batch-save stdout is only ids). */
function thesisPreviewForEvent(
  theses: Record<string, unknown>[],
): Record<string, unknown>[] {
  return theses.map((t) => {
    const whoRaw = Array.isArray(t.who) ? t.who : [];
    const whyRaw = Array.isArray(t.why) ? t.why : [];
    const whyLines: string[] = [];
    for (const w of whyRaw) {
      if (typeof w === "string" && w.trim()) {
        whyLines.push(w.trim().slice(0, 500));
      } else if (w && typeof w === "object" && w !== null && "text" in w) {
        const tx = (w as { text?: unknown }).text;
        if (typeof tx === "string" && tx.trim()) {
          whyLines.push(tx.trim().slice(0, 500));
        }
      }
    }
    const who = whoRaw
      .filter((w) => w && typeof w === "object")
      .slice(0, 8)
      .map((w) => {
        const o = w as Record<string, unknown>;
        return {
          ticker: typeof o.ticker === "string" ? o.ticker.slice(0, 64) : "",
          direction:
            typeof o.direction === "string" ? o.direction.slice(0, 32) : "",
        };
      });
    return {
      thesis: typeof t.thesis === "string" ? t.thesis.slice(0, 2000) : "",
      headline_quote:
        typeof t.headline_quote === "string"
          ? t.headline_quote.slice(0, 280)
          : "",
      route_status: t.route_status ?? null,
      unrouted_reason:
        typeof t.unrouted_reason === "string"
          ? t.unrouted_reason.slice(0, 240)
          : null,
      who,
      why_preview: whyLines.slice(0, 12),
    };
  });
}

function emit(
  runtime: IAgentRuntime,
  rec: PasteTradeRunRecord,
  event_type: string,
  data: Record<string, unknown> = {},
): void {
  appendRunEvent(rec.runId, event_type, data);
  emitPasteTradeEvent(runtime, {
    runId: rec.runId,
    agentId: rec.agentId,
    sourceId: rec.sourceId,
    event_type,
    data,
  });
}

function pasteTradeEnv(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    PASTE_TRADE_SKIP_OPEN: "1",
    VINCE_PASTE_TRADE: "1",
  };
}

function runBunScript(
  scriptRelative: string,
  args: string[],
): Promise<{ stdout: string; stderr: string; code: number }> {
  const root = getPasteTradePackageRoot();
  return new Promise((resolve) => {
    const child = spawn("bun", ["run", join(root, scriptRelative), ...args], {
      cwd: root,
      env: pasteTradeEnv(),
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (c) => {
      stdout += c.toString();
    });
    child.stderr?.on("data", (c) => {
      stderr += c.toString();
    });
    child.on("close", (code) => {
      resolve({ stdout, stderr, code: code ?? 1 });
    });
  });
}

/** Parse last JSON line or whole stdout from paste-trade scripts. */
function parseJsonOutput(stdout: string): unknown {
  const lines = stdout.trim().split("\n").filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(lines[i]!);
    } catch {
      /* continue */
    }
  }
  try {
    return JSON.parse(stdout.trim());
  } catch {
    return null;
  }
}

export async function runPasteTradePipeline(
  runtime: IAgentRuntime,
  rec: PasteTradeRunRecord,
  client: PasteTradeClient | null,
): Promise<void> {
  const url = rec.inputUrl?.trim();
  const text = rec.inputText?.trim();

  try {
    let bodyText = text ?? "";
    let title = "";
    let platform = "typed";
    let wordCount: number | undefined;

    if (url) {
      updateRun(rec.runId, { status: "extracting" });
      emit(runtime, rec, "status", { message: "Extracting source…" });

      const { stdout, stderr, code } = await runBunScript(
        "scripts/extract.ts",
        [url],
      );
      if (code !== 0) {
        throw new Error(stderr || stdout || `extract exited ${code}`);
      }
      const extracted = parseJsonOutput(stdout) as Record<
        string,
        unknown
      > | null;
      if (!extracted || typeof extracted !== "object") {
        throw new Error("extract: could not parse JSON output");
      }
      if ((extracted as { error?: string }).error) {
        throw new Error(`extract: ${(extracted as { error: string }).error}`);
      }
      bodyText = resolveBodyTextFromExtractOutput(extracted);
      title = (extracted.title as string) || url;
      const srcLabel =
        typeof extracted.source === "string" ? extracted.source : "";
      platform =
        (extracted.platform as string) ||
        (srcLabel.startsWith("x_") ||
        srcLabel === "fxtwitter" ||
        srcLabel === "fxtwitter_article" ||
        srcLabel === "vxtwitter"
          ? "x"
          : srcLabel === "youtube"
            ? "youtube"
            : "web");
      wordCount =
        typeof extracted.word_count === "number"
          ? extracted.word_count
          : undefined;
      if (!bodyText) {
        throw new Error(
          "extract: empty body (no text/transcript in extract output; for X URLs set X_BEARER_TOKEN or rely on fxtwitter, or paste thesis text)",
        );
      }
    } else if (!bodyText) {
      throw new Error("No URL or text to process");
    }

    const payload: CreateSourcePayload = {
      url: url || undefined,
      title: title || (url ? url : "User thesis"),
      platform,
      author_handle: "vince",
      source_date: new Date().toISOString(),
      body_text: bodyText,
      word_count: wordCount,
      run_id: rec.runId,
    };

    let runIdBack = rec.runId;

    if (rec.localOnly) {
      const localSourceId = `local:${rec.runId}`;
      updateRun(rec.runId, {
        status: "active",
        sourceId: localSourceId,
        sourceUrl: undefined,
      });
      const updatedLocal = getRun(rec.runId);
      if (updatedLocal) {
        Object.assign(rec, updatedLocal);
      }
      emit(runtime, rec, "status", {
        message: "Local run — not publishing to paste.trade.",
      });
      emit(runtime, rec, "source_created", {
        local_only: true,
        run_id: rec.runId,
        source_id: localSourceId,
      });
    } else {
      if (!client) {
        throw new Error(
          "Remote publish requires PASTE_TRADE_KEY / PasteTradeClient",
        );
      }
      updateRun(rec.runId, { status: "creating" });
      emit(runtime, rec, "status", { message: "Creating paste.trade source…" });

      const created = await client.createSource(payload);
      runIdBack = created.run_id || rec.runId;
      updateRun(rec.runId, {
        sourceId: created.source_id,
        sourceUrl: created.source_url,
        status: "active",
      });
      const updated = getRun(rec.runId);
      if (updated) {
        Object.assign(rec, updated);
      }

      emit(runtime, rec, "source_created", {
        source_id: created.source_id,
        source_url: created.source_url,
        run_id: runIdBack,
      });

      await client.postSourceEvent(
        created.source_id,
        "status",
        { message: "VINCE pipeline: extracting theses…" },
        runIdBack,
      );

      const pollMs = getPasteTradePollMs();
      const pollTimer = setInterval(async () => {
        const r = getRun(rec.runId);
        if (!r || r.status === "done" || r.status === "error") {
          clearInterval(pollTimer);
          return;
        }
        const snap = await client.getSourceSnapshot(created.source_id);
        if (snap) {
          updateRun(rec.runId, { lastSnapshot: snap });
          emit(runtime, rec, "snapshot", { snapshot: snap });
        }
      }, pollMs);
      setTimeout(
        () => {
          clearInterval(pollTimer);
        },
        30 * 60 * 1000,
      );
    }

    const thesisPrompt = `You are extracting tradeable theses from a source. Output ONLY a valid JSON array (no markdown), 1 to 4 objects. Each object MUST match this shape:
{"thesis":"one sentence directional belief","horizon":"timing if any or unknown","route_status":"unrouted","unrouted_reason":"pending_route_check","who":[{"ticker":"SYM","direction":"long"}],"why":["author reasoning"],"quotes":["verbatim short quote"],"headline_quote":"verbatim <=120 chars from quotes","source_date":"${payload.source_date}"}

Source text:
---
${bodyText.slice(0, 24_000)}
---`;

    const llmOut = await runtime.useModel(ModelType.TEXT_LARGE, {
      prompt: thesisPrompt,
    });
    const textOut = String(llmOut).trim();

    let theses: unknown[];
    try {
      const cleaned = textOut.replace(/```json\n?|\n?```/g, "").trim();
      const parsed = JSON.parse(
        cleaned.startsWith("[") ? cleaned : `[${cleaned}]`,
      );
      theses = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      logger.warn(`[paste-trade] thesis JSON parse failed: ${e}`);
      const excerpt =
        bodyText.trim().slice(0, 280) ||
        "Could not parse LLM output as thesis JSON.";
      const hq = excerpt.slice(0, Math.min(120, excerpt.length));
      theses = [
        {
          thesis:
            "Could not auto-extract structured theses; review source manually.",
          horizon: "unknown",
          route_status: "unrouted",
          unrouted_reason: "llm_parse_failed",
          who: [],
          why: [String(e)],
          quotes: [excerpt],
          headline_quote: hq,
          source_date: payload.source_date,
        },
      ];
    }

    const sourceDate =
      typeof payload.source_date === "string" && payload.source_date.trim()
        ? payload.source_date
        : new Date().toISOString();
    const thesesForSave = ensureThesesPassBatchValidation(
      theses,
      bodyText,
      sourceDate,
      (msg) => logger.warn(msg),
    );

    const root = getPasteTradePackageRoot();
    const batchSave = spawn(
      "bun",
      ["run", join(root, "scripts/batch-save.ts"), "--run-id", runIdBack],
      {
        cwd: root,
        env: pasteTradeEnv(),
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
    batchSave.stdin?.write(JSON.stringify(thesesForSave));
    batchSave.stdin?.end();
    let bsOut = "";
    batchSave.stdout?.on("data", (c) => {
      bsOut += c.toString();
    });
    await new Promise<void>((resolve, reject) => {
      batchSave.on("close", (c) => {
        if (c === 0) resolve();
        else reject(new Error(`batch-save exited ${c}: ${bsOut}`));
      });
    });

    emit(runtime, rec, "theses_saved", {
      raw: bsOut.slice(0, 2000),
      theses_preview: thesisPreviewForEvent(thesesForSave),
    });
    const donePatch: Partial<PasteTradeRunRecord> = { status: "done" };
    if (rec.localOnly) {
      const base = buildLocalLeaderboardSnapshot(thesesForSave);
      try {
        donePatch.lastSnapshot = await enrichLocalSnapshotWithMarks(base);
      } catch (e) {
        logger.warn(
          `[paste-trade] live marks enrich failed (snapshot still saved): ${e instanceof Error ? e.message : String(e)}`,
        );
        donePatch.lastSnapshot = base;
      }
    }
    updateRun(rec.runId, donePatch);
    const latest = getRun(rec.runId);
    if (latest) {
      Object.assign(rec, latest);
    }
    if (rec.localOnly) {
      emit(runtime, rec, "done", {
        local_only: true,
        run_id: rec.runId,
        source_id: rec.sourceId,
      });
    } else {
      emit(runtime, rec, "done", {
        source_url: rec.sourceUrl,
        source_id: rec.sourceId,
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[paste-trade] pipeline failed: ${msg}`);
    updateRun(rec.runId, { status: "error", error: msg });
    emit(runtime, rec, "failed", { error: msg });
  }
}
