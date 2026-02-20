/**
 * Mission Control Actions
 *
 * Actions to interact with Mission Control:
 * - Register Satoshi agent
 * - Create research board
 * - Assign tasks
 * - Check task status
 */

import {
  type Action,
  type ActionExample,
  type ActionResult,
  type IAgentRuntime,
  type Memory,
  type State,
  logger,
} from "@elizaos/core";
import { MissionControlService } from "../services/missionControl.service";

export const mcRegisterSatoshiAction: Action = {
  name: "MC_REGISTER_SATOSHI",
  description: "Register Satoshi agent in Mission Control",
  examples: [
    [
      {
        name: "{{name1}}",
        content: { text: "Register Satoshi in Mission Control" },
      },
    ],
  ],

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    return text.includes("register") && text.includes("mission control");
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
  ): Promise<void | ActionResult> => {
    const mc = runtime.getService<MissionControlService>(
      "MISSION_CONTROL_SERVICE",
    );

    if (!mc || !mc.isConfigured()) {
      console.log("⚠️ Mission Control not configured");
      console.log("Set MISSION_CONTROL_TOKEN in environment");
      return { success: false, error: "mission_control_not_configured" };
    }

    try {
      // Check if Satoshi already exists
      const existing = await mc.findSatoshi();
      if (existing) {
        console.log(`✅ Satoshi already registered: ${existing.id}`);
        console.log(`   Status: ${existing.status}`);
        return { success: true };
      }

      // Register Satoshi
      const satoshi = await mc.registerSatoshi();
      if (satoshi) {
        console.log(`✅ Satoshi registered successfully!`);
        console.log(`   ID: ${satoshi.id}`);
        console.log(`   Status: ${satoshi.status}`);
      }

      // Create Satoshi Research Board
      const board = await mc.createSatoshiBoard();
      if (board) {
        console.log(`✅ Created Satoshi Research Board`);
        console.log(`   ID: ${board.id}`);
        console.log(`   Name: ${board.name}`);
      }

      return { success: true };
    } catch (e) {
      logger.error("[MCRegister] Error: " + (e as Error).message);
      return { success: false, error: (e as Error).message };
    }
  },
};

export const mcAssignTaskAction: Action = {
  name: "MC_ASSIGN_TASK",
  description: "Assign a research task to Satoshi via Mission Control",
  examples: [
    [
      {
        name: "{{name1}}",
        content: { text: "Assign task: Research NVDA stock" },
      },
      {
        name: "{{name2}}",
        content: { text: "Create task to analyze Tesla" },
      },
    ],
  ],

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    return text.includes("task") || text.includes("assign");
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
  ): Promise<void | ActionResult> => {
    const mc = runtime.getService<MissionControlService>(
      "MISSION_CONTROL_SERVICE",
    );

    if (!mc || !mc.isConfigured()) {
      console.log("⚠️ Mission Control not configured");
      return { success: false, error: "mission_control_not_configured" };
    }

    const text = message.content?.text || "";

    // Extract task from message
    const taskMatch = text.match(
      /(?:research|analyze|investigate|deep dive)\s+(\w+)/i,
    );
    const ticker = taskMatch ? taskMatch[1].toUpperCase() : null;

    if (!ticker) {
      console.log("⚠️ Could not extract ticker from message");
      return { success: false, error: "could_not_extract_ticker" };
    }

    try {
      // Find Satoshi's board
      const boards = await mc.listBoards();
      const satoshiBoard = boards.find((b) => b.name === "Satoshi Research");

      if (!satoshiBoard) {
        console.log("⚠️ Satoshi Research board not found");
        return { success: false, error: "satoshi_board_not_found" };
      }

      // Create task
      const task = await mc.createTask(satoshiBoard.id, {
        title: `Research ${ticker}`,
        description: `Deep research on ${ticker} stock - fundamentals, news, technicals, and thesis`,
        status: "inbox",
      });

      if (task) {
        console.log(`✅ Task created!`);
        console.log(`   Board: ${satoshiBoard.name}`);
        console.log(`   Task: ${task.title}`);
        console.log(`   ID: ${task.id}`);
      }

      return { success: true };
    } catch (e) {
      logger.error("[MCAssignTask] Error: " + (e as Error).message);
      return { success: false, error: (e as Error).message };
    }
  },
};

export const mcListTasksAction: Action = {
  name: "MC_LIST_TASKS",
  description: "List pending tasks in Mission Control",
  examples: [
    [
      {
        name: "{{name1}}",
        content: { text: "What tasks do I have?" },
      },
    ],
  ],

  validate: async (
    _runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    const text = message.content?.text?.toLowerCase() || "";
    return text.includes("task") || text.includes("todo");
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state: State,
  ): Promise<void | ActionResult> => {
    const mc = runtime.getService<MissionControlService>(
      "MISSION_CONTROL_SERVICE",
    );

    if (!mc || !mc.isConfigured()) {
      console.log("⚠️ Mission Control not configured");
      return { success: false, error: "mission_control_not_configured" };
    }

    try {
      const boards = await mc.listBoards();

      for (const board of boards) {
        const tasks = await mc.listTasks(board.id);
        if (tasks.length > 0) {
          console.log(`\n## ${board.name}`);
          for (const task of tasks) {
            console.log(`- [${task.status}] ${task.title}`);
          }
        }
      }

      return { success: true };
    } catch (e) {
      logger.error("[MCListTasks] Error: " + (e as Error).message);
      return { success: false, error: (e as Error).message };
    }
  },
};
