/**
 * Gateway client unit tests. Uses env mutation and fetch mock; no real network or CLI.
 * Child_process is mocked so getStatus/runAgent do not run real CLI; gateway is imported after mock.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  mock,
  beforeAll,
} from "bun:test";
import { withEnv } from "./test-utils";

// Mock child_process so getStatus (exec fallback) and runAgent don't hang or run real CLI.
mock.module("child_process", () => ({
  exec: (
    cmd: string,
    opts:
      | Record<string, unknown>
      | ((err: Error | null, stdout?: string, stderr?: string) => void),
    callback?: (err: Error | null, stdout?: string, stderr?: string) => void,
  ) => {
    const cb = typeof opts === "function" ? opts : callback!;
    const resolved = (err: Error | null, stdout?: string, stderr?: string) => {
      if (cb) setImmediate(() => cb(err, stdout ?? "", stderr ?? ""));
    };
    if (cmd.includes("openclaw gateway status")) {
      resolved(null, "gateway not running", "");
    } else if (cmd.includes("openclaw agent")) {
      resolved(null, "mock stdout", "mock stderr");
    } else {
      resolved(null, "", "");
    }
  },
}));

let isGatewayConfigured: typeof import("../services/gatewayClient.service").isGatewayConfigured;
let getHealth: typeof import("../services/gatewayClient.service").getHealth;
let getStatus: typeof import("../services/gatewayClient.service").getStatus;
let runAgent: typeof import("../services/gatewayClient.service").runAgent;

beforeAll(async () => {
  const mod = await import("../services/gatewayClient.service");
  isGatewayConfigured = mod.isGatewayConfigured;
  getHealth = mod.getHealth;
  getStatus = mod.getStatus;
  runAgent = mod.runAgent;
});

const REMOTE_URL = "http://example.com:18789";
const LOOPBACK_URL = "http://127.0.0.1:18789";

describe("isGatewayConfigured", () => {
  it("returns false when OPENCLAW_GATEWAY_URL is unset", async () => {
    await withEnv({ OPENCLAW_GATEWAY_URL: undefined }, async () => {
      expect(isGatewayConfigured()).toBe(false);
    });
  });

  it("returns false when OPENCLAW_GATEWAY_URL is empty string", async () => {
    await withEnv({ OPENCLAW_GATEWAY_URL: "" }, async () => {
      expect(isGatewayConfigured()).toBe(false);
    });
  });

  it("returns false when OPENCLAW_GATEWAY_URL is whitespace only", async () => {
    await withEnv({ OPENCLAW_GATEWAY_URL: "   " }, async () => {
      expect(isGatewayConfigured()).toBe(false);
    });
  });

  it("returns true when OPENCLAW_GATEWAY_URL is set", async () => {
    await withEnv({ OPENCLAW_GATEWAY_URL: LOOPBACK_URL }, async () => {
      expect(isGatewayConfigured()).toBe(true);
    });
  });
});

describe("getHealth", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns blocked when URL is remote and OPENCLAW_ALLOW_REMOTE_GATEWAY is not true", async () => {
    await withEnv(
      {
        OPENCLAW_GATEWAY_URL: REMOTE_URL,
        OPENCLAW_ALLOW_REMOTE_GATEWAY: undefined,
      },
      async () => {
        const result = await getHealth();
        expect(result.ok).toBe(false);
        expect(result.status).toBe("blocked");
        expect(result.message).toContain("remote host");
        expect(result.message).toContain("OPENCLAW_ALLOW_REMOTE_GATEWAY");
      },
    );
  });

  it("returns ok when loopback URL and fetch returns 200", async () => {
    await withEnv({ OPENCLAW_GATEWAY_URL: LOOPBACK_URL }, async () => {
      globalThis.fetch = () =>
        Promise.resolve(new Response("", { status: 200 })) as any;
      const result = await getHealth();
      expect(result.ok).toBe(true);
      expect(result.status).toBe("ok");
      expect(result.message).toContain("Gateway reachable");
    });
  });

  it("returns error when loopback URL and fetch returns 500", async () => {
    await withEnv({ OPENCLAW_GATEWAY_URL: LOOPBACK_URL }, async () => {
      globalThis.fetch = () =>
        Promise.resolve(
          new Response("Internal Server Error", { status: 500 }),
        ) as any;
      const result = await getHealth();
      expect(result.ok).toBe(false);
      expect(result.status).toBe("error");
      expect(result.message).toContain("500");
    });
  });

  it("returns unreachable when loopback URL and fetch throws", async () => {
    await withEnv({ OPENCLAW_GATEWAY_URL: LOOPBACK_URL }, async () => {
      globalThis.fetch = () => Promise.reject(new Error("Network error"));
      const result = await getHealth();
      expect(result.ok).toBe(false);
      expect(result.status).toBe("unreachable");
      expect(result.message).toBeDefined();
    });
  });
});

describe("getStatus", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("returns ok when getHealth returns ok", async () => {
    await withEnv({ OPENCLAW_GATEWAY_URL: LOOPBACK_URL }, async () => {
      globalThis.fetch = () =>
        Promise.resolve(new Response("", { status: 200 })) as any;
      const result = await getStatus();
      expect(result.ok).toBe(true);
      expect(result.status).toBe("ok");
    });
  });

  it("returns not ok when getHealth returns not ok (exec fallback may fail without openclaw CLI)", async () => {
    await withEnv({ OPENCLAW_GATEWAY_URL: LOOPBACK_URL }, async () => {
      globalThis.fetch = () => Promise.reject(new Error("fetch failed"));
      const result = await getStatus();
      expect(result.ok).toBe(false);
      expect(result.message).toBeDefined();
    });
  });
});

describe("runAgent", () => {
  it("returns a result with ok and error shape", async () => {
    const result = await runAgent("test task");
    expect(typeof result.ok).toBe("boolean");
    if (!result.ok) {
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe("string");
    }
  });

  it("accepts optional agentId", async () => {
    const result = await runAgent("test task", "agent-1");
    expect(typeof result.ok).toBe("boolean");
  });
});
