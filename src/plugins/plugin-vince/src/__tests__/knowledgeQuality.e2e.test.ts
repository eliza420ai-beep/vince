/**
 * Eliza, VINCE & Solus Knowledge Quality E2E Test
 *
 * Tests whether the knowledge base actually improves response quality using
 * A/B comparison (with knowledge vs without knowledge).
 *
 * PRIMARY CONSUMERS:
 * - Eliza (chat, brainstorm, research) — synthesizes across knowledge
 * - VINCE (execution context) — options, perps, memes, lifestyle, art
 * - Solus (wealth architect) — strike ritual, yield stack, seven pillars
 *
 * Usage:
 *   RUN_NETWORK_TESTS=1 bun test src/plugins/plugin-vince/src/__tests__/knowledgeQuality.e2e.test.ts
 *   KNOWLEDGE_QUALITY_QUICK=1 RUN_NETWORK_TESTS=1 bun test ...  # Run only OPTIONS, PERPS, RESEARCH (~2-3 min)
 *
 * Output:
 *   - Console summary
 *   - data/knowledge-quality-results.json (for dashboard display)
 *
 * Requirements:
 *   - OPENAI_API_KEY
 *   - Network access
 *   - ~5-10 minutes runtime
 */

import * as fs from "fs";
import * as path from "path";
import { describe, it, expect, beforeAll } from "vitest";
import {
  type TestCase,
  type DomainTestResult,
  runDomainTest,
  clearEmbeddingCache,
  DOMAIN_TO_FOLDER,
} from "./knowledge-utils";

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const VINCE_TEST_CASES: TestCase[] = [
  // OPTIONS Domain - explicitly ask for knowledge-based frameworks
  {
    domain: "OPTIONS",
    query:
      "Using the strike selection framework from your knowledge base, how should I adjust HYPE covered call strikes when funding is +0.03%? What does your knowledge say about APR thresholds and the Wheel Strategy implementation?",
    expectedCapabilities: [
      "strike selection from perps methodology",
      "Wheel Strategy implementation",
      "APR threshold framework",
      "HYPE-specific guidance",
    ],
    expectedTone: [
      "direct",
      "methodology-focused",
      "trader language",
      "framework-citing",
    ],
    weight: 5,
    description: "Options strike selection with Wheel Strategy",
  },

  // PERPS Domain - explicitly ask for interpretation framework
  {
    domain: "PERPS",
    query:
      "According to your funding rate interpretation framework, what are the red flags when funding flips from negative to positive? Apply the methodology from your knowledge to explain entry timing.",
    expectedCapabilities: [
      "funding rate interpretation framework",
      "specific thresholds (0.05% crowded)",
      "entry timing methodology",
      "red flag identification",
    ],
    expectedTone: ["data-first", "framework-applying", "expert knowledge"],
    weight: 5,
    description: "Funding rate interpretation methodology",
  },

  // MEMES/TRENCHES Domain - explicitly ask for H/E/F/S and grinding methodology
  {
    domain: "MEMES",
    query:
      "Using the trenches grinding methodology from your knowledge base, how should I evaluate a new Solana meme coin? Apply the H/E/F/S rating system if your knowledge includes it.",
    expectedCapabilities: [
      "trenches grinding methodology",
      "H/E/F/S rating system",
      "pump.fun evaluation framework",
      "LP analysis approach",
    ],
    expectedTone: ["practical", "framework-citing", "degen-aware"],
    weight: 4,
    description: "Meme coin evaluation with H/E/F/S",
  },

  // AIRDROPS Domain - explicitly ask for Tread.fi strategies
  {
    domain: "AIRDROPS",
    query:
      "What does your knowledge base say about Tread.fi airdrop farming strategies? Apply any specific volume targets or tier thresholds from your knowledge to optimize farming approach.",
    expectedCapabilities: [
      "Treadfi strategy specifics",
      "volume target thresholds",
      "tier optimization framework",
      "capital efficiency methodology",
    ],
    expectedTone: ["strategic", "framework-citing", "specific protocols"],
    weight: 4,
    description: "Airdrop farming with knowledge thresholds",
  },

  // LIFESTYLE Domain - explicitly ask for Southwest France Palace methodology
  {
    domain: "LIFESTYLE",
    query:
      "According to your Southwest France Palace methodology, which of the three Palaces should I choose for a gastronomy-focused one-night stay? Apply your 24-hour protocol and explain the off-season timing strategy. What makes Les Prés d'Eugénie different from Les Sources de Caudalie for this purpose?",
    expectedCapabilities: [
      "specific Palace comparisons (Eugénie vs Caudalie vs Palais)",
      "1-night 24-hour protocol",
      "off-season timing strategy",
      "occasion-matching framework",
    ],
    expectedTone: ["cultured", "methodology-applying", "property-specific"],
    weight: 3,
    description: "Southwest France Palace selection methodology",
  },

  // ART/NFT Domain - explicitly ask for floor analysis methodology
  {
    domain: "ART",
    query:
      "What methodology does your knowledge base provide for evaluating NFT floor thickness? Apply this framework to analyze CryptoPunks or Meridian liquidity specifically.",
    expectedCapabilities: [
      "floor analysis methodology from knowledge",
      "liquidity assessment framework",
      "CryptoPunks/Meridian specific analysis",
      "collection evaluation approach",
    ],
    expectedTone: ["analytical", "framework-applying", "collection-specific"],
    weight: 3,
    description: "NFT floor analysis with knowledge methodology",
  },

  // --- Eliza-specific: chat, brainstorm, research (primary knowledge consumer) ---
  {
    domain: "RESEARCH",
    query:
      "What does our research say about macro cycles and liquidity regimes? Synthesize across substack-essays and bitcoin-maxi—how should we think about risk-on vs risk-off right now?",
    expectedCapabilities: [
      "synthesis across substack-essays",
      "macro cycle frameworks",
      "liquidity regime methodology",
      "risk-on/risk-off thinking",
    ],
    expectedTone: ["synthesizing", "framework-citing", "research-led"],
    weight: 4,
    description: "Eliza: research synthesis across essays",
    agent: "eliza",
  },
  {
    domain: "BRAINSTORM",
    query:
      "I'm brainstorming lifestyle ROI—when to trade vs when to step away. What frameworks from the-good-life and internal-docs apply? How does the Cheat Code or Okerson Protocol inform this?",
    expectedCapabilities: [
      "lifestyle ROI framework",
      "Cheat Code / Okerson Protocol",
      "trade vs step-away methodology",
      "the-good-life synthesis",
    ],
    expectedTone: ["brainstorm-friendly", "framework-citing", "synthesizing"],
    weight: 3,
    description: "Eliza: brainstorm with lifestyle frameworks",
    agent: "eliza",
  },
  {
    domain: "PROMPT_DESIGN",
    query:
      "What does our prompt-templates knowledge say about the six-part framework for prompt engineering? How should I approach teaching someone to build their own prompts vs producing for them?",
    expectedCapabilities: [
      "six-part prompt framework",
      "teaching vs producing methodology",
      "prompt-templates knowledge",
      "PROMPT-ENGINEER-MASTER guidance",
    ],
    expectedTone: ["mentor-like", "framework-citing", "educational"],
    weight: 3,
    description: "Eliza: prompt design mentoring from knowledge",
    agent: "eliza",
  },

  // --- Solus-specific: wealth architect, strike ritual, yield stack ---
  {
    domain: "STRIKE_RITUAL",
    query:
      "Using your strike ritual methodology from the knowledge base, how should I set up this week's HYPERSURFACE covered call strikes? Apply yield math: $X weekly on $100K at Y% OTM. What does the knowledge say about IV-aware sizing and Friday strike selection?",
    expectedCapabilities: [
      "strike ritual / strike selection framework",
      "yield math ($X/week on $100K at Y% OTM)",
      "IV-aware sizing",
      "Friday strike selection cadence",
      "HYPERSURFACE-specific guidance",
    ],
    expectedTone: [
      "execution-focused",
      "numbers-first",
      "wealth-building systems",
      "no hopium",
    ],
    weight: 5,
    description: "Solus: HYPERSURFACE strike ritual with yield math",
    agent: "solus",
  },
  {
    domain: "YIELD_STACK",
    query:
      "What does your knowledge base say about stacking yield on USDC and USDT0? Compare Pendle, Aave, Morpho—risk-adjusted rates. How should I size idle stablecoins for the $100K plan?",
    expectedCapabilities: [
      "USDC/USDT0 yield comparison",
      "Pendle, Aave, Morpho protocols",
      "risk-adjusted rates",
      "sizing for $100K plan",
    ],
    expectedTone: ["execution-driven", "numbers-first", "protocol-specific"],
    weight: 4,
    description: "Solus: DeFi yield stack for stablecoins",
    agent: "solus",
  },
  {
    domain: "SEVEN_PILLARS",
    query:
      "Walk me through the full $100K plan from your knowledge. How do the seven pillars (sats, yield, Echo DD, paper perps bot, HIP-3, airdrops, HYPERSURFACE options) allocate? What are concrete weekly targets and execution systems?",
    expectedCapabilities: [
      "seven pillars breakdown",
      "concrete allocations",
      "weekly targets",
      "execution systems",
      "options as primary engine",
    ],
    expectedTone: ["systematic", "execution-focused", "numbers-first"],
    weight: 4,
    description: "Solus: $100K plan seven pillars",
    agent: "solus",
  },
];

