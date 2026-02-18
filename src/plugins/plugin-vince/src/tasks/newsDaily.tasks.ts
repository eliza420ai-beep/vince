/**
 * VINCE News Daily Task
 *
 * Scheduled daily news briefing pushed to Discord/Slack/Telegram.
 * Uses MandoMinutes data - only pushes when we can confirm Mando has updated.
 *
 * MandoMinutes updates daily around 4:20 PM Paris time (~15:20 UTC winter / 14:20 UTC summer).
 * Default run is 16:00 UTC so we refresh the cache and push after the update is live.
 *
 * Freshness gate: Skips push if we can't infer Mando's publish date from the page,
 * or if the inferred date is older than yesterday. Mando doesn't update every day.
 * Set VINCE_NEWS_PUSH_REQUIRE_FRESH=false to push anyway (e.g. for testing).
 *
 * - Runs at configured hour (default 16:00 UTC, after ~4:20 PM Paris update).
 * - Pushes to channels whose name contains "news" (e.g. #vince-news).
 *
 * Set VINCE_NEWS_HOUR=16 (UTC) to customize. Disable with VINCE_NEWS_DAILY_ENABLED=false.
 */

import { type IAgentRuntime, type UUID, logger } from "@elizaos/core";
import type { VinceNewsSentimentService } from "../services/newsSentiment.service";
import {
  buildNewsDataContext,
  generateNewsHumanBriefing,
  type NewsDataContext,
} from "../actions/news.action";

/** Default 16:00 UTC = after MandoMinutes update (~4:20 PM Paris) */
const DEFAULT_NEWS_HOUR_UTC = 16;
const TASK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

export async function registerNewsDailyTask(
  runtime: IAgentRuntime,
): Promise<void> {
  const enabled = process.env.VINCE_NEWS_DAILY_ENABLED !== "false";
  if (!enabled) {
    logger.debug("[NewsDaily] Task disabled (VINCE_NEWS_DAILY_ENABLED=false)");
    return;
  }

  const newsHour =
    parseInt(
      process.env.VINCE_NEWS_HOUR ?? String(DEFAULT_NEWS_HOUR_UTC),
      10,
    ) || DEFAULT_NEWS_HOUR_UTC;
  const taskWorldId = runtime.agentId as UUID;

  runtime.registerTaskWorker({
    name: "VINCE_NEWS_DAILY",
    validate: async () => true,
    execute: async (rt) => {
      const now = new Date();
      const hourUtc = now.getUTCHours();
      if (hourUtc !== newsHour) {
        logger.debug(
          `[NewsDaily] Skipping: current hour ${hourUtc} UTC, target ${newsHour}`,
        );
        return;
      }

      const newsService = rt.getService(
        "VINCE_NEWS_SENTIMENT_SERVICE",
      ) as VinceNewsSentimentService | null;
      if (!newsService) {
        logger.warn("[NewsDaily] VinceNewsSentimentService not available");
        return;
      }

      const notif = rt.getService("VINCE_NOTIFICATION_SERVICE") as {
        push?: (
          text: string,
          opts?: { roomNameContains?: string },
        ) => Promise<number>;
      } | null;
      if (!notif?.push) {
        logger.warn("[NewsDaily] VinceNotificationService not available");
        return;
      }

      logger.debug(
        "[NewsDaily] Fetching news (MandoMinutes, direct fetch for freshness check)...",
      );
      await newsService.refreshData(true);

      const freshness = newsService.getMandoFreshnessInfo();
      if (!freshness.isLikelyFresh) {
        if (!freshness.hasData) {
          logger.debug(
            "[NewsDaily] Skipping: no news data (run MANDO_MINUTES or ensure cache is populated)",
          );
        } else if (!freshness.inferredPublishDate) {
          logger.debug(
            "[NewsDaily] Skipping: could not infer Mando publish date - may be stale. Set VINCE_NEWS_PUSH_REQUIRE_FRESH=false to push anyway.",
          );
        } else {
          logger.debug(
            `[NewsDaily] Skipping: Mando data from ${freshness.inferredPublishDate} (not today/yesterday). He may not have updated yet.`,
          );
        }
        return;
      }

      logger.debug("[NewsDaily] Building news briefing...");
      try {
        const sentiment = newsService.getOverallSentiment();
        const riskEvents = newsService.getCriticalRiskEvents();
        const topNews = newsService.getTopHeadlines(12);
        const allHeadlines = newsService.getAllHeadlines();
        const alsoInFeed = allHeadlines.slice(12, 12 + 40).map((n) => ({ title: n.title }));
        const stats = newsService.getDebugStats();

        const assetSentiments: NewsDataContext["assetSentiments"] = [];
        for (const asset of ["BTC", "ETH", "SOL", "HYPE"]) {
          const assetData = newsService.getAssetSentiment(asset);
          if (assetData.newsCount > 0) {
            assetSentiments.push({
              asset,
              sentiment: assetData.sentiment,
              confidence: assetData.confidence,
              newsCount: assetData.newsCount,
            });
          }
        }

        const ctx: NewsDataContext = {
          overallSentiment: sentiment.sentiment,
          overallConfidence: Math.round(sentiment.confidence),
          riskEvents: riskEvents.slice(0, 5).map((e) => ({
            severity: e.severity,
            description: e.description,
            assets: e.assets,
          })),
          assetSentiments,
          topHeadlines: topNews.map((n) => ({
            title: n.title,
            source: n.source,
            sentiment: n.sentiment,
            impact: n.impact,
          })),
          alsoInFeed: alsoInFeed.length > 0 ? alsoInFeed : undefined,
          stats: {
            total: stats.totalNews,
            bullish: stats.bullishCount,
            bearish: stats.bearishCount,
            neutral: stats.neutralCount,
          },
        };

        const dataContext = buildNewsDataContext(ctx);
        const briefing = await generateNewsHumanBriefing(rt, dataContext);

        const date = now.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });
        const text = [
          `**News Briefing** _${date}_`,
          "",
          briefing,
          "",
          "*Source: MandoMinutes*",
          "",
          "---",
          "*Commands: OPTIONS, PERPS, NEWS, MEMES, AIRDROPS, LIFESTYLE, NFT, INTEL, BOT, UPLOAD*",
        ].join("\n");

        const sent = await notif.push(text, { roomNameContains: "news" });
        if (sent > 0) {
          logger.debug(
            `[NewsDaily] Pushed to ${sent} channel(s) (Mando date: ${freshness.inferredPublishDate})`,
          );
        } else {
          logger.debug(
            "[NewsDaily] No channels matched (room name contains 'news'). Create e.g. #vince-news.",
          );
        }
      } catch (error) {
        logger.error(`[NewsDaily] Failed: ${error}`);
      }
    },
  });

  await runtime.createTask({
    name: "VINCE_NEWS_DAILY",
    description:
      "Daily news briefing (MandoMinutes) pushed to Discord/Slack - only when Mando has updated",
    roomId: taskWorldId,
    worldId: taskWorldId,
    tags: ["vince", "news", "repeat"],
    metadata: {
      updatedAt: Date.now(),
      updateInterval: TASK_INTERVAL_MS,
    },
  });

  logger.debug(
    `[NewsDaily] Task registered (runs at ${newsHour}:00 UTC, push to channels with "news" in name, freshness gate: ${process.env.VINCE_NEWS_PUSH_REQUIRE_FRESH !== "false" ? "on" : "off"})`,
  );
}
