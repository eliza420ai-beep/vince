/**
 * Standup State Manager
 * 
 * Tracks the current standup session to prevent:
 * - Duplicate agent calls
 * - Kelly self-loops
 * - Calling agents out of order
 * 
 * State resets after standup completes or times out.
 */

import { logger } from "@elizaos/core";
import { STANDUP_REPORT_ORDER } from "./standup.constants";

/** Standup turn order (lowercase); derived dynamically from canonical STANDUP_REPORT_ORDER */
const STANDUP_ORDER: readonly string[] = STANDUP_REPORT_ORDER.map((n) => n.toLowerCase());

type StandupAgent = string;

interface StandupSession {
  startedAt: number;
  roomId: string;
  currentAgent: StandupAgent | null;
  reportedAgents: Set<StandupAgent>;
  lastActivityAt: number;
  isWrappingUp: boolean;
}

/** In-memory standup state (resets on restart) */
let currentSession: StandupSession | null = null;

/** Session timeout: 30 minutes */
const SESSION_TIMEOUT_MS = 30 * 60 * 1000;

/** Inactivity timeout: 5 minutes (skip agent if no response) */
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Start a new standup session
 */
export function startStandupSession(roomId: string): void {
  currentSession = {
    startedAt: Date.now(),
    roomId,
    currentAgent: STANDUP_ORDER[0] ?? "vince", // First agent
    reportedAgents: new Set(),
    lastActivityAt: Date.now(),
    isWrappingUp: false,
  };
  logger.info(`[STANDUP_STATE] Session started in room ${roomId}`);
}

/**
 * Check if a standup session is active
 */
export function isStandupActive(roomId?: string): boolean {
  if (!currentSession) return false;
  
  // Check for timeout
  const now = Date.now();
  if (now - currentSession.startedAt > SESSION_TIMEOUT_MS) {
    logger.info("[STANDUP_STATE] Session timed out (30 min)");
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
  if (now - currentSession.startedAt > SESSION_TIMEOUT_MS) {
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
    logger.info(`[STANDUP_STATE] ${agentName} marked as reported (${currentSession.reportedAgents.size}/${STANDUP_ORDER.length})`);
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
  return timeSinceActivity > INACTIVITY_TIMEOUT_MS;
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
}

/**
 * Check if standup is in wrap-up phase
 */
export function isWrappingUp(): boolean {
  return currentSession?.isWrappingUp ?? false;
}

/**
 * End the standup session
 */
export function endStandupSession(): void {
  if (currentSession) {
    const duration = Math.round((Date.now() - currentSession.startedAt) / 1000);
    logger.info(`[STANDUP_STATE] Session ended after ${duration}s, ${currentSession.reportedAgents.size} agents reported`);
  }
  currentSession = null;
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
    return { active: false, reported: [], remaining: [...STANDUP_ORDER], durationSec: 0 };
  }
  
  const reported = [...currentSession.reportedAgents];
  const remaining = STANDUP_ORDER.filter((a) => !currentSession!.reportedAgents.has(a));
  const durationSec = Math.round((Date.now() - currentSession.startedAt) / 1000);
  
  return { active: true, reported, remaining, durationSec };
}

/**
 * Update activity timestamp (call when any standup-related message is seen)
 */
export function touchActivity(): void {
  if (currentSession) {
    currentSession.lastActivityAt = Date.now();
  }
}

/**
 * Check if this message is from Kelly (to prevent self-loops)
 */
export function isKellyMessage(senderName: string): boolean {
  return senderName.toLowerCase().includes("kelly");
}
