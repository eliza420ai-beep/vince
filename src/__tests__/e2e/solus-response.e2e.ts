/**
 * E2E tests for Solus agent response flow.
 * Proves Solus quality: handoff to VINCE, Hypersurface/strike ritual/$100K plan ownership,
 * curve naming, and brand voice (no AI-slop).
 *
 * Run with: bun test src/__tests__/e2e/solus-response.e2e.ts
 * Or via ElizaOS runner when targeting Solus: elizaos test e2e (with Solus loaded).
 */
import { describe, it, expect, mock } from "bun:test";
import { v4 as uuidv4 } from "uuid";
import {
  type IAgentRuntime,
  type Memory,
  type Content,
  type State,
  type UUID,
  type HandlerCallback,
  ChannelType,
  ModelType,
  logger,
} from "@elizaos/core";
import { solusCharacter } from "../../agents/solus";
import { replyAction } from "../../plugins/plugin-bootstrap/src/actions/reply";
import {
  solusStrikeRitualAction,
  solusHypersurfaceExplainAction,
  solusPositionAssessAction,
  solusOptimalStrikeAction,
} from "../../plugins/plugin-solus/src/actions";

const BANNED_PHRASES = [
  "delve",
  "leverage",
  "utilize",
  "great question",
  "i'd be happy to",
  "let me help",
  "explore",
  "dive into",
  "nuanced",
  "actionable",
  "circle back",
  "at the end of the day",
];

function createMessage(text: string): Memory {
  return {
    id: uuidv4() as UUID,
    entityId: uuidv4() as UUID,
    roomId: uuidv4() as UUID,
    agentId: uuidv4() as UUID,
    content: { text, source: "test", channelType: ChannelType.DM },
    createdAt: Date.now(),
    embedding: [],
  } as Memory;
}

function defaultState(): State {
  return {
    text: "[Hypersurface context] Friday 08:00 UTC. Assets: HYPE, SOL, WBTC, ETH. Covered calls, CSP, wheel.",
    values: {},
    data: {
      providers: {
        ACTIONS: {
          data: {
            actionsData: [
              { name: "REPLY" },
              { name: "SOLUS_STRIKE_RITUAL" },
              { name: "SOLUS_HYPERSURFACE_EXPLAIN" },
              { name: "SOLUS_POSITION_ASSESS" },
              { name: "SOLUS_OPTIMAL_STRIKE" },
            ],
          },
        },
      },
    },
  };
}

function assertNoAISlop(reply: string): void {
  const lower = reply.toLowerCase();
  for (const phrase of BANNED_PHRASES) {
    expect(lower).not.toContain(phrase);
  }
}

interface TestCase {
  name: string;
  fn: (runtime: IAgentRuntime) => Promise<void>;
}

interface TestSuite {
  name: string;
  tests: TestCase[];
}

function runWithSolusRuntime(
  runtime: IAgentRuntime | null,
  testFn: (runtime: IAgentRuntime) => Promise<void>,
): Promise<void> {
  if (!runtime || (runtime.character?.name ?? "").toUpperCase() !== "SOLUS") {
    logger.info("⚠ Solus runtime not provided by runner; skip or run with Solus as the loaded agent.");
    return Promise.resolve();
  }
  return testFn(runtime);
}

function createMinimalSolusRuntime(useModelImpl: (modelType: string, params: { prompt?: string }) => Promise<string>): IAgentRuntime {
  const agentId = uuidv4() as UUID;
  return {
    agentId,
    character: solusCharacter,
    getSetting: mock(() => null),
    getService: mock(() => null),
    composeState: mock(() => Promise.resolve(defaultState())),
    useModel: mock(useModelImpl) as IAgentRuntime["useModel"],
    logger: {
      info: () => {},
      debug: () => {},
      warn: () => {},
      error: () => {},
    },
  } as unknown as IAgentRuntime;
}

function xmlMessage(text: string, thought = ""): string {
  return `<response><thought>${thought}</thought><message>${text}</message></response>`;
}

