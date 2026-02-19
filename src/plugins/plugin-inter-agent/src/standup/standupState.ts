/**
 * Standup State Manager
 *
 * Tracks the current standup session to prevent:
 * - Duplicate agent calls
 * - Kelly self-loops
 * - Calling agents out of order
 *
 * State is persisted to standup-session.json so it survives process restart.
 * On start we restore from file if present and not timed out; otherwise start fresh.
 */

import * as fs from "node:fs/promises";
import * as path from "node:path";
import { logger } from "@elizaos/core";
import {
  STANDUP_REPORT_ORDER,
  getStandupSessionTimeoutMs,
  getStandupInactivityTimeoutMs,
} from "./standup.constants";
import { withLock } from "./fileLock";

/** Standup turn order (lowercase); derived dynamically from canonical STANDUP_REPORT_ORDER */
const STANDUP_ORDER: readonly string[] = STANDUP_REPORT_ORDER.map((n) =>
  n.toLowerCase(),
);

type StandupAgent = string;

interface StandupSession {
  startedAt: number;
  roomId: string;
  currentAgent: StandupAgent | null;
  reportedAgents: Set<StandupAgent>;
  lastActivityAt: number;
  isWrappingUp: boolean;
}

/** Persisted shape (reportedAgents as array for JSON) */
interface PersistedSession {
  startedAt: number;
  roomId: string;
  currentAgent: StandupAgent | null;
  reportedAgents: string[];
  lastActivityAt: number;
  isWrappingUp: boolean;
}

/** In-memory standup state; also persisted to file for restart recovery */
let currentSession: StandupSession | null = null;

function getSessionFilePath(): string {
  const dir =
    process.env.STANDUP_DELIVERABLES_DIR?.trim() ||
    path.join(
      process.cwd(),
      process.env.STANDUP_DELIVERABLES_DIR || "docs/standup",
    );
  return path.join(dir, "standup-session.json");
}

/**
 * Load session from disk. Returns null if file missing, invalid, or timed out.
 */
async function loadPersistedSession(): Promise<StandupSession | null> {
  const filepath = getSessionFilePath();
  try {
    const raw = await fs.readFile(filepath, "utf-8");
    const data = JSON.parse(raw) as PersistedSession;
    if (!data || typeof data.startedAt !== "number" || !data.roomId)
      return null;
    const now = Date.now();
    if (now - data.startedAt > getStandupSessionTimeoutMs()) return null;
    const session: StandupSession = {
      startedAt: data.startedAt,
      roomId: data.roomId,
      currentAgent: data.currentAgent ?? null,
      reportedAgents: new Set(
        Array.isArray(data.reportedAgents) ? data.reportedAgents : [],
      ),
      lastActivityAt:
        typeof data.lastActivityAt === "number"
          ? data.lastActivityAt
          : data.startedAt,
      isWrappingUp: Boolean(data.isWrappingUp),
    };
    return session;
  } catch {
    return null;
  }
}

/**
 * Persist current session to disk (or delete file if no session). Call withLock for safe write.
 */
async function persistSession(): Promise<void> {
  const filepath = getSessionFilePath();
  await withLock(filepath, async () => {
    if (!currentSession) {
      try {
        await fs.unlink(filepath);
      } catch {
        // ignore if file does not exist
      }
      return;
    }
    const dir = path.dirname(filepath);
    await fs.mkdir(dir, { recursive: true });
    const payload: PersistedSession = {
      startedAt: currentSession.startedAt,
      roomId: currentSession.roomId,
      currentAgent: currentSession.currentAgent,
      reportedAgents: [...currentSession.reportedAgents],
      lastActivityAt: currentSession.lastActivityAt,
      isWrappingUp: currentSession.isWrappingUp,
    };
    await fs.writeFile(filepath, JSON.stringify(payload, null, 2), "utf-8");
  });
}

/**
 * Start a new standup session (or restore from persisted state if same room and not timed out).
 */
export async function startStandupSession(roomId: string): Promise<void> {
  const restored = await loadPersistedSession();
  if (restored && restored.roomId === roomId) {
    currentSession = restored;
    logger.info(
      `[STANDUP_STATE] Session restored in room ${roomId} (${currentSession.reportedAgents.size} already reported)`,
    );
  } else {
    currentSession = {
      startedAt: Date.now(),
      roomId,
      currentAgent: STANDUP_ORDER[0] ?? "vince",
      reportedAgents: new Set(),
      lastActivityAt: Date.now(),
      isWrappingUp: false,
    };
    logger.info(`[STANDUP_STATE] Session started in room ${roomId}`);
  }
  await persistSession();
}

