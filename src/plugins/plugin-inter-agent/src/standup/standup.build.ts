/**
 * Standup build action items: delegate to Milaidy Gateway or fallback to in-VINCE code generation.
 * North-star deliverables (essay, tweets, x_article, trades, good_life) are generated in-VINCE and written to subdirs.
 * Deliverables are written to STANDUP_DELIVERABLES_DIR; no auto-execution.
 */

import { type IAgentRuntime, logger, ModelType } from "@elizaos/core";
import * as fs from "node:fs";
import * as path from "node:path";
import type { StandupActionItem, StandupActionItemType } from "./standup.parse";

const MILAIDY_STANDUP_ACTION_PATH = "/api/standup-action";
const DEFAULT_DELIVERABLES_DIR = "standup-deliverables";
const MANIFEST_FILENAME = "manifest.md";

const NORTH_STAR_TYPES: StandupActionItemType[] = [
  "essay",
  "tweets",
  "x_article",
  "trades",
  "good_life",
  "prd",
  "integration_instructions",
];

export interface BuildActionResult {
  path?: string;
  message?: string;
}

export function isNorthStarType(type: StandupActionItemType | undefined): boolean {
  return type !== undefined && NORTH_STAR_TYPES.includes(type);
}

function getDeliverablesDir(): string {
  const dir = process.env.STANDUP_DELIVERABLES_DIR?.trim();
  if (dir) return path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
  return path.join(process.cwd(), DEFAULT_DELIVERABLES_DIR);
}

function sanitizeFilename(description: string, assignee: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const safe = description
    .slice(0, 40)
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "deliverable";
  const assigneeSafe = (assignee || "agent").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  return `${date}-${assigneeSafe}-${safe}.ts`;
}

/**
 * POST action item to Milaidy Gateway. Returns result if endpoint exists and succeeds.
 */
async function tryMilaidyGateway(
  description: string,
  assigneeAgentName: string,
): Promise<BuildActionResult | null> {
  const baseUrl = process.env.MILAIDY_GATEWAY_URL?.trim();
  if (!baseUrl) return null;
  const url = `${baseUrl.replace(/\/$/, "")}${MILAIDY_STANDUP_ACTION_PATH}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description,
        assigneeAgentName: assigneeAgentName || undefined,
        source: "vince-standup",
      }),
    });
    if (!res.ok) {
      logger.debug({ status: res.status, url }, "[Standup] Milaidy Gateway returned non-OK");
      return null;
    }
    const data = (await res.json()) as { deliverablePath?: string; message?: string; accepted?: boolean };
    if (data.deliverablePath || data.message) {
      return { path: data.deliverablePath, message: data.message };
    }
    if (data.accepted) return { message: "Accepted by Milaidy (deliverable path not returned)." };
    return null;
  } catch (err) {
    logger.debug({ err, url }, "[Standup] Milaidy Gateway request failed");
    return null;
  }
}

/**
 * Fallback: generate a single file via LLM and write to deliverables dir. No execution.
 */
async function fallbackCodeGen(
  runtime: IAgentRuntime,
  description: string,
  assigneeAgentName: string,
): Promise<BuildActionResult | null> {
  const fallbackEnabled = process.env.STANDUP_BUILD_FALLBACK_TO_VINCE !== "false";
  if (!fallbackEnabled) return null;

  const dir = getDeliverablesDir();
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    logger.warn({ err: e, dir }, "[Standup] Could not create deliverables dir");
    return null;
  }

  const prompt = `You are implementing a standup action item. Output a single TypeScript or JavaScript file only: no explanation, no markdown fences, no "here is the code" text. Just the code.

Action (from standup): ${description}
Assignee: ${assigneeAgentName}

Requirements: one file, runnable or composable (function or small module). Keep it under 150 lines. Output only the code.`;

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    const raw = typeof response === "string" ? response : (response as { text?: string })?.text ?? "";
    const code = raw
      .replace(/^```(?:ts|typescript|js|javascript)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();
    if (!code || code.length < 10) {
      logger.debug("[Standup] Fallback code gen produced empty or too short output");
      return null;
    }

    const filename = sanitizeFilename(description, assigneeAgentName);
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, code, "utf-8");

    const manifestPath = path.join(dir, MANIFEST_FILENAME);
    const manifestLine = `| ${new Date().toISOString().slice(0, 10)} | ${assigneeAgentName} | ${description.slice(0, 60)}... | \`${filename}\` |\n`;
    if (!fs.existsSync(manifestPath)) {
      fs.writeFileSync(
        manifestPath,
        "| Date | Assignee | Description | File |\n|------|----------|-------------|------|\n",
        "utf-8",
      );
    }
    fs.appendFileSync(manifestPath, manifestLine, "utf-8");

    logger.info(`[Standup] Wrote deliverable ${filepath}`);
    return { path: filepath, message: `Deliverable: ${filename}` };
  } catch (err) {
    logger.warn({ err }, "[Standup] Fallback code gen failed");
    return null;
  }
}

