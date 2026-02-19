/**
 * OpenClaw context provider tests.
 */

import { describe, it, expect } from "bun:test";
import { openclawContextProvider } from "../providers/openclawContext.provider";
import {
  createMockMessage,
  createMockState,
  createMockRuntime,
  withEnv,
} from "./test-utils";

const runtime = createMockRuntime();

describe("openclawContextProvider.get", () => {
  it("returns empty when message and state have no OpenClaw/AI keywords", async () => {
    const message = createMockMessage("What is the weather today?");
    const state = createMockState({ text: "nothing relevant" });
    const result = await openclawContextProvider.get(runtime, message, state);
    expect(result.text).toBeUndefined();
    expect(result.values).toBeUndefined();
  });

  it("returns context when message contains openclaw", async () => {
    const message = createMockMessage("How do I set up openclaw?");
    const result = await openclawContextProvider.get(
      runtime,
      message,
      createMockState(),
    );
    expect(result.text).toBeDefined();
    expect(result.values).toBeDefined();
    expect(result.values!.openclawContext).toBeDefined();
    expect((result.text ?? "").toLowerCase()).toContain("gateway");
    expect((result.text ?? "").toLowerCase()).toContain("setup");
    expect(
      (result.text ?? "").includes("releases") ||
        (result.text ?? "").includes("github.com/openclaw"),
    ).toBe(true);
  });

  it("returns context when message contains gateway", async () => {
    const message = createMockMessage("gateway status");
    const result = await openclawContextProvider.get(
      runtime,
      message,
      createMockState(),
    );
    expect(result.text).toBeDefined();
    expect(result.values).toBeDefined();
    expect((result.text ?? "").toLowerCase()).toContain("gateway");
  });

  it("returns context when message contains ai 2027", async () => {
    const message = createMockMessage("What is AI 2027?");
    const result = await openclawContextProvider.get(
      runtime,
      message,
      createMockState(),
    );
    expect(result.text).toBeDefined();
    expect(result.values).toBeDefined();
    expect((result.text ?? "").toLowerCase()).toContain("ai 2027");
    expect((result.text ?? "").toLowerCase()).toContain("research agent");
  });

  it("returns context when message contains research agent", async () => {
    const message = createMockMessage("Explain research agents");
    const result = await openclawContextProvider.get(
      runtime,
      message,
      createMockState(),
    );
    expect(result.text).toBeDefined();
    expect((result.text ?? "").toLowerCase()).toContain("research");
  });

  it("sets openclawGatewayConfigured false when OPENCLAW_GATEWAY_URL is not set", async () => {
    await withEnv({ OPENCLAW_GATEWAY_URL: undefined }, async () => {
      const message = createMockMessage("openclaw");
      const result = await openclawContextProvider.get(
        runtime,
        message,
        createMockState(),
      );
      expect(result.values!.openclawGatewayConfigured).toBe(false);
      expect((result.text ?? "").toLowerCase()).toContain("not set");
    });
  });

  it("sets openclawGatewayConfigured true when OPENCLAW_GATEWAY_URL is set", async () => {
    await withEnv(
      { OPENCLAW_GATEWAY_URL: "http://127.0.0.1:18789" },
      async () => {
        const message = createMockMessage("openclaw");
        const result = await openclawContextProvider.get(
          runtime,
          message,
          createMockState(),
        );
        expect(result.values!.openclawGatewayConfigured).toBe(true);
        expect((result.text ?? "").toLowerCase()).toContain(
          "gateway url is set",
        );
      },
    );
  });
});
