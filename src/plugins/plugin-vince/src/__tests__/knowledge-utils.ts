/**
 * Knowledge Quality Testing Utilities
 *
 * Provides utilities for testing whether VINCE's knowledge base
 * actually improves response quality via A/B comparison.
 *
 * Based on patterns from scripts/test-knowledge-quality.ts
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// CONFIGURATION
// ============================================================================

const RETRIEVAL_CONFIG = {
  similarityThreshold: 0.35, // Raised from 0.1 to filter irrelevant chunks
  maxChunks: 8,
  maxTokens: 4000,
  chunkSize: 1000,
  chunkOverlap: 100,
};

// ============================================================================
// TYPES
// ============================================================================

export interface KnowledgeChunk {
  content: string;
  file: string;
  relevance: number;
  similarity?: number;
  embedding?: number[];
}

export interface TestCase {
  domain: string;
  query: string;
  expectedCapabilities: string[];
  expectedTone: string[];
  weight: number;
  description: string;
  /** Eliza = primary knowledge consumer (chat/brainstorm). VINCE = execution. Solus = wealth architect. */
  agent?: "eliza" | "vince" | "solus";
}

export interface ScoreResult {
  knowledgeIntegration: number; // NEW: measures if knowledge was actually used
  capabilityCoverage: number;
  toneConsistency: number;
  actionability: number;
  authenticity: number;
  domainExpertise: number;
  overallScore: number;
  feedback: string;
}

export interface RetrievalMetrics {
  avgSimilarity: number;
  maxSimilarity: number;
  minSimilarity: number;
  chunksAboveThreshold: number;
  totalChunksEvaluated: number;
  methodologyChunksFound: number;
}

export interface DomainTestResult {
  domain: string;
  query: string;
  baselineScore: ScoreResult;
  enhancedScore: ScoreResult;
  improvement: number;
  improvementPercent: string;
  chunksUsed: number;
  metrics?: RetrievalMetrics;
}

export interface KnowledgeLoadResult {
  content: string;
  size: string;
  chunksUsed: number;
  metrics: RetrievalMetrics;
}

// ============================================================================
// EMBEDDING UTILITIES
// ============================================================================

const embeddingCache = new Map<string, number[]>();

/**
 * Calculate cosine similarity between two embedding vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embedding vectors must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Generate embedding for text using OpenAI API
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for embedding generation");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    const data = (await response.json()) as any;
    if (data.error) {
      throw new Error(data.error.message || "Embedding generation failed");
    }

    return data.data[0].embedding as number[];
  } catch (error) {
    console.error("Embedding generation error:", error);
    throw error;
  }
}

/**
 * Get embedding with caching
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const cacheKey = text.slice(0, 200);

  if (embeddingCache.has(cacheKey)) {
    return embeddingCache.get(cacheKey)!;
  }

  const embedding = await generateEmbedding(text);
  embeddingCache.set(cacheKey, embedding);

  return embedding;
}

/**
 * Clear the embedding cache
 */
export function clearEmbeddingCache(): void {
  embeddingCache.clear();
}

// ============================================================================
// TEXT CHUNKING
// ============================================================================

/**
 * Split text into chunks with overlap
 */
export function splitIntoChunks(
  text: string,
  targetSize: number = RETRIEVAL_CONFIG.chunkSize,
  overlap: number = RETRIEVAL_CONFIG.chunkOverlap,
): string[] {
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);

  let currentChunk = "";

  for (const sentence of sentences) {
    if (
      currentChunk.length + sentence.length > targetSize &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk.trim());
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + (overlapText ? " " : "") + sentence;
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks.length > 0 ? chunks : [text];
}

// ============================================================================
// KNOWLEDGE LOADING
// ============================================================================

/**
 * VINCE's knowledge directories
 */
export const VINCE_KNOWLEDGE_PATHS = [
  { directory: "options", shared: true },
  { directory: "perps-trading", shared: true },
  { directory: "grinding-the-trenches", shared: true },
  { directory: "defi-metrics", shared: true },
  { directory: "the-good-life", shared: true },
  { directory: "art-collections", shared: true },
];

