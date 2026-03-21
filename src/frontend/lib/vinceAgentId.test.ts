import { describe, expect, it } from "bun:test";
import { findVinceAgentId, type AgentLike } from "./vinceAgentId";

describe("findVinceAgentId", () => {
  it("returns active VINCE when both active and inactive exist", () => {
    const agents: AgentLike[] = [
      { id: "dead", name: "VINCE", status: "inactive" },
      { id: "live", name: "VINCE", status: "active" },
    ];
    expect(findVinceAgentId(agents)).toBe("live");
  });

  it("returns null when only inactive VINCE exists", () => {
    const agents: AgentLike[] = [
      { id: "dead", name: "VINCE", status: "inactive" },
    ];
    expect(findVinceAgentId(agents)).toBeNull();
  });

  it("matches characterName VINCE", () => {
    const agents: AgentLike[] = [
      { id: "x", characterName: "VINCE", status: "active" },
    ];
    expect(findVinceAgentId(agents)).toBe("x");
  });

  it("uses fallback when no VINCE row", () => {
    const agents: AgentLike[] = [{ id: "k", name: "KELLY", status: "active" }];
    expect(findVinceAgentId(agents, "fallback")).toBe("fallback");
  });

  it("uses unknown-status VINCE when no explicit active", () => {
    const agents: AgentLike[] = [{ id: "legacy", name: "VINCE" }];
    expect(findVinceAgentId(agents)).toBe("legacy");
  });
});
