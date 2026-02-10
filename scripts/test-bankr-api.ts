/**
 * Test Bankr Agent API (prompt + job status, and user info).
 * Run from repo root: bun run scripts/test-bankr-api.ts
 * Requires BANKR_API_KEY in .env (Bun loads it automatically from cwd).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dir, "..");
const ENV_PATH = resolve(PROJECT_ROOT, ".env");

function loadEnv(): void {
  if (process.env.BANKR_API_KEY) return;
  if (!existsSync(ENV_PATH)) {
    console.error("No .env found at", ENV_PATH);
    process.exit(1);
  }
  const content = readFileSync(ENV_PATH, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eq = trimmed.indexOf("=");
      if (eq > 0) {
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'")))
          val = val.slice(1, -1);
        if (!(key in process.env)) process.env[key] = val;
      }
    }
  }
}

loadEnv();

const API_KEY = process.env.BANKR_API_KEY?.trim();
const BASE_URL = (process.env.BANKR_AGENT_URL || "https://api.bankr.bot").replace(/\/$/, "");

if (!API_KEY) {
  console.error("BANKR_API_KEY is not set. Add it to .env and run again.");
  process.exit(1);
}

const headers = {
  "x-api-key": API_KEY,
  "Content-Type": "application/json",
};

type JobStatus = "pending" | "processing" | "completed" | "failed" | "cancelled";

interface JobStatusResponse {
  success: boolean;
  jobId: string;
  status: JobStatus;
  prompt?: string;
  response?: string;
  error?: string;
  transactions?: unknown[];
}

async function getUserInfo(): Promise<void> {
  console.log("\n--- GET /agent/me (user info) ---");
  const res = await fetch(`${BASE_URL}/agent/me`, {
    method: "GET",
    headers: { "X-API-Key": API_KEY },
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Error:", (data as { error?: string }).error ?? data);
    return;
  }
  console.log(JSON.stringify(data, null, 2));
}

async function submitPrompt(prompt: string): Promise<{ jobId: string }> {
  const res = await fetch(`${BASE_URL}/agent/prompt`, {
    method: "POST",
    headers,
    body: JSON.stringify({ prompt }),
  });
  const data = (await res.json()) as { jobId?: string; error?: string; message?: string };
  if (!res.ok) throw new Error(data.error || data.message || "Bankr Agent API error");
  if (!data.jobId) throw new Error("No jobId in response");
  return { jobId: data.jobId };
}

async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${BASE_URL}/agent/job/${jobId}`, {
    method: "GET",
    headers: { "x-api-key": API_KEY },
  });
  const data = (await res.json()) as JobStatusResponse & { error?: string };
  if (!res.ok) throw new Error(data.error || "Job status API error");
  return data;
}

async function pollUntilComplete(
  jobId: string,
  intervalMs = 2000,
  maxAttempts = 120
): Promise<JobStatusResponse> {
  let last: JobStatusResponse | null = null;
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getJobStatus(jobId);
    last = status;
    console.log(`  [${i + 1}] status: ${status.status}${status.statusUpdates?.length ? ` — ${status.statusUpdates.slice(-1)[0]?.message}` : ""}`);
    if (status.status === "completed" || status.status === "failed" || status.status === "cancelled") {
      return status;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  console.warn("\nPolling timed out; job may still complete on Bankr's side. Check dashboard or try again.");
  return last!;
}

async function main(): Promise<void> {
  console.log("Bankr API test");
  console.log("Base URL:", BASE_URL);
  console.log("API key:", API_KEY ? `${API_KEY.slice(0, 8)}...` : "(missing)");

  await getUserInfo();

  const prompt = "What is my ETH balance on Base?";
  console.log("\n--- POST /agent/prompt ---");
  console.log("Prompt:", prompt);
  const { jobId } = await submitPrompt(prompt);
  console.log("Job ID:", jobId);

  console.log("\n--- Poll GET /agent/job/:jobId until complete (up to ~4 min; Bankr jobs can be slow) ---");
  const result = await pollUntilComplete(jobId);
  console.log("\nFinal status:", result.status);
  if (result.response) console.log("Response:", result.response);
  if (result.error) console.log("Error:", result.error);
  if (result.transactions?.length) console.log("Transactions:", result.transactions.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
