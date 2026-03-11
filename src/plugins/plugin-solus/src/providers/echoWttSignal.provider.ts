import type {
  IAgentRuntime,
  Memory,
  Provider,
  ProviderResult,
  State,
} from "@elizaos/core";
import { logger } from "@elizaos/core";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import {
  loadEchoXSignals,
  getEchoXSignalForAsset,
} from "../../../plugin-vince/src/utils/standupSignalsReader";
import {
  parseAndValidateWttPick,
  type WttPick,
} from "../../../../shared/wttContract";

const CORE_ASSETS = ["BTC", "ETH", "SOL", "HYPE"] as const;

interface SignalSnapshotMeta {
  ageMinutes: number | null;
  isFresh: boolean;
}

function getWttJsonPath(date?: Date): string {
  const d = date ?? new Date();
  const dateStr = d.toISOString().slice(0, 10);
  const base = process.env.STANDUP_DELIVERABLES_DIR?.trim()
    ? path.join(process.cwd(), process.env.STANDUP_DELIVERABLES_DIR)
    : path.join(process.cwd(), "docs", "standup");
  return path.join(base, "whats-the-trade", `${dateStr}-whats-the-trade.json`);
}

async function loadWttPick(date?: Date): Promise<WttPick | null> {
  try {
    const raw = await fs.readFile(getWttJsonPath(date), "utf-8");
    const validated = parseAndValidateWttPick(raw);
    return validated.ok ? validated.value : null;
  } catch {
    return null;
  }
}

async function getFileAgeMeta(filepath: string): Promise<SignalSnapshotMeta> {
  try {
    const stat = await fs.stat(filepath);
    const ageMs = Date.now() - stat.mtimeMs;
    const ageMinutes = Math.max(0, Math.round(ageMs / 60_000));
    return { ageMinutes, isFresh: ageMs <= 18 * 60 * 60 * 1000 };
  } catch {
    return { ageMinutes: null, isFresh: false };
  }
}

export const echoWttSignalProvider: Provider = {
  name: "ECHO_WTT_SIGNAL",
  description:
    "Latest ECHO WTT signal sidecars (echo-x + structured WTT pick) for Solus strike decisions.",
  position: -5,
  dynamic: true,
  get: async (
    _runtime: IAgentRuntime,
    _message: Memory,
    _state?: State,
  ): Promise<ProviderResult> => {
    try {
      const [echo, pick] = await Promise.all([
        loadEchoXSignals(),
        loadWttPick(),
      ]);
      if (!echo && !pick) return {};

      const [echoAge, wttAge] = await Promise.all([
        getFileAgeMeta(
          path.join(
            process.env.STANDUP_DELIVERABLES_DIR?.trim()
              ? path.join(process.cwd(), process.env.STANDUP_DELIVERABLES_DIR)
              : path.join(process.cwd(), "docs", "standup"),
            "signals",
            `${new Date().toISOString().slice(0, 10)}-echo-x.json`,
          ),
        ),
        getFileAgeMeta(getWttJsonPath()),
      ]);

      const lines: string[] = ["[ECHO WTT signal context]"];
      const perAsset: Record<
        string,
        { direction: "long" | "short" | "neutral"; confidence: number | null }
      > = {};
      if (echo?.signals?.length) {
        for (const asset of CORE_ASSETS) {
          const s = getEchoXSignalForAsset(echo, asset);
          if (!s) continue;
          const confidence =
            typeof s.confidence === "number"
              ? ` (${Math.round(s.confidence)}%)`
              : "";
          perAsset[asset] = {
            direction: s.direction,
            confidence:
              typeof s.confidence === "number"
                ? Math.round(s.confidence)
                : null,
          };
          lines.push(`- ${asset}: ${s.direction}${confidence}`);
        }
      }
      lines.push(
        `- Echo sidecar age: ${echoAge.ageMinutes != null ? `${echoAge.ageMinutes}m` : "unknown"} (${echoAge.isFresh ? "fresh" : "stale"})`,
      );

      let hasCrowdingRisk = false;
      let invalidationClarity: "high" | "medium" | "low" = "low";
      if (pick) {
        hasCrowdingRisk = pick.killConditions.some((k) =>
          /crowding|overcrowd|consensus/i.test(k),
        );
        invalidationClarity = pick.invalidateCondition
          ? pick.invalidateCondition.length >= 28
            ? "high"
            : "medium"
          : "low";
        lines.push(
          `- Daily thesis: ${pick.primaryDirection.toUpperCase()} ${pick.primaryTicker} | ${pick.thesis}`,
        );
        lines.push(
          `- Invalidation: ${pick.invalidateCondition || "n/a"} (clarity: ${invalidationClarity})`,
        );
        lines.push(
          `- Kill conditions: ${pick.killConditions.length} | Crowding risk: ${hasCrowdingRisk ? "yes" : "no"}`,
        );
        if (pick.catalystSources?.length) {
          lines.push(`- Catalyst sources: ${pick.catalystSources.join(", ")}`);
        }
      }
      lines.push(
        `- WTT sidecar age: ${wttAge.ageMinutes != null ? `${wttAge.ageMinutes}m` : "unknown"} (${wttAge.isFresh ? "fresh" : "stale"})`,
      );

      const text = lines.join("\n");
      return {
        text,
        values: {
          echoWttSignal: {
            perAsset,
            pick: pick ?? undefined,
            freshness: {
              echo: echoAge,
              wtt: wttAge,
            },
            summary: {
              hasCrowdingRisk,
              invalidationClarity,
              primaryTicker: pick?.primaryTicker,
              primaryDirection: pick?.primaryDirection,
              catalystSources: pick?.catalystSources ?? [],
            },
          },
        },
      };
    } catch (error) {
      logger.debug(
        "[Solus] ECHO_WTT_SIGNAL provider failed: " +
          (error instanceof Error ? error.message : String(error)),
      );
      return {};
    }
  },
};
