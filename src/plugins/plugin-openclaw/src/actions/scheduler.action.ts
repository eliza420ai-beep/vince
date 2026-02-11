import {
  Action,
  ActionResult,
  HandlerCallback,
  IAgentRuntime,
  Memory,
  State,
  logger,
} from "@elizaos/core";
import {
  getSchedules,
  createSchedule,
  deleteSchedule,
  toggleSchedule,
  formatSchedules,
  formatFrequency,
} from "../services/scheduler.service";

interface SchedulerActionParams {
  action?: "list" | "create" | "delete" | "toggle";
  tokens?: string;
  frequency?: "hourly" | "daily" | "weekly";
  scheduleId?: string;
}

export const schedulerAction: Action = {
  name: "MANAGE_SCHEDULE",
  similes: [
    "SCHEDULE",
    "SCHEDULED",
    "AUTO_RESEARCH",
    "RECURRING",
    "AUTOMATIC",
    "CRON",
  ],
  description: `Schedule automatic periodic research for tokens.

Commands:
- schedule SOL BTC daily - Create daily research
- schedule SOL hourly - Create hourly research
- schedules - View all scheduled research
- unschedule <id> - Delete a schedule
- toggle <id> - Enable/disable schedule

Frequencies: hourly, daily, weekly`,

  parameters: {
    action: {
      type: "string",
      description: "Action: list, create, delete, toggle",
      required: false,
    },
    tokens: {
      type: "string",
      description: "Tokens to research (e.g., 'SOL BTC')",
      required: false,
    },
    frequency: {
      type: "string",
      description: "Frequency: hourly, daily, weekly",
      required: false,
    },
    scheduleId: {
      type: "string",
      description: "Schedule ID for delete/toggle",
      required: false,
    },
  },

  validate: async (): Promise<boolean> => true,

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    options?: SchedulerActionParams,
    callback?: HandlerCallback,
  ): Promise<ActionResult> => {
    try {
      const composedState = await runtime.composeState(message, ["ACTION_STATE"], true);
      const params = (composedState?.data?.actionParams || options || {}) as SchedulerActionParams;

      const action = params.action || "list";
      let text = "";

      switch (action) {
        case "create": {
          const tokensStr = params.tokens || "";
          const tokens = tokensStr.toUpperCase().split(/[\s,]+/).filter(t => t.length > 0);
          const frequency = params.frequency || "daily";

          if (tokens.length === 0) {
            text = `❌ **Specify tokens to schedule**

Example: \`@VINCE schedule SOL BTC daily\``;
            break;
          }

          if (!["hourly", "daily", "weekly"].includes(frequency)) {
            text = `❌ **Invalid frequency**

Options: hourly, daily, weekly

Example: \`@VINCE schedule SOL BTC daily\``;
            break;
          }

          const schedule = createSchedule(tokens, "all", frequency as any);
          const nextRun = new Date(schedule.nextRun).toLocaleString();

          text = `✅ **Scheduled Research Created**

📋 **Tokens:** ${tokens.join(", ")}
⏰ **Frequency:** ${formatFrequency(frequency as any)}
📅 **Next run:** ${nextRun}
🆔 **ID:** \`${schedule.id}\`

---
Manage: \`@VINCE schedules\``;
          break;
        }

        case "delete": {
          const id = params.scheduleId;
          if (!id) {
            text = `❌ **Specify schedule ID**

Example: \`@VINCE unschedule sched-123456\`

View IDs: \`@VINCE schedules\``;
            break;
          }

          const deleted = deleteSchedule(id);
          text = deleted
            ? `✅ **Deleted schedule** \`${id}\``
            : `❌ **Schedule not found:** \`${id}\``;
          break;
        }

        case "toggle": {
          const id = params.scheduleId;
          if (!id) {
            text = `❌ **Specify schedule ID**

Example: \`@VINCE toggle sched-123456\``;
            break;
          }

          const schedule = toggleSchedule(id);
          if (schedule) {
            const status = schedule.enabled ? "✅ Enabled" : "⏸️ Paused";
            text = `${status} schedule \`${id}\``;
          } else {
            text = `❌ **Schedule not found:** \`${id}\``;
          }
          break;
        }

        case "list":
        default: {
          const schedules = getSchedules();
          text = formatSchedules(schedules);
          break;
        }
      }

      if (callback) {
        await callback({
          text,
          content: { action, tokens: params.tokens, frequency: params.frequency },
          actions: ["MANAGE_SCHEDULE"],
          source: message.content.source,
        });
      }

      return { text, success: true, data: { action } };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logger.error(`[MANAGE_SCHEDULE] Failed: ${msg}`);

      const errorText = `❌ Scheduler error: ${msg}`;
      if (callback) {
        await callback({ text: errorText, content: { error: msg } });
      }
      return { text: errorText, success: false, error: msg };
    }
  },

  examples: [
    [
      { name: "{{user}}", content: { text: "Schedule SOL BTC research daily" } },
      { name: "{{agent}}", content: { text: "✅ **Scheduled Research Created**\n\n📋 **Tokens:** SOL, BTC...", actions: ["MANAGE_SCHEDULE"] } },
    ],
    [
      { name: "{{user}}", content: { text: "Show my schedules" } },
      { name: "{{agent}}", content: { text: "⏰ **Scheduled Research** (2)...", actions: ["MANAGE_SCHEDULE"] } },
    ],
  ],
};
