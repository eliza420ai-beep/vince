import { afterEach, describe, expect, test } from "bun:test";
import type { IAgentRuntime } from "@elizaos/core";
import {
  getPasteTradeRemotePublishDefault,
  resolvePasteTradeRemotePublish,
} from "../config.ts";

describe("PASTE_TRADE_REMOTE_PUBLISH", () => {
  const prev = process.env.PASTE_TRADE_REMOTE_PUBLISH;
  afterEach(() => {
    if (prev === undefined) delete process.env.PASTE_TRADE_REMOTE_PUBLISH;
    else process.env.PASTE_TRADE_REMOTE_PUBLISH = prev;
  });

  test("defaults true when unset", () => {
    delete process.env.PASTE_TRADE_REMOTE_PUBLISH;
    expect(getPasteTradeRemotePublishDefault()).toBe(true);
  });

  test("false when env is false / 0 / off", () => {
    for (const v of ["false", "0", "off", "no"]) {
      process.env.PASTE_TRADE_REMOTE_PUBLISH = v;
      expect(getPasteTradeRemotePublishDefault()).toBe(false);
    }
  });

  test("resolvePasteTradeRemotePublish body overrides env", () => {
    process.env.PASTE_TRADE_REMOTE_PUBLISH = "false";
    const rt = {
      getSetting: () => null,
    } as unknown as IAgentRuntime;
    expect(resolvePasteTradeRemotePublish(rt, undefined)).toBe(false);
    expect(resolvePasteTradeRemotePublish(rt, true)).toBe(true);
    expect(resolvePasteTradeRemotePublish(rt, false)).toBe(false);
  });
});
