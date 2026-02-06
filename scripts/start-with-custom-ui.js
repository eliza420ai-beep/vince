#!/usr/bin/env node
/**
 * Start the ElizaOS server serving the Otaku-style frontend (dist/frontend) at localhost:3000.
 * Run `bun run build:frontend` (or `bun run build:all`) first so dist/frontend exists.
 *
 * Usage: node scripts/start-with-custom-ui.js
 * Or:    bun run start:custom-ui
 */

import { AgentServer } from "@elizaos/server";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
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

// Log when local-only messaging is active (agent replies stay on local server/socket)
const useLocalMessaging = process.env.ELIZAOS_USE_LOCAL_MESSAGING === "true" || !process.env.ELIZAOS_API_KEY?.trim();
if (useLocalMessaging) {
  console.log("[start] Messaging: local-only (replies delivered via local server/socket)");
}

// Optional: run Postgres bootstrap when POSTGRES_URL is set (same as start-with-db.js)
const postgresUrl = process.env.POSTGRES_URL?.trim();
const sslReject = process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED?.trim().toLowerCase();
const sslRelax = sslReject === "false" || sslReject === "0" || sslReject === "no" || sslReject === "off";

async function runBootstrap() {
  if (!postgresUrl) return;
  const sqlPath = path.resolve(__dirname, "supabase-migrations-bootstrap.sql");
  if (!fs.existsSync(sqlPath)) return;
  let pg;
  try {
    pg = await import("pg");
  } catch {
    return;
  }
  const clientConfig = { connectionString: postgresUrl };
  if (sslRelax) clientConfig.ssl = { rejectUnauthorized: false };
  const client = new pg.default.Client(clientConfig);
  try {
    await client.connect();
    const sql = fs.readFileSync(sqlPath, "utf8");
    await client.query(sql);
    console.log("[start] Migration schema ready.");
  } catch (err) {
    console.error("[start] Bootstrap failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

function runBuildFrontend() {
  return new Promise((resolve, reject) => {
    console.log("[start] Building frontend (dist/frontend missing)...");
    const child = spawn("bun", ["run", "build:frontend"], {
      cwd: rootDir,
      stdio: "inherit",
      shell: true,
    });
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error("build:frontend exited with " + code))));
    child.on("error", reject);
  });
}

function runBuildBackend() {
  return new Promise((resolve, reject) => {
    console.log("[start] Building backend (dist/index.js missing)...");
    const child = spawn("bun", ["run", "build"], {
      cwd: rootDir,
      stdio: "inherit",
      shell: true,
    });
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error("build exited with " + code))));
    child.on("error", reject);
  });
}

async function main() {
  await runBootstrap();

  const clientPath = path.resolve(rootDir, "dist/frontend");
  if (!fs.existsSync(path.join(clientPath, "index.html"))) {
    try {
      await runBuildFrontend();
    } catch (err) {
      console.error("Frontend build failed:", err.message);
      process.exit(1);
    }
  }

  const projectPath = path.resolve(rootDir, "dist/index.js");
  if (!fs.existsSync(projectPath)) {
    try {
      await runBuildBackend();
    } catch (err) {
      console.error("Backend build failed:", err.message);
      process.exit(1);
    }
  }
  console.log("Loading project from:", projectPath);
  const project = await import(pathToFileURL(projectPath).href);
  const projectModule = project.default || project;

  if (!projectModule.agents || !Array.isArray(projectModule.agents)) {
    throw new Error("No agents found in project");
  }
  const agents = projectModule.agents.map((a) => ({
    character: a.character,
    plugins: a.plugins,
    init: a.init,
  }));

  const port = parseInt(process.env.SERVER_PORT || "3000", 10);
  const dataDir = process.env.PGLITE_DATA_DIR || path.resolve(rootDir, ".eliza/.elizadb");

  // Start server with single start(): HTTP server is brought up first, then agents.
  // This order is required so MessageBusService fetch to localhost succeeds when using central/cloud messaging.
  const server = new AgentServer();
  await server.start({
    port,
    agents,
    clientPath,
    dataDir,
    postgresUrl: postgresUrl || undefined,
  });
  console.log(" Started", agents.length, "agent(s)");
  console.log(" Serving Otaku-style UI from:", clientPath);
  console.log("\n Open: http://localhost:" + port + "\n");
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
