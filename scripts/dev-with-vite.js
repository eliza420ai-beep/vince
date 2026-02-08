#!/usr/bin/env node
/**
 * Start backend (API on :3000) and Vite dev server (UI on :5173).
 * Open http://localhost:5173 for the full Otaku-style UI (avoids static-asset issues on :3000).
 *
 * Matches Otaku's approach: "run Vite dev server in a second terminal" — here we do both in one command.
 * See https://github.com/elizaOS/otaku
 *
 * Usage: node scripts/dev-with-vite.js
 * Or:    bun run dev
 */

import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { spawn } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// Load .env from project root
const envPath = path.resolve(rootDir, ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
          val = val.slice(1, -1);
        process.env[key] = val;
      }
    }
  }
}

const API_PORT = parseInt(process.env.SERVER_PORT || "3000", 10);
const VITE_PORT = 5173;

function waitFor(url, maxAttempts = 30) {
  return new Promise((resolve) => {
    let attempts = 0;
    const tryFetch = () => {
      fetch(url).then(
        () => resolve(true),
        () => {
          attempts++;
          if (attempts >= maxAttempts) return resolve(false);
          setTimeout(tryFetch, 500);
        }
      );
    };
    tryFetch();
  });
}

async function main() {
  // 1) Ensure frontend build exists (for backend's clientPath); Vite will use source
  const clientPath = path.resolve(rootDir, "dist/frontend");
  if (!fs.existsSync(path.join(clientPath, "index.html"))) {
    console.log("[dev] Building frontend (dist/frontend missing)...");
    const build = spawn("bun", ["run", "build:frontend"], { cwd: rootDir, stdio: "inherit" });
    await new Promise((resolve, reject) => {
      build.on("close", (code) => (code === 0 ? resolve() : reject(new Error("build:frontend exited " + code))));
      build.on("error", reject);
    });
  }

  // 2) Start backend (same as start-with-custom-ui)
  const backend = spawn("node", [path.join(__dirname, "start-with-custom-ui.js")], {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, SERVER_PORT: String(API_PORT) },
  });
  backend.on("error", (err) => {
    console.error("[dev] Backend failed:", err);
    process.exit(1);
  });
  backend.on("exit", (code) => {
    if (code != null && code !== 0) {
      process.exit(code);
    }
  });

  // 3) Wait for API to be ready
  console.log("[dev] Waiting for API on port", API_PORT, "...");
  const ready = await waitFor(`http://127.0.0.1:${API_PORT}/api/server/health`);
  if (!ready) {
    console.warn("[dev] API not ready after 15s; starting Vite anyway.");
  } else {
    console.log("[dev] API ready.");
  }

  // 4) Start Vite dev server (proxies /api and /socket.io to backend)
  console.log("[dev] Starting Vite dev server...");
  const viteUrl = `http://localhost:${VITE_PORT}`;
  let vite = spawn("bunx", ["vite"], {
    cwd: rootDir,
    stdio: "inherit",
    env: { ...process.env, FORCE_COLOR: "1" },
  });
  const killAll = () => {
    backend.kill();
    vite.kill();
  };
  process.on("SIGINT", killAll);
  process.on("SIGTERM", killAll);
  vite.on("error", (err) => {
    console.error("[dev] Vite failed:", err);
    backend.kill();
    process.exit(1);
  });
  vite.on("exit", (code) => {
    backend.kill();
    process.exit(code ?? 0);
  });

  // 5) Wait for Vite to be ready. If 5173 was in use, Vite will have bound to 5174 — check 5174 first so we open the new server, not the old one on 5173.
  await new Promise((r) => setTimeout(r, 2500));
  const portsToTry = [5174, VITE_PORT, 5175];
  let resolvedUrl = viteUrl;
  for (const port of portsToTry) {
    const url = `http://localhost:${port}`;
    const ready = await waitFor(url, 8);
    if (ready) {
      resolvedUrl = url;
      if (port !== VITE_PORT) {
        console.log("[dev] Port", VITE_PORT, "was in use; Vite started on", resolvedUrl);
      }
      break;
    }
  }
  const openCmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  spawn(openCmd, [resolvedUrl], { stdio: "ignore", shell: false }).unref();

  console.log("\n");
  console.log("  ╔════════════════════════════════════════════════════════════╗");
  console.log("  ║  Otaku-style UI (VINCE chat + Alpha):                      ║");
  console.log("  ║                                                            ║");
  console.log("  ║  http://localhost:" + API_PORT + "  (built UI from this process)           ║");
  console.log("  ║  " + resolvedUrl + "  (Vite dev server)   ║");
  console.log("  ║                                                            ║");
  console.log("  ║  Use either URL. If you see \"Invite code\" / old dashboard,   ║");
  console.log("  ║  you may have run `elizaos start` — use `bun start` instead.║");
  console.log("  ╚════════════════════════════════════════════════════════════╝");
  console.log("\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