export const SolusResponseTestSuite: TestSuite = {
  name: "Solus Response E2E",
  tests: [
    {
      name: "handoff_aloha_returns_vince_and_paste",
      fn: async (runtime: IAgentRuntime) =>
        runWithSolusRuntime(runtime, async (r) => {
          const canned =
            "That's VINCE—say 'aloha' to him for the daily. When you have his options or summary, paste it here and I'll give you the call (size/skip and invalidation).";
          const rt = createMinimalSolusRuntime(async (t) => (t === ModelType.TEXT_LARGE ? xmlMessage(canned) : ""));
          const msg = createMessage("Aloha");
          const collected: Content[] = [];
          await replyAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
          expect(collected.length).toBeGreaterThanOrEqual(1);
          const text = collected[collected.length - 1]?.text ?? "";
          expect(text).toMatch(/vince/i);
          expect(text).toMatch(/paste|paste it here/i);
          assertNoAISlop(text);
        }),
    },
    {
      name: "handoff_options_returns_vince_and_paste",
      fn: async (runtime: IAgentRuntime) =>
        runWithSolusRuntime(runtime, async () => {
          const canned =
            "That's VINCE—say 'options' to him, then paste his view here. I'll give you strike ritual and size/skip with invalidation.";
          const rt = createMinimalSolusRuntime(async (t) => (t === ModelType.TEXT_LARGE ? xmlMessage(canned) : ""));
          const msg = createMessage("Options for this week");
          const collected: Content[] = [];
          await replyAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
          const text = (collected[collected.length - 1]?.text ?? "").toLowerCase();
          expect(text).toMatch(/vince/);
          expect(text).toMatch(/paste|options/);
          assertNoAISlop(text);
        }),
    },
    {
      name: "handoff_funding_returns_left_curve_vince",
      fn: async (runtime: IAgentRuntime) =>
        runWithSolusRuntime(runtime, async () => {
          const canned =
            "That's left curve—Vince. Say 'options' to him and paste here; then I'll give you the strike call.";
          const rt = createMinimalSolusRuntime(async (t) => (t === ModelType.TEXT_LARGE ? xmlMessage(canned) : ""));
          const msg = createMessage("What's BTC funding? I need it for my strike call.");
          const collected: Content[] = [];
          await replyAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
          const text = (collected[collected.length - 1]?.text ?? "").toLowerCase();
          expect(text).toMatch(/vince|left curve/);
          expect(text).toMatch(/paste/);
          assertNoAISlop(text);
        }),
    },
    {
      name: "handoff_ct_returns_vince_and_paste",
      fn: async (runtime: IAgentRuntime) =>
        runWithSolusRuntime(runtime, async () => {
          const canned =
            "That's VINCE. Say 'What's CT saying about BTC' to him, paste his answer here, and I'll give you size/skip and invalidation.";
          const rt = createMinimalSolusRuntime(async (t) => (t === ModelType.TEXT_LARGE ? xmlMessage(canned) : ""));
          const msg = createMessage("What's CT saying about BTC?");
          const collected: Content[] = [];
          await replyAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
          const text = (collected[collected.length - 1]?.text ?? "").toLowerCase();
          expect(text).toMatch(/vince/);
          expect(text).toMatch(/paste/);
          assertNoAISlop(text);
        }),
    },
    {
      name: "own_hypersurface_explain_contains_mechanics",
      fn: async (runtime: IAgentRuntime) =>
        runWithSolusRuntime(runtime, async () => {
          const canned =
            "Hypersurface is where we execute—weekly options, Friday 08:00 UTC expiry. Covered calls: you own the asset, sell a call at a strike, earn upfront premium; above strike you're assigned. Secured puts: hold stablecoins (e.g. USDT0), sell a put, earn premium; below strike you're assigned, premium reduces cost basis. Wheel: CC then CSP, premium at every step. For live IV say 'options' to VINCE.";
          const rt = createMinimalSolusRuntime(async () => canned);
          const msg = createMessage("How does Hypersurface work?");
          const collected: Content[] = [];
          await solusHypersurfaceExplainAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
          const text = (collected[collected.length - 1]?.text ?? "").toLowerCase();
          expect(text).toMatch(/friday 08:00|08:00 utc/);
          expect(text).toMatch(/covered call|secured put|wheel|premium|cost basis/);
          assertNoAISlop(text);
        }),
    },
    {
      name: "own_strike_ritual_contains_steps",
      fn: async (runtime: IAgentRuntime) =>
        runWithSolusRuntime(runtime, async () => {
          const canned =
            "Friday: (1) Say 'options' to VINCE and get his strike selection. (2) If you want CT vibe, ask VINCE 'What's CT saying about BTC'. (3) Paste that here and I'll give you size/skip and invalidation. I can also use the latest Grok daily from internal-docs if you haven't got fresh data.";
          const rt = createMinimalSolusRuntime(async () => canned);
          const msg = createMessage("How do I run my strike ritual?");
          const collected: Content[] = [];
          await solusStrikeRitualAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
          const text = (collected[collected.length - 1]?.text ?? "").toLowerCase();
          expect(text).toMatch(/vince|options/);
          expect(text).toMatch(/paste|size|skip|invalidation/);
          assertNoAISlop(text);
        }),
    },
    {
      name: "own_100k_plan_contains_seven_pillars",
      fn: async (runtime: IAgentRuntime) =>
        runWithSolusRuntime(runtime, async () => {
          const canned =
            "The $100K stack: (1) HYPERSURFACE options $3K/week min. (2) Yield USDC/USDT0. (3) Stack sats. (4) Echo DD. (5) Paper perps. (6) HIP-3 spot. (7) Airdrops. Options carry the target; the rest compounds. I can break down allocations and weekly targets, or you grab VINCE's live yield/options and we tune.";
          const rt = createMinimalSolusRuntime(async (t) => (t === ModelType.TEXT_LARGE ? xmlMessage(canned) : ""));
          const msg = createMessage("Give me the full $100K plan.");
          const collected: Content[] = [];
          await replyAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
          const text = (collected[collected.length - 1]?.text ?? "").toLowerCase();
          expect(text).toMatch(/100k|hypersurface|options|stack|pillar|seven/);
          assertNoAISlop(text);
        }),
    },
    {
      name: "own_position_assess_contains_csp_mechanics",
      fn: async (runtime: IAgentRuntime) =>
        runWithSolusRuntime(runtime, async () => {
          const canned =
            "Got it. $70K notional secured puts, $3,800 premium (about 2.5% on collateral), $150K USDT0. If spot stays above your strike through Friday 08:00 UTC, you keep the full $3,800 and the puts expire worthless. If spot breaks below strike, you're assigned—you buy at strike; the $3,800 premium lowers your cost basis. What's your strike? With that I'll give you the invalidation level and whether to hold, roll, or adjust.";
          const rt = createMinimalSolusRuntime(async () => canned);
          const msg = createMessage(
            "We bought $70K secured puts on Hypersurface, expiry next Friday, $3800 premium, $150K USDT0.",
          );
          const collected: Content[] = [];
          await solusPositionAssessAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
          const text = (collected[collected.length - 1]?.text ?? "").toLowerCase();
          expect(text).toMatch(/strike|premium|assigned|cost basis|invalidation|hold|roll/);
          expect(text).toMatch(/70|3800|150|usdt0/);
          assertNoAISlop(text);
        }),
    },
    {
      name: "own_pasted_call_contains_size_skip_and_invalidation",
      fn: async (runtime: IAgentRuntime) =>
        runWithSolusRuntime(runtime, async () => {
          const canned =
            "Size. Invalidation: funding above 0.02% or spot above 102k before expiry. If either hits, roll or close. That's the move.";
          const rt = createMinimalSolusRuntime(async () => canned);
          const msg = createMessage("VINCE said: BTC 105k strike, funding 0.01%. What's your call?");
          const collected: Content[] = [];
          await solusOptimalStrikeAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
          const text = (collected[collected.length - 1]?.text ?? "").toLowerCase();
          expect(text).toMatch(/size|skip|watch/);
          expect(text).toMatch(/invalidation/);
          assertNoAISlop(text);
        }),
    },
    {
      name: "curve_naming_who_do_i_ask_contains_lane_split",
      fn: async (runtime: IAgentRuntime) =>
        runWithSolusRuntime(runtime, async () => {
          const canned =
            "**VINCE** — aloha, options, perps, memes, news, X/CT, bot status, yield. **Me** — $100K plan, strike ritual how-to, size/skip when you paste his (or any) context, Echo DD process, rebalance. Data → him. Call → me.";
          const rt = createMinimalSolusRuntime(async (t) => (t === ModelType.TEXT_LARGE ? xmlMessage(canned) : ""));
          const msg = createMessage("Who do I ask for what?");
          const collected: Content[] = [];
          await replyAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
          const text = (collected[collected.length - 1]?.text ?? "").toLowerCase();
          expect(text).toMatch(/vince/);
          expect(text).toMatch(/data|call|paste|options|strike/);
          assertNoAISlop(text);
        }),
    },
    {
      name: "no_ai_slop_in_any_canned_reply",
      fn: async (runtime: IAgentRuntime) =>
        runWithSolusRuntime(runtime, async () => {
          const replies = [
            "That's VINCE—say 'aloha' to him. Paste it here and I'll give you the call.",
            "Hypersurface: Friday 08:00 UTC. Covered calls, secured puts, wheel. For IV say options to VINCE.",
            "Size. Invalidation: funding above 0.02%. That's the move.",
          ];
          for (const reply of replies) {
            assertNoAISlop(reply);
          }
        }),
    },
    {
      name: "one_clear_call_contains_size_skip_watch_and_invalidation",
      fn: async (runtime: IAgentRuntime) =>
        runWithSolusRuntime(runtime, async () => {
          const canned =
            "Size. Invalidation: funding above 0.02% or spot above 102k before expiry. If either hits, roll or close.";
          const rt = createMinimalSolusRuntime(async () => canned);
          const msg = createMessage("VINCE said: BTC 105k strike, funding 0.01%. What's your call?");
          const collected: Content[] = [];
          await solusOptimalStrikeAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
          const text = (collected[collected.length - 1]?.text ?? "").toLowerCase();
          const hasCall = /size|skip|watch/.test(text);
          const hasInvalidation = /invalidation|hold|roll/.test(text);
          expect(hasCall).toBe(true);
          expect(hasInvalidation).toBe(true);
        }),
    },
  ],
};

