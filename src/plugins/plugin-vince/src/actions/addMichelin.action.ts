/**
 * ADD_MICHELIN_RESTAURANT Action
 *
 * When Eliza receives a message in a Discord channel whose name contains "knowledge"
 * and the message contains a guide.michelin.com URL, this action fetches the page,
 * extracts restaurant fields (name, address, phone, website, price, style, chef,
 * description, notes), and appends a formatted entry to the appropriate file under
 * knowledge/the-good-life/michelin-restaurants/.
 *
 * See: knowledge/the-good-life/michelin-restaurants/README.md "How to add new lunch spots"
 * Fallback: docs/todo-michelin-crawlee.md if phone/website are often missing.
 */

import type {
  Action,
  IAgentRuntime,
  Memory,
  State,
  HandlerCallback,
} from "@elizaos/core";
import { logger, ModelType } from "@elizaos/core";
import * as fs from "fs";
import * as path from "path";
import { runSummarizeCli } from "./upload.action";

const MICHELIN_URL_REGEX =
  /https?:\/\/guide\.michelin\.com\/[^\s<>"{}|\\^`[\]]+/i;

/** Path segment before /restaurant/ in guide.michelin.com URLs (e.g. biarritz, bayonne) */
const MICHELIN_PATH_CITY_REGEX =
  /guide\.michelin\.com\/[^/]+\/[^/]+\/nouvelle-aquitaine\/([^/]+)\/restaurant\//i;

const KNOWLEDGE_BASE = "knowledge/the-good-life/michelin-restaurants";

/** City slug from URL path → { file, section } for insertion */
const CITY_TO_FILE_AND_SECTION: Record<
  string,
  { file: string; section: string }
> = {
  biarritz: { file: "biarritz-region.md", section: "### Biarritz Area" },
  bayonne: { file: "biarritz-region.md", section: "### Bayonne" },
  bordeaux: { file: "bordeaux-region.md", section: "### Bordeaux" },
  "la-rochelle": { file: "la-rochelle-region.md", section: "### La Rochelle" },
  anglet: { file: "biarritz-region.md", section: "### Biarritz Area" },
  "saint-jean-de-luz": {
    file: "biarritz-region.md",
    section: "### Biarritz Area",
  },
  guethary: { file: "biarritz-region.md", section: "### Biarritz Area" },
  guéthary: { file: "biarritz-region.md", section: "### Biarritz Area" },
};

function extractMichelinUrl(text: string): string | null {
  const match = text.match(MICHELIN_URL_REGEX);
  if (!match) return null;
  return match[0].replace(/[.,;:!?)]+$/, "").trim();
}

function extractCitySlugFromUrl(url: string): string {
  const match = url.match(MICHELIN_PATH_CITY_REGEX);
  if (match) return match[1].toLowerCase().trim();
  return "biarritz"; // default to Biarritz region
}

function getDisplayCity(citySlug: string, address: string): string {
  const slugToCity: Record<string, string> = {
    biarritz: "Biarritz",
    bayonne: "Bayonne",
    bordeaux: "Bordeaux",
    "la-rochelle": "La Rochelle",
    anglet: "Anglet",
    "saint-jean-de-luz": "Saint-Jean-de-Luz",
    guethary: "Guéthary",
    guéthary: "Guéthary",
  };
  if (slugToCity[citySlug]) return slugToCity[citySlug];
  if (address) {
    const postcodeMatch = address.match(/\d{5}\s+(\w[\w\s-]+?)(?:\s*$|,|\.)/);
    if (postcodeMatch) return postcodeMatch[1].trim();
  }
  return citySlug.charAt(0).toUpperCase() + citySlug.slice(1);
}

interface MichelinExtract {
  name: string;
  address: string;
  phone: string;
  website: string;
  price: string;
  style: string;
  chef: string;
  description: string;
  notes: string;
}

function formatEntry(
  extract: MichelinExtract,
  url: string,
  cityDisplay: string,
): string {
  const lines: string[] = [
    `#### ${extract.name} (${cityDisplay})`,
    `- **Address**: ${extract.address || "—"}`,
    `- **MICHELIN**: ${url}`,
    `- **Phone**: ${extract.phone || "—"}`,
    `- **Price**: ${extract.price || "—"}`,
    `- **Style**: ${extract.style || "—"}`,
  ];
  if (extract.website?.trim()) lines.push(`- **Website**: ${extract.website.trim()}`);
  if (extract.chef?.trim()) lines.push(`- **Chef**: ${extract.chef.trim()}`);
  lines.push(`- **Notes**: ${extract.notes || "From the Guide"}`);
  if (extract.description?.trim()) {
    lines.push("");
    lines.push("> " + extract.description.trim().replace(/\n/g, "\n> "));
  }
  return lines.join("\n");
}