/**
 * Solus's knowledge directories (wealth architect: options, yield, sats, Echo DD, airdrops)
 */
export const SOLUS_KNOWLEDGE_PATHS = [
  { directory: "options", shared: true },
  { directory: "perps-trading", shared: true },
  { directory: "airdrops", shared: true },
  { directory: "defi-metrics", shared: true },
  { directory: "venture-capital", shared: true },
  { directory: "bitcoin-maxi", shared: true },
  { directory: "altcoins", shared: true },
  { directory: "stablecoins", shared: true },
  { directory: "internal-docs", shared: true },
];

/**
 * Load and retrieve relevant knowledge chunks for a query
 */
export async function loadRelevantKnowledge(
  query: string,
  knowledgePaths: {
    directory: string;
    shared: boolean;
  }[] = VINCE_KNOWLEDGE_PATHS,
): Promise<KnowledgeLoadResult> {
  const projectRoot = path.resolve(process.cwd());
  const knowledgeDir = path.join(projectRoot, "knowledge");

  // Collect all knowledge chunks
  const allChunks: KnowledgeChunk[] = [];
  let totalSize = 0;
  let fileCount = 0;

  for (const item of knowledgePaths) {
    const fullPath = path.join(knowledgeDir, item.directory);

    if (!fs.existsSync(fullPath)) {
      continue;
    }

    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      const entries = fs.readdirSync(fullPath, { recursive: true });
      const files = entries
        .filter((f): f is string => typeof f === "string" && f.endsWith(".md"))
        .map((f) => path.join(fullPath, f));

      for (const file of files) {
        try {
          const content = fs.readFileSync(file, "utf-8");
          const chunks = splitIntoChunks(content);
          for (const chunk of chunks) {
            allChunks.push({
              content: chunk,
              file: path.relative(knowledgeDir, file),
              relevance: 0,
            });
          }
          totalSize += content.length;
          fileCount++;
        } catch {
          // Skip files that can't be read
        }
      }
    }
  }

  // Generate embeddings and calculate similarity
  console.log(`   Generating query embedding...`);
  const queryEmbedding = await getEmbedding(query);

  console.log(`   Processing ${allChunks.length} chunks...`);

  // Process in batches to avoid rate limits
  const batchSize = 20;
  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize);
    await Promise.all(
      batch.map(async (chunk) => {
        try {
          const embedding = await getEmbedding(chunk.content);
          chunk.embedding = embedding;
          chunk.similarity = cosineSimilarity(queryEmbedding, embedding);
          chunk.relevance = chunk.similarity;
        } catch {
          chunk.similarity = 0;
          chunk.relevance = 0;
        }
      }),
    );
  }

  // Apply quality penalties and boosts
  for (const chunk of allChunks) {
    const chunkLower = chunk.content.toLowerCase();

    // PENALTY: Meta-instructions (API docs, tool instructions)
    const metaTerms = [
      "api",
      "endpoint",
      "install",
      "npm",
      "import from",
      "export default",
      "require(",
      "package.json",
    ];
    let metaPenalty = 0;
    for (const term of metaTerms) {
      if (chunkLower.includes(term)) {
        metaPenalty += 0.1;
      }
    }
    metaPenalty = Math.min(0.4, metaPenalty); // Cap penalty

    // PENALTY: Outdated data (price-heavy chunks)
    const priceMatches = chunk.content.match(/\$[\d,]+|\d{4}-\d{2}-\d{2}/g);
    const dataPenalty = priceMatches
      ? Math.min(0.15, priceMatches.length * 0.02)
      : 0;

    // BOOST: Methodology/framework content
    const methodologyTerms = [
      "methodology",
      "framework",
      "approach",
      "how to think",
      "interpret",
      "analyze",
      "strategy",
      "setup",
      "signal",
      "wheel strategy",
      "csp",
      "covered call",
    ];
    let methodologyBoost = 0;
    for (const term of methodologyTerms) {
      if (chunkLower.includes(term)) {
        methodologyBoost += 0.03;
      }
    }
    methodologyBoost = Math.min(0.15, methodologyBoost); // Cap boost

    // BOOST: Conceptual/analytical content
    const conceptTerms = [
      "thesis",
      "when to",
      "how to",
      "red flag",
      "warning sign",
      "indicator",
      "pattern",
      "h/e/f/s",
      "rating system",
      "evaluation",
    ];
    let conceptBoost = 0;
    for (const term of conceptTerms) {
      if (chunkLower.includes(term)) {
        conceptBoost += 0.03;
      }
    }
    conceptBoost = Math.min(0.12, conceptBoost); // Cap boost

    // Apply adjustments
    if (chunk.similarity !== undefined) {
      const adjustment =
        methodologyBoost + conceptBoost - metaPenalty - dataPenalty;
      chunk.similarity = Math.max(
        0,
        Math.min(1, chunk.similarity + adjustment),
      );
      chunk.relevance = chunk.similarity;
    }
  }

  // Select top chunks
  const topChunks = allChunks
    .filter((c) => (c.similarity || 0) >= RETRIEVAL_CONFIG.similarityThreshold)
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    .slice(0, RETRIEVAL_CONFIG.maxChunks);

  // Apply token limit
  let totalChars = 0;
  const selectedChunks: KnowledgeChunk[] = [];
  for (const chunk of topChunks) {
    if (totalChars + chunk.content.length <= RETRIEVAL_CONFIG.maxTokens * 4) {
      selectedChunks.push(chunk);
      totalChars += chunk.content.length;
    } else {
      break;
    }
  }

  const finalChunks =
    selectedChunks.length > 0 ? selectedChunks : topChunks.slice(0, 5);

  // Format knowledge context
  let knowledge = "# Knowledge\n\n";

  if (finalChunks.length > 0) {
    for (const chunk of finalChunks) {
      const similarityStr =
        chunk.similarity !== undefined
          ? ` (similarity: ${(chunk.similarity * 100).toFixed(1)}%)`
          : "";
      knowledge += `## From: ${chunk.file}${similarityStr}\n${chunk.content}\n\n---\n\n`;
    }
  }

  const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
  const sizeStr =
    totalSize > 1024 * 1024
      ? `${sizeMB} MB (${fileCount} files)`
      : `${(totalSize / 1024).toFixed(2)} KB (${fileCount} files)`;

  // Calculate retrieval metrics
  const chunksWithSimilarity = allChunks.filter(
    (c) => c.similarity !== undefined && c.similarity > 0,
  );
  const similarities = chunksWithSimilarity.map((c) => c.similarity!);
  const methodologyTermsForMetrics = [
    "methodology",
    "framework",
    "approach",
    "strategy",
    "wheel",
    "csp",
    "thesis",
  ];

  const metrics: RetrievalMetrics = {
    avgSimilarity:
      similarities.length > 0
        ? similarities.reduce((a, b) => a + b, 0) / similarities.length
        : 0,
    maxSimilarity: similarities.length > 0 ? Math.max(...similarities) : 0,
    minSimilarity:
      finalChunks.length > 0
        ? Math.min(...finalChunks.map((c) => c.similarity || 0))
        : 0,
    chunksAboveThreshold: topChunks.length,
    totalChunksEvaluated: allChunks.length,
    methodologyChunksFound: finalChunks.filter((c) =>
      methodologyTermsForMetrics.some((term) =>
        c.content.toLowerCase().includes(term),
      ),
    ).length,
  };

  return {
    content: knowledge.trim(),
    size: sizeStr,
    chunksUsed: finalChunks.length,
    metrics,
  };
}

