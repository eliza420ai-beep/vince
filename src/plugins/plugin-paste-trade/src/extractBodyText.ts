import { readFileSync } from "node:fs";

/**
 * Pull prose from extract.ts JSON. Never use `source` — it is a platform label
 * (x_api, fxtwitter, youtube, …), not article/tweet body.
 */
export function bodyTextFromExtracted(
  extracted: Record<string, unknown>,
): string {
  const pick = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
  const text = pick(extracted.text);
  if (text) return text;
  const body = pick(extracted.body_text);
  if (body) return body;
  const transcript = pick(extracted.transcript);
  if (transcript) return transcript;
  return "";
}

/**
 * Same as bodyTextFromExtracted, then read `saved_to` if needed (YouTube omits
 * transcript from stdout; file holds full JSON with transcript).
 */
export function resolveBodyTextFromExtractOutput(
  extracted: Record<string, unknown>,
  readSavedFile: (path: string) => string = (p) => readFileSync(p, "utf8"),
): string {
  let body = bodyTextFromExtracted(extracted);
  if (body) return body;

  const savedTo = extracted.saved_to;
  if (typeof savedTo !== "string" || !savedTo.trim()) return "";

  try {
    const raw = readSavedFile(savedTo).trim();
    if (!raw) return "";
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      body = bodyTextFromExtracted(parsed);
      if (body) return body;
    } catch {
      /* not JSON — treat as plain text if substantial */
    }
    return raw.length >= 20 ? raw : "";
  } catch {
    return "";
  }
}
