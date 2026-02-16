#!/usr/bin/env node
/**
 * Reorder .env into clear sections matching .env.example structure.
 * Reads .env, groups vars by section, writes back. Preserves all key=value pairs.
 * Usage: node scripts/reorder-env.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const envPath = path.join(__dirname, "..", ".env");
const content = fs.readFileSync(envPath, "utf8");
const lines = content.split(/\n/);

const vars = [];
const comments = [];

for (const line of lines) {
  const trimmed = line.trimEnd();
  if (trimmed === "") {
    comments.push({ type: "blank" });
    continue;
  }
  const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if (match) {
    vars.push({ key: match[1], value: match[2], raw: trimmed });
  } else if (trimmed.startsWith("#")) {
    comments.push({ type: "comment", raw: trimmed });
  } else {
    comments.push({ type: "other", raw: trimmed });
  }
}

function sectionForKey(key) {
  if (key.startsWith("ELIZA_") && key !== "ELIZAOS_") return "ELIZA";
  if (key.startsWith("VINCE_")) return "VINCE";
  if (key.startsWith("ECHO_")) return "ECHO";
  if (key.startsWith("ORACLE_")) return "ORACLE";
  if (key.startsWith("SOLUS_")) return "SOLUS";
  if (
    key.startsWith("OTAKU_") ||
    key.startsWith("CDP_") ||
    key.startsWith("BANKR_") ||
    key.startsWith("VITE_CDP") ||
    key === "BASE_RPC_URL" ||
    key === "ETHEREUM_RPC_URL" ||
    key === "ARBITRUM_RPC_URL" ||
    key === "POLYGON_RPC_URL" ||
    key === "OPTIMISM_RPC_URL" ||
    key === "ALCHEMY_API_KEY" ||
    key === "BICONOMY_API_KEY" ||
    key === "RELAY_API_KEY" ||
    key.startsWith("X402_") ||
    key.startsWith("ERC8004_")
  )
    return "OTAKU";
  if (
    key.startsWith("KELLY_") ||
    key === "ENABLE_AUTO_EVOLUTION" ||
    key === "EVOLUTION_COOLDOWN_MS" ||
    key === "REQUIRE_ADMIN_APPROVAL"
  )
    return "KELLY";
  if (key.startsWith("SENTINEL_")) return "SENTINEL";
  if (key.startsWith("CLAWTERM_")) return "CLAWTERM";
  if (key === "DISCORD_APPLICATION_ID" || key === "DISCORD_API_TOKEN")
    return "FALLBACK";
  if (key.startsWith("STANDUP_") || key.startsWith("ESSENTIAL_STANDUP_"))
    return "STANDUP";
  if (
    key.startsWith("A2A_") ||
    key.startsWith("REFLECTION_")
  )
    return "A2A";
  if (
    key === "ELIZAOS_USE_LOCAL_MESSAGING" ||
    key === "ELIZAOS_API_KEY" ||
    key === "OPENAI_API_KEY" ||
    key === "ANTHROPIC_API_KEY" ||
    key.startsWith("ANTHROPIC_") ||
    key === "LOG_LEVEL" ||
    key.startsWith("SENTRY_")
  )
    return "CORE";
  if (
    key === "PGLITE_DATA_DIR" ||
    key.startsWith("POSTGRES_") ||
    key.startsWith("SUPABASE_")
  )
    return "DATABASE";
  if (
    key === "TAVILY_API_KEY" ||
    key === "COINGECKO_API_KEY" ||
    key.startsWith("COINMARKETCAP_") ||
    key === "COINDESK_API_KEY" ||
    key === "COINCAP_API_KEY" ||
    key.startsWith("DEXSCREENER_") ||
    key === "NANSEN_API_KEY" ||
    key === "DUNE_API_KEY" ||
    key === "SANTIMENT_API_KEY" ||
    key === "COINGLASS_API_KEY" ||
    key === "ALLIUM_API_KEY" ||
    key === "OPENSEA_API_KEY" ||
    key === "NFT_" ||
    key === "BIRDEYE_API_KEY" ||
    key === "JUPITER_API_KEY" ||
    key === "HELIUS_API_KEY" ||
    key === "ZEROEX_API_KEY" ||
    key === "ETHERSCAN_API_KEY" ||
    key === "FIRECRAWL_API_KEY" ||
    key === "OX_API_KEY" ||
    key.startsWith("OPENROUTER_") ||
    key === "LOAD_DOCS_ON_STARTUP" ||
    key === "KNOWLEDGE_PATH" ||
    key === "CTX_KNOWLEDGE_ENABLED" ||
    key.startsWith("TEXT_") ||
    key === "MESSARI_API_KEY" ||
    key === "DISABLE_COINGECKO_MCP" ||
    key === "DISABLE_DEFILLAMA_MCP"
  )
    return "SHARED";
  if (
    key === "X_BEARER_TOKEN" ||
    key === "ELIZA_X_BEARER_TOKEN" ||
    key.startsWith("X_BEARER_TOKEN") ||
    key === "X_LIST_ID" ||
    key.startsWith("X_RESEARCH_") ||
    key.startsWith("X_SENTIMENT_") ||
    key.startsWith("XAI_") ||
    key.startsWith("GROK_")
  )
    return "X";
  if (
    key.startsWith("HONCHO_") ||
    key.startsWith("OPENCLAW_") ||
    key === "MILAIDY_GATEWAY_URL"
  )
    return "OPENCLAW";
  if (key.startsWith("NAVAL_")) return "NAVAL";
  return "MISC";
}

// Dedupe: keep last occurrence per key
const seen = new Map();
for (const v of vars) {
  seen.set(v.key, v);
}
const dedupedVars = [...seen.values()];

const bySection = {};
for (const v of dedupedVars) {
  const s = sectionForKey(v.key);
  if (!bySection[s]) bySection[s] = [];
  bySection[s].push(v);
}

const sectionOrder = [
  "CORE",
  "DATABASE",
  "SHARED",
  "X",
  "ELIZA",
  "VINCE",
  "ECHO",
  "ORACLE",
  "SOLUS",
  "OTAKU",
  "KELLY",
  "SENTINEL",
  "CLAWTERM",
  "FALLBACK",
  "STANDUP",
  "A2A",
  "OPENCLAW",
  "MISC",
  "NAVAL",
];

const sectionTitles = {
  CORE: "# -----------------------------------------------------------------------------\n# CORE — Required to run\n# -----------------------------------------------------------------------------",
  DATABASE: "# -----------------------------------------------------------------------------\n# DATABASE\n# -----------------------------------------------------------------------------",
  SHARED: "# -----------------------------------------------------------------------------\n# SHARED APIs (used by multiple agents)\n# -----------------------------------------------------------------------------",
  X: "# -----------------------------------------------------------------------------\n# X / TWITTER (VINCE, ECHO, Eliza, Clawterm)\n# -----------------------------------------------------------------------------",
  ELIZA: "# -----------------------------------------------------------------------------\n# ELIZA (CEO — knowledge, research, content)\n# -----------------------------------------------------------------------------",
  VINCE: "# -----------------------------------------------------------------------------\n# VINCE (CDO — data, paper bot, options, perps, memes)\n# -----------------------------------------------------------------------------",
  ECHO: "# -----------------------------------------------------------------------------\n# ECHO (CSO — CT sentiment, X pulse, threads)\n# -----------------------------------------------------------------------------",
  ORACLE: "# -----------------------------------------------------------------------------\n# ORACLE (CPO — Polymarket discovery, odds, portfolio)\n# -----------------------------------------------------------------------------",
  SOLUS: "# -----------------------------------------------------------------------------\n# SOLUS (CFO — strike ritual, options, $100K plan)\n# -----------------------------------------------------------------------------",
  OTAKU: "# -----------------------------------------------------------------------------\n# OTAKU (COO — DeFi, wallet, BANKR, Relay, Morpho)\n# -----------------------------------------------------------------------------",
  KELLY: "# -----------------------------------------------------------------------------\n# KELLY (CVO — lifestyle, standup facilitator)\n# -----------------------------------------------------------------------------",
  SENTINEL: "# -----------------------------------------------------------------------------\n# SENTINEL (CTO — PRDs, cost, ONNX, OpenClaw guide)\n# -----------------------------------------------------------------------------",
  CLAWTERM: "# -----------------------------------------------------------------------------\n# CLAWTERM (OpenClaw research terminal)\n# -----------------------------------------------------------------------------",
  FALLBACK: "# -----------------------------------------------------------------------------\n# FALLBACK DISCORD (when an agent has no *_DISCORD_* set)\n# -----------------------------------------------------------------------------",
  STANDUP: "# -----------------------------------------------------------------------------\n# STANDUP & A2A (multi-agent meetings, loop control)\n# -----------------------------------------------------------------------------",
  A2A: "# (A2A continued)",
  OPENCLAW: "# -----------------------------------------------------------------------------\n# OPENCLAW / HONCHO\n# -----------------------------------------------------------------------------",
  MISC: "# -----------------------------------------------------------------------------\n# MISC\n# -----------------------------------------------------------------------------",
  NAVAL: "# -----------------------------------------------------------------------------\n# NAVAL (optional)\n# -----------------------------------------------------------------------------",
};

const out = [];
out.push("# =============================================================================");
out.push("# VINCE — Environment Variables (reordered; same as .env.example structure)");
out.push("# =============================================================================\n");

let prevSection = null;
for (const sec of sectionOrder) {
  const list = bySection[sec];
  if (!list || list.length === 0) continue;
  if (sec !== "A2A" || prevSection !== "STANDUP") {
    out.push(sectionTitles[sec]);
    out.push("");
  }
  prevSection = sec;
  for (const v of list) {
    out.push(v.raw);
  }
  out.push("");
}

const result = out.join("\n").replace(/\n{3,}/g, "\n\n");
fs.writeFileSync(envPath, result + "\n", "utf8");
console.log("Reordered .env into sections. Backup not created; check git diff.");
process.exit(0);
