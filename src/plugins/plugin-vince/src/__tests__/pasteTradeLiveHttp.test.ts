/**
 * Spawns start-with-custom-ui (real AgentServer) and POSTs paste.trade.
 * Proves the route is registered (not generic 404). Expects 202/400/503 — never 404 for correct path.
 *
 * Run: `RUN_PASTE_TRADE_LIVE=1 bun test src/plugins/plugin-vince/src/__tests__/pasteTradeLiveHttp.test.ts`
 * Requires: `bun run build` and `bun run build:frontend` (dist/index.js + dist/frontend).
 */

import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RUN_LIVE =
  process.env.RUN_PASTE_TRADE_LIVE === "1" ||
  process.env.RUN_PASTE_TRADE_LIVE === "true";

function repoRoot(): string {
  let d = __dirname;
  for (let i = 0; i < 12; i++) {
    const pkg = path.join(d, "package.json");
    if (fs.existsSync(pkg)) {
      try {
        const j = JSON.parse(fs.readFileSync(pkg, "utf8")) as { name?: string };
        if (j.name === "vince") return d;
      } catch {
        /* continue */
      }
    }
    d = path.dirname(d);
  }
  throw new Error("Could not find vince repo root");
}

async function waitForHealth(port: number, maxMs = 120_000): Promise<boolean> {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/healthz`);
      if (r.ok) return true;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

/** HTTP is up before runtimes finish; plugin routes need an active VINCE row. */
async function waitForActiveVinceId(
  port: number,
  maxMs = 120_000,
): Promise<string> {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/agents`);
      if (!r.ok) {
        await new Promise((x) => setTimeout(x, 500));
        continue;
      }
      const j = (await r.json()) as {
        data?: {
          agents?: Array<{ id?: string; name?: string; status?: string }>;
        };
      };
      const vince = (j.data?.agents ?? []).find(
        (a) =>
          (a.name ?? "").toUpperCase() === "VINCE" &&
          (a.status ?? "").toLowerCase() === "active",
      );
      if (vince?.id) return vince.id;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    `No active VINCE in GET /api/agents within ${maxMs}ms — plugin routes only exist on started runtimes.`,
  );
}

/** Paste-trade route can briefly 404 right after /healthz; poll until handler responds (503 = no key, 200 = list). */
async function waitForPasteTradeRouteOk(
  port: number,
  agentId: string,
  maxMs = 60_000,
): Promise<void> {
  const t0 = Date.now();
  const q = `?agentId=${encodeURIComponent(agentId)}`;
  const listUrl = `http://127.0.0.1:${port}/api/agents/${agentId}/plugins/plugin-vince/vince/paste-trade/runs${q}`;
  while (Date.now() - t0 < maxMs) {
    try {
      const r = await fetch(listUrl);
      if (r.status !== 404) return;
    } catch {
      /* retry */
    }
    await new Promise((x) => setTimeout(x, 400));
  }
  throw new Error(
    `paste-trade list GET still 404 after ${maxMs}ms — check plugin-vince routes and server patch.`,
  );
}

describe.skipIf(!RUN_LIVE)("paste.trade live HTTP (AgentServer)", () => {
  const root = repoRoot();
  const distIndex = path.join(root, "dist", "index.js");
  const distFe = path.join(root, "dist", "frontend", "index.html");
  const startScript = path.join(root, "scripts", "start-with-custom-ui.js");
  const patchScript = path.join(
    root,
    "scripts",
    "patch-elizaos-server-plugin-routes.cjs",
  );

  let port = 31_000 + Math.floor(Math.random() * 1000);
  let child: ChildProcess | null = null;
  let pgliteDir: string;

  beforeAll(async () => {
    if (!fs.existsSync(distIndex) || !fs.existsSync(distFe)) {
      throw new Error(
        "Missing dist/index.js or dist/frontend — run: bun run build && bun run build:frontend",
      );
    }
    const { spawnSync } = await import("node:child_process");
    const pr = spawnSync(process.execPath, [patchScript], {
      cwd: root,
      encoding: "utf8",
    });
    if (pr.status !== 0) {
      throw new Error(`patch script failed: ${pr.stderr || pr.stdout}`);
    }

    pgliteDir = path.join(
      root,
      `.eliza-test-paste-live-${Date.now()}-${process.pid}`,
    );
    fs.mkdirSync(pgliteDir, { recursive: true });

    const env = { ...process.env } as NodeJS.ProcessEnv;
    env.SERVER_PORT = String(port);
    env.PGLITE_DATA_DIR = pgliteDir;
    delete env.ELIZA_SERVER_AUTH_TOKEN;
    delete env.ENABLE_DATA_ISOLATION;

    child = spawn(process.execPath, [startScript], {
      cwd: root,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr?.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    child.stdout?.on("data", (c: Buffer) => {
      stderr += c.toString();
    });

    const ok = await waitForHealth(port);
    if (!ok) {
      child.kill("SIGTERM");
      throw new Error(
        `Server did not become healthy on port ${port} within 120s. Output:\n${stderr.slice(-4000)}`,
      );
    }
    const vinceId = await waitForActiveVinceId(port);
    await waitForPasteTradeRouteOk(port, vinceId);
  }, 130_000);

  afterAll(async () => {
    if (child?.pid) {
      child.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 2000));
      try {
        child.kill("SIGKILL");
      } catch {
        /* ignore */
      }
    }
    try {
      fs.rmSync(pgliteDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it("GET /api/agents lists active VINCE", async () => {
    const r = await fetch(`http://127.0.0.1:${port}/api/agents`);
    expect(r.status).toBe(200);
    const j = (await r.json()) as {
      success?: boolean;
      data?: {
        agents?: Array<{ id?: string; name?: string; status?: string }>;
      };
    };
    expect(j.success).toBe(true);
    const agents = j.data?.agents ?? [];
    const vince = agents.find(
      (a) =>
        (a.name ?? "").toUpperCase() === "VINCE" &&
        (a.status ?? "").toLowerCase() === "active",
    );
    expect(vince?.id).toBeTruthy();
  });

  it("POST .../plugins/plugin-vince/vince/paste-trade/runs is not API 404 (route exists)", async () => {
    const id = await waitForActiveVinceId(port, 15_000);
    expect(id).toBeTruthy();
    await waitForPasteTradeRouteOk(port, id, 30_000);

    const url = `http://127.0.0.1:${port}/api/agents/${id}/plugins/plugin-vince/vince/paste-trade/runs?agentId=${encodeURIComponent(id!)}`;
    const post = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com" }),
    });
    const text = await post.text();
    expect(post.status).not.toBe(404);
    if (post.status === 404) {
      throw new Error(`Unexpected 404 body: ${text.slice(0, 500)}`);
    }
    expect(
      post.status === 202 ||
        post.status === 400 ||
        post.status === 503 ||
        post.status === 401,
    ).toBe(true);
  });
});

describe("paste.trade live HTTP gate", () => {
  it("documents RUN_PASTE_TRADE_LIVE when skipped", () => {
    if (RUN_LIVE) return;
    expect(true).toBe(true);
  });
});
