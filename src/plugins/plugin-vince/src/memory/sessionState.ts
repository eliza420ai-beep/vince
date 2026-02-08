/**
 * Crypto intel session state (Phase 3).
 * File: session_state.json — single JSON object.
 */

import * as fs from "fs";
import * as path from "path";
import type { SessionState } from "../types/cryptoIntelMemory";

const SESSION_STATE_FILE = "session_state.json";

/**
 * Read session_state.json. Returns null if missing or invalid.
 */
export async function readSessionState(
  memoryDir: string,
): Promise<SessionState | null> {
  const filepath = path.join(memoryDir, SESSION_STATE_FILE);
  if (!fs.existsSync(filepath)) return null;
  try {
    const raw = fs.readFileSync(filepath, "utf-8");
    const obj = JSON.parse(raw) as SessionState;
    if (!obj || typeof obj !== "object") return null;
    return {
      last_run: obj.last_run ?? "",
      open_investigations: Array.isArray(obj.open_investigations)
        ? obj.open_investigations
        : [],
      questions_for_next_session: Array.isArray(obj.questions_for_next_session)
        ? obj.questions_for_next_session
        : [],
      contrarian_challenges: Array.isArray(obj.contrarian_challenges)
        ? obj.contrarian_challenges
        : [],
    };
  } catch {
    return null;
  }
}

/**
 * Write session_state.json. Creates directory if needed.
 */
export async function writeSessionState(
  memoryDir: string,
  state: SessionState,
): Promise<void> {
  if (!fs.existsSync(memoryDir)) {
    fs.mkdirSync(memoryDir, { recursive: true });
  }
  const filepath = path.join(memoryDir, SESSION_STATE_FILE);
  fs.writeFileSync(filepath, JSON.stringify(state, null, 2), "utf-8");
}