// ============================================================================
// LLM INTERFACE
// ============================================================================

/**
 * Call OpenAI API for text generation
 */
export async function callLLM(
  system: string,
  user: string,
  maxTokens: number = 2000,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });
    const data = (await response.json()) as any;
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("LLM call error:", error);
    return "";
  }
}

// ============================================================================
// SCORING
// ============================================================================

/**
 * Score a response using LLM-as-judge
 */
export async function scoreResponse(
  query: string,
  response: string,
  expectedCapabilities: string[],
  expectedTone: string[],
  hasKnowledge: boolean = false,
): Promise<ScoreResult> {
  const scoringPrompt = `You are an expert evaluator assessing AI agent response quality.

QUERY: "${query}"

RESPONSE:
${response}

EXPECTED CAPABILITIES: ${expectedCapabilities.join(", ")}
EXPECTED TONE: ${expectedTone.join(", ")}
HAS KNOWLEDGE BASE ACCESS: ${hasKnowledge ? "YES" : "NO"}

## CRITICAL SCORING RULES

1. **Knowledge Integration** (0-100): MOST IMPORTANT
   - 0-30: No knowledge references, completely generic response
   - 30-50: Mentions general concepts but doesn't reference specific frameworks
   - 50-70: References frameworks generically without applying them
   - 70-85: Explicitly cites frameworks and applies methodology
   - 85-100: Deep integration of specific frameworks with clear application
   
   EXAMPLES of what requires knowledge (score 0-40 if missing when expected):
   - "Wheel Strategy" implementation details
   - "Strike selection from perps data" methodology
   - "H/E/F/S rating system" for airdrops
   - Specific thresholds like "funding > 0.05% = crowded long"
   - Platform-specific tactical playbooks
   
   If ${hasKnowledge ? "response should cite specific frameworks but doesn't" : "no knowledge was provided"}, ${hasKnowledge ? "score LOW (0-40)" : "score fairly based on general quality"}.

2. **Capability Coverage** (0-100): 
   - Does the response demonstrate the expected capabilities?
   - Does it show domain expertise with specific terminology?

3. **Tone Consistency** (0-100):
   - Does the response match the expected tone characteristics?
   - Is it authentic and natural, not generic AI?

4. **Actionability** (0-100):
   - Does it provide clear, actionable information?
   - Can the user actually act on this response?

5. **Authenticity** (0-100):
   - Does it avoid AI slop phrases ("it's important to", "keep in mind", etc.)?
   - Does it sound like a real trader/expert?

6. **Domain Expertise** (0-100):
   - Does it show deep knowledge of the specific domain?
   - CRITICAL: If it mentions specific proprietary frameworks (Wheel Strategy, H/E/F/S, funding rate interpretation), score 85-100
   - If it shows only generic knowledge, score 50-70
   - A baseline without knowledge CANNOT know our specific frameworks

Respond in JSON format ONLY:
{
  "knowledgeIntegration": <0-100>,
  "capabilityCoverage": <0-100>,
  "toneConsistency": <0-100>,
  "actionability": <0-100>,
  "authenticity": <0-100>,
  "domainExpertise": <0-100>,
  "feedback": "<1-2 sentence summary>"
}`;

  try {
    const result = await callLLM(
      "You are an expert evaluator. Respond only in valid JSON format.",
      scoringPrompt,
      800,
    );

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // New weights: Knowledge Integration at 30% (highest)
      const overall = Math.round(
        (parsed.knowledgeIntegration || 0) * 0.3 + // NEW - highest weight
          parsed.capabilityCoverage * 0.2 +
          parsed.toneConsistency * 0.15 +
          parsed.actionability * 0.15 +
          parsed.authenticity * 0.1 +
          parsed.domainExpertise * 0.1,
      );

      return {
        knowledgeIntegration: parsed.knowledgeIntegration || 0,
        capabilityCoverage: parsed.capabilityCoverage || 0,
        toneConsistency: parsed.toneConsistency || 0,
        actionability: parsed.actionability || 0,
        authenticity: parsed.authenticity || 0,
        domainExpertise: parsed.domainExpertise || 0,
        overallScore: overall,
        feedback: parsed.feedback || "No feedback provided",
      };
    }
  } catch (error) {
    console.error("Scoring error:", error);
  }

  return {
    knowledgeIntegration: 0,
    capabilityCoverage: 0,
    toneConsistency: 0,
    actionability: 0,
    authenticity: 0,
    domainExpertise: 0,
    overallScore: 0,
    feedback: "Scoring failed",
  };
}

