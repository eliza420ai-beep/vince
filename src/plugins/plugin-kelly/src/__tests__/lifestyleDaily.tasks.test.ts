/**
 * Task registration tests: KELLY_LIFESTYLE_DAILY and KELLY_NUDGE_WEDNESDAY.
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  registerKellyLifestyleDailyTask,
  registerKellyNudgeTask,
} from "../tasks/lifestyleDaily.tasks";
import { createMockRuntime } from "./test-utils";
import type { UUID } from "@elizaos/core";

describe("Kelly lifestyle daily tasks", () => {
  let envSnapshot: Record<string, string | undefined>;

  beforeEach(() => {
    envSnapshot = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...envSnapshot };
  });

  describe("registerKellyLifestyleDailyTask", () => {
    it("calls createTask with name KELLY_LIFESTYLE_DAILY and metadata updateInterval when enabled", async () => {
      delete process.env.KELLY_LIFESTYLE_DAILY_ENABLED;
      const createTaskCalls: Array<{
        name: string;
        metadata?: { updateInterval?: number };
      }> = [];
      const runtime = createMockRuntime({
        createTask: async (task: any) => {
          createTaskCalls.push({
            name: task.name,
            metadata: task.metadata,
          });
          return "task-uuid" as UUID;
        },
        registerTaskWorker: () => {},
      }) as any;

      await registerKellyLifestyleDailyTask(runtime);

      expect(createTaskCalls.length).toBeGreaterThanOrEqual(1);
      const dailyTask = createTaskCalls.find(
        (c) => c.name === "KELLY_LIFESTYLE_DAILY",
      );
      expect(dailyTask).toBeDefined();
      expect(dailyTask?.metadata?.updateInterval).toBeDefined();
      expect(typeof dailyTask?.metadata?.updateInterval).toBe("number");
    });

    it("does not call createTask when KELLY_LIFESTYLE_DAILY_ENABLED=false", async () => {
      process.env.KELLY_LIFESTYLE_DAILY_ENABLED = "false";
      let createTaskCallCount = 0;
      const runtime = createMockRuntime({
        createTask: async () => {
          createTaskCallCount++;
          return "task-uuid" as UUID;
        },
        registerTaskWorker: () => {},
      }) as any;

      await registerKellyLifestyleDailyTask(runtime);

      expect(createTaskCallCount).toBe(0);
    });
  });

  describe("registerKellyNudgeTask", () => {
    it("calls createTask with name KELLY_NUDGE_WEDNESDAY when KELLY_NUDGE_ENABLED=true", async () => {
      process.env.KELLY_NUDGE_ENABLED = "true";
      const createTaskCalls: Array<{
        name: string;
        metadata?: { updateInterval?: number };
      }> = [];
      const runtime = createMockRuntime({
        createTask: async (task: any) => {
          createTaskCalls.push({
            name: task.name,
            metadata: task.metadata,
          });
          return "task-uuid" as UUID;
        },
        registerTaskWorker: () => {},
      }) as any;

      await registerKellyNudgeTask(runtime);

      expect(createTaskCalls.length).toBeGreaterThanOrEqual(1);
      const nudgeTask = createTaskCalls.find(
        (c) => c.name === "KELLY_NUDGE_WEDNESDAY",
      );
      expect(nudgeTask).toBeDefined();
      expect(nudgeTask?.metadata?.updateInterval).toBeDefined();
    });

    it("does not call createTask when KELLY_NUDGE_ENABLED is not set", async () => {
      delete process.env.KELLY_NUDGE_ENABLED;
      let createTaskCallCount = 0;
      const runtime = createMockRuntime({
        createTask: async () => {
          createTaskCallCount++;
          return "task-uuid" as UUID;
        },
        registerTaskWorker: () => {},
      }) as any;

      await registerKellyNudgeTask(runtime);

      expect(createTaskCallCount).toBe(0);
    });
  });
});
