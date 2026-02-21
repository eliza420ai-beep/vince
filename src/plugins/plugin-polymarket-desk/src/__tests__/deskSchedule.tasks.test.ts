import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { registerDeskSchedule } from "../tasks/deskSchedule.tasks";
import type { IAgentRuntime, Task } from "@elizaos/core";

function createMockRuntime(characterName: string): IAgentRuntime {
  const taskWorkers: Array<{
    name: string;
    execute: (rt: IAgentRuntime, opts: unknown, task: Task) => Promise<void>;
  }> = [];
  const createdTasks: Array<{
    name: string;
    description: string;
    tags: string[];
    metadata: Record<string, unknown>;
  }> = [];
  return {
    character: { name: characterName },
    agentId: "test-agent",
    registerTaskWorker: (worker: {
      name: string;
      execute: (rt: IAgentRuntime, opts: unknown, task: Task) => Promise<void>;
    }) => {
      taskWorkers.push(worker);
    },
    createTask: async (task: {
      name: string;
      description: string;
      tags: string[];
      metadata?: Record<string, unknown>;
    }) => {
      createdTasks.push({
        name: task.name,
        description: task.description,
        tags: task.tags,
        metadata: task.metadata ?? {},
      });
      return "task-id" as any;
    },
    updateTask: async () => {},
    actions: [],
    getConnection: async () => null,
    getSetting: () => undefined,
    // Expose for assertions
    _taskWorkers: taskWorkers,
    _createdTasks: createdTasks,
  } as unknown as IAgentRuntime & {
    _taskWorkers: Array<{ name: string }>;
    _createdTasks: Array<{ name: string; description: string; tags: string[] }>;
  };
}