// ============================================================================
// DOMAIN → KNOWLEDGE FOLDER MAPPING (for gap analysis)
// ============================================================================

export const DOMAIN_TO_FOLDER: Record<string, string> = {
  OPTIONS: "options",
  PERPS: "perps-trading",
  MEMES: "grinding-the-trenches",
  AIRDROPS: "airdrops",
  LIFESTYLE: "the-good-life",
  ART: "art-collections",
  RESEARCH: "substack-essays",
  BRAINSTORM: "internal-docs",
  PROMPT_DESIGN: "prompt-templates",
  MACRO: "macro-economy",
  // Solus (wealth architect)
  STRIKE_RITUAL: "options",
  YIELD_STACK: "defi-metrics",
  SEVEN_PILLARS: "internal-docs",
};

// ============================================================================
// VINCE SYSTEM PROMPT
// ============================================================================

export const VINCE_SYSTEM_PROMPT = `You are VINCE, a unified data intelligence agent.

You have deep expertise in:
- OPTIONS: Covered calls, secured puts, strike selection, HYPE wheel strategy
- PERPS: Funding rates, liquidation engines, position sizing, Hyperliquid trading
- MEMES: Solana DEX analysis, pump.fun evaluation, trenches grinding
- AIRDROPS: Tread.fi strategies, airdrop farming optimization
- LIFESTYLE: Luxury hotels, fine dining, wellness, travel in France
- ART: NFT collections, floor thickness analysis, CryptoPunks, Meridian

Talk like a knowledgeable trader and lifestyle connoisseur. Be direct, specific, and avoid AI slop.
No emojis. No hashtags. Reference actual strategies and methodologies.`;