describe("Solus response (mocked runtime)", () => {
  it("handoff — Aloha returns VINCE and paste", async () => {
    const canned =
      "That's VINCE—say 'aloha' to him for the daily. When you have his options or summary, paste it here and I'll give you the call (size/skip and invalidation).";
    const rt = createMinimalSolusRuntime(async (t) => (t === ModelType.TEXT_LARGE ? xmlMessage(canned) : ""));
    const msg = createMessage("Aloha");
    const collected: Content[] = [];
    await replyAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
    const text = collected[collected.length - 1]?.text ?? "";
    expect(text).toMatch(/vince/i);
    expect(text).toMatch(/paste|paste it here/i);
    assertNoAISlop(text);
  });

  it("handoff — Options for this week returns VINCE and paste", async () => {
    const canned =
      "That's VINCE—say 'options' to him, then paste his view here. I'll give you strike ritual and size/skip with invalidation.";
    const rt = createMinimalSolusRuntime(async (t) => (t === ModelType.TEXT_LARGE ? xmlMessage(canned) : ""));
    const msg = createMessage("Options for this week");
    const collected: Content[] = [];
    await replyAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
    const text = (collected[collected.length - 1]?.text ?? "").toLowerCase();
    expect(text).toMatch(/vince/);
    expect(text).toMatch(/paste|options/);
    assertNoAISlop(text);
  });

  it("handoff — funding returns left curve / Vince", async () => {
    const canned =
      "That's left curve—Vince. Say 'options' to him and paste here; then I'll give you the strike call.";
    const rt = createMinimalSolusRuntime(async (t) => (t === ModelType.TEXT_LARGE ? xmlMessage(canned) : ""));
    const msg = createMessage("What's BTC funding? I need it for my strike call.");
    const collected: Content[] = [];
    await replyAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
    const text = (collected[collected.length - 1]?.text ?? "").toLowerCase();
    expect(text).toMatch(/vince|left curve/);
    expect(text).toMatch(/paste/);
    assertNoAISlop(text);
  });

  it("handoff — CT returns VINCE and paste", async () => {
    const canned =
      "That's VINCE. Say 'What's CT saying about BTC' to him, paste his answer here, and I'll give you size/skip and invalidation.";
    const rt = createMinimalSolusRuntime(async (t) => (t === ModelType.TEXT_LARGE ? xmlMessage(canned) : ""));
    const msg = createMessage("What's CT saying about BTC?");
    const collected: Content[] = [];
    await replyAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
    const text = (collected[collected.length - 1]?.text ?? "").toLowerCase();
    expect(text).toMatch(/vince/);
    expect(text).toMatch(/paste/);
    assertNoAISlop(text);
  });

  it("own — How does Hypersurface work? contains Friday 08:00, covered call, secured put, wheel, premium", async () => {
    const canned =
      "Hypersurface is where we execute—weekly options, Friday 08:00 UTC expiry. Covered calls: you own the asset, sell a call at a strike, earn upfront premium; above strike you're assigned. Secured puts: hold stablecoins (e.g. USDT0), sell a put, earn premium; below strike you're assigned, premium reduces cost basis. Wheel: CC then CSP, premium at every step. For live IV say 'options' to VINCE.";
    const rt = createMinimalSolusRuntime(async () => canned);
    const msg = createMessage("How does Hypersurface work?");
    const collected: Content[] = [];
    await solusHypersurfaceExplainAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
    const text = (collected[collected.length - 1]?.text ?? "").toLowerCase();
    expect(text).toMatch(/friday 08:00|08:00 utc/);
    expect(text).toMatch(/covered call|secured put|wheel|premium|cost basis/);
    assertNoAISlop(text);
  });

  it("own — How do I run my strike ritual? contains steps and VINCE options, paste, size/skip/invalidation", async () => {
    const canned =
      "Friday: (1) Say 'options' to VINCE and get his strike selection. (2) If you want CT vibe, ask VINCE 'What's CT saying about BTC'. (3) Paste that here and I'll give you size/skip and invalidation. I can also use the latest Grok daily from internal-docs if you haven't got fresh data.";
    const rt = createMinimalSolusRuntime(async () => canned);
    const msg = createMessage("How do I run my strike ritual?");
    const collected: Content[] = [];
    await solusStrikeRitualAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
    const text = (collected[collected.length - 1]?.text ?? "").toLowerCase();
    expect(text).toMatch(/vince|options/);
    expect(text).toMatch(/paste|size|skip|invalidation/);
    assertNoAISlop(text);
  });

  it("own — $100K plan contains seven pillars / HYPERSURFACE options / stack", async () => {
    const canned =
      "The $100K stack: (1) HYPERSURFACE options $3K/week min. (2) Yield USDC/USDT0. (3) Stack sats. (4) Echo DD. (5) Paper perps. (6) HIP-3 spot. (7) Airdrops. Options carry the target; the rest compounds.";
    const rt = createMinimalSolusRuntime(async (t) => (t === ModelType.TEXT_LARGE ? xmlMessage(canned) : ""));
    const msg = createMessage("Give me the full $100K plan.");
    const collected: Content[] = [];
    await replyAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
    const text = (collected[collected.length - 1]?.text ?? "").toLowerCase();
    expect(text).toMatch(/100k|hypersurface|options|stack|pillar|seven/);
    assertNoAISlop(text);
  });

  it("own — $70K secured puts position assess contains CSP mechanics, strike, premium, assigned, cost basis, invalidation/hold/roll", async () => {
    const canned =
      "Got it. $70K notional secured puts, $3,800 premium (about 2.5% on collateral), $150K USDT0. If spot stays above your strike through Friday 08:00 UTC, you keep the full $3,800 and the puts expire worthless. If spot breaks below strike, you're assigned—you buy at strike; the $3,800 premium lowers your cost basis. What's your strike? With that I'll give you the invalidation level and whether to hold, roll, or adjust.";
    const rt = createMinimalSolusRuntime(async () => canned);
    const msg = createMessage(
      "We bought $70K secured puts on Hypersurface, expiry next Friday, $3800 premium, $150K USDT0.",
    );
    const collected: Content[] = [];
    await solusPositionAssessAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
    const text = (collected[collected.length - 1]?.text ?? "").toLowerCase();
    expect(text).toMatch(/strike|premium|assigned|cost basis|invalidation|hold|roll/);
    expect(text).toMatch(/70|3800|150|usdt0/);
    assertNoAISlop(text);
  });

  it("own — pasted VINCE context returns size/skip/watch and invalidation", async () => {
    const canned =
      "Size. Invalidation: funding above 0.02% or spot above 102k before expiry. If either hits, roll or close. That's the move.";
    const rt = createMinimalSolusRuntime(async () => canned);
    const msg = createMessage("VINCE said: BTC 105k strike, funding 0.01%. What's your call?");
    const collected: Content[] = [];
    await solusOptimalStrikeAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
    const text = (collected[collected.length - 1]?.text ?? "").toLowerCase();
    expect(text).toMatch(/size|skip|watch/);
    expect(text).toMatch(/invalidation/);
    assertNoAISlop(text);
  });

  it("curve naming — Who do I ask for what? contains clear lane split", async () => {
    const canned =
      "**VINCE** — aloha, options, perps, memes, news, X/CT, bot status, yield. **Me** — $100K plan, strike ritual how-to, size/skip when you paste his (or any) context, Echo DD process, rebalance. Data → him. Call → me.";
    const rt = createMinimalSolusRuntime(async (t) => (t === ModelType.TEXT_LARGE ? xmlMessage(canned) : ""));
    const msg = createMessage("Who do I ask for what?");
    const collected: Content[] = [];
    await replyAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
    const text = (collected[collected.length - 1]?.text ?? "").toLowerCase();
    expect(text).toMatch(/vince/);
    expect(text).toMatch(/data|call|paste|options|strike/);
    assertNoAISlop(text);
  });

  it("no AI-slop — canned replies contain no banned phrases", async () => {
    const replies = [
      "That's VINCE—say 'aloha' to him. Paste it here and I'll give you the call.",
      "Hypersurface: Friday 08:00 UTC. Covered calls, secured puts, wheel. For IV say options to VINCE.",
      "Size. Invalidation: funding above 0.02%. That's the move.",
    ];
    for (const reply of replies) {
      assertNoAISlop(reply);
    }
  });

  it("one clear call — pasted-context reply contains size/skip/watch and invalidation", async () => {
    const canned =
      "Size. Invalidation: funding above 0.02% or spot above 102k before expiry. If either hits, roll or close.";
    const rt = createMinimalSolusRuntime(async () => canned);
    const msg = createMessage("VINCE said: BTC 105k strike, funding 0.01%. What's your call?");
    const collected: Content[] = [];
    await solusOptimalStrikeAction.handler!(rt, msg, defaultState(), undefined, async (c) => collected.push(c));
    const text = (collected[collected.length - 1]?.text ?? "").toLowerCase();
    expect(/size|skip|watch/.test(text)).toBe(true);
    expect(/invalidation|hold|roll/.test(text)).toBe(true);
  });
});