function northStarSubdir(type: StandupActionItemType): string {
  switch (type) {
    case "essay":
      return "essays";
    case "tweets":
      return "tweets";
    case "x_article":
      return "x-articles";
    case "trades":
      return "trades";
    case "good_life":
      return "good-life";
    case "prd":
      return "prds";
    case "integration_instructions":
      return "integration-instructions";
    default:
      return "north-star";
  }
}

function slugFromDescription(description: string): string {
  return description
    .slice(0, 30)
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "deliverable";
}

function northStarFilename(type: StandupActionItemType, description: string, assignee: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const slug = slugFromDescription(description);
  const assigneeSafe = (assignee || "agent").replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
  const ext = type === "tweets" ? "md" : "md";
  return `${date}-${assigneeSafe}-${slug}.${ext}`;
}

const NORTH_STAR_PROMPTS: Record<
  Exclude<StandupActionItemType, "build" | "remind">,
  (description: string, assignee: string) => string
> = {
  essay: (description, assignee) =>
    `You are writing a long-form essay for the Ikigai Studio Substack. Output only the essay body in markdown: no title block, no "here is the essay" — just the content ready to paste into Substack. Voice: benefit-led (Apple-style), confident and craft-focused (Porsche OG). No AI-slop jargon (no leverage, utilize, streamline, robust, cutting-edge, game-changer, synergy, paradigm, holistic, seamless). One clear idea per piece. Request from standup: ${description}. Assignee: ${assignee}. Output only valid markdown.`,
  tweets: (description, assignee) =>
    `You are suggesting banger tweets with viral potential for the Ikigai / crypto / good-life brand. Output a markdown file: a short intro line, then each tweet as a numbered item (one per line or block). Optionally one sentence per tweet on why it could go viral. Request from standup: ${description}. Assignee: ${assignee}. Output only the markdown.`,
  x_article: (description, assignee) =>
    `You are writing a long-form story to publish on X as an article. Output only the article body in markdown or plain text suitable for X's long-form feature: no meta-commentary. Narrative, one clear thread, shareable. Voice: benefit-led, confident, no AI slop. Request from standup: ${description}. Assignee: ${assignee}. Output only the content.`,
  trades: (description, assignee) =>
    `You are suggesting trades (suggestions only; not financial advice). Produce a markdown document with two sections: (1) Perps on Hyperliquid: suggested direction/size/rationale for BTC, SOL, ETH, HYPE. (2) Onchain options on HypeSurface: suggested underlyings (BTC, SOL, ETH, HYPE), strikes/expiry and brief rationale. Add a clear disclaimer: not financial advice; user must do own research. Request from standup: ${description}. Assignee: ${assignee}. Output only the markdown.`,
  good_life: (description, assignee) =>
    `You are Kelly, the lifestyle concierge. Suggest things for founders to do to live the good life: travel, dining (Michelin, sommelier-level wine), health, fitness, touch grass, relocation/UHNW bases. Concrete and actionable. Benefit-led, luxury without fluff. No trading or financial advice. Request from standup: ${description}. Assignee: ${assignee}. Output only the markdown.`,
  prd: (description, assignee) =>
    `You are Sentinel. Produce a Product Requirements Document (PRD) for Cursor: a markdown doc the team can paste or save and use in Cursor when implementing. Include: (1) goal and scope, (2) user/caller story, (3) acceptance criteria (bullets), (4) technical constraints (plugin boundaries, agents thin, no duplicate lanes), (5) architecture rules and "keep the architecture as good as it gets", (6) optional out-of-scope. No preamble—just the PRD markdown. Request from standup: ${description}. Assignee: ${assignee}. Output only the markdown.`,
  integration_instructions: (description, assignee) =>
    `You are Sentinel. Produce integration/setup instructions for Milaidy (https://github.com/milady-ai/milaidy) and/or OpenClaw (https://github.com/openclaw/openclaw). Include: (1) what each project is (Milaidy: personal AI on ElizaOS, Gateway at localhost:18789; OpenClaw: personal AI assistant, multi-channel). (2) How to run or install (npx milaidy, npm install -g openclaw, links to their README). (3) How VINCE integrates: standup build items POST to MILAIDY_GATEWAY_URL/api/standup-action when set; openclaw-adapter for Eliza↔OpenClaw. (4) Links: Milaidy https://github.com/milady-ai/milaidy, OpenClaw https://github.com/openclaw/openclaw. Output only the markdown. Request from standup: ${description}. Assignee: ${assignee}.`,
};