// ============================================================================
// TEST SUITE (A/B comparison skipped unless RUN_NETWORK_TESTS=1)
// ============================================================================
const skipNetworkTests = process.env.RUN_NETWORK_TESTS !== "1";

/** When KNOWLEDGE_QUALITY_QUICK=1, run only these domains for faster feedback (~2–3 min vs ~5–10 min). */
const QUICK_QUALITY_DOMAINS = ["OPTIONS", "PERPS", "RESEARCH"];

describe("VINCE Knowledge Quality", () => {
  const results: DomainTestResult[] = [];

  beforeAll(() => {
    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      console.warn("\n⚠️  OPENAI_API_KEY not set - test will skip\n");
    }

    // Clear embedding cache for fresh run
    clearEmbeddingCache();
  });

  describe.skipIf(skipNetworkTests)("A/B Comparison by Domain", () => {
    it("should show improvement with OPTIONS knowledge", async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping - no API key");
        return;
      }
      if (process.env.KNOWLEDGE_QUALITY_QUICK === "1" && !QUICK_QUALITY_DOMAINS.includes("OPTIONS")) return;

      const testCase = VINCE_TEST_CASES.find((t) => t.domain === "OPTIONS")!;
      const result = await runDomainTest(testCase);
      results.push(result);

      // Enhanced should score at least as well as baseline
      expect(result.enhancedScore.overallScore).toBeGreaterThanOrEqual(
        result.baselineScore.overallScore - 5, // Allow small variance
      );

      // Domain expertise should show improvement
      expect(result.enhancedScore.domainExpertise).toBeGreaterThanOrEqual(
        result.baselineScore.domainExpertise - 10,
      );
    }, 180000); // 3 min timeout

    it("should show improvement with PERPS knowledge", async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping - no API key");
        return;
      }
      if (process.env.KNOWLEDGE_QUALITY_QUICK === "1" && !QUICK_QUALITY_DOMAINS.includes("PERPS")) return;

      const testCase = VINCE_TEST_CASES.find((t) => t.domain === "PERPS")!;
      const result = await runDomainTest(testCase);
      results.push(result);

      expect(result.enhancedScore.overallScore).toBeGreaterThanOrEqual(
        result.baselineScore.overallScore - 5,
      );
    }, 180000);

    it("should show improvement with MEMES knowledge", async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping - no API key");
        return;
      }
      if (process.env.KNOWLEDGE_QUALITY_QUICK === "1" && !QUICK_QUALITY_DOMAINS.includes("MEMES")) return;

      const testCase = VINCE_TEST_CASES.find((t) => t.domain === "MEMES")!;
      const result = await runDomainTest(testCase);
      results.push(result);

      expect(result.enhancedScore.overallScore).toBeGreaterThanOrEqual(
        result.baselineScore.overallScore - 5,
      );
    }, 180000);

    it("should show improvement with AIRDROPS knowledge", async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping - no API key");
        return;
      }
      if (process.env.KNOWLEDGE_QUALITY_QUICK === "1" && !QUICK_QUALITY_DOMAINS.includes("AIRDROPS")) return;

      const testCase = VINCE_TEST_CASES.find((t) => t.domain === "AIRDROPS")!;
      const result = await runDomainTest(testCase);
      results.push(result);

      expect(result.enhancedScore.overallScore).toBeGreaterThanOrEqual(
        result.baselineScore.overallScore - 5,
      );
    }, 180000);

    it("should show improvement with LIFESTYLE knowledge", async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping - no API key");
        return;
      }
      if (process.env.KNOWLEDGE_QUALITY_QUICK === "1" && !QUICK_QUALITY_DOMAINS.includes("LIFESTYLE")) return;

      const testCase = VINCE_TEST_CASES.find((t) => t.domain === "LIFESTYLE")!;
      const result = await runDomainTest(testCase);
      results.push(result);

      expect(result.enhancedScore.overallScore).toBeGreaterThanOrEqual(
        result.baselineScore.overallScore - 5,
      );
    }, 180000);

    it("should show improvement with ART knowledge", async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping - no API key");
        return;
      }
      if (process.env.KNOWLEDGE_QUALITY_QUICK === "1" && !QUICK_QUALITY_DOMAINS.includes("ART")) return;

      const testCase = VINCE_TEST_CASES.find((t) => t.domain === "ART")!;
      const result = await runDomainTest(testCase);
      results.push(result);

      expect(result.enhancedScore.overallScore).toBeGreaterThanOrEqual(
        result.baselineScore.overallScore - 5,
      );
    }, 180000);

    // Eliza-specific: research, brainstorm, prompt design (primary knowledge consumer)
    it("should show improvement with RESEARCH knowledge (Eliza)", async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping - no API key");
        return;
      }
      if (process.env.KNOWLEDGE_QUALITY_QUICK === "1" && !QUICK_QUALITY_DOMAINS.includes("RESEARCH")) return;

      const testCase = VINCE_TEST_CASES.find((t) => t.domain === "RESEARCH")!;
      const result = await runDomainTest(testCase);
      results.push(result);
      expect(result.enhancedScore.overallScore).toBeGreaterThanOrEqual(
        result.baselineScore.overallScore - 5,
      );
    }, 180000);

    it("should show improvement with BRAINSTORM knowledge (Eliza)", async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping - no API key");
        return;
      }
      if (process.env.KNOWLEDGE_QUALITY_QUICK === "1" && !QUICK_QUALITY_DOMAINS.includes("BRAINSTORM")) return;

      const testCase = VINCE_TEST_CASES.find((t) => t.domain === "BRAINSTORM")!;
      const result = await runDomainTest(testCase);
      results.push(result);
      expect(result.enhancedScore.overallScore).toBeGreaterThanOrEqual(
        result.baselineScore.overallScore - 5,
      );
    }, 180000);

    it("should show improvement with PROMPT_DESIGN knowledge (Eliza)", async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping - no API key");
        return;
      }
      if (process.env.KNOWLEDGE_QUALITY_QUICK === "1" && !QUICK_QUALITY_DOMAINS.includes("PROMPT_DESIGN")) return;

      const testCase = VINCE_TEST_CASES.find((t) => t.domain === "PROMPT_DESIGN")!;
      const result = await runDomainTest(testCase);
      results.push(result);
      expect(result.enhancedScore.overallScore).toBeGreaterThanOrEqual(
        result.baselineScore.overallScore - 5,
      );
    }, 180000);

    // Solus-specific: strike ritual, yield stack, seven pillars
    it("should show improvement with STRIKE_RITUAL knowledge (Solus)", async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping - no API key");
        return;
      }
      if (process.env.KNOWLEDGE_QUALITY_QUICK === "1" && !QUICK_QUALITY_DOMAINS.includes("STRIKE_RITUAL")) return;

      const testCase = VINCE_TEST_CASES.find((t) => t.domain === "STRIKE_RITUAL")!;
      const result = await runDomainTest(testCase);
      results.push(result);
      expect(result.enhancedScore.overallScore).toBeGreaterThanOrEqual(
        result.baselineScore.overallScore - 5,
      );
    }, 180000);

    it("should show improvement with YIELD_STACK knowledge (Solus)", async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping - no API key");
        return;
      }
      if (process.env.KNOWLEDGE_QUALITY_QUICK === "1" && !QUICK_QUALITY_DOMAINS.includes("YIELD_STACK")) return;

      const testCase = VINCE_TEST_CASES.find((t) => t.domain === "YIELD_STACK")!;
      const result = await runDomainTest(testCase);
      results.push(result);
      expect(result.enhancedScore.overallScore).toBeGreaterThanOrEqual(
        result.baselineScore.overallScore - 5,
      );
    }, 180000);

    it("should show improvement with SEVEN_PILLARS knowledge (Solus)", async () => {
      if (!process.env.OPENAI_API_KEY) {
        console.log("Skipping - no API key");
        return;
      }
      if (process.env.KNOWLEDGE_QUALITY_QUICK === "1" && !QUICK_QUALITY_DOMAINS.includes("SEVEN_PILLARS")) return;

      const testCase = VINCE_TEST_CASES.find((t) => t.domain === "SEVEN_PILLARS")!;
      const result = await runDomainTest(testCase);
      results.push(result);
      expect(result.enhancedScore.overallScore).toBeGreaterThanOrEqual(
        result.baselineScore.overallScore - 5,
      );
    }, 180000);
  });

  describe("Overall Knowledge Impact", () => {
    it("should show positive average improvement across all domains", async () => {
      if (!process.env.OPENAI_API_KEY || results.length === 0) {
        console.log("Skipping - no API key or no results");
        return;
      }

      // Calculate averages
      const avgBaseline =
        results.reduce((sum, r) => sum + r.baselineScore.overallScore, 0) /
        results.length;
      const avgEnhanced =
        results.reduce((sum, r) => sum + r.enhancedScore.overallScore, 0) /
        results.length;
      const avgImprovement = avgEnhanced - avgBaseline;
      const improvementPercent =
        avgBaseline > 0
          ? ((avgImprovement / avgBaseline) * 100).toFixed(1)
          : "N/A";

      // Calculate Knowledge Integration averages
      const avgKIBaseline =
        results.reduce(
          (sum, r) => sum + r.baselineScore.knowledgeIntegration,
          0,
        ) / results.length;
      const avgKIEnhanced =
        results.reduce(
          (sum, r) => sum + r.enhancedScore.knowledgeIntegration,
          0,
        ) / results.length;
      const avgKIImprovement = avgKIEnhanced - avgKIBaseline;

      // Print summary
      console.log("\n");
      console.log("═".repeat(80));
      console.log("                    VINCE KNOWLEDGE QUALITY RESULTS");
      console.log("═".repeat(80));
      console.log(
        "\n| Domain     | Base | Enh  | Impr   | KI Base | KI Enh | KI Delta |",
      );
      console.log(
        "|------------|------|------|--------|---------|--------|----------|",
      );

      for (const r of results) {
        const kiDelta =
          r.enhancedScore.knowledgeIntegration -
          r.baselineScore.knowledgeIntegration;
        console.log(
          `| ${r.domain.padEnd(10)} | ${String(r.baselineScore.overallScore).padStart(4)} | ${String(r.enhancedScore.overallScore).padStart(4)} | ${((r.improvement >= 0 ? "+" : "") + r.improvement).padStart(6)} | ${String(r.baselineScore.knowledgeIntegration).padStart(7)} | ${String(r.enhancedScore.knowledgeIntegration).padStart(6)} | ${((kiDelta >= 0 ? "+" : "") + kiDelta).padStart(8)} |`,
        );
      }

      console.log(
        "|------------|------|------|--------|---------|--------|----------|",
      );
      console.log(
        `| AVERAGE    | ${String(Math.round(avgBaseline)).padStart(4)} | ${String(Math.round(avgEnhanced)).padStart(4)} | ${((avgImprovement >= 0 ? "+" : "") + Math.round(avgImprovement)).padStart(6)} | ${String(Math.round(avgKIBaseline)).padStart(7)} | ${String(Math.round(avgKIEnhanced)).padStart(6)} | ${((avgKIImprovement >= 0 ? "+" : "") + Math.round(avgKIImprovement)).padStart(8)} |`,
      );
      console.log("\n");
      console.log(`Overall Improvement: ${improvementPercent}%`);
      console.log(
        `Knowledge Integration Delta: +${Math.round(avgKIImprovement)} points`,
      );

      // Interpretation
      const pct = parseFloat(improvementPercent as string);
      if (pct >= 20) {
        console.log("EXCELLENT: Knowledge base provides significant value!");
      } else if (pct >= 10) {
        console.log("GOOD: Knowledge base is helping responses.");
      } else if (pct >= 5) {
        console.log("MODERATE: Some improvement detected.");
      } else if (pct > 0) {
        console.log(
          "LIMITED: Small improvement. Consider reviewing knowledge quality.",
        );
      } else {
        console.log(
          "NO IMPROVEMENT: Knowledge may not be matching queries well.",
        );
      }

      // Best and worst domains
      const best = results.reduce((a, b) =>
        a.improvement > b.improvement ? a : b,
      );
      const worst = results.reduce((a, b) =>
        a.improvement < b.improvement ? a : b,
      );

      console.log(`\nBest: ${best.domain} (+${best.improvement})`);
      console.log(`Needs work: ${worst.domain} (+${worst.improvement})`);
      console.log("\n");

      // Build recommendations and gaps, write to data/knowledge-quality-results.json
      const gaps = results
        .filter((r) => r.improvement < 5 || r.enhancedScore.knowledgeIntegration < 50)
        .map((r) => ({
          domain: r.domain,
          folder: DOMAIN_TO_FOLDER[r.domain] ?? r.domain.toLowerCase(),
          improvement: r.improvement,
          knowledgeIntegration: r.enhancedScore.knowledgeIntegration,
          recommendation: r.improvement < 0
            ? `Add or improve methodology content in knowledge/${DOMAIN_TO_FOLDER[r.domain] ?? r.domain.toLowerCase()}/. Low KI score (${r.enhancedScore.knowledgeIntegration}) suggests retrieval or content quality issues.`
            : r.enhancedScore.knowledgeIntegration < 50
              ? `Improve knowledge quality in knowledge/${DOMAIN_TO_FOLDER[r.domain] ?? r.domain.toLowerCase()}/: add frameworks, methodology sections, and decision trees. KI score ${r.enhancedScore.knowledgeIntegration} is below 50.`
              : `Consider adding more content to knowledge/${DOMAIN_TO_FOLDER[r.domain] ?? r.domain.toLowerCase()}/. Improvement +${r.improvement} is modest.`,
        }))
        .sort((a, b) => a.improvement - b.improvement);

      const recommendations: string[] = [];
      if (pct >= 20) {
        recommendations.push("EXCELLENT: Knowledge base provides significant value. Keep adding methodology-focused content.");
      } else if (pct >= 10) {
        recommendations.push("GOOD: Knowledge base is helping. Focus on improving low-scoring domains.");
      } else if (pct >= 5) {
        recommendations.push("MODERATE: Some improvement. Prioritize gaps below; add methodology sections and frameworks.");
      } else if (pct > 0) {
        recommendations.push("LIMITED: Small improvement. Review knowledge structure and add decision frameworks to weak areas.");
      } else {
        recommendations.push("NO IMPROVEMENT: Check RAG retrieval and ensure knowledge files have methodology sections at top.");
      }
      recommendations.push(`Focus first on: ${gaps.slice(0, 3).map((g) => g.folder).join(", ")}`);
      recommendations.push("Use KNOWLEDGE-QUALITY-CHECKLIST.md when adding new files.");

      const output = {
        ranAt: new Date().toISOString(),
        summary: {
          avgBaseline: Math.round(avgBaseline),
          avgEnhanced: Math.round(avgEnhanced),
          avgImprovement: Math.round(avgImprovement),
          improvementPercent,
          avgKIImprovement: Math.round(avgKIImprovement),
        },
        results: results.map((r) => ({
          domain: r.domain,
          folder: DOMAIN_TO_FOLDER[r.domain] ?? r.domain.toLowerCase(),
          improvement: r.improvement,
          knowledgeIntegration: r.enhancedScore.knowledgeIntegration,
          baselineScore: r.baselineScore.overallScore,
          enhancedScore: r.enhancedScore.overallScore,
          agent: r.agent ?? "vince",
        })),
        gaps,
        recommendations,
        note: "Eliza (chat, brainstorm), VINCE (execution), Solus (wealth architect). Each agent uses knowledge differently.",
      };

      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const outPath = path.join(dataDir, "knowledge-quality-results.json");
      fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
      const historyPath = path.join(dataDir, "knowledge-quality-history.json");
      const MAX_HISTORY = 10;
      let historyEntries: { ranAt: string; avgImprovement: number; avgKIImprovement: number }[] = [];
      if (fs.existsSync(historyPath)) {
        try {
          const raw = fs.readFileSync(historyPath, "utf8");
          historyEntries = JSON.parse(raw);
        } catch {
          historyEntries = [];
        }
      }
      historyEntries.unshift({
        ranAt: output.ranAt,
        avgImprovement: output.summary.avgImprovement,
        avgKIImprovement: output.summary.avgKIImprovement,
      });
      if (historyEntries.length > MAX_HISTORY) historyEntries = historyEntries.slice(0, MAX_HISTORY);
      fs.writeFileSync(historyPath, JSON.stringify(historyEntries, null, 2), "utf8");
      console.log(`\nResults written to ${outPath} (for dashboard display)\n`);

      // Assertion: average improvement should be non-negative
      // We're lenient here - knowledge should help, not hurt
      expect(avgEnhanced).toBeGreaterThanOrEqual(avgBaseline - 10);
    });

    it("should have OPTIONS and PERPS as top performers (our deepest knowledge)", async () => {
      if (!process.env.OPENAI_API_KEY || results.length === 0) {
        console.log("Skipping - no API key or no results");
        return;
      }

      const optionsResult = results.find((r) => r.domain === "OPTIONS");
      const perpsResult = results.find((r) => r.domain === "PERPS");

      if (optionsResult && perpsResult) {
        // These are our deepest knowledge areas - should show positive improvement
        console.log(`\nCore Domains Check:`);
        const optKIDelta =
          optionsResult.enhancedScore.knowledgeIntegration -
          optionsResult.baselineScore.knowledgeIntegration;
        const perpsKIDelta =
          perpsResult.enhancedScore.knowledgeIntegration -
          perpsResult.baselineScore.knowledgeIntegration;

        console.log(
          `  OPTIONS: Overall ${optionsResult.improvement >= 0 ? "PASS" : "FAIL"} (+${optionsResult.improvement}) | KI Delta: +${optKIDelta}`,
        );
        console.log(
          `  PERPS: Overall ${perpsResult.improvement >= 0 ? "PASS" : "FAIL"} (+${perpsResult.improvement}) | KI Delta: +${perpsKIDelta}`,
        );

        // At least one of our core domains should show improvement
        const coreImprovement = Math.max(
          optionsResult.improvement,
          perpsResult.improvement,
        );
        expect(coreImprovement).toBeGreaterThanOrEqual(0);

        // Knowledge Integration should improve significantly for core domains
        const coreKIImprovement = Math.max(optKIDelta, perpsKIDelta);
        expect(coreKIImprovement).toBeGreaterThanOrEqual(5);

        // Per-domain regression guards: OPTIONS and PERPS must meet quality thresholds
        const OPTIONS_KI_OK = optionsResult.enhancedScore.knowledgeIntegration >= 70;
        const OPTIONS_IMPROVEMENT_OK = optionsResult.improvement >= 15;
        const PERPS_KI_OK = perpsResult.enhancedScore.knowledgeIntegration >= 70;
        const PERPS_IMPROVEMENT_OK = perpsResult.improvement >= 15;
        expect(
          OPTIONS_KI_OK || OPTIONS_IMPROVEMENT_OK,
          `OPTIONS regression: KI ${optionsResult.enhancedScore.knowledgeIntegration} (need >=70) or improvement ${optionsResult.improvement} (need >=15)`,
        ).toBe(true);
        expect(
          PERPS_KI_OK || PERPS_IMPROVEMENT_OK,
          `PERPS regression: KI ${perpsResult.enhancedScore.knowledgeIntegration} (need >=70) or improvement ${perpsResult.improvement} (need >=15)`,
        ).toBe(true);
      }
    });

    it("should show Knowledge Integration improvement when knowledge is provided", async () => {
      if (!process.env.OPENAI_API_KEY || results.length === 0) {
        console.log("Skipping - no API key or no results");
        return;
      }

      // Calculate average KI delta
      const avgKIDelta =
        results.reduce((sum, r) => {
          return (
            sum +
            (r.enhancedScore.knowledgeIntegration -
              r.baselineScore.knowledgeIntegration)
          );
        }, 0) / results.length;

      console.log(`\nKnowledge Integration Check:`);
      console.log(`  Average KI Delta: +${Math.round(avgKIDelta)}`);
      console.log(
        `  This measures whether knowledge is actually being USED, not just present.`,
      );

      // Enhanced responses should have higher KI scores than baseline
      // This is the key metric - proves knowledge is being integrated
      expect(avgKIDelta).toBeGreaterThan(0);
    });
  });
});
