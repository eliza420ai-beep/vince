/**
 * VinceBench improvement loop: use LLM to suggest parameter changes from benchmark report.
 */
import type { VinceBenchReport } from "./types";

export interface CurrentParams {
  signalWeights?: Record<string, number>;
  minStrength?: number;
  minConfidence?: number;
  minConfirmingSignals?: number;
  sessionFilters?: Record<string, { confidence: number; size: number }>;
}

export interface ImprovementSuggestion {
  reasoning: string;
  parameterChanges: {
    minStrength?: number;
    minConfidence?: number;
    minConfirmingSignals?: number;
    signalWeights?: Record<string, number>;
    sessionFilters?: Record<string, { confidence: number; size: number }>;
  };
  missingSignaturesToTarget?: string[];
}

const SYSTEM_PROMPT = `You are VinceBench Improver. Analyze the benchmark report and suggest concrete parameter changes to improve FINAL_SCORE. Output valid JSON only, no code fences. Use this shape:
{
  "reasoning": "1-2 sentences on the main gap",
  "parameterChanges": {
    "minStrength": number or omit,
    "minConfidence": number or omit,
    "minConfirmingSignals": number or omit,
    "signalWeights": { "sourceName": number } or omit,
    "sessionFilters": { "sessionName": { "confidence": number, "size": number } } or omit
  },
  "missingSignaturesToTarget": ["signature.quality.xyz"] or omit
}`;

function buildUserPrompt(report: VinceBenchReport, currentParams: CurrentParams): string {
  const lines: string[] = [
    `Current FINAL_SCORE: ${report.scoring.finalScore.toFixed(2)} (Base: ${report.scoring.base}, Bonus: ${report.scoring.bonus}, Penalty: ${report.scoring.penalty})`,
    "",
    "Domain breakdown:",
    ...Object.entries(report.domainBreakdown).map(
      ([name, d]) => `- ${name}: weight=${d.weight}, uniqueSignatures=${d.uniqueSignatures}, contribution=${d.contribution.toFixed(2)}`,
    ),
    "",
    "Unmapped signatures (never matched a domain): " + (report.unmappedSignatures.length ? report.unmappedSignatures.join(", ") : "none"),
    "",
    "Current parameters:",
    `- minStrength: ${currentParams.minStrength ?? "unknown"}`,
    `- minConfidence: ${currentParams.minConfidence ?? "unknown"}`,
    `- minConfirmingSignals: ${currentParams.minConfirmingSignals ?? "unknown"}`,
  ];
  if (currentParams.signalWeights && Object.keys(currentParams.signalWeights).length > 0) {
    lines.push("- signalWeights: " + JSON.stringify(currentParams.signalWeights));
  }
  const worst = report.perDecision
    .filter((d) => (d.decisionScore ?? 0) < (report.scoring.finalScore / Math.max(1, report.perDecision.length)))
    .slice(0, 3);
  if (worst.length > 0) {
    lines.push("", "Sample low-scoring decisions:");
    worst.forEach((d) => {
      lines.push(`  recordId=${d.recordId}, score=${(d.decisionScore ?? 0).toFixed(2)}, signatures=[${d.signatures.slice(0, 5).join(", ")}...]`);
    });
  }
  return lines.join("\n");
}

/**
 * Call OpenAI API for improvement suggestion. Requires OPENAI_API_KEY.
 */
async function callOpenAI(userPrompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not set");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from OpenAI");
  return content;
}

/**
 * Parse LLM JSON response into ImprovementSuggestion.
 */
function parseSuggestion(raw: string): ImprovementSuggestion {
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  return {
    reasoning: String(parsed.reasoning ?? ""),
    parameterChanges: (parsed.parameterChanges as ImprovementSuggestion["parameterChanges"]) ?? {},
    missingSignaturesToTarget: Array.isArray(parsed.missingSignaturesToTarget)
      ? (parsed.missingSignaturesToTarget as string[])
      : undefined,
  };
}

/**
 * Run one improvement iteration: report + current params -> LLM -> suggestion.
 */
export async function generateImprovementSuggestions(
  report: VinceBenchReport,
  currentParams: CurrentParams = {},
): Promise<ImprovementSuggestion | null> {
  const userPrompt = buildUserPrompt(report, currentParams);
  try {
    const raw = await callOpenAI(userPrompt);
    return parseSuggestion(raw);
  } catch (e) {
    console.error("[VinceBench improvementLoop] LLM call failed:", e);
    return null;
  }
}
