/**
 * POLYMARKET_EXECUTE_POLL task: worker calls POLYMARKET_EXECUTE_PENDING_ORDER handler directly.
 */

import { describe, it, expect, afterEach } from "vitest";
import { registerPolymarketExecutePollTask } from "../tasks/polymarketExecutePoll.tasks";
import type { IAgentRuntime, Task } from "@elizaos/core";

function createMockRuntime(): IAgentRuntime & {
  _taskWorkers: Array<{
    name: string;
    execute: (rt: IAgentRuntime, opts: unknown, task: Task) => Promise<void>;
  }>;
  _createdTasks: Array<{ name: string; tags: string[] }>;
} {
  const taskWorkers: Array<{
    name: string;
    execute: (rt: IAgentRuntime, opts: unknown, task: Task) => Promise<void>;
  }> = [];
  const createdTasks: Array<{ name: string; tags: string[] }> = [];
  return {
    agentId: "test-otaku",
    registerTaskWorker: (worker: {
      name: string;
      execute: (rt: IAgentRuntime, opts: unknown, task: Task) => Promise<void>;
    }) => {
      taskWorkers.push(worker);
    },
    createTask: async (task: { name: string; tags: string[] }) => {
      createdTasks.push({ name: task.name, tags: task.tags });
      return "task-id" as any;
    },
    updateTask: async () => {},
    actions: [],
    _taskWorkers: taskWorkers,
    _createdTasks: createdTasks,
  } as unknown as IAgentRuntime & {
    _taskWorkers: Array<{
      name: string;
      execute: (rt: IAgentRuntime, opts: unknown, task: Task) => Promise<void>;
    }>;
    _createdTasks: Array<{ name: string; tags: string[] }>;
  };
}

describe("plugin-otaku: polymarketExecutePoll.tasks", () => {
  const origEnv = process.env.POLYMARKET_DESK_SCHEDULE_ENABLED;

  afterEach(() => {
    if (origEnv !== undefined)
      process.env.POLYMARKET_DESK_SCHEDULE_ENABLED = origEnv;
    else delete process.env.POLYMARKET_DESK_SCHEDULE_ENABLED;
  });

  it("registers POLYMARKET_EXECUTE_POLL worker and createTask with queue and repeat tags", async () => {
    const runtime = createMockRuntime();
    registerPolymarketExecutePollTask(runtime);
    await new Promise((r) => setImmediate(r));
    expect(runtime._taskWorkers.length).toBe(1);
    expect(runtime._taskWorkers[0].name).toBe("POLYMARKET_EXECUTE_POLL");
    expect(runtime._createdTasks.length).toBe(1);
    expect(runtime._createdTasks[0].name).toBe("POLYMARKET_EXECUTE_POLL");
    expect(runtime._createdTasks[0].tags).toContain("queue");
    expect(runtime._createdTasks[0].tags).toContain("repeat");
  });

  it("execute poll worker calls POLYMARKET_EXECUTE_PENDING_ORDER handler when action present", async () => {
    delete process.env.POLYMARKET_DESK_SCHEDULE_ENABLED;
    let handlerCalled = false;
    let receivedMsg: any;
    const runtime = createMockRuntime();
    runtime.actions = [
      {
        name: "POLYMARKET_EXECUTE_PENDING_ORDER",
        handler: async (
          _rt: any,
          msg: any,
          _state: any,
          _opts: any,
          callback: any,
        ) => {
          handlerCalled = true;
          receivedMsg = msg;
          if (callback)
            await callback({
              text: "ok",
              actions: ["POLYMARKET_EXECUTE_PENDING_ORDER"],
            });
        },
      } as any,
    ];
    registerPolymarketExecutePollTask(runtime);
    const worker = runtime._taskWorkers[0];
    let updateCalled = false;
    (runtime as any).updateTask = async () => {
      updateCalled = true;
    };
    await worker.execute(runtime, {}, {
      id: "t1",
      name: "POLYMARKET_EXECUTE_POLL",
      tags: [],
      metadata: {},
    } as Task);
    expect(handlerCalled).toBe(true);
    expect(receivedMsg?.content?.text).toBe("execute pending polymarket order");
    expect(updateCalled).toBe(true);
  });

  it("execute poll worker runs updateTask when POLYMARKET_EXECUTE_PENDING_ORDER action not present", async () => {
    delete process.env.POLYMARKET_DESK_SCHEDULE_ENABLED;
    const runtime = createMockRuntime();
    runtime.actions = [];
    registerPolymarketExecutePollTask(runtime);
    const worker = runtime._taskWorkers[0];
    let updateCalled = false;
    (runtime as any).updateTask = async () => {
      updateCalled = true;
    };
    await worker.execute(runtime, {}, {
      id: "t1",
      name: "POLYMARKET_EXECUTE_POLL",
      tags: [],
      metadata: {},
    } as Task);
    expect(updateCalled).toBe(true);
  });

  it("execute poll worker respects POLYMARKET_DESK_SCHEDULE_ENABLED=false", async () => {
    process.env.POLYMARKET_DESK_SCHEDULE_ENABLED = "false";
    let handlerCalled = false;
    const runtime = createMockRuntime();
    runtime.actions = [
      {
        name: "POLYMARKET_EXECUTE_PENDING_ORDER",
        handler: async () => {
          handlerCalled = true;
        },
      } as any,
    ];
    registerPolymarketExecutePollTask(runtime);
    const worker = runtime._taskWorkers[0];
    let updateCalled = false;
    (runtime as any).updateTask = async () => {
      updateCalled = true;
    };
    await worker.execute(runtime, {}, {
      id: "t1",
      name: "POLYMARKET_EXECUTE_POLL",
      tags: [],
      metadata: {},
    } as Task);
    expect(handlerCalled).toBe(false);
    expect(updateCalled).toBe(false);
  });
});