/**
 * Generate and write a north-star deliverable (essay, tweets, x_article, trades, good_life).
 * Returns path and message for notification.
 */
export async function executeNorthStarDeliverable(
  runtime: IAgentRuntime,
  item: StandupActionItem,
): Promise<BuildActionResult | null> {
  const type = item.type;
  if (!type || !NORTH_STAR_TYPES.includes(type)) return null;

  const description = (item.description ?? "").trim();
  const assignee = (item.assigneeAgentName ?? "").trim();
  if (!description) return null;

  const baseDir = getDeliverablesDir();
  const subdir = northStarSubdir(type);
  const dir = path.join(baseDir, subdir);

  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    logger.warn({ err: e, dir }, "[Standup] Could not create north-star subdir");
    return null;
  }

  const promptFn = NORTH_STAR_PROMPTS[type as keyof typeof NORTH_STAR_PROMPTS];
  if (!promptFn) return null;

  const prompt = promptFn(description, assignee);

  try {
    const response = await runtime.useModel(ModelType.TEXT_LARGE, { prompt });
    const raw = typeof response === "string" ? response : (response as { text?: string })?.text ?? "";
    const content = raw
      .replace(/^```(?:markdown|md)?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();
    if (!content || content.length < 20) {
      logger.debug("[Standup] North-star gen produced empty or too short output");
      return null;
    }

    const filename = northStarFilename(type, description, assignee);
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, content, "utf-8");

    const manifestPath = path.join(baseDir, MANIFEST_FILENAME);
    const manifestLine = `| ${new Date().toISOString().slice(0, 10)} | ${assignee} | [${type}] ${description.slice(0, 50)}... | \`${subdir}/${filename}\` |\n`;
    if (!fs.existsSync(manifestPath)) {
      fs.writeFileSync(
        manifestPath,
        "| Date | Assignee | Description | File |\n|------|----------|-------------|------|\n",
        "utf-8",
      );
    }
    fs.appendFileSync(manifestPath, manifestLine, "utf-8");

    logger.info(`[Standup] Wrote north-star deliverable ${filepath}`);
    return { path: filepath, message: `North-star (${type}): ${filename}` };
  } catch (err) {
    logger.warn({ err, type }, "[Standup] North-star deliverable gen failed");
    return null;
  }
}

/**
 * Execute a build-type standup action item: try Milaidy Gateway first, then in-VINCE code gen.
 * Returns path and/or message for notification; no automatic execution of generated code.
 */
export async function executeBuildActionItem(
  runtime: IAgentRuntime,
  item: StandupActionItem,
): Promise<BuildActionResult | null> {
  const description = (item.description ?? "").trim();
  const assignee = (item.assigneeAgentName ?? "").trim();
  if (!description) return null;

  if (isNorthStarType(item.type)) {
    return executeNorthStarDeliverable(runtime, item);
  }

  const milaidyResult = await tryMilaidyGateway(description, assignee);
  if (milaidyResult) return milaidyResult;

  return fallbackCodeGen(runtime, description, assignee);
}
