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
  client: PasteTradeClient,
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
      bodyText =
        (extracted.body_text as string) || (extracted.source as string) || "";
      title = (extracted.title as string) || url;
      platform = (extracted.platform as string) || "web";
      wordCount =
        typeof extracted.word_count === "number"
          ? extracted.word_count
          : undefined;
      if (!bodyText) {
        const savedTo = extracted.saved_to as string | undefined;
        if (savedTo) {
          try {
            const { readFileSync } = await import("node:fs");
            bodyText = readFileSync(savedTo, "utf8");
          } catch {
            throw new Error("extract: empty body and could not read saved_to");
          }
        } else {
          throw new Error("extract: empty body_text");
        }
      }
    } else if (!bodyText) {
      throw new Error("No URL or text to process");
    }

    updateRun(rec.runId, { status: "creating" });
    emit(runtime, rec, "status", { message: "Creating paste.trade source…" });

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

    const created = await client.createSource(payload);
    const runIdBack = created.run_id || rec.runId;
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
      theses = [
        {
          thesis:
            "Could not auto-extract structured theses; review source manually.",
          horizon: "unknown",
          route_status: "unrouted",
          unrouted_reason: "llm_parse_failed",
          who: [],
          why: [String(e)],
          quotes: [],
          headline_quote: bodyText.slice(0, 120),
          source_date: payload.source_date,
        },
      ];
    }

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
    batchSave.stdin?.write(JSON.stringify(theses));
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

    emit(runtime, rec, "theses_saved", { raw: bsOut.slice(0, 2000) });
    updateRun(rec.runId, { status: "done" });
    emit(runtime, rec, "done", {
      source_url: created.source_url,
      source_id: created.source_id,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error(`[paste-trade] pipeline failed: ${msg}`);
    updateRun(rec.runId, { status: "error", error: msg });
    emit(runtime, rec, "failed", { error: msg });
  }
}
