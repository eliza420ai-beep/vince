import { describe, expect, it } from "vitest";
import {
  buildPipelineArgs,
  defaultCachePath,
  defaultOutputDir,
  parseFetchLimitFromMessage,
  resolvePipelineRoot,
} from "../services/xBookmarksPipelineRunner";

describe("xBookmarksPipelineRunner", () => {
  it("resolvePipelineRoot uses packages path by default", () => {
    expect(resolvePipelineRoot("/app")).toBe(
      "/app/packages/x-bookmarks-pipeline",
    );
  });

  it("defaultOutputDir nests under data/", () => {
    expect(defaultOutputDir("/repo")).toBe(
      "/repo/data/x-bookmarks-pipeline/output",
    );
  });

  it("defaultCachePath uses sqlite file", () => {
    expect(defaultCachePath("/repo")).toBe(
      "/repo/data/x-bookmarks-pipeline/cache/bookmarks.db",
    );
  });

  it("parseFetchLimitFromMessage reads last N bookmarks", () => {
    expect(parseFetchLimitFromMessage("run last 15 bookmarks")).toBe(15);
    expect(parseFetchLimitFromMessage("limit 3 bookmark")).toBe(3);
    expect(parseFetchLimitFromMessage("no limit here")).toBeUndefined();
  });

  it("buildPipelineArgs fetch requires user id or username in env", () => {
    const prevUid = process.env.X_FETCH_USER_ID;
    const prevUser = process.env.X_FETCH_USERNAME;
    delete process.env.X_FETCH_USER_ID;
    delete process.env.X_FETCH_USERNAME;
    expect(() =>
      buildPipelineArgs({
        mode: "fetch",
        cwd: "/r",
        verbose: false,
      }),
    ).toThrow(/X_FETCH_USER_ID/);
    process.env.X_FETCH_USER_ID = "123";
    const args = buildPipelineArgs({
      mode: "fetch",
      cwd: "/r",
      verbose: true,
      fetchLimit: 10,
    });
    expect(args).toContain("--fetch");
    expect(args).toContain("--fetch-user-id");
    expect(args).toContain("123");
    expect(args).toContain("--verbose");
    expect(args).toContain("--fetch-limit");
    expect(args).toContain("10");
    if (prevUid !== undefined) process.env.X_FETCH_USER_ID = prevUid;
    else delete process.env.X_FETCH_USER_ID;
    if (prevUser !== undefined) process.env.X_FETCH_USERNAME = prevUser;
    else delete process.env.X_FETCH_USERNAME;
  });

  it("buildPipelineArgs text mode", () => {
    const args = buildPipelineArgs({
      mode: "text",
      cwd: "/r",
      verbose: false,
      textSnippet: "BTC 4h",
    });
    expect(args).toContain("--text");
    expect(args).toContain("BTC 4h");
  });

  it("buildPipelineArgs fetch uses username when id missing", () => {
    const prevUid = process.env.X_FETCH_USER_ID;
    const prevUser = process.env.X_FETCH_USERNAME;
    delete process.env.X_FETCH_USER_ID;
    process.env.X_FETCH_USERNAME = "alice";
    const args = buildPipelineArgs({
      mode: "fetch",
      cwd: "/r",
      verbose: false,
    });
    expect(args).toContain("--fetch-username");
    expect(args).toContain("alice");
    if (prevUid !== undefined) process.env.X_FETCH_USER_ID = prevUid;
    else delete process.env.X_FETCH_USER_ID;
    if (prevUser !== undefined) process.env.X_FETCH_USERNAME = prevUser;
    else delete process.env.X_FETCH_USERNAME;
  });
});
