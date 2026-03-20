/**
 * Opt-in E2E checks against a running server (no mock).
 * Run: VINCE_API_GATING_TEST=1 VINCE_API_GATING_BASE_URL=http://127.0.0.1:3000 bun test src/__tests__/apiGating.e2e.test.ts
 */
import { describe, it, expect } from "vitest";

const enabled = process.env.VINCE_API_GATING_TEST === "1";
const base = (
  process.env.VINCE_API_GATING_BASE_URL || "http://127.0.0.1:3000"
).replace(/\/$/, "");
const token = process.env.ELIZA_SERVER_AUTH_TOKEN?.trim();

describe.skipIf(!enabled)("API gating E2E", () => {
  it("GET /healthz is 200 without auth", async () => {
    const res = await fetch(`${base}/healthz`);
    expect(res.status).toBe(200);
    const j = (await res.json()) as { status?: string };
    expect(j.status).toBe("ok");
  });

  it("GET /api/agents respects ELIZA_SERVER_AUTH_TOKEN when set", async () => {
    if (!token) {
      // If the server is started without ELIZA_SERVER_AUTH_TOKEN, auth gating for /api/agents is disabled.
      // In that situation we only validate the public health endpoint above.
      return;
    }
    const noKey = await fetch(`${base}/api/agents`);
    expect(noKey.status).toBe(401);

    const withKey = await fetch(`${base}/api/agents`, {
      headers: { "X-API-KEY": token },
    });
    expect(withKey.status).toBe(200);
  });
});