/**
 * Check if a standup session is active
 */
export function isStandupActive(roomId?: string): boolean {
  if (!currentSession) return false;

  // Check for timeout
  const now = Date.now();
  if (now - currentSession.startedAt > getStandupSessionTimeoutMs()) {
    logger.info("[STANDUP_STATE] Session timed out");
    currentSession = null;
    return false;
  }

  // Optional room check
  if (roomId && currentSession.roomId !== roomId) {
    return false;
  }

  return true;
}

/**
 * Check if any standup is currently running (regardless of room).
 * Used as a collision guard between manual and scheduled standups.
 */
export function isStandupRunning(): boolean {
  if (!currentSession) return false;
  const now = Date.now();
  if (now - currentSession.startedAt > getStandupSessionTimeoutMs()) {
    currentSession = null;
    return false;
  }
  return true;
}

/**
 * Mark an agent as having reported
 */
export function markAgentReported(agentName: string): void {
  if (!currentSession) return;

  const normalized = agentName.toLowerCase();
  if (STANDUP_ORDER.includes(normalized)) {
    currentSession.reportedAgents.add(normalized);
    currentSession.lastActivityAt = Date.now();
    logger.info(
      `[STANDUP_STATE] ${agentName} marked as reported (${currentSession.reportedAgents.size}/${STANDUP_ORDER.length})`,
    );
    void persistSession();
  }
}

/**
 * Check if an agent has already reported
 */
export function hasAgentReported(agentName: string): boolean {
  if (!currentSession) return false;
  const normalized = agentName.toLowerCase();
  return currentSession.reportedAgents.has(normalized);
}

/**
 * Get the next agent that should report
 */
export function getNextUnreportedAgent(): string | null {
  if (!currentSession) return null;

  for (const agent of STANDUP_ORDER) {
    if (!currentSession.reportedAgents.has(agent)) {
      return agent;
    }
  }
  return null; // All reported
}

/**
 * Check if all agents have reported
 */
export function haveAllAgentsReported(): boolean {
  if (!currentSession) return false;
  return currentSession.reportedAgents.size >= STANDUP_ORDER.length;
}

/**
 * Check if we should skip the current agent due to inactivity
 */
export function shouldSkipCurrentAgent(): boolean {
  if (!currentSession) return false;

  const timeSinceActivity = Date.now() - currentSession.lastActivityAt;
  return timeSinceActivity > getStandupInactivityTimeoutMs();
}

/**
 * Get time since last activity (for UI/logging)
 */
export function getTimeSinceLastActivity(): number {
  if (!currentSession) return 0;
  return Date.now() - currentSession.lastActivityAt;
}

/**
 * Mark standup as wrapping up (generating Day Report)
 */
export function markWrappingUp(): void {
  if (!currentSession) return;
  currentSession.isWrappingUp = true;
  logger.info("[STANDUP_STATE] Standup wrapping up");
  void persistSession();
}

/**
 * Check if standup is in wrap-up phase
 */
export function isWrappingUp(): boolean {
  return currentSession?.isWrappingUp ?? false;
}

/**
 * End the standup session and clear persisted state.
 */
export async function endStandupSession(): Promise<void> {
  if (currentSession) {
    const duration = Math.round((Date.now() - currentSession.startedAt) / 1000);
    logger.info(
      `[STANDUP_STATE] Session ended after ${duration}s, ${currentSession.reportedAgents.size} agents reported`,
    );
  }
  currentSession = null;
  await persistSession();
}

/**
 * Get session stats for debugging
 */
export function getSessionStats(): {
  active: boolean;
  reported: string[];
  remaining: string[];
  durationSec: number;
} {
  if (!currentSession) {
    return {
      active: false,
      reported: [],
      remaining: [...STANDUP_ORDER],
      durationSec: 0,
    };
  }

  const reported = [...currentSession.reportedAgents];
  const remaining = STANDUP_ORDER.filter(
    (a) => !currentSession!.reportedAgents.has(a),
  );
  const durationSec = Math.round(
    (Date.now() - currentSession.startedAt) / 1000,
  );

  return { active: true, reported, remaining, durationSec };
}

/**
 * Update activity timestamp (call when any standup-related message is seen)
 */
export function touchActivity(): void {
  if (currentSession) {
    currentSession.lastActivityAt = Date.now();
    void persistSession();
  }
}

/**
 * Check if this message is from Kelly (to prevent self-loops)
 */
export function isKellyMessage(senderName: string): boolean {
  return senderName.toLowerCase().includes("kelly");
}
