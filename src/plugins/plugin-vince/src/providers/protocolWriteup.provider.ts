/**
 * Protocol Writeup Provider
 *
 * For Eliza: when the user asks about a protocol we have a dedicated writeup for,
 * inject that file into context so the model always gets the content (RAG can miss
 * it due to embedding similarity). Ensures e.g. "tell me more about USDai" gets
 * knowledge/airdrops/why-usdai.md.
 */

import type { Provider, IAgentRuntime, Memory, State } from "@elizaos/core";
import { logger } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import { isElizaAgent } from "../utils/dashboard";

const KNOWLEDGE_ROOT = path.join(process.cwd(), "knowledge");

/** Protocol keyword (in user message, case-insensitive) -> path relative to knowledge/ */
const PROTOCOL_WRITEUPS: [string, string][] = [
  ["usdai", "airdrops/why-usdai.md"],
  ["chip token", "airdrops/why-usdai.md"],
  ["permian", "airdrops/why-usdai.md"],
];

function readFileSafe(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return fs.readFileSync(filePath, "utf-8").trim();
  } catch {
    return null;
  }
}

export const protocolWriteupProvider: Provider = {
  name: "PROTOCOL_WRITEUP",
  description: "Injects known protocol writeups from knowledge/ when the user asks about them (Eliza only)",
  position: -15, // Run early, after teammate

  get: async (runtime: IAgentRuntime, message: Memory, _state: State) => {
    if (!isElizaAgent(runtime)) {
      return { text: "", values: {}, data: {} };
    }

    const text = (message?.content?.text ?? "").toLowerCase();
    if (!text) return { text: "", values: {}, data: {} };

    for (const [keyword, relPath] of PROTOCOL_WRITEUPS) {
      if (!text.includes(keyword)) continue;

      const fullPath = path.join(KNOWLEDGE_ROOT, relPath);
      const content = readFileSafe(fullPath);
      if (!content) {
        logger.debug(`[ProtocolWriteup] File not found: ${fullPath}`);
        continue;
      }

      const capped = content.length > 12_000 ? content.slice(0, 12_000) + "\n\n[... truncated ...]" : content;
      const block = `## Protocol writeup (from knowledge/${relPath})\n\n${capped}`;
      return {
        text: block,
        values: { protocolWriteupInjected: true, protocolWriteupPath: relPath },
        data: {},
      };
    }

    return { text: "", values: {}, data: {} };
  },
};
