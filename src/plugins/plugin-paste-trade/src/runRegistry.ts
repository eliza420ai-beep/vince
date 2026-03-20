import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export type PasteTradeRunStatus =
  | "pending"
  | "extracting"
  | "creating"
  | "active"
  | "error"
  | "done";

export interface PasteTradeRunRecord {
  runId: string;
  agentId: string;
  roomId?: string;
  sourceId?: string;
  sourceUrl?: string;
  status: PasteTradeRunStatus;
  inputUrl?: string;
  inputText?: string;
  error?: string;
  events: Array<{
    t: number;
    event_type: string;
    data: Record<string, unknown>;
  }>;
  lastSnapshot?: unknown;
  createdAt: number;
  updatedAt: number;
}

const runs = new Map<string, PasteTradeRunRecord>();

function dataDir(): string {
  const dir =
    process.env.PGLITE_DATA_DIR?.trim() || join(process.cwd(), ".elizadb");
  return join(dir, "paste-trade-runs");
}

function fileFor(runId: string): string {
  return join(dataDir(), `${runId}.json`);
}

export function loadRunFromDisk(runId: string): PasteTradeRunRecord | null {
  try {
    const raw = readFileSync(fileFor(runId), "utf8");
    return JSON.parse(raw) as PasteTradeRunRecord;
  } catch {
    return null;
  }
}

export function persistRun(rec: PasteTradeRunRecord): void {
  try {
    mkdirSync(dataDir(), { recursive: true });
    writeFileSync(fileFor(rec.runId), JSON.stringify(rec, null, 2), "utf8");
  } catch {
    /* non-fatal */
  }
}

export function createRun(input: {
  runId: string;
  agentId: string;
  roomId?: string;
  inputUrl?: string;
  inputText?: string;
}): PasteTradeRunRecord {
  const now = Date.now();
  const rec: PasteTradeRunRecord = {
    runId: input.runId,
    agentId: input.agentId,
    roomId: input.roomId,
    inputUrl: input.inputUrl,
    inputText: input.inputText,
    status: "pending",
    events: [],
    createdAt: now,
    updatedAt: now,
  };
  runs.set(input.runId, rec);
  persistRun(rec);
  return rec;
}

export function getRun(runId: string): PasteTradeRunRecord | null {
  return runs.get(runId) ?? loadRunFromDisk(runId);
}

export function updateRun(
  runId: string,
  patch: Partial<PasteTradeRunRecord>,
): PasteTradeRunRecord | null {
  const cur = getRun(runId);
  if (!cur) return null;
  const next = { ...cur, ...patch, updatedAt: Date.now() };
  runs.set(runId, next);
  persistRun(next);
  return next;
}

export function appendRunEvent(
  runId: string,
  event_type: string,
  data: Record<string, unknown>,
): PasteTradeRunRecord | null {
  const cur = getRun(runId);
  if (!cur) return null;
  cur.events.push({ t: Date.now(), event_type, data });
  cur.updatedAt = Date.now();
  runs.set(runId, cur);
  persistRun(cur);
  return cur;
}
