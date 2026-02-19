/**
 * Tests for standup state manager (session tracking, turn order, wrap-up).
 * Uses a temp dir for STANDUP_DELIVERABLES_DIR so session persistence does not affect other tests.
 */

import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, it, expect, beforeEach } from "bun:test";
import {
  startStandupSession,
  endStandupSession,
  isStandupActive,
  isStandupRunning,
  markAgentReported,
  hasAgentReported,
  getNextUnreportedAgent,
  haveAllAgentsReported,
  shouldSkipCurrentAgent,
  getTimeSinceLastActivity,
  markWrappingUp,
  isWrappingUp,
  getSessionStats,
  touchActivity,
  isKellyMessage,
} from "../standupState";
import { STANDUP_REPORT_ORDER } from "../standup.constants";

describe("standupState", () => {
  const roomId = "room-123";
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(
      os.tmpdir(),
      `standup-state-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    await fs.mkdir(tempDir, { recursive: true });
    process.env.STANDUP_DELIVERABLES_DIR = tempDir;
    await endStandupSession();
  });

  describe("startStandupSession / endStandupSession", () => {
    it("starts a session and makes it active", async () => {
      await startStandupSession(roomId);
      expect(isStandupActive(roomId)).toBe(true);
      expect(isStandupRunning()).toBe(true);
      await endStandupSession();
      expect(isStandupActive(roomId)).toBe(false);
      expect(isStandupRunning()).toBe(false);
    });

    it("session is not active for different room when roomId is passed", async () => {
      await startStandupSession(roomId);
      expect(isStandupActive(roomId)).toBe(true);
      expect(isStandupActive("other-room")).toBe(false);
      await endStandupSession();
    });

    it("getSessionStats returns correct initial state", async () => {
      await startStandupSession(roomId);
      const stats = getSessionStats();
      expect(stats.active).toBe(true);
      expect(stats.reported).toEqual([]);
      expect(stats.remaining).toEqual(
        STANDUP_REPORT_ORDER.map((n) => n.toLowerCase()),
      );
      expect(stats.durationSec).toBeGreaterThanOrEqual(0);
      await endStandupSession();
    });

    it("getSessionStats returns inactive when no session", () => {
      const stats = getSessionStats();
      expect(stats.active).toBe(false);
      expect(stats.reported).toEqual([]);
      expect(stats.remaining.length).toBe(STANDUP_REPORT_ORDER.length);
      expect(stats.durationSec).toBe(0);
    });
  });

  describe("markAgentReported / hasAgentReported / getNextUnreportedAgent", () => {
    it("marks agent as reported and getNextUnreportedAgent returns next in order", async () => {
      await startStandupSession(roomId);
      const first = getNextUnreportedAgent();
      expect(first).toBe("vince");
      expect(hasAgentReported("VINCE")).toBe(false);
      markAgentReported("VINCE");
      expect(hasAgentReported("VINCE")).toBe(true);
      expect(hasAgentReported("vince")).toBe(true);
      const second = getNextUnreportedAgent();
      expect(second).toBe("eliza");
      markAgentReported("Eliza");
      const third = getNextUnreportedAgent();
      expect(third).toBe("echo");
      await endStandupSession();
    });

    it("haveAllAgentsReported is false until all report", async () => {
      await startStandupSession(roomId);
      expect(haveAllAgentsReported()).toBe(false);
      for (const name of STANDUP_REPORT_ORDER) {
        markAgentReported(name);
      }
      expect(haveAllAgentsReported()).toBe(true);
      expect(getNextUnreportedAgent()).toBe(null);
      await endStandupSession();
    });

    it("markAgentReported does nothing when no session", () => {
      markAgentReported("VINCE");
      expect(hasAgentReported("VINCE")).toBe(false);
    });
  });

  describe("getTimeSinceLastActivity / touchActivity / shouldSkipCurrentAgent", () => {
    it("getTimeSinceLastActivity returns 0 when no session", () => {
      expect(getTimeSinceLastActivity()).toBe(0);
    });

    it("touchActivity updates last activity", async () => {
      await startStandupSession(roomId);
      const t0 = getTimeSinceLastActivity();
      expect(t0).toBeGreaterThanOrEqual(0);
      touchActivity();
      const t1 = getTimeSinceLastActivity();
      expect(t1).toBeLessThanOrEqual(t0 + 100);
      await endStandupSession();
    });

    it("shouldSkipCurrentAgent is false when no session", () => {
      expect(shouldSkipCurrentAgent()).toBe(false);
    });
  });

  describe("markWrappingUp / isWrappingUp", () => {
    it("markWrappingUp sets wrap-up state", async () => {
      await startStandupSession(roomId);
      expect(isWrappingUp()).toBe(false);
      markWrappingUp();
      expect(isWrappingUp()).toBe(true);
      await endStandupSession();
      expect(isWrappingUp()).toBe(false);
    });

    it("markWrappingUp does nothing when no session", () => {
      markWrappingUp();
      expect(isWrappingUp()).toBe(false);
    });
  });

  describe("isKellyMessage", () => {
    it("returns true for names containing kelly (case-insensitive)", () => {
      expect(isKellyMessage("Kelly")).toBe(true);
      expect(isKellyMessage("kelly")).toBe(true);
      expect(isKellyMessage("Kelly Bot")).toBe(true);
    });

    it("returns false for other names", () => {
      expect(isKellyMessage("VINCE")).toBe(false);
      expect(isKellyMessage("Sentinel")).toBe(false);
    });
  });
});