describe("plugin-polymarket-desk: deskSchedule.tasks", () => {
  const origEnv = process.env.POLYMARKET_DESK_SCHEDULE_ENABLED;
  const origCondition = process.env.POLYMARKET_DESK_DEFAULT_CONDITION_ID;

  afterEach(() => {
    if (origEnv !== undefined)
      process.env.POLYMARKET_DESK_SCHEDULE_ENABLED = origEnv;
    else delete process.env.POLYMARKET_DESK_SCHEDULE_ENABLED;
    if (origCondition !== undefined)
      process.env.POLYMARKET_DESK_DEFAULT_CONDITION_ID = origCondition;
    else delete process.env.POLYMARKET_DESK_DEFAULT_CONDITION_ID;
  });

  it("registerDeskSchedule does nothing for unknown character name", () => {
    const runtime = createMockRuntime("Other Agent");
    registerDeskSchedule(runtime);
    expect((runtime as any)._taskWorkers.length).toBe(0);
    expect((runtime as any)._createdTasks.length).toBe(0);
  });

  it("registerDeskSchedule registers analyst, risk, perf for Oracle only", async () => {
    const runtime = createMockRuntime("Oracle");
    registerDeskSchedule(runtime);
    await new Promise((r) => setImmediate(r));
    expect((runtime as any)._taskWorkers.length).toBe(3);
    expect(
      (runtime as any)._taskWorkers.map((w: { name: string }) => w.name),
    ).toEqual([
      "POLYMARKET_ANALYST_HOURLY",
      "POLYMARKET_RISK_15M",
      "POLYMARKET_PERF_4H",
    ]);
    expect((runtime as any)._createdTasks.length).toBe(3);
    expect((runtime as any)._createdTasks[0].name).toBe(
      "POLYMARKET_ANALYST_HOURLY",
    );
    expect((runtime as any)._createdTasks[0].tags).toContain("analyst");
    expect((runtime as any)._createdTasks[0].tags).toContain("queue");
    expect((runtime as any)._createdTasks[0].tags).toContain("repeat");
    expect((runtime as any)._createdTasks[1].name).toBe("POLYMARKET_RISK_15M");
    expect((runtime as any)._createdTasks[1].tags).toContain("risk");
    expect((runtime as any)._createdTasks[1].tags).toContain("queue");
    expect((runtime as any)._createdTasks[1].tags).toContain("repeat");
    expect((runtime as any)._createdTasks[2].name).toBe("POLYMARKET_PERF_4H");
    expect((runtime as any)._createdTasks[2].tags).toContain("performance");
    expect((runtime as any)._createdTasks[2].tags).toContain("queue");
    expect((runtime as any)._createdTasks[2].tags).toContain("repeat");
  });

  it("registerDeskSchedule does nothing for Polymarket Risk (consolidated under Oracle)", () => {
    const runtime = createMockRuntime("Polymarket Risk");
    registerDeskSchedule(runtime);
    expect((runtime as any)._taskWorkers.length).toBe(0);
    expect((runtime as any)._createdTasks.length).toBe(0);
  });

  it("registerDeskSchedule does nothing for Polymarket Performance (consolidated under Oracle)", () => {
    const runtime = createMockRuntime("Polymarket Performance");
    registerDeskSchedule(runtime);
    expect((runtime as any)._taskWorkers.length).toBe(0);
    expect((runtime as any)._createdTasks.length).toBe(0);
  });

  it("analyst task worker respects POLYMARKET_DESK_SCHEDULE_ENABLED=false", async () => {
    process.env.POLYMARKET_DESK_SCHEDULE_ENABLED = "false";
    const runtime = createMockRuntime("Oracle");
    registerDeskSchedule(runtime);
    const worker = (runtime as any)._taskWorkers[0];
    expect(worker).toBeDefined();
    let updateCalled = false;
    (runtime as any).updateTask = async () => {
      updateCalled = true;
    };
    await worker.execute(runtime, {}, {
      id: "t1",
      name: "POLYMARKET_ANALYST_HOURLY",
      tags: [],
      metadata: {},
    } as Task);
    // When schedule is disabled, worker returns early and does not call updateTask
    expect(updateCalled).toBe(false);
  });

  it("analyst task worker skips when POLYMARKET_DESK_DEFAULT_CONDITION_ID not set", async () => {
    delete process.env.POLYMARKET_DESK_SCHEDULE_ENABLED;
    delete process.env.POLYMARKET_DESK_DEFAULT_CONDITION_ID;
    const runtime = createMockRuntime("Oracle");
    runtime.actions = [];
    registerDeskSchedule(runtime);
    const worker = (runtime as any)._taskWorkers[0];
    let updateCalled = false;
    (runtime as any).updateTask = async () => {
      updateCalled = true;
    };
    await worker.execute(runtime, {}, {
      id: "t1",
      name: "POLYMARKET_ANALYST_HOURLY",
      tags: [],
      metadata: {},
    } as Task);
    expect(updateCalled).toBe(true);
  });

  it("analyst task worker runs edge check and updateTask when condition_id set", async () => {
    delete process.env.POLYMARKET_DESK_SCHEDULE_ENABLED;
    process.env.POLYMARKET_DESK_DEFAULT_CONDITION_ID = "0xcond123";
    let handlerCalled = false;
    const runtime = createMockRuntime("Oracle");
    runtime.actions = [
      {
        name: "POLYMARKET_EDGE_CHECK",
        handler: async (_rt, _msg, _state, options) => {
          handlerCalled = true;
          expect(options?.condition_id).toBe("0xcond123");
          expect(options?.asset).toBe("BTC");
        },
      } as any,
    ];
    registerDeskSchedule(runtime);
    const worker = (runtime as any)._taskWorkers[0];
    let updateCalled = false;
    (runtime as any).updateTask = async () => {
      updateCalled = true;
    };
    await worker.execute(runtime, {}, {
      id: "t1",
      name: "POLYMARKET_ANALYST_HOURLY",
      tags: [],
      metadata: {},
    } as Task);
    expect(handlerCalled).toBe(true);
    expect(updateCalled).toBe(true);
  });

  it("risk 15m worker calls POLYMARKET_RISK_APPROVE handler and updateTask", async () => {
    delete process.env.POLYMARKET_DESK_SCHEDULE_ENABLED;
    let riskHandlerCalled = false;
    let handlerOptions: Record<string, unknown> = {};
    const runtime = createMockRuntime("Oracle");
    runtime.actions = [
      {
        name: "POLYMARKET_RISK_APPROVE",
        handler: async (_rt: any, msg: any, _state: any, options: any) => {
          riskHandlerCalled = true;
          handlerOptions = options ?? {};
          expect(msg?.content?.text).toBe("risk approve");
        },
      } as any,
    ];
    registerDeskSchedule(runtime);
    const worker = (runtime as any)._taskWorkers[1];
    let updateCalled = false;
    (runtime as any).updateTask = async () => {
      updateCalled = true;
    };
    await worker.execute(runtime, {}, {
      id: "t2",
      name: "POLYMARKET_RISK_15M",
      tags: [],
      metadata: {},
    } as Task);
    expect(riskHandlerCalled).toBe(true);
    expect(updateCalled).toBe(true);
    expect(handlerOptions).toBeDefined();
  });

  it("risk 15m worker runs updateTask when POLYMARKET_RISK_APPROVE action not present", async () => {
    delete process.env.POLYMARKET_DESK_SCHEDULE_ENABLED;
    const runtime = createMockRuntime("Oracle");
    runtime.actions = [];
    registerDeskSchedule(runtime);
    const worker = (runtime as any)._taskWorkers[1];
    let updateCalled = false;
    (runtime as any).updateTask = async () => {
      updateCalled = true;
    };
    await worker.execute(runtime, {}, {
      id: "t2",
      name: "POLYMARKET_RISK_15M",
      tags: [],
      metadata: {},
    } as Task);
    expect(updateCalled).toBe(true);
  });

  it("risk 15m worker passes wallet_address in options when POLYMARKET_DESK_WALLET_ADDRESS set", async () => {
    delete process.env.POLYMARKET_DESK_SCHEDULE_ENABLED;
    process.env.POLYMARKET_DESK_WALLET_ADDRESS = "0xWallet123";
    let handlerOptions: Record<string, unknown> = {};
    const runtime = createMockRuntime("Oracle");
    runtime.actions = [
      {
        name: "POLYMARKET_RISK_APPROVE",
        handler: async (_rt: any, _msg: any, _state: any, options: any) => {
          handlerOptions = options ?? {};
        },
      } as any,
    ];
    registerDeskSchedule(runtime);
    const worker = (runtime as any)._taskWorkers[1];
    await worker.execute(runtime, {}, {
      id: "t2",
      name: "POLYMARKET_RISK_15M",
      tags: [],
      metadata: {},
    } as Task);
    expect(handlerOptions.wallet_address).toBe("0xWallet123");
    delete process.env.POLYMARKET_DESK_WALLET_ADDRESS;
  });

  it("perf 4h worker runs desk report action and updateTask", async () => {
    delete process.env.POLYMARKET_DESK_SCHEDULE_ENABLED;
    let reportHandlerCalled = false;
    const runtime = createMockRuntime("Oracle");
    runtime.actions = [
      {
        name: "POLYMARKET_DESK_REPORT",
        handler: async (_rt: any, _msg: any, _state: any, options: any) => {
          reportHandlerCalled = true;
          expect(options?.hours).toBe(24 * 7);
        },
      } as any,
    ];
    registerDeskSchedule(runtime);
    const worker = (runtime as any)._taskWorkers[2];
    let updateCalled = false;
    (runtime as any).updateTask = async () => {
      updateCalled = true;
    };
    await worker.execute(runtime, {}, {
      id: "t3",
      name: "POLYMARKET_PERF_4H",
      tags: [],
      metadata: {},
    } as Task);
    expect(reportHandlerCalled).toBe(true);
    expect(updateCalled).toBe(true);
  });

  it("perf 4h worker respects POLYMARKET_DESK_SCHEDULE_ENABLED=false", async () => {
    process.env.POLYMARKET_DESK_SCHEDULE_ENABLED = "false";
    const runtime = createMockRuntime("Oracle");
    runtime.actions = [
      { name: "POLYMARKET_DESK_REPORT", handler: async () => {} } as any,
    ];
    registerDeskSchedule(runtime);
    const worker = (runtime as any)._taskWorkers[2];
    let updateCalled = false;
    (runtime as any).updateTask = async () => {
      updateCalled = true;
    };
    await worker.execute(runtime, {}, {
      id: "t3",
      name: "POLYMARKET_PERF_4H",
      tags: [],
      metadata: {},
    } as Task);
    expect(updateCalled).toBe(false);
  });

  it("analyst task worker runs updateTask only when condition_id set but no edge check action", async () => {
    delete process.env.POLYMARKET_DESK_SCHEDULE_ENABLED;
    process.env.POLYMARKET_DESK_DEFAULT_CONDITION_ID = "0xcond456";
    const runtime = createMockRuntime("Oracle");
    runtime.actions = [];
    registerDeskSchedule(runtime);
    const worker = (runtime as any)._taskWorkers[0];
    let updateCalled = false;
    (runtime as any).updateTask = async () => {
      updateCalled = true;
    };
    await worker.execute(runtime, {}, {
      id: "t1",
      name: "POLYMARKET_ANALYST_HOURLY",
      tags: [],
      metadata: {},
    } as Task);
    expect(updateCalled).toBe(true);
  });

  it("perf 4h worker runs updateTask only when no desk report action", async () => {
    delete process.env.POLYMARKET_DESK_SCHEDULE_ENABLED;
    const runtime = createMockRuntime("Oracle");
    runtime.actions = [];
    registerDeskSchedule(runtime);
    const worker = (runtime as any)._taskWorkers[2];
    let updateCalled = false;
    (runtime as any).updateTask = async () => {
      updateCalled = true;
    };
    await worker.execute(runtime, {}, {
      id: "t3",
      name: "POLYMARKET_PERF_4H",
      tags: [],
      metadata: {},
    } as Task);
    expect(updateCalled).toBe(true);
  });

  it("createTask analyst catch runs when createTask rejects", async () => {
    let catchErr: unknown;
    const runtime = createMockRuntime("Oracle");
    (runtime as any).createTask = () =>
      Promise.reject((catchErr = new Error("createTask analyst failed")));
    registerDeskSchedule(runtime);
    await new Promise((r) => setImmediate(r));
    expect(catchErr).toBeDefined();
  });

  it("createTask risk catch runs when createTask rejects", async () => {
    let catchErr: unknown;
    const runtime = createMockRuntime("Oracle");
    (runtime as any).createTask = () =>
      Promise.reject((catchErr = new Error("createTask risk failed")));
    registerDeskSchedule(runtime);
    await new Promise((r) => setImmediate(r));
    expect(catchErr).toBeDefined();
  });

  it("createTask perf catch runs when createTask rejects", async () => {
    let catchErr: unknown;
    const runtime = createMockRuntime("Oracle");
    (runtime as any).createTask = () =>
      Promise.reject((catchErr = new Error("createTask perf failed")));
    registerDeskSchedule(runtime);
    await new Promise((r) => setImmediate(r));
    expect(catchErr).toBeDefined();
  });
});