function parseJsonFromModelResponse(raw: string): MichelinExtract | null {
  const trimmed = String(raw).trim();
  let jsonStr = trimmed;
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) jsonStr = codeBlock[1].trim();
  try {
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    return {
      name: String(parsed.name ?? "").trim() || "Restaurant",
      address: String(parsed.address ?? "").trim(),
      phone: String(parsed.phone ?? "").trim(),
      website: String(parsed.website ?? "").trim(),
      price: String(parsed.price ?? "").trim(),
      style: String(parsed.style ?? "").trim(),
      chef: String(parsed.chef ?? "").trim(),
      description: String(parsed.description ?? "").trim(),
      notes: String(parsed.notes ?? "").trim(),
    };
  } catch {
    return null;
  }
}

/** Simple HTML strip so visible text can be passed to the LLM (e.g. for phone/website in sidebar). */
function htmlToVisibleText(html: string): string {
  return (
    html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** True if content likely already has contact info (phone or website cues). */
function contentHasContactCues(content: string): boolean {
  const lower = content.toLowerCase();
  const hasPhone = /\+\d{2}\s*\d[\d\s.]{8,}/.test(content) || /tel:/i.test(content);
  const hasWebsite =
    /\bvisit\s+website\b/i.test(lower) ||
    /\bwebsite\b/i.test(lower) ||
    /\bsite\s+web\b/i.test(lower) ||
    /https?:\/\/[^\s"]+/.test(content);
  return hasPhone || hasWebsite;
}

const MICHELIN_CONTENT_MAX_CHARS = 12_000;

async function fetchPageContent(url: string): Promise<string | null> {
  let content: string | null = null;
  try {
    const summarized = await runSummarizeCli(url, {
      isYouTube: false,
      extractOnly: true,
    });
    if (summarized && "content" in summarized && summarized.content?.length) {
      content = summarized.content;
    }
  } catch (e) {
    logger.debug(
      { url, err: String(e) },
      "[ADD_MICHELIN] runSummarizeCli failed, trying fetch",
    );
  }
  if (!content) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; ElizaOS/1.0; +https://github.com/elizaos/eliza)",
        },
      });
      if (!res.ok) return null;
      const html = await res.text();
      content = htmlToVisibleText(html);
    } catch (e) {
      logger.warn({ url, err: String(e) }, "[ADD_MICHELIN] fetch failed");
      return null;
    }
  }
  if (!content || content.length < 100) return content;
  if (contentHasContactCues(content)) return content.slice(0, MICHELIN_CONTENT_MAX_CHARS);
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; ElizaOS/1.0; +https://github.com/elizaos/eliza)",
      },
    });
    if (!res.ok) return content.slice(0, MICHELIN_CONTENT_MAX_CHARS);
    const html = await res.text();
    const fetchText = htmlToVisibleText(html);
    if (fetchText.length < 50) return content.slice(0, MICHELIN_CONTENT_MAX_CHARS);
    const combined = (content + "\n\n" + fetchText).slice(0, MICHELIN_CONTENT_MAX_CHARS);
    logger.debug("[ADD_MICHELIN] Augmented content with raw fetch for contact info");
    return combined;
  } catch {
    return content.slice(0, MICHELIN_CONTENT_MAX_CHARS);
  }
}