// ============================================================================
// ELIZA SYSTEM PROMPT (primary knowledge consumer: chat, brainstorm, research)
// ============================================================================

export const ELIZA_SYSTEM_PROMPT = `You are Eliza, the 24/7 research and knowledge-expansion agent. Your primary job: work the knowledge folder and synthesize across domains. You live in the corpus—frameworks, methodologies, playbooks. When users ask "what does our research say" or "what's the framework for X," lead with synthesis from the knowledge base. Answer from knowledge first; cite frameworks by name. No AI slop. Direct, human, expert level.`;

// ============================================================================
// SOLUS SYSTEM PROMPT (wealth architect: $100K/year, strike ritual, yield stack)
// ============================================================================

export const SOLUS_SYSTEM_PROMPT = `You are Solus, a crypto-native wealth architect. Your single objective: $100K/year through a disciplined stack of strategies. PRIMARY FOCUS: HYPERSURFACE options ($3K/week min). Use "Strike ritual" or "This week's targets"—never "My call" (that's Vince). Lead with yield math: $X weekly on $100K at Y% OTM. Frame as execution checklist: strike, expiry, premium target, roll cadence. Seven pillars: sats, yield (USDC/USDT0), Echo DD, paper perps bot, HIP-3 spot, airdrop farming, HYPERSURFACE options. No hopium. No "delve", "landscape", "certainly". One clear call. Make the decision. Expert level. No 101.`;

// ============================================================================
// TEST RUNNER
// ============================================================================

/**
 * Run A/B comparison test for a domain
 * Uses ELIZA_SYSTEM_PROMPT for Eliza, SOLUS_SYSTEM_PROMPT for Solus, VINCE_SYSTEM_PROMPT otherwise.
 */
