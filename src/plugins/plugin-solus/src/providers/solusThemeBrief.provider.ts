import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
  State,
} from "@elizaos/core";
import type { SolusThemeBriefService } from "../services/solusThemeBrief.service";

function shouldInjectThemeBrief(messageText: string): boolean {
  const t = (messageText || "").toLowerCase();
  const keywords = [
    "stock",
    "stocks",
    "analyze",
    "theme",
    "thesis",
    "ai infrastructure",
    "power",
    "grid",
    "permit",
    "interconnect",
    "data center",
    "hosting",
  ];
  return keywords.some((k) => t.includes(k));
}

export const solusThemeBriefProvider: Provider = {
  name: "SOLUS_THEME_BRIEF",
  description:
    "AI bottleneck theme context for Solus stock analysis (power, permits, hosting conversion).",
  position: 11,
  get: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
  ): Promise<ProviderResult> => {
    const text = message.content?.text || "";
    if (!shouldInjectThemeBrief(text)) {
      return { text: "", values: {} };
    }

    const svc = runtime.getService("SOLUS_THEME_BRIEF_SERVICE") as
      | SolusThemeBriefService
      | null
      | undefined;
    if (!svc) {
      return { text: "", values: {} };
    }

    const brief = await svc.buildThemeBrief(text);
    if (!brief) {
      return { text: "", values: {} };
    }

    return {
      text: brief,
      values: { solusThemeBrief: brief },
    };
  },
};
