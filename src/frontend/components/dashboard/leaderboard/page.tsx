import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardPageLayout from "@/frontend/components/dashboard/layout";
import RebelsRanking from "@/frontend/components/dashboard/rebels-ranking";
import DashboardCard from "@/frontend/components/dashboard/card";
import { MarketLeaderboardSection } from "@/frontend/components/dashboard/leaderboard/market-leaderboard-section";
import { Button } from "@/frontend/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/frontend/components/ui/tabs";
import { elizaClient } from "@/frontend/lib/elizaClient";
import {
  fetchLeaderboardsWithError,
  fetchPaperWithError,
  fetchKnowledgeWithError,
  LEADERBOARDS_STALE_MS,
} from "@/frontend/lib/leaderboardsApi";
import type { RebelRanking } from "@/frontend/types/dashboard";
import type {
  LeaderboardEntry,
  ReferralCodeResponse,
} from "@elizaos/api-client";
import { Trophy, RefreshCw, Copy, Check, BarChart3, Flame, Newspaper, Bot, BookOpen, ExternalLink } from "lucide-react";
import { UUID } from "@elizaos/core";
import { cn } from "@/frontend/lib/utils";

const MANDO_MINUTES_URL = "https://www.mandominutes.com/Latest";

type MainTab = "knowledge" | "markets" | "news" | "trading_bot";

// Type assertion for gamification service (will be available after API client rebuild)
const gamificationClient = (elizaClient as any).gamification;

/** Agent from list (id, name, ...). Used to pick VINCE for Markets API. */
type AgentFromList = { id?: string; name?: string };

interface LeaderboardPageProps {
  agentId: UUID;
  /** Agent list from API; Markets data is fetched using the VINCE agent (plugin-vince). */
  agents?: AgentFromList[];
}