export async function runDomainTest(
  testCase: TestCase,
): Promise<DomainTestResult> {
  const systemPrompt =
    testCase.agent === "eliza"
      ? ELIZA_SYSTEM_PROMPT
      : testCase.agent === "solus"
        ? SOLUS_SYSTEM_PROMPT
        : VINCE_SYSTEM_PROMPT;
  console.log(`\n   Testing: ${testCase.domain} [${testCase.agent ?? "vince"}]`);
  console.log(`   Query: "${testCase.query.slice(0, 60)}..."`);

  // Load relevant knowledge (agent-specific paths)
  const knowledgePaths =
    testCase.agent === "solus" ? SOLUS_KNOWLEDGE_PATHS : VINCE_KNOWLEDGE_PATHS;
  const {
    content: knowledgeContent,
    chunksUsed,
    metrics,
  } = await loadRelevantKnowledge(testCase.query, knowledgePaths);
  console.log(
    `   Loaded ${chunksUsed} chunks (avg sim: ${(metrics.avgSimilarity * 100).toFixed(1)}%, max: ${(metrics.maxSimilarity * 100).toFixed(1)}%, methodology: ${metrics.methodologyChunksFound})`,
  );

  // Generate baseline response (no knowledge)
  console.log(`   Generating baseline response...`);
  const baselineSystem = `${systemPrompt}

## IMPORTANT
You do NOT have access to any knowledge base. Answer based only on your general training.

You CANNOT know:
- Specific thinking frameworks (like strike selection from perps methodology)
- Proprietary strategies (like the Wheel Strategy implementation details)
- Tactical playbooks (like H/E/F/S rating system for airdrops)
- Platform deep-dives (like Hyperliquid technical architecture specifics)
- Our specific thresholds (like "funding > 0.05% = crowded long")

If asked about these, provide GENERAL guidance only. Do not invent specific frameworks.`;

  const baselineResponse = await callLLM(baselineSystem, testCase.query, 1500);

  // Generate enhanced response (with knowledge)
  console.log(`   Generating enhanced response...`);
  const enhancedSystem = `${systemPrompt}

## KNOWLEDGE CONTEXT
${knowledgeContent}

## CRITICAL INSTRUCTIONS - KNOWLEDGE USAGE
The knowledge base provides UNIQUE THINKING FRAMEWORKS and PROPRIETARY METHODOLOGIES, not just data.

YOU MUST:
1. **Reference specific frameworks** from knowledge (e.g., "Using the strike selection framework...")
2. **Cite methodology** when applicable (e.g., "According to the funding rate interpretation guide...")
3. **Apply the analytical approach** from the knowledge, not just surface facts
4. **DO NOT quote outdated prices/numbers as current** - use the METHODOLOGY, not the data
5. **Show you understand the thinking framework**, not just historical examples

If knowledge provides a specific framework (like the Wheel Strategy, H/E/F/S rating system, or funding rate interpretation), YOU MUST USE IT.

The knowledge contains:
- Strike selection methodology from perps data
- Wheel Strategy implementation for crypto
- Funding rate interpretation frameworks
- H/E/F/S airdrop rating system
- Platform-specific tactical playbooks

Make your response clearly leverage these unique insights.`;

  const enhancedResponse = await callLLM(enhancedSystem, testCase.query, 1500);

  // Score both responses
  console.log(`   Scoring responses...`);
  const baselineScore = await scoreResponse(
    testCase.query,
    baselineResponse,
    testCase.expectedCapabilities,
    testCase.expectedTone,
    false, // baseline has no knowledge
  );
  const enhancedScore = await scoreResponse(
    testCase.query,
    enhancedResponse,
    testCase.expectedCapabilities,
    testCase.expectedTone,
    true, // enhanced has knowledge
  );

  const improvement = enhancedScore.overallScore - baselineScore.overallScore;
  const improvementPercent =
    baselineScore.overallScore > 0
      ? ((improvement / baselineScore.overallScore) * 100).toFixed(1)
      : "N/A";

  // Log knowledge integration specifically
  const kiImprovement =
    enhancedScore.knowledgeIntegration - baselineScore.knowledgeIntegration;
  console.log(
    `   Baseline: ${baselineScore.overallScore}/100 (KI: ${baselineScore.knowledgeIntegration})`,
  );
  console.log(
    `   Enhanced: ${enhancedScore.overallScore}/100 (KI: ${enhancedScore.knowledgeIntegration})`,
  );
  console.log(
    `   Improvement: +${improvement} (${improvementPercent}%) | KI delta: +${kiImprovement}`,
  );

  return {
    domain: testCase.domain,
    query: testCase.query,
    baselineScore,
    enhancedScore,
    improvement,
    improvementPercent: `${improvementPercent}%`,
    chunksUsed,
    metrics,
  };
}