function insertBlockIntoSection(
  fileContent: string,
  sectionHeading: string,
  newBlock: string,
): string {
  const sectionIndex = fileContent.indexOf(sectionHeading);
  if (sectionIndex === -1) {
    return fileContent.trimEnd() + "\n\n" + newBlock + "\n";
  }
  const afterSection = fileContent.slice(sectionIndex + sectionHeading.length);
  const nextHeading = afterSection.match(/\n(#{1,3})\s+/);
  const insertEnd = nextHeading
    ? sectionIndex +
      sectionHeading.length +
      nextHeading.index!
    : fileContent.length;
  const before = fileContent.slice(0, insertEnd).trimEnd();
  const after = fileContent.slice(insertEnd);
  const blockWithNewlines =
    (before.endsWith("\n\n") ? "" : "\n\n") + newBlock + "\n";
  return before + blockWithNewlines + after;
}

export const addMichelinRestaurantAction: Action = {
  name: "ADD_MICHELIN_RESTAURANT",
  similes: ["MICHELIN_TO_KNOWLEDGE", "ADD_MICHELIN"],
  description: `Use when the message is in the **knowledge** channel and contains a **guide.michelin.com** link. Adds that restaurant to the Michelin knowledge base (knowledge/the-good-life/michelin-restaurants/).`,

  validate: async (
    runtime: IAgentRuntime,
    message: Memory,
  ): Promise<boolean> => {
    if (runtime.character?.name !== "Eliza") return false;
    const room = await runtime.getRoom(message.roomId);
    const roomName = (room?.name ?? "").toLowerCase();
    if (!roomName.includes("knowledge")) return false;
    const text = message.content?.text ?? "";
    if (!text.includes("guide.michelin.com")) return false;
    if (!extractMichelinUrl(text)) return false;
    return true;
  },

  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    _state?: State,
    _options?: Record<string, unknown>,
    callback?: HandlerCallback,
  ): Promise<void> => {
    const text = message.content?.text ?? "";
    const url = extractMichelinUrl(text);
    if (!url) {
      if (callback) {
        await callback({
          text: "No Michelin Guide link found in that message.",
          actions: ["ADD_MICHELIN_RESTAURANT"],
        });
      }
      return;
    }

    const urls = text.match(new RegExp(MICHELIN_URL_REGEX.source, "gi"));
    if (urls && urls.length > 1 && callback) {
      await callback({
        text: "Only one Michelin link per message, please. I’ll use the first one.",
        actions: ["ADD_MICHELIN_RESTAURANT"],
      });
    }

    if (callback) {
      await callback({
        text: `🔗 **Fetching Michelin page**\n\n${url}\n\nExtracting details and adding to knowledge…`,
        actions: ["ADD_MICHELIN_RESTAURANT"],
      });
    }

    const content = await fetchPageContent(url);
    if (!content || content.length < 100) {
      if (callback) {
        await callback({
          text: `Couldn’t fetch that Michelin page (or the content was too short). Add it manually using the steps in \`knowledge/the-good-life/michelin-restaurants/README.md\` (section "How to add new lunch spots").`,
          actions: ["ADD_MICHELIN_RESTAURANT"],
        });
      }
      return;
    }

    const extractPrompt = `From this Michelin Guide page content, extract the following as JSON only (no markdown, no explanation). Use empty string "" for missing fields.

Extract phone if present (e.g. +33 6 87 62 06 07). Extract website URL if present (e.g. from "Visit Website" link or similar in the content).

{"name":"restaurant name","address":"full address","phone":"+33 ... or phone if present","website":"restaurant website URL if present (e.g. from Visit Website link); empty if not found","price":"e.g. €€ or €€€","style":"e.g. Cuisine créative","chef":"chef name if shown","description":"the main paragraph about the restaurant from the Guide (the long descriptive text); empty if not found","notes":"short tagline e.g. Nouveau, Bib, Chef's Table, or one line why worth a visit"}

Content (excerpt):
${content.slice(0, 12000)}
`;

    let extract: MichelinExtract | null = null;
    try {
      const response = await runtime.useModel(ModelType.TEXT_SMALL, {
        prompt: extractPrompt,
      });
      extract = parseJsonFromModelResponse(String(response ?? ""));
    } catch (e) {
      logger.warn({ err: String(e) }, "[ADD_MICHELIN] useModel failed");
    }

    if (!extract?.name) {
      if (callback) {
        await callback({
          text: "I couldn’t parse the restaurant details from that page. Add it manually using `knowledge/the-good-life/michelin-restaurants/README.md`.",
          actions: ["ADD_MICHELIN_RESTAURANT"],
        });
      }
      return;
    }

    const citySlug = extractCitySlugFromUrl(url);
    const { file: fileName, section: sectionHeading } =
      CITY_TO_FILE_AND_SECTION[citySlug] ??
      CITY_TO_FILE_AND_SECTION["biarritz"];
    const cityDisplay = getDisplayCity(citySlug, extract.address);
    const newBlock = formatEntry(extract, url, cityDisplay);

    const baseDir = process.cwd();
    const filePath = path.join(baseDir, KNOWLEDGE_BASE, fileName);

    if (!fs.existsSync(filePath)) {
      if (callback) {
        await callback({
          text: `Regional file \`${KNOWLEDGE_BASE}/${fileName}\` not found. Add the entry manually.`,
          actions: ["ADD_MICHELIN_RESTAURANT"],
        });
      }
      return;
    }

    let fileContent = fs.readFileSync(filePath, "utf-8");
    if (fileContent.includes(url)) {
      if (callback) {
        await callback({
          text: `**Already in knowledge.** That Michelin link is already in \`${KNOWLEDGE_BASE}/${fileName}\`.`,
          actions: ["ADD_MICHELIN_RESTAURANT"],
        });
      }
      return;
    }

    fileContent = insertBlockIntoSection(
      fileContent,
      sectionHeading,
      newBlock,
    );
    fs.writeFileSync(filePath, fileContent, "utf-8");

    if (callback) {
      await callback({
        text: `Added **${extract.name}** (${cityDisplay}) to \`${KNOWLEDGE_BASE}/${fileName}\`.`,
        actions: ["ADD_MICHELIN_RESTAURANT"],
      });
    }
  },
};