export default function LeaderboardPage({ agentId, agents }: LeaderboardPageProps) {
  // Markets (HIP-3, Crypto, Memes, etc.) come from plugin-vince — use VINCE agent so the route exists
  const vinceAgent = agents?.find((a) => (a.name ?? "").toUpperCase() === "VINCE");
  const leaderboardsAgentId = (vinceAgent?.id ?? agents?.[0]?.id ?? agentId) as string;
  const [mainTab, setMainTab] = useState<MainTab>("markets");
  const [scope, setScope] = useState<"weekly" | "all_time">("weekly");
  const [copied, setCopied] = useState(false);

  const { data: leaderboardsResult, isLoading: leaderboardsLoading, refetch: refetchLeaderboards, isFetching: leaderboardsFetching } = useQuery({
    queryKey: ["leaderboards", leaderboardsAgentId],
    queryFn: () => fetchLeaderboardsWithError(leaderboardsAgentId),
    enabled: (mainTab === "markets" || mainTab === "news") && !!leaderboardsAgentId,
    staleTime: LEADERBOARDS_STALE_MS,
  });

  const { data: paperResult, isLoading: paperLoading, isFetching: paperFetching, refetch: refetchPaper } = useQuery({
    queryKey: ["paper", leaderboardsAgentId],
    queryFn: () => fetchPaperWithError(leaderboardsAgentId),
    enabled: mainTab === "trading_bot" && !!leaderboardsAgentId,
    staleTime: 60 * 1000,
  });

  const { data: knowledgeResult, isLoading: knowledgeLoading, refetch: refetchKnowledge } = useQuery({
    queryKey: ["knowledge", leaderboardsAgentId],
    queryFn: () => fetchKnowledgeWithError(leaderboardsAgentId),
    enabled: mainTab === "knowledge" && !!leaderboardsAgentId,
    staleTime: 5 * 60 * 1000,
  });
  const leaderboardsData = leaderboardsResult?.data ?? null;
  const leaderboardsError = leaderboardsResult?.error ?? null;
  const leaderboardsStatus = leaderboardsResult?.status ?? null;

  const {
    data: leaderboardData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["leaderboard", agentId, scope],
    queryFn: async () => {
      if (!gamificationClient) {
        return { scope, entries: [], userRank: 0, limit: 50 };
      }
      try {
        return await gamificationClient.getLeaderboard(agentId, scope, 50);
      } catch (err: any) {
        console.error("[LeaderboardPage] Error fetching leaderboard:", err);
        if (err?.response?.status === 404 || err?.status === 404) {
          return { scope, entries: [], userRank: 0, limit: 50 };
        }
        throw err;
      }
    },
    enabled: !!agentId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  // Available default avatars for randomization
  const defaultAvatars = [
    "/avatars/user_joyboy.png",
    "/avatars/user_krimson.png",
    "/avatars/user_mati.png",
    "/avatars/user_pek.png",
  ];

  // Simple hash function to deterministically select avatar based on username
  const getRandomAvatar = (username: string): string => {
    // Use username as seed for deterministic randomization
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      const char = username.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    const index = Math.abs(hash) % defaultAvatars.length;
    return defaultAvatars[index];
  };

  // Check if avatar is the default krimson avatar (early users have this)
  const isKrimsonAvatar = (avatar: string | undefined): boolean => {
    if (!avatar) return false;
    return (
      avatar.includes("user_krimson.png") || avatar.includes("user_krimson")
    );
  };

  // Transform leaderboard entries to RebelRanking format
  // API already limits to 50 entries - entries no longer contain userId (privacy)
  const rebels: RebelRanking[] = (leaderboardData?.entries || []).map(
    (entry: LeaderboardEntry, index: number) => {
      const username = entry.username;
      // Randomize if no avatar or if avatar is the default krimson avatar
      const avatar =
        !entry.avatar || isKrimsonAvatar(entry.avatar)
          ? getRandomAvatar(username)
          : entry.avatar;
      return {
        id: entry.rank,
        name: username,
        handle: username.toUpperCase(), // Use uppercase username as handle
        streak: "", // Could add streak info if available
        points: entry.points,
        avatar, // Use randomized avatar if missing or if it's the default krimson avatar
        featured: index < 3, // Top 3 are featured
        subtitle: undefined, // Removed redundant rank and level name subtitle
      };
    },
  );

  const handleRefresh = () => {
    refetch();
  };

  // Query for referral code (requires authentication via Bearer token)
  const {
    data: referralData,
    isLoading: isLoadingReferral,
    refetch: refetchReferral,
  } = useQuery({
    queryKey: ["referralCode", agentId],
    queryFn: async () => {
      if (!gamificationClient) return { referralLink: "" };
      return await gamificationClient.getReferralCode(agentId);
    },
    enabled: !!agentId && !!gamificationClient,
    staleTime: Infinity,
  });

  const handleCopyReferralLink = async () => {
    if (!referralData?.referralLink) return;

    try {
      await navigator.clipboard.writeText(referralData.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy referral link:", err);
    }
  };

  // Calculate if we need to account for "Your Rank" card and referral card in height
  const hasUserRank =
    leaderboardData?.userRank != null && leaderboardData.userRank > 0;
  const hasReferralCard = !!agentId; // Referral card shown if agent context available (auth required)

  // Calculate max-height for leaderboard: viewport height minus header, tabs, user rank card, referral card, and spacing
  // Approximate heights: header ~80px, tabs ~60px, user rank ~100px, referral ~200px, spacing ~100px
  const leaderboardMaxHeight =
    hasUserRank && hasReferralCard
      ? "calc(100vh - 540px)" // Account for all elements
      : hasUserRank
        ? "calc(100vh - 340px)" // Account for user rank only
        : hasReferralCard
          ? "calc(100vh - 440px)" // Account for referral only
          : "calc(100vh - 240px)"; // Just header and tabs

  const headerDescription =
    mainTab === "knowledge"
      ? scope === "weekly"
        ? "Weekly Sprint Rankings · Newly added knowledge"
        : "All-Time Rankings · Newly added knowledge"
      : mainTab === "markets"
        ? "All market data in one place — no need to ask VINCE"
        : mainTab === "news"
          ? "MandoMinutes headlines with TLDR and deep dive"
          : "Open paper trades and portfolio overview";

  return (
    <DashboardPageLayout
      header={{
        title: "Leaderboard",
        description: headerDescription,
      }}
    >
      <div className="flex flex-col min-h-0">
        <Tabs
          value={mainTab}
          onValueChange={(v) => setMainTab(v as MainTab)}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex items-center justify-between flex-shrink-0 gap-2">
            <TabsList>
              <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
              <TabsTrigger value="markets">Markets</TabsTrigger>
              <TabsTrigger value="news">News</TabsTrigger>
              <TabsTrigger value="trading_bot">Trading Bot</TabsTrigger>
            </TabsList>
            {(mainTab === "markets" || mainTab === "news") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchLeaderboards()}
                disabled={leaderboardsLoading}
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", leaderboardsLoading && "animate-spin")} />
                Refresh
              </Button>
            )}
            {mainTab === "trading_bot" && (
              <Button variant="outline" size="sm" onClick={() => refetchPaper()} disabled={paperFetching}>
                <RefreshCw className={cn("w-4 h-4 mr-2", paperFetching && "animate-spin")} />
                Refresh
              </Button>
            )}
            {mainTab === "knowledge" && (
              <Button variant="outline" size="sm" onClick={() => refetchKnowledge()} disabled={knowledgeLoading}>
                <RefreshCw className={cn("w-4 h-4 mr-2", knowledgeLoading && "animate-spin")} />
                Refresh
              </Button>
            )}
          </div>

          {/* Markets tab: all data leaderboards — full data, no need to ask the agent */}
          <TabsContent value="markets" className="mt-6 flex-1 min-h-0 min-h-[280px]">
            {(leaderboardsLoading || leaderboardsFetching) ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-48 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : leaderboardsData ? (
              <div className="space-y-8">
                {/* Hero line: always-available data */}
                <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 border border-border/50 px-4 py-3">
                  <p className="text-sm font-medium text-foreground/90">
                    All data we have — always here. Open this page anytime; no need to ask VINCE.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {leaderboardsData.updatedAt != null
                      ? `Updated ${new Date(leaderboardsData.updatedAt).toLocaleTimeString()}`
                      : "Live data"}
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  {/* HIP-3: full top movers, volume leaders, AND all categories */}
                  {leaderboardsData.hip3 && (
                    <div className="lg:col-span-2">
                      <MarketLeaderboardSection
                        title={leaderboardsData.hip3.title}
                        subtitle={`${leaderboardsData.hip3.hottestSector} hottest · ${leaderboardsData.hip3.coldestSector} coldest · ${leaderboardsData.hip3.rotation}`}
                        topMovers={leaderboardsData.hip3.topMovers ?? []}
                        volumeLeaders={leaderboardsData.hip3.volumeLeaders ?? []}
                        oneLiner={leaderboardsData.hip3.oneLiner}
                        bias={leaderboardsData.hip3.bias}
                        categories={
                          leaderboardsData.hip3.categories
                            ? [
                                { label: "Commodities", rows: leaderboardsData.hip3.categories.commodities ?? [] },
                                { label: "Indices", rows: leaderboardsData.hip3.categories.indices ?? [] },
                                { label: "Stocks", rows: leaderboardsData.hip3.categories.stocks ?? [] },
                                { label: "AI / Tech", rows: leaderboardsData.hip3.categories.aiTech ?? [] },
                              ]
                            : undefined
                        }
                      />
                    </div>
                  )}

                  {/* HL Crypto: full lists */}
                  {leaderboardsData.hlCrypto && (
                    <MarketLeaderboardSection
                      title={leaderboardsData.hlCrypto.title}
                      subtitle={`Hottest avg ${(leaderboardsData.hlCrypto.hottestAvg ?? 0) >= 0 ? "+" : ""}${(leaderboardsData.hlCrypto.hottestAvg ?? 0).toFixed(2)}% · Coldest ${(leaderboardsData.hlCrypto.coldestAvg ?? 0).toFixed(2)}%`}
                      topMovers={leaderboardsData.hlCrypto.topMovers ?? []}
                      volumeLeaders={leaderboardsData.hlCrypto.volumeLeaders ?? []}
                      oneLiner={leaderboardsData.hlCrypto.oneLiner}
                      bias={leaderboardsData.hlCrypto.bias}
                    />
                  )}

                  {/* Memes: full hot + full ape lists */}
                  {leaderboardsData.memes && (
                    <DashboardCard title={leaderboardsData.memes.title}>
                      <p className="text-sm text-muted-foreground mb-3">{leaderboardsData.memes.moodSummary ?? ""}</p>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Mood: {leaderboardsData.memes.mood ?? "—"}</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            <Flame className="w-3.5 h-3.5" /> Hot (≥21%) — all
                          </div>
                          <ul className="space-y-1 text-sm">
                            {(leaderboardsData.memes.hot ?? []).map((r) => (
                              <li key={r.symbol} className="flex justify-between">
                                <span className="font-medium">{r.symbol}</span>
                                <span className={cn((r.change24h ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                  {(r.change24h ?? 0) >= 0 ? "+" : ""}{(r.change24h ?? 0).toFixed(1)}%
                                </span>
                              </li>
                            ))}
                            {(leaderboardsData.memes.hot ?? []).length === 0 && <li className="text-muted-foreground">—</li>}
                          </ul>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                            Ape candidates — all
                          </div>
                          <ul className="space-y-1 text-sm">
                            {(leaderboardsData.memes.ape ?? []).map((r) => (
                              <li key={r.symbol} className="flex justify-between">
                                <span className="font-medium">{r.symbol}</span>
                                {r.volumeFormatted && <span className="text-muted-foreground">{r.volumeFormatted}</span>}
                              </li>
                            ))}
                            {(leaderboardsData.memes.ape ?? []).length === 0 && <li className="text-muted-foreground">—</li>}
                          </ul>
                        </div>
                      </div>
                    </DashboardCard>
                  )}

                  {/* Meteora: all top pools */}
                  {leaderboardsData.meteora && (leaderboardsData.meteora.topPools?.length ?? 0) > 0 && (
                    <DashboardCard title={leaderboardsData.meteora.title}>
                      <p className="text-sm text-muted-foreground mb-3">{leaderboardsData.meteora.oneLiner ?? ""}</p>
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        <BarChart3 className="w-3.5 h-3.5" /> Top pools by TVL — all
                      </div>
                      <ul className="space-y-2 text-sm">
                        {(leaderboardsData.meteora.topPools ?? []).map((p) => (
                          <li key={p.name} className="flex justify-between items-center">
                            <span className="font-medium">{p.name}</span>
                            <span className="text-muted-foreground">{p.tvlFormatted}</span>
                            {p.apy != null && <span className="text-green-600 dark:text-green-400 tabular-nums">{p.apy.toFixed(1)}% APY</span>}
                          </li>
                        ))}
                      </ul>
                    </DashboardCard>
                  )}

                  {/* News: all headlines */}
                  {leaderboardsData.news && (
                    <DashboardCard title={leaderboardsData.news.title}>
                      <p className="text-sm text-muted-foreground mb-3">{leaderboardsData.news.oneLiner ?? ""}</p>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Sentiment: {leaderboardsData.news.sentiment ?? "—"}</p>
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        <Newspaper className="w-3.5 h-3.5" /> Headlines — all
                      </div>
                      <ul className="space-y-1.5 text-sm">
                        {(leaderboardsData.news.headlines ?? []).map((h, i) => (
                          <li key={i} className="flex gap-2">
                            {h.sentiment && (
                              <span className={cn(
                                "shrink-0 w-6",
                                h.sentiment === "bullish" && "text-green-600",
                                h.sentiment === "bearish" && "text-red-600",
                              )}>
                                {h.sentiment === "bullish" ? "🟢" : h.sentiment === "bearish" ? "🔴" : "⚪"}
                              </span>
                            )}
                            <span className="line-clamp-2">{h.text}</span>
                          </li>
                        ))}
                        {(leaderboardsData.news.headlines ?? []).length === 0 && <li className="text-muted-foreground">—</li>}
                      </ul>
                    </DashboardCard>
                  )}
                </div>

                {!leaderboardsData.hip3 && !leaderboardsData.hlCrypto && !leaderboardsData.memes && !leaderboardsData.meteora && !leaderboardsData.news && (
                  <p className="text-center text-muted-foreground py-8">No market data available. Try again in a moment.</p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center space-y-3 min-h-[200px] flex flex-col justify-center">
                <p className="font-medium text-foreground">Could not load leaderboards</p>
                {leaderboardsError != null && (
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {typeof leaderboardsError === "string" ? leaderboardsError : (leaderboardsError as any)?.message ?? String(leaderboardsError)}
                  </p>
                )}
                {leaderboardsStatus === 503 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Backend may need a restart. Run <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">bun run build</code> then restart the server.
                  </p>
                )}
                {leaderboardsStatus === 404 && (
                  <>
                    <p className="text-xs text-amber-600 dark:text-amber-400 max-w-md mx-auto">
                      Plugin route not found. Run <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">node scripts/patch-elizaos-server-plugin-routes.cjs</code> after install, then <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">bun run build</code> and restart with <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">bun start</code>.
                    </p>
                    <p className="text-xs text-muted-foreground font-mono break-all">
                      Requested agent ID: {leaderboardsAgentId || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      If backend is on port 3000, test: <code className="bg-muted px-1 rounded break-all">curl &quot;http://localhost:3000/api/agents/{leaderboardsAgentId || "AGENT_ID"}/plugins/plugin-vince/vince/leaderboards?agentId={leaderboardsAgentId || "AGENT_ID"}&quot;</code>
                    </p>
                  </>
                )}
                <p className="text-sm text-muted-foreground">Make sure VINCE is running, then click Refresh above.</p>
              </div>
            )}
          </TabsContent>

          {/* News tab: MandoMinutes headlines + TLDR + deep dive */}
          <TabsContent value="news" className="mt-6 flex-1 min-h-0 overflow-auto">
            {(leaderboardsLoading || leaderboardsFetching) && !leaderboardsData?.news ? (
              <div className="space-y-4">
                <div className="h-24 bg-muted/50 rounded-xl animate-pulse" />
                <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
              </div>
            ) : leaderboardsData?.news ? (
              <div className="space-y-6">
                <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 border border-border/50 px-4 py-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">TLDR</p>
                  <p className="text-sm font-medium text-foreground/90">{leaderboardsData.news.oneLiner}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sentiment: {leaderboardsData.news.sentiment} · {leaderboardsData.news.headlines.length} headlines
                  </p>
                </div>
                <DashboardCard title={leaderboardsData.news.title}>
                  <ul className="space-y-2 text-sm max-h-[60vh] overflow-y-auto pr-1">
                    {(leaderboardsData.news.headlines ?? []).map((h, i) => (
                      <li key={i} className="flex gap-2 items-start">
                        {h.sentiment && (
                          <span
                            className={cn(
                              "shrink-0 w-6 pt-0.5",
                              h.sentiment === "bullish" && "text-green-600 dark:text-green-400",
                              h.sentiment === "bearish" && "text-red-600 dark:text-red-400",
                            )}
                          >
                            {h.sentiment === "bullish" ? "🟢" : h.sentiment === "bearish" ? "🔴" : "⚪"}
                          </span>
                        )}
                        <span className="flex-1 line-clamp-2">{h.text}</span>
                        <a
                          href={h.url || MANDO_MINUTES_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-primary hover:underline flex items-center gap-1 text-xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Deep dive
                        </a>
                      </li>
                    ))}
                  </ul>
                  {(leaderboardsData.news.headlines ?? []).length === 0 && (
                    <p className="text-muted-foreground py-4">No headlines yet. Run MANDO_MINUTES or ask VINCE for news.</p>
                  )}
                </DashboardCard>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center">
                <Newspaper className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">No news data</p>
                <p className="text-sm text-muted-foreground mt-1">Switch to Markets to load data, or ask VINCE for &quot;mando minutes&quot;.</p>
              </div>
            )}
          </TabsContent>

          {/* Trading Bot tab: open positions + portfolio — scrollable area so all content is reachable */}
          <TabsContent value="trading_bot" className="mt-6 flex-1 min-h-0 flex flex-col data-[state=active]:flex">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-7rem)] pb-8">
              <>
            {paperLoading && !paperResult?.data ? (
              <div className="space-y-4">
                <div className="h-32 bg-muted/50 rounded-xl animate-pulse" />
                <div className="h-24 bg-muted/50 rounded-xl animate-pulse" />
              </div>
            ) : paperResult?.data ? (
              <div className="space-y-6">
                <DashboardCard title="Portfolio">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Total value</p>
                      <p className="font-mono font-semibold">${(paperResult.data.portfolio.totalValue ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Realized P&L</p>
                      <p className={cn("font-mono font-semibold", (paperResult.data.portfolio.realizedPnl ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                        ${(paperResult.data.portfolio.realizedPnl ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Win rate</p>
                      <p className="font-mono font-semibold">{((paperResult.data.portfolio.winRate ?? 0) * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Trades</p>
                      <p className="font-mono font-semibold">{paperResult.data.portfolio.tradeCount ?? 0}</p>
                    </div>
                  </div>
                </DashboardCard>
                <DashboardCard title="Open positions">
                  {paperResult.data.openPositions.length === 0 ? (
                    <p className="text-muted-foreground py-4">No open paper positions. Ask VINCE to &quot;bot status&quot; or &quot;trade&quot;.</p>
                  ) : (
                    <div className="space-y-4">
                      {paperResult.data.openPositions.map((pos) => {
                        const entryTime = pos.openedAt ? new Date(pos.openedAt).toISOString().replace("T", " ").slice(0, 19) + "Z" : "—";
                        const marginUsd = pos.marginUsd ?? (pos.sizeUsd && pos.leverage ? pos.sizeUsd / pos.leverage : 0);
                        const slPct = pos.entryPrice && pos.stopLossPrice
                          ? Math.abs(((pos.stopLossPrice - pos.entryPrice) / pos.entryPrice) * 100).toFixed(2)
                          : null;
                        const liqPct = pos.entryPrice && pos.liquidationPrice
                          ? Math.abs(((pos.liquidationPrice - pos.entryPrice) / pos.entryPrice) * 100).toFixed(1)
                          : null;
                        const atrVal = pos.entryATRPct ?? (pos.metadata?.entryATRPct as number | undefined);
                        const atrPct = atrVal != null ? `${Number(atrVal).toFixed(2)}%` : "—";
                        const sources = (pos.metadata?.contributingSources as string[] | undefined) ?? [];
                        const supporting = pos.triggerSignals ?? [];
                        const conflicting = (pos.metadata?.conflictingReasons as string[] | undefined) ?? [];
                        const totalSourceCount = (pos.metadata?.totalSourceCount as number | undefined) ?? 0;
                        const confirmingCount = (pos.metadata?.confirmingCount as number | undefined) ?? 0;
                        const conflictingCount = (pos.metadata?.conflictingCount as number | undefined) ?? 0;
                        const strength = pos.metadata?.strength as number | undefined;
                        const confidence = pos.metadata?.confidence as number | undefined;
                        const session = pos.metadata?.session as string | undefined;
                        const metaSlLossUsd = pos.metadata?.slLossUsd as number | undefined;
                        const metaTp1ProfitUsd = pos.metadata?.tp1ProfitUsd as number | undefined;
                        const rrRatio = pos.metadata?.rrRatio as number | undefined;
                        const rrLabel = pos.metadata?.rrLabel as string | undefined;
                        const metaSlPct = pos.metadata?.slPct as number | undefined;
                        const metaTp1Pct = pos.metadata?.tp1Pct as number | undefined;
                        const tp1Price = pos.takeProfitPrices?.[0];
                        // Derive risk management from position when metadata missing (e.g. older positions)
                        const ep = pos.entryPrice ?? 0;
                        const sizeUsd = pos.sizeUsd ?? 0;
                        const slPrice = pos.stopLossPrice;
                        const slPctDerived = ep && slPrice ? Math.abs(((slPrice - ep) / ep) * 100) : null;
                        const tp1PctDerived = ep && tp1Price ? Math.abs(((tp1Price - ep) / ep) * 100) : null;
                        const slLossUsd = metaSlLossUsd ?? (sizeUsd && slPctDerived != null ? sizeUsd * (slPctDerived / 100) : undefined);
                        const tp1ProfitUsd = metaTp1ProfitUsd ?? (sizeUsd && tp1PctDerived != null ? sizeUsd * (tp1PctDerived / 100) : undefined);
                        const slPctDisplay = metaSlPct ?? slPctDerived;
                        const tp1PctDisplay = metaTp1Pct ?? tp1PctDerived;
                        const rrNum = slLossUsd != null && slLossUsd > 0 && tp1ProfitUsd != null ? tp1ProfitUsd / slLossUsd : undefined;
                        const rrRatioDisplay = rrRatio ?? rrNum;
                        const rrLabelDisplay = rrLabel ?? (rrNum != null ? (rrNum >= 1.5 ? "Good" : rrNum >= 1 ? "OK" : rrNum >= 0.5 ? "Weak" : rrNum > 0 ? "Poor" : "—") : undefined);
                        const hasWhy = supporting.length > 0 || conflicting.length > 0 || sources.length > 0;
                        const hasSignal = strength != null || confidence != null || confirmingCount != null;
                        const hasRisk = pos.stopLossPrice != null || tp1Price != null;
                        return (
                          <div key={pos.id} className="rounded-lg border border-border bg-muted/20 p-4 space-y-4">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold">
                              <span className={cn("uppercase", pos.direction === "long" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                {pos.direction} {pos.asset}
                              </span>
                              <span className="font-mono">@ ${(pos.entryPrice ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                              <span className={cn("font-mono", (pos.unrealizedPnl ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                P&L ${(pos.unrealizedPnl ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                {pos.unrealizedPnlPct != null && ` (${pos.unrealizedPnlPct >= 0 ? "+" : ""}${pos.unrealizedPnlPct.toFixed(2)}%)`}
                              </span>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                              <div><span className="text-muted-foreground">Entry</span><p className="font-mono">{entryTime}</p></div>
                              <div><span className="text-muted-foreground">Notional</span><p className="font-mono">${(pos.sizeUsd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
                              <div><span className="text-muted-foreground">Margin</span><p className="font-mono">${marginUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div>
                              <div><span className="text-muted-foreground">Leverage</span><p className="font-mono">{pos.leverage}x{sizeUsd > 0 && ` (~$${Math.round(sizeUsd / 100)}/1%)`}</p></div>
                              {pos.liquidationPrice != null && <div><span className="text-muted-foreground">Liq</span><p className="font-mono">${pos.liquidationPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}{liqPct != null && ` (~${liqPct}%)`}</p></div>}
                              {atrPct !== "—" && <div><span className="text-muted-foreground">ATR(14)</span><p className="font-mono">{atrPct} (volatility → SL floor)</p></div>}
                              {slPct != null && <div><span className="text-muted-foreground">SL</span><p className="font-mono">{slPct}%{rrRatioDisplay != null ? ` (${rrRatioDisplay.toFixed(1)}:1 R:R target)` : ""}</p></div>}
                              {pos.strategyName && <div><span className="text-muted-foreground">Strategy</span><p className="font-mono">{pos.strategyName}</p></div>}
                              {session && <div><span className="text-muted-foreground">Session</span><p className="font-mono">{session}</p></div>}
                            </div>
                            {hasWhy && (
                              <div className="border-t border-border/50 pt-3 space-y-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Why this trade</p>
                                {totalSourceCount > 0 && (confirmingCount != null || conflictingCount != null) && (
                                  <p className="text-xs text-muted-foreground">
                                    {pos.direction.toUpperCase()} — {confirmingCount} of {totalSourceCount} sources agreed
                                    {conflictingCount != null && conflictingCount > 0 ? ` (${conflictingCount} disagreed).` : "."}
                                    {strength != null && confidence != null && ` Net: Strength ${strength}% / confidence ${confidence}% met threshold. `}
                                    {supporting.length} supporting, {conflicting.length} conflicting.
                                  </p>
                                )}
                                {supporting.length > 0 && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Supporting ({supporting.length})</p>
                                    <ul className="list-disc list-inside text-xs space-y-0.5">
                                      {supporting.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                  </div>
                                )}
                                {conflicting.length > 0 && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Conflicting ({conflicting.length})</p>
                                    <ul className="list-disc list-inside text-xs space-y-0.5">
                                      {conflicting.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                  </div>
                                )}
                                {sources.length > 0 && (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">Sources</p>
                                    <p className="text-xs">{sources.join(", ")}</p>
                                  </div>
                                )}
                              </div>
                            )}
                            {hasSignal && (
                              <div className="border-t border-border/50 pt-3 space-y-1">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Signal</p>
                                <p className="text-xs font-mono">
                                  {strength != null && `Strength ${strength}%`}
                                  {strength != null && (confidence != null || confirmingCount != null || totalSourceCount > 0) && " · "}
                                  {confidence != null && `Confidence ${confidence}%`}
                                  {confidence != null && (confirmingCount != null || totalSourceCount > 0) && " · "}
                                  {confirmingCount != null && (
                                    totalSourceCount > 0
                                      ? `Confirming ${confirmingCount} of ${totalSourceCount}`
                                      : `Confirming ${confirmingCount}`
                                  )}
                                </p>
                                {strength == null && confidence == null && (confirmingCount != null || totalSourceCount > 0) && (
                                  <p className="text-[11px] text-muted-foreground">Strength/confidence not recorded for this position.</p>
                                )}
                              </div>
                            )}
                            {hasRisk && (
                              <div className="border-t border-border/50 pt-3 space-y-1">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Risk management</p>
                                <div className="text-xs space-y-1">
                                  {pos.stopLossPrice != null && (
                                    <p className="font-mono">
                                      SL ${pos.stopLossPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      {slPctDisplay != null && ` (${slPctDisplay.toFixed(1)}%)`}
                                      {slLossUsd != null && ` If hit -$${Math.round(slLossUsd)}`}
                                    </p>
                                  )}
                                  {tp1Price != null && (
                                    <p className="font-mono">
                                      TP ${tp1Price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      {tp1PctDisplay != null && ` (${tp1PctDisplay.toFixed(1)}%)`}
                                      {tp1ProfitUsd != null && ` If hit +$${Math.round(tp1ProfitUsd)}`}
                                    </p>
                                  )}
                                  {(rrRatioDisplay != null || rrLabelDisplay) && (
                                    <p className="font-mono">
                                      R:R (TP1 vs SL) {rrRatioDisplay != null ? `${rrRatioDisplay.toFixed(1)}:1` : "—"} {rrLabelDisplay ? ` ${rrLabelDisplay}` : ""}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                            {((pos.metadata?.mlQualityScore != null) || (pos.metadata?.banditWeightsUsed === true)) && (
                              <div className="border-t border-border/50 pt-3 space-y-1">
                                <p className="text-xs font-semibold text-muted-foreground uppercase">Recorded data influence</p>
                                <p className="text-xs font-mono">
                                  {typeof pos.metadata?.mlQualityScore === "number" && `ML quality ${(Number(pos.metadata.mlQualityScore) * 100).toFixed(0)}%`}
                                  {typeof pos.metadata?.mlQualityScore === "number" && pos.metadata?.banditWeightsUsed === true && " · "}
                                  {pos.metadata?.banditWeightsUsed === true && "Bandit weights used"}
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </DashboardCard>
                {/* Signals evaluated but no trade — "a no-trade is also a trade" (same data as terminal) */}
                <DashboardCard
                  title="Signals evaluated (no trade)"
                  className="border-amber-500/30 dark:border-amber-500/20"
                >
                  <p className="text-xs text-muted-foreground mb-3">
                    A no-trade is also a decision. When the bot evaluates a signal but does not open (e.g. strength/confidence below bar, book imbalance, ML reject), it appears here—same data as the terminal &quot;SIGNAL EVALUATED - NO TRADE&quot; boxes. Hit Refresh to sync with the running bot.
                  </p>
                  {(paperResult.data.recentNoTrades?.length ?? 0) === 0 ? (
                    <p className="text-muted-foreground py-4 text-sm rounded-lg bg-muted/30 border border-dashed border-border px-3">
                      No no-trade evaluations in this run yet. They appear as the bot evaluates signals (ETH, SOL, HYPE, etc.) and skips opening when thresholds aren’t met. Refresh after the bot has been running to see them.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {[...(paperResult.data.recentNoTrades ?? [])]
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map((ev, i) => (
                          <div key={`${ev.asset}-${ev.timestamp}-${i}`} className="rounded-lg border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 p-3 text-xs space-y-2">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-semibold">
                              <span className="text-amber-600 dark:text-amber-400">⏸️</span>
                              <span className="font-mono">{ev.asset}</span>
                              <span className={cn("uppercase", ev.direction === "long" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                {ev.direction}
                              </span>
                              <span className="text-muted-foreground font-normal">·</span>
                              <span className="text-muted-foreground font-normal truncate" title={ev.reason}>{ev.reason}</span>
                            </div>
                            <p className="text-muted-foreground">
                              <span className="font-medium text-foreground">Why no trade:</span> {ev.reason}
                            </p>
                            <div className="grid gap-x-4 gap-y-0.5 sm:grid-cols-3 font-mono text-[11px]">
                              <p>Strength {ev.strength.toFixed(0)}% (need {ev.minStrength}%)</p>
                              <p>Confidence {ev.confidence.toFixed(0)}% (need {ev.minConfidence}%)</p>
                              <p>Confirming {ev.confirmingCount} (need {ev.minConfirming})</p>
                            </div>
                            <p className="text-muted-foreground text-[11px]">
                              {new Date(ev.timestamp).toISOString().replace("T", " ").slice(0, 19)}Z
                            </p>
                          </div>
                        ))}
                    </div>
                  )}
                </DashboardCard>
                {/* ML & recorded data influence (ONNX, bandit, improvement report) — flagship: open AI interoperability */}
                <DashboardCard title="ML & recorded data influence">
                  {paperResult.data.mlStatus != null ? (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-primary/20 bg-primary/5 dark:bg-primary/10 px-3 py-2.5">
                        <p className="text-xs font-semibold text-foreground mb-1">What this is</p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          <strong className="text-foreground">ONNX</strong> (Open Neural Network Exchange) is the open format for AI model interoperability—founded by Meta and Microsoft, now a Linux Foundation project with broad adoption (Amazon, Apple, IBM, NVIDIA, Intel, AMD, Qualcomm). We use ONNX so the bot’s models (signal quality, position sizing, take-profit/stop-loss) are portable and trainable on your trade data. Paper trades → feature store → training → ONNX export → live inference; when no models are loaded, rule-based fallbacks keep the bot running.
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">ONNX models (4 possible)</p>
                        <p className="text-xs font-mono">
                          {paperResult.data.mlStatus.modelsLoaded.length > 0
                            ? paperResult.data.mlStatus.modelsLoaded.join(", ")
                            : "None loaded (rule-based fallbacks)"}
                        </p>
                        {paperResult.data.mlStatus.modelsLoaded.length === 0 ? (
                          <p className="text-xs text-muted-foreground mt-1">
                            The four slots: <span className="font-mono">signal_quality</span>, <span className="font-mono">position_sizing</span>, <span className="font-mono">tp_optimizer</span>, <span className="font-mono">sl_optimizer</span>. To enable: run training after 90+ closed trades, or add .onnx files to <span className="font-mono">.elizadb/vince-paper-bot/models/</span>.
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">
                            Signal quality threshold: {(paperResult.data.mlStatus.signalQualityThreshold * 100).toFixed(0)}%
                            {paperResult.data.mlStatus.suggestedMinStrength != null && ` · Suggested min strength: ${paperResult.data.mlStatus.suggestedMinStrength}%`}
                            {paperResult.data.mlStatus.suggestedMinConfidence != null && ` · Suggested min confidence: ${paperResult.data.mlStatus.suggestedMinConfidence}%`}
                            {paperResult.data.mlStatus.tpLevelSkipped != null && ` · TP level ${paperResult.data.mlStatus.tpLevelSkipped + 1} skipped (win rate from report)`}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Thompson Sampling (bandit)</p>
                        <p className="text-xs font-mono">
                          {paperResult.data.mlStatus.banditReady ? "Active" : "Not active"} · {paperResult.data.mlStatus.banditTradesProcessed} trades processed
                        </p>
                      </div>
                      {(paperResult.data.recentMLInfluences?.length ?? 0) > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Recent influence</p>
                          <div className="space-y-1.5 max-h-64 overflow-y-auto">
                            {[...(paperResult.data.recentMLInfluences ?? [])]
                              .sort((a, b) => b.timestamp - a.timestamp)
                              .map((ev, i) => (
                                <div key={`${ev.asset}-${ev.timestamp}-${i}`} className="rounded border border-border/50 px-2 py-1.5 text-xs">
                                  <span className={ev.type === "open" ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400"}>
                                    {ev.type === "open" ? "Opened" : "Rejected"}
                                  </span>
                                  <span className="font-mono ml-1">{ev.asset}</span>
                                  <span className="text-muted-foreground ml-1">· {ev.message}</span>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground py-4 text-sm">ML inference service not available. When ONNX and bandit are active, you’ll see models loaded, thresholds from the improvement report, and when recorded data influenced a reject or open.</p>
                  )}
                </DashboardCard>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center">
                <Bot className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">Could not load paper trading data</p>
                {paperResult?.error && <p className="text-sm text-muted-foreground mt-1">{paperResult.error}</p>}
              </div>
            )}
              </>
            </div>
          </TabsContent>

          {/* Knowledge tab: newly added knowledge overview + points leaderboard + referral */}
          <TabsContent value="knowledge" className="mt-6 flex-1 min-h-0 flex flex-col">
            {/* Knowledge overview: newly added files (weekly + all-time) */}
            {knowledgeLoading && !knowledgeResult?.data ? (
              <div className="h-32 bg-muted/50 rounded-xl animate-pulse mb-6" />
            ) : knowledgeResult?.data ? (
              <div className="mb-6 space-y-4">
                <DashboardCard title="Newly added knowledge">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">This week</p>
                      <p className="text-2xl font-mono font-bold">{knowledgeResult.data.weekly.count}</p>
                      <p className="text-xs text-muted-foreground mt-1">files added in the last 7 days</p>
                      {knowledgeResult.data.weekly.files.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground max-h-48 overflow-y-auto">
                          {knowledgeResult.data.weekly.files.map((f, i) => (
                            <li key={i} className="truncate" title={f.relativePath}>
                              {f.relativePath}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">All time</p>
                      <p className="text-2xl font-mono font-bold">{knowledgeResult.data.allTime.count}</p>
                      <p className="text-xs text-muted-foreground mt-1">files in knowledge base</p>
                      {knowledgeResult.data.allTime.files.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-muted-foreground max-h-48 overflow-y-auto">
                          {knowledgeResult.data.allTime.files.map((f, i) => (
                            <li key={i} className="truncate" title={f.relativePath}>
                              {f.relativePath}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </DashboardCard>
              </div>
            ) : null}

            <Tabs
              value={scope}
              onValueChange={(value) => setScope(value as "weekly" | "all_time")}
              className="flex flex-col flex-1 min-h-0"
            >
              <div className="flex items-center justify-between flex-shrink-0">
                <TabsList>
                  <TabsTrigger value="weekly">Weekly</TabsTrigger>
                  <TabsTrigger value="all_time">All-Time</TabsTrigger>
                </TabsList>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
                  Refresh
                </Button>
              </div>

          <TabsContent
            value="weekly"
            className="mt-6 flex-1 min-h-0 flex flex-col"
          >
            {error && !isLoading ? (
              <DashboardCard title="WEEKLY LEADERBOARD">
                <div className="text-center py-12">
                  <p className="text-destructive mb-2">
                    Error loading leaderboard
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {error instanceof Error ? error.message : "Unknown error"}
                  </p>
                  <Button onClick={() => refetch()} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </DashboardCard>
            ) : isLoading ? (
              <DashboardCard title="WEEKLY LEADERBOARD">
                <div className="space-y-4">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 animate-pulse"
                    >
                      <div className="h-8 w-8 bg-muted rounded" />
                      <div className="h-12 w-12 bg-muted rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/3" />
                        <div className="h-3 bg-muted rounded w-1/4" />
                      </div>
                      <div className="h-6 bg-muted rounded w-20" />
                    </div>
                  ))}
                </div>
              </DashboardCard>
            ) : rebels.length > 0 ? (
              <RebelsRanking rebels={rebels} maxHeight={leaderboardMaxHeight} />
            ) : (
              <DashboardCard title="WEEKLY LEADERBOARD">
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No rankings yet this week
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Complete actions to earn points and climb the leaderboard!
                  </p>
                </div>
              </DashboardCard>
            )}
          </TabsContent>

          <TabsContent
            value="all_time"
            className="mt-6 flex-1 min-h-0 flex flex-col"
          >
            {error && !isLoading ? (
              <DashboardCard title="ALL-TIME LEADERBOARD">
                <div className="text-center py-12">
                  <p className="text-destructive mb-2">
                    Error loading leaderboard
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">
                    {error instanceof Error ? error.message : "Unknown error"}
                  </p>
                  <Button onClick={() => refetch()} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retry
                  </Button>
                </div>
              </DashboardCard>
            ) : isLoading ? (
              <DashboardCard title="ALL-TIME LEADERBOARD">
                <div className="space-y-4">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 animate-pulse"
                    >
                      <div className="h-8 w-8 bg-muted rounded" />
                      <div className="h-12 w-12 bg-muted rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-muted rounded w-1/3" />
                        <div className="h-3 bg-muted rounded w-1/4" />
                      </div>
                      <div className="h-6 bg-muted rounded w-20" />
                    </div>
                  ))}
                </div>
              </DashboardCard>
            ) : rebels.length > 0 ? (
              <RebelsRanking rebels={rebels} maxHeight={leaderboardMaxHeight} />
            ) : (
              <DashboardCard title="ALL-TIME LEADERBOARD">
                <div className="text-center py-12">
                  <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No rankings yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Complete actions to earn points and climb the leaderboard!
                  </p>
                </div>
              </DashboardCard>
            )}
          </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>

        {/* User Rank Card - only when Knowledge tab */}
        {mainTab === "knowledge" && hasUserRank && (
          <div className="mt-6 mb-4 flex-shrink-0">
            <DashboardCard title="Your Rank">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold font-mono">
                    #{leaderboardData.userRank}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {scope === "weekly" ? "Weekly Ranking" : "All-Time Ranking"}
                  </div>
                </div>
                {/* Points are shown on user's account page - no userId in entries for privacy */}
              </div>
            </DashboardCard>
          </div>
        )}

        {/* Referral Link Card - requires authentication, only when Knowledge tab */}
        {mainTab === "knowledge" && agentId && (
          <DashboardCard title="Referral Link">
            {isLoadingReferral ? (
              <div className="space-y-3">
                <div className="h-10 bg-muted rounded animate-pulse" />
                <div className="h-9 bg-muted rounded w-32 animate-pulse" />
              </div>
            ) : referralData ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-lg border">
                    <div className="text-xs text-muted-foreground mb-1">
                      Your Referral Link
                    </div>
                    <div className="text-sm font-mono break-all">
                      {referralData.referralLink}
                    </div>
                  </div>
                  <Button
                    onClick={handleCopyReferralLink}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 mr-2 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Signups: </span>
                    <span className="font-semibold">
                      {referralData.stats.totalReferrals}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Activated: </span>
                    <span className="font-semibold">
                      {referralData.stats.activatedReferrals}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      Points Earned:{" "}
                    </span>
                    <span className="font-semibold">
                      {referralData.stats.totalPointsEarned.toLocaleString()}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share your referral link to earn points when friends sign up
                  and activate their accounts!
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  Unable to load referral code
                </p>
                <Button
                  onClick={() => refetchReferral()}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            )}
          </DashboardCard>
        )}
      </div>
    </DashboardPageLayout>
  );
}
