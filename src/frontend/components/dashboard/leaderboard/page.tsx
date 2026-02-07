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
import { Trophy, RefreshCw, Copy, Check, BarChart3, Flame, Newspaper, Bot, BookOpen, ExternalLink, Palette } from "lucide-react";
import { UUID } from "@elizaos/core";
import { cn } from "@/frontend/lib/utils";

const MANDO_MINUTES_URL = "https://www.mandominutes.com/Latest";

type MainTab = "knowledge" | "markets" | "memetics" | "news" | "more" | "trading_bot" | "digital_art";

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
  const [mainTab, setMainTab] = useState<MainTab>("trading_bot");
  const [scope, setScope] = useState<"weekly" | "all_time">("weekly");
  const [copied, setCopied] = useState(false);

  const { data: leaderboardsResult, isLoading: leaderboardsLoading, refetch: refetchLeaderboards, isFetching: leaderboardsFetching } = useQuery({
    queryKey: ["leaderboards", leaderboardsAgentId],
    queryFn: () => fetchLeaderboardsWithError(leaderboardsAgentId),
    enabled: (mainTab === "markets" || mainTab === "memetics" || mainTab === "news" || mainTab === "more" || mainTab === "digital_art") && !!leaderboardsAgentId,
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
        ? "HIP-3 and HL Crypto (perps) — no need to ask VINCE"
        : mainTab === "memetics"
          ? "Memes (Solana) and Meteora LP"
          : mainTab === "news"
            ? "MandoMinutes headlines with TLDR and deep dive"
            : mainTab === "more"
              ? "Fear & Greed, Options, Binance Intel, CoinGlass, Deribit skew, Sanbase, Nansen, Cross-venue funding, OI cap, Alerts"
              : mainTab === "digital_art"
                ? "Curated NFT collections — floor prices and thin-floor opportunities"
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
              <TabsTrigger value="trading_bot">Trading Bot</TabsTrigger>
              <TabsTrigger value="news">News</TabsTrigger>
              <TabsTrigger value="markets">Markets</TabsTrigger>
              <TabsTrigger value="knowledge">Knowledge</TabsTrigger>
              <TabsTrigger value="memetics">Memetics</TabsTrigger>
              <TabsTrigger value="digital_art">Digital Art</TabsTrigger>
              <TabsTrigger value="more">More</TabsTrigger>
            </TabsList>
            {(mainTab === "markets" || mainTab === "memetics" || mainTab === "news" || mainTab === "more" || mainTab === "digital_art") && (
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
                    HIP-3 and HL Crypto (perps) — always here. Open this page anytime; no need to ask VINCE.
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

                  {/* HL Crypto: full width like HIP-3, stacked categories for full-width tables */}
                  {leaderboardsData.hlCrypto && (() => {
                    const hl = leaderboardsData.hlCrypto;
                    const categories: { label: string; rows: typeof hl.topMovers }[] = [];
                    if ((hl.allTickers?.length ?? 0) > 0) {
                      categories.push({ label: "All HL tickers", rows: hl.allTickers! });
                    }
                    if ((hl.openInterestLeaders?.length ?? 0) > 0) {
                      categories.push({ label: "Open interest leaders", rows: hl.openInterestLeaders! });
                    }
                    if ((hl.crowdedLongs?.length ?? 0) > 0) {
                      categories.push({ label: "Crowded longs", rows: hl.crowdedLongs! });
                    }
                    if ((hl.crowdedShorts?.length ?? 0) > 0) {
                      categories.push({ label: "Crowded shorts", rows: hl.crowdedShorts! });
                    }
                    return (
                      <div className="lg:col-span-2">
                        <MarketLeaderboardSection
                          title={hl.title}
                          subtitle={`Hottest avg ${(hl.hottestAvg ?? 0) >= 0 ? "+" : ""}${(hl.hottestAvg ?? 0).toFixed(2)}% · Coldest ${(hl.coldestAvg ?? 0).toFixed(2)}%`}
                          topMovers={hl.topMovers ?? []}
                          volumeLeaders={hl.volumeLeaders ?? []}
                          oneLiner={hl.oneLiner}
                          bias={hl.bias}
                          categories={categories.length > 0 ? categories : undefined}
                          categoriesLayout="stack"
                        />
                      </div>
                    );
                  })()}

                </div>

                {!leaderboardsData.hip3 && !leaderboardsData.hlCrypto && (
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

          {/* Memetics tab: Memes (Solana) + Meteora LP */}
          <TabsContent value="memetics" className="mt-6 flex-1 min-h-0 overflow-auto">
            {(leaderboardsLoading || leaderboardsFetching) ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="h-48 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : leaderboardsData ? (
              <div className="space-y-8">
                <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 border border-border/50 px-4 py-3">
                  <p className="text-sm font-medium text-foreground/90">
                    Memes (Solana), Meteora LP, and Watchlist — memetics-focused views.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {leaderboardsData.updatedAt != null
                      ? `Updated ${new Date(leaderboardsData.updatedAt).toLocaleTimeString()}`
                      : "Live data"}
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Memes: full hot + ape + watch + avoid — clean layout, no duplicates */}
                  {leaderboardsData.memes && (() => {
                    const hot = leaderboardsData.memes.hot ?? [];
                    const ape = leaderboardsData.memes.ape ?? [];
                    const apeSymbols = new Set(ape.map((r) => r.symbol));
                    const hotOnly = hot.filter((r) => !apeSymbols.has(r.symbol));
                    const formatMcap = (v: number) =>
                      v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `$${(v / 1e3).toFixed(0)}K` : `$${v.toFixed(0)}`;
                    const formatChange = (n: number) => (n >= 0 ? `+${n.toFixed(1)}%` : `${n.toFixed(1)}%`);

                    return (
                      <DashboardCard title={leaderboardsData.memes.title} className="lg:col-span-2">
                        <div className="rounded-lg bg-muted/40 dark:bg-muted/20 px-4 py-2.5 mb-5">
                          <p className="text-sm font-medium text-foreground/95">{leaderboardsData.memes.moodSummary ?? ""}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Mood: {leaderboardsData.memes.mood ?? "—"}</p>
                        </div>
                        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                              <Flame className="w-3.5 h-3.5" /> Hot (≥21%)
                            </div>
                            <div className="rounded-md border border-border/60 overflow-hidden">
                              <table className="w-full text-sm">
                                <tbody>
                                  {hotOnly.slice(0, 6).map((r) => (
                                    <tr key={r.symbol} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                                      <td className="py-2 px-3 font-medium">{r.symbol}</td>
                                      <td className="py-2 px-3 text-right">
                                        <span
                                            className={cn(
                                              "tabular-nums font-medium",
                                              (r.change24h ?? 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
                                            )}>
                                          {formatChange(r.change24h ?? 0)}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                  {hotOnly.length === 0 && (
                                    <tr>
                                      <td colSpan={2} className="py-3 px-3 text-muted-foreground text-sm">—</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                              Ape
                            </div>
                            <div className="rounded-md border border-border/60 overflow-hidden">
                              <table className="w-full text-sm">
                                <tbody>
                                  {ape.slice(0, 6).map((r) => (
                                    <tr key={r.symbol} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                                      <td className="py-2 px-3 font-medium">{r.symbol}</td>
                                      <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">
                                        {r.marketCap != null && formatMcap(r.marketCap)}
                                        {r.volumeLiquidityRatio != null && ` · ${r.volumeLiquidityRatio.toFixed(1)}x`}
                                      </td>
                                    </tr>
                                  ))}
                                  {ape.length === 0 && (
                                    <tr>
                                      <td colSpan={2} className="py-3 px-3 text-muted-foreground text-sm">—</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                              Watch
                            </div>
                            <div className="rounded-md border border-border/60 overflow-hidden">
                              <table className="w-full text-sm">
                                <tbody>
                                  {(leaderboardsData.memes.watch ?? []).slice(0, 6).map((r) => (
                                    <tr key={r.symbol} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                                      <td className="py-2 px-3 font-medium">{r.symbol}</td>
                                      <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">
                                        {r.volumeLiquidityRatio != null ? `${r.volumeLiquidityRatio.toFixed(1)}x` : "—"}
                                      </td>
                                    </tr>
                                  ))}
                                  {(leaderboardsData.memes.watch?.length ?? 0) === 0 && (
                                    <tr>
                                      <td colSpan={2} className="py-3 px-3 text-muted-foreground text-sm">—</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      </DashboardCard>
                    );
                  })()}

                  {/* Meteora: APY-ranked table + top TVL + meme LP opportunities */}
                  {leaderboardsData.meteora && (leaderboardsData.meteora.topPools?.length ?? 0) > 0 && (() => {
                    const topPools = leaderboardsData.meteora!.topPools ?? [];
                    const memePools = leaderboardsData.meteora!.memePools ?? [];
                    const allPoolsByApy = leaderboardsData.meteora!.allPoolsByApy ?? [];
                    const topNames = new Set(topPools.map((p) => p.name));
                    const memeOnly = memePools.filter((p) => !topNames.has(p.name)).slice(0, 8);

                    const poolKey = (p: { id?: string; name: string }) => p.id ?? p.name;

                    const PoolTable = ({ pools, emptyMsg }: { pools: typeof topPools; emptyMsg: string }) => (
                      <div className="rounded-md border border-border/60 overflow-hidden">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50">
                              <th className="text-left py-2 px-3 font-medium">Pair</th>
                              <th className="text-right py-2 px-3 font-medium">TVL</th>
                              <th className="text-right py-2 px-3 font-medium w-12">bp</th>
                              <th className="text-right py-2 px-3 font-medium">APY</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pools.map((p) => (
                              <tr key={poolKey(p)} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                                <td className="py-2 px-3 font-medium">{p.name}</td>
                                <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">{p.tvlFormatted}</td>
                                <td className="py-2 px-3 text-right text-muted-foreground tabular-nums text-xs">
                                  {p.binWidth != null ? (p.binWidth * 100).toFixed(0) : "—"}
                                </td>
                                <td className="py-2 px-3 text-right tabular-nums font-medium text-green-600 dark:text-green-400">
                                  {p.apy != null ? `${(p.apy * 100).toFixed(1)}%` : "—"}
                                </td>
                              </tr>
                            ))}
                            {pools.length === 0 && (
                              <tr>
                                <td colSpan={4} className="py-4 px-3 text-muted-foreground text-center text-sm">{emptyMsg}</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    );

                    return (
                      <DashboardCard title={leaderboardsData.meteora!.title} className="lg:col-span-2">
                        <div className="rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 px-4 py-2.5 mb-5">
                          <p className="text-sm font-medium text-foreground/95">{leaderboardsData.meteora!.oneLiner ?? ""}</p>
                        </div>
                        {allPoolsByApy.length > 0 && (
                          <div className="space-y-2 mb-6">
                            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                              All pools ranked by APY (highest first)
                            </div>
                            <div className="rounded-md border border-border/60 overflow-hidden">
                              <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-muted/95 backdrop-blur">
                                  <tr className="bg-muted/50">
                                    <th className="text-left py-2 px-3 font-medium w-12">Rank</th>
                                    <th className="text-left py-2 px-3 font-medium">Pair</th>
                                    <th className="text-right py-2 px-3 font-medium">APY</th>
                                    <th className="text-right py-2 px-3 font-medium">TVL</th>
                                    <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">Table / note</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {allPoolsByApy.map((p, i) => (
                                    <tr key={poolKey(p)} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                                      <td className="py-2 px-3 font-medium tabular-nums">{i + 1}</td>
                                      <td className="py-2 px-3 font-medium">{p.name}</td>
                                      <td className="py-2 px-3 text-right tabular-nums font-medium text-green-600 dark:text-green-400">
                                        {p.apy != null ? `${(p.apy * 100).toFixed(1)}%` : "—"}
                                      </td>
                                      <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">{p.tvlFormatted}</td>
                                      <td className="py-2 px-3 text-muted-foreground text-xs">{p.category ?? "—"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                        <div className="grid gap-6 lg:grid-cols-2">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                              <BarChart3 className="w-3.5 h-3.5" /> Top pools by TVL
                            </div>
                            <PoolTable pools={topPools.slice(0, 10)} emptyMsg="—" />
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                              Meme LP opportunities (high vol/TVL)
                            </div>
                            <PoolTable
                              pools={memeOnly}
                              emptyMsg="No extra meme pools beyond top TVL — all high-activity pools are above."
                            />
                          </div>
                        </div>
                      </DashboardCard>
                    );
                  })()}

                  {/* Left Curve (MandoMinutes) */}
                  {leaderboardsData.memes?.leftcurve && (leaderboardsData.memes.leftcurve.headlines?.length ?? 0) > 0 && (
                    <DashboardCard title={leaderboardsData.memes.leftcurve.title} className="lg:col-span-2">
                      <ul className="space-y-2 text-sm max-h-[40vh] overflow-y-auto pr-1">
                        {leaderboardsData.memes.leftcurve.headlines.map((h, i) => (
                          <li key={i} className="flex gap-2 items-start">
                            <span className="flex-1 line-clamp-2">{h.text}</span>
                            {h.url && (
                              <a
                                href={h.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 text-primary hover:underline flex items-center gap-1 text-xs"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Deep dive
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    </DashboardCard>
                  )}
                  {/* Watchlist */}
                  {leaderboardsData.more?.watchlist && (leaderboardsData.more.watchlist.tokens?.length ?? 0) > 0 && (
                    <DashboardCard title="Watchlist" className="lg:col-span-2">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 font-medium">Symbol</th>
                              <th className="text-left py-2 font-medium">Chain</th>
                              <th className="text-left py-2 font-medium">Priority</th>
                              <th className="text-right py-2 font-medium">Target Mcap</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(leaderboardsData.more.watchlist.tokens ?? []).map((t) => (
                              <tr key={t.symbol} className="border-b border-border/50">
                                <td className="py-1.5 font-medium">{t.symbol}</td>
                                <td className="py-1.5 text-muted-foreground">{t.chain ?? "—"}</td>
                                <td className="py-1.5 text-muted-foreground">{t.priority ?? "—"}</td>
                                <td className="py-1.5 text-right font-mono">{t.targetMcap != null ? `$${(t.targetMcap / 1e6).toFixed(1)}M` : "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </DashboardCard>
                  )}
                </div>

                {!leaderboardsData.memes && !leaderboardsData.meteora && !(leaderboardsData.more?.watchlist && (leaderboardsData.more.watchlist.tokens?.length ?? 0) > 0) && (
                  <p className="text-center text-muted-foreground py-8">No memetics data available. Try again in a moment.</p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center space-y-3 min-h-[200px] flex flex-col justify-center">
                <p className="font-medium text-foreground">Could not load memetics data</p>
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

          {/* Digital Art tab: curated NFT collections — floor prices and thin-floor opportunities */}
          <TabsContent value="digital_art" className="mt-6 flex-1 min-h-0 overflow-auto">
            {(leaderboardsLoading || leaderboardsFetching) && !leaderboardsData?.digitalArt ? (
              <div className="space-y-4">
                <div className="h-24 bg-muted/50 rounded-xl animate-pulse" />
                <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
              </div>
            ) : leaderboardsData?.digitalArt ? (
              <div className="space-y-6">
                <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 border border-border/50 px-4 py-3">
                  <p className="text-sm font-medium text-foreground/90">{leaderboardsData.digitalArt.oneLiner}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {leaderboardsData.updatedAt != null
                      ? `Updated ${new Date(leaderboardsData.updatedAt).toLocaleTimeString()}`
                      : "Live data"}
                  </p>
                </div>
                <DashboardCard title={leaderboardsData.digitalArt.title}>
                  {(leaderboardsData.digitalArt.collections ?? []).length > 0 ? (
                    <div className="rounded-md border border-border/60 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/60 bg-muted/30">
                            <th className="py-2.5 px-3 text-left font-semibold">Collection</th>
                            <th className="py-2.5 px-3 text-right font-semibold">Floor (ETH)</th>
                            <th className="py-2.5 px-3 text-right font-semibold">Thickness</th>
                            <th className="py-2.5 px-2 text-right font-semibold">2nd</th>
                            <th className="py-2.5 px-2 text-right font-semibold">3rd</th>
                            <th className="py-2.5 px-2 text-right font-semibold">4th</th>
                            <th className="py-2.5 px-2 text-right font-semibold">5th</th>
                            <th className="py-2.5 px-2 text-right font-semibold">6th</th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboardsData.digitalArt.collections.map((c) => {
                            const g = c.gaps ?? { to2nd: 0, to3rd: 0, to4th: 0, to5th: 0, to6th: 0 };
                            const fmt = (v: number) => (v > 0 ? `${v.toFixed(3)} ETH` : "—");
                            return (
                              <tr key={c.slug} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                                <td className="py-2 px-3 font-medium">{c.name}</td>
                                <td className="py-2 px-3 text-right tabular-nums">{c.floorPrice.toFixed(2)}</td>
                                <td className="py-2 px-3 text-right capitalize">{c.floorThickness}</td>
                                <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">{fmt(g.to2nd)}</td>
                                <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">{fmt(g.to3rd)}</td>
                                <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">{fmt(g.to4th)}</td>
                                <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">{fmt(g.to5th)}</td>
                                <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">{fmt(g.to6th)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground py-6">No NFT data yet. Set OPENSEA_API_KEY for curated collection floor prices.</p>
                  )}
                </DashboardCard>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center">
                <Palette className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">No Digital Art data</p>
                <p className="text-sm text-muted-foreground mt-1">Switch to Markets to load data, or set OPENSEA_API_KEY for NFT floor prices.</p>
              </div>
            )}
          </TabsContent>

          {/* More tab: Fear & Greed, Options, Binance Intel, CoinGlass, Deribit skew, Sanbase, Nansen, Cross-venue funding, OI cap, Alerts */}
          <TabsContent value="more" className="mt-6 flex-1 min-h-0 overflow-auto">
            {(leaderboardsLoading || leaderboardsFetching) && !leaderboardsData?.more ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="h-32 bg-muted/50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : leaderboardsData?.more ? (
              <div className="space-y-6">
                <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 border border-border/50 px-4 py-3">
                  <p className="text-sm font-medium text-foreground/90">
                    Fear & Greed, Options, Binance Intel, CoinGlass, Deribit skew, Sanbase, Nansen, Cross-venue funding, OI cap, Alerts
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {leaderboardsData.updatedAt != null
                      ? `Updated ${new Date(leaderboardsData.updatedAt).toLocaleTimeString()}`
                      : "Live data"}
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Fear & Greed */}
                  {leaderboardsData.more.fearGreed && (
                    <DashboardCard title="Fear & Greed">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full border-4 border-primary/30 flex items-center justify-center text-xl font-bold">
                          {leaderboardsData.more.fearGreed.value}
                        </div>
                        <div>
                          <p className="font-medium capitalize">{leaderboardsData.more.fearGreed.label}</p>
                          <p className="text-xs text-muted-foreground">{leaderboardsData.more.fearGreed.classification}</p>
                        </div>
                      </div>
                    </DashboardCard>
                  )}

                  {/* Options DVOL + TLDR */}
                  {leaderboardsData.more.options && (
                    <DashboardCard title="Options (Deribit)">
                      <div className="space-y-3">
                        <div className="flex gap-4 text-sm">
                          {leaderboardsData.more.options.btcDvol != null && (
                            <span className="font-mono">BTC DVOL: {leaderboardsData.more.options.btcDvol.toFixed(1)}%</span>
                          )}
                          {leaderboardsData.more.options.ethDvol != null && (
                            <span className="font-mono">ETH DVOL: {leaderboardsData.more.options.ethDvol.toFixed(1)}%</span>
                          )}
                        </div>
                        {leaderboardsData.more.options.btcTldr && (
                          <p className="text-xs text-muted-foreground">{leaderboardsData.more.options.btcTldr}</p>
                        )}
                        {leaderboardsData.more.options.ethTldr && (
                          <p className="text-xs text-muted-foreground">{leaderboardsData.more.options.ethTldr}</p>
                        )}
                      </div>
                    </DashboardCard>
                  )}

                  {/* Cross-venue funding */}
                  {leaderboardsData.more.crossVenue && (leaderboardsData.more.crossVenue.assets?.length ?? 0) > 0 && (
                    <DashboardCard title="Cross-venue funding" className="lg:col-span-2">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 font-medium">Coin</th>
                              <th className="text-right py-2 font-medium">HL</th>
                              <th className="text-right py-2 font-medium">CEX</th>
                              <th className="text-left py-2 font-medium">Arb</th>
                            </tr>
                          </thead>
                          <tbody>
                            {leaderboardsData.more.crossVenue.assets.map((a) => (
                              <tr key={a.coin} className="border-b border-border/50">
                                <td className="py-1.5 font-medium">{a.coin}</td>
                                <td className="py-1.5 text-right font-mono">{a.hlFunding != null ? (a.hlFunding * 100).toFixed(4) + "%" : "—"}</td>
                                <td className="py-1.5 text-right font-mono">{a.cexFunding != null ? (a.cexFunding * 100).toFixed(4) + "%" : "—"}</td>
                                <td className="py-1.5 text-muted-foreground">{a.arb ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {leaderboardsData.more.crossVenue.arbOpportunities?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Arb: {leaderboardsData.more.crossVenue.arbOpportunities.join(", ")}
                        </p>
                      )}
                    </DashboardCard>
                  )}

                  {/* OI cap */}
                  {leaderboardsData.more.oiCap && leaderboardsData.more.oiCap.length > 0 && (
                    <DashboardCard title="Perps at OI cap">
                      <ul className="flex flex-wrap gap-2">
                        {leaderboardsData.more.oiCap.map((s) => (
                          <li key={s} className="px-2 py-1 rounded bg-muted/50 text-sm font-mono">{s}</li>
                        ))}
                      </ul>
                    </DashboardCard>
                  )}

                  {/* Regime */}
                  {leaderboardsData.more.regime && (leaderboardsData.more.regime.btc || leaderboardsData.more.regime.eth) && (
                    <DashboardCard title="Market regime">
                      <div className="flex gap-4 text-sm">
                        {leaderboardsData.more.regime.btc && <span>BTC: {leaderboardsData.more.regime.btc}</span>}
                        {leaderboardsData.more.regime.eth && <span>ETH: {leaderboardsData.more.regime.eth}</span>}
                      </div>
                    </DashboardCard>
                  )}

                  {/* Binance Intelligence */}
                  {leaderboardsData.more.binanceIntel && (
                    <DashboardCard title="Binance Intelligence">
                      <div className="space-y-2 text-sm">
                        <div className="flex gap-4">
                          {leaderboardsData.more.binanceIntel.topTraderRatio != null && (
                            <span className="font-mono">Top L/S: {leaderboardsData.more.binanceIntel.topTraderRatio.toFixed(2)}</span>
                          )}
                          {leaderboardsData.more.binanceIntel.takerBuySellRatio != null && (
                            <span className="font-mono">Taker B/S: {leaderboardsData.more.binanceIntel.takerBuySellRatio.toFixed(2)}</span>
                          )}
                        </div>
                        {leaderboardsData.more.binanceIntel.fundingExtreme && (
                          <p className="text-amber-600 dark:text-amber-400 text-xs">
                            Funding extreme: {leaderboardsData.more.binanceIntel.fundingDirection ?? "—"}
                          </p>
                        )}
                        {(leaderboardsData.more.binanceIntel.bestLong || leaderboardsData.more.binanceIntel.bestShort) && (
                          <p className="text-xs text-muted-foreground">
                            Cross-ex: spread {leaderboardsData.more.binanceIntel.crossExchangeSpread != null ? (leaderboardsData.more.binanceIntel.crossExchangeSpread * 100).toFixed(4) + "%" : "—"}
                            {leaderboardsData.more.binanceIntel.bestLong && ` · Long ${leaderboardsData.more.binanceIntel.bestLong}`}
                            {leaderboardsData.more.binanceIntel.bestShort && ` · Short ${leaderboardsData.more.binanceIntel.bestShort}`}
                          </p>
                        )}
                      </div>
                    </DashboardCard>
                  )}

                  {/* CoinGlass Extended */}
                  {leaderboardsData.more.coinglassExtended && (leaderboardsData.more.coinglassExtended.funding?.length > 0 || leaderboardsData.more.coinglassExtended.longShort?.length > 0 || leaderboardsData.more.coinglassExtended.openInterest?.length > 0) && (
                    <DashboardCard title="CoinGlass Extended" className="lg:col-span-2">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 font-medium">Asset</th>
                              <th className="text-right py-2 font-medium">Funding</th>
                              <th className="text-right py-2 font-medium">L/S</th>
                              <th className="text-right py-2 font-medium">OI</th>
                              <th className="text-right py-2 font-medium">OI Δ24h</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const fundingMap = new Map((leaderboardsData.more.coinglassExtended?.funding ?? []).map((f) => [f.asset, f.rate]));
                              const lsMap = new Map((leaderboardsData.more.coinglassExtended?.longShort ?? []).map((ls) => [ls.asset, ls.ratio]));
                              const oiMap = new Map((leaderboardsData.more.coinglassExtended?.openInterest ?? []).map((oi) => [oi.asset, oi]));
                              const assets = [...new Set([...fundingMap.keys(), ...lsMap.keys(), ...oiMap.keys()])].slice(0, 10);
                              return assets.map((asset) => {
                                const rate = fundingMap.get(asset);
                                const ratio = lsMap.get(asset);
                                const oi = oiMap.get(asset);
                                return (
                                  <tr key={asset} className="border-b border-border/50">
                                    <td className="py-1.5 font-medium">{asset}</td>
                                    <td className="py-1.5 text-right font-mono">{rate != null ? (rate * 100).toFixed(4) + "%" : "—"}</td>
                                    <td className="py-1.5 text-right font-mono">{ratio != null ? ratio.toFixed(2) : "—"}</td>
                                    <td className="py-1.5 text-right font-mono">{oi != null ? `$${(oi.value / 1e9).toFixed(2)}B` : "—"}</td>
                                    <td className="py-1.5 text-right font-mono">{oi?.change24h != null ? (oi.change24h >= 0 ? "+" : "") + oi.change24h.toFixed(1) + "%" : "—"}</td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </div>
                    </DashboardCard>
                  )}

                  {/* Deribit IV Skew */}
                  {leaderboardsData.more.deribitSkew && (leaderboardsData.more.deribitSkew.btc || leaderboardsData.more.deribitSkew.eth) && (
                    <DashboardCard title="Deribit IV Skew">
                      <div className="flex gap-4 text-sm">
                        {leaderboardsData.more.deribitSkew.btc && (
                          <span>
                            BTC: <span className={cn("font-medium", leaderboardsData.more.deribitSkew.btc.skewInterpretation === "fearful" && "text-amber-600 dark:text-amber-400", leaderboardsData.more.deribitSkew.btc.skewInterpretation === "bullish" && "text-green-600 dark:text-green-400")}>{leaderboardsData.more.deribitSkew.btc.skewInterpretation}</span>
                          </span>
                        )}
                        {leaderboardsData.more.deribitSkew.eth && (
                          <span>
                            ETH: <span className={cn("font-medium", leaderboardsData.more.deribitSkew.eth.skewInterpretation === "fearful" && "text-amber-600 dark:text-amber-400", leaderboardsData.more.deribitSkew.eth.skewInterpretation === "bullish" && "text-green-600 dark:text-green-400")}>{leaderboardsData.more.deribitSkew.eth.skewInterpretation}</span>
                          </span>
                        )}
                      </div>
                    </DashboardCard>
                  )}

                  {/* Sanbase On-Chain */}
                  {leaderboardsData.more.sanbaseOnChain && (leaderboardsData.more.sanbaseOnChain.btc || leaderboardsData.more.sanbaseOnChain.eth) && (
                    <DashboardCard title="Sanbase On-Chain">
                      <div className="space-y-3 text-sm">
                        {leaderboardsData.more.sanbaseOnChain.btc && (
                          <div>
                            <p className="font-medium mb-1">BTC</p>
                            <p className="text-xs text-muted-foreground">Flows: {leaderboardsData.more.sanbaseOnChain.btc.flows} · Whales: {leaderboardsData.more.sanbaseOnChain.btc.whales}</p>
                            <p className="text-xs mt-0.5">{leaderboardsData.more.sanbaseOnChain.btc.tldr}</p>
                          </div>
                        )}
                        {leaderboardsData.more.sanbaseOnChain.eth && (
                          <div>
                            <p className="font-medium mb-1">ETH</p>
                            <p className="text-xs text-muted-foreground">Flows: {leaderboardsData.more.sanbaseOnChain.eth.flows} · Whales: {leaderboardsData.more.sanbaseOnChain.eth.whales}</p>
                            <p className="text-xs mt-0.5">{leaderboardsData.more.sanbaseOnChain.eth.tldr}</p>
                          </div>
                        )}
                      </div>
                    </DashboardCard>
                  )}

                  {/* Nansen Smart Money */}
                  {leaderboardsData.more.nansenSmartMoney && (leaderboardsData.more.nansenSmartMoney.tokens?.length > 0 || leaderboardsData.more.nansenSmartMoney.creditRemaining != null) && (
                    <DashboardCard title="Nansen Smart Money" className="lg:col-span-2">
                      {leaderboardsData.more.nansenSmartMoney.creditRemaining != null && (
                        <p className="text-xs text-muted-foreground mb-2">Credits: {leaderboardsData.more.nansenSmartMoney.creditRemaining}/100</p>
                      )}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 font-medium">Symbol</th>
                              <th className="text-left py-2 font-medium">Chain</th>
                              <th className="text-right py-2 font-medium">Net Flow</th>
                              <th className="text-right py-2 font-medium">Buy Vol</th>
                              <th className="text-right py-2 font-medium">24h %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(leaderboardsData.more.nansenSmartMoney.tokens ?? []).map((t) => (
                              <tr key={`${t.symbol}-${t.chain}`} className="border-b border-border/50">
                                <td className="py-1.5 font-medium">{t.symbol}</td>
                                <td className="py-1.5 text-muted-foreground">{t.chain}</td>
                                <td className="py-1.5 text-right font-mono">${(t.netFlow / 1000).toFixed(1)}K</td>
                                <td className="py-1.5 text-right font-mono">${(t.buyVolume / 1000).toFixed(1)}K</td>
                                <td className={cn("py-1.5 text-right font-mono", t.priceChange24h >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400")}>
                                  {(t.priceChange24h >= 0 ? "+" : "") + t.priceChange24h.toFixed(1)}%
                                </td>
                              </tr>
                            ))}
                            {(leaderboardsData.more.nansenSmartMoney.tokens ?? []).length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-4 text-center text-muted-foreground text-xs">No smart money tokens</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </DashboardCard>
                  )}

                  {/* Alerts */}
                  {leaderboardsData.more.alerts && (
                    <DashboardCard title="Alerts" className="lg:col-span-2">
                      <div className="flex gap-4 text-sm mb-3">
                        <span>Total: {leaderboardsData.more.alerts.total}</span>
                        <span>Unread: {leaderboardsData.more.alerts.unread}</span>
                        <span className="text-amber-600 dark:text-amber-400">High: {leaderboardsData.more.alerts.highPriority}</span>
                      </div>
                      <ul className="space-y-2 max-h-48 overflow-y-auto">
                        {(leaderboardsData.more.alerts.items ?? []).map((a, i) => (
                          <li key={i} className="rounded border border-border/50 px-3 py-2 text-xs">
                            <span className="font-medium">{a.type}</span> · {a.title} — {a.message}
                            <span className="block text-muted-foreground mt-0.5">{new Date(a.timestamp).toLocaleString()}</span>
                          </li>
                        ))}
                        {(leaderboardsData.more.alerts.items ?? []).length === 0 && (
                          <li className="text-muted-foreground">No alerts</li>
                        )}
                      </ul>
                    </DashboardCard>
                  )}

                </div>

                {!leaderboardsData.more.fearGreed &&
                  !leaderboardsData.more.options &&
                  !leaderboardsData.more.crossVenue &&
                  !leaderboardsData.more.oiCap &&
                  !leaderboardsData.more.alerts &&
                  !leaderboardsData.more.regime &&
                  !leaderboardsData.more.binanceIntel &&
                  !leaderboardsData.more.coinglassExtended &&
                  !leaderboardsData.more.deribitSkew &&
                  !leaderboardsData.more.sanbaseOnChain &&
                  !leaderboardsData.more.nansenSmartMoney && (
                  <p className="text-center text-muted-foreground py-8">No MORE data available. Try again in a moment.</p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center space-y-3 min-h-[200px] flex flex-col justify-center">
                <p className="font-medium text-foreground">Could not load MORE data</p>
                <p className="text-sm text-muted-foreground">Make sure VINCE is running, then click Refresh above.</p>
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

                {/* Goal Progress */}
                {paperResult.data.goalProgress && (
                  <DashboardCard title="Goal progress">
                    <div className="space-y-4">
                      {paperResult.data.goalTargets && (
                        <div className="text-xs text-muted-foreground">
                          Targets: ${paperResult.data.goalTargets.daily}/day · ${paperResult.data.goalTargets.monthly.toLocaleString()}/mo
                        </div>
                      )}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Daily</p>
                          <p className="font-mono">
                            ${paperResult.data.goalProgress.daily.current.toFixed(0)} / ${paperResult.data.goalProgress.daily.target.toFixed(0)}
                            <span className="ml-1 text-muted-foreground">({paperResult.data.goalProgress.daily.pct.toFixed(0)}%)</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Remaining ${paperResult.data.goalProgress.daily.remaining.toFixed(0)} · {paperResult.data.goalProgress.daily.pace}
                            {paperResult.data.goalProgress.daily.paceAmount !== 0 && (
                              <span className={cn("ml-1", paperResult.data.goalProgress.daily.paceAmount >= 0 ? "text-green-600 dark:text-green-400" : "text-amber-600 dark:text-amber-400")}>
                                ({paperResult.data.goalProgress.daily.paceAmount >= 0 ? "+" : ""}${paperResult.data.goalProgress.daily.paceAmount.toFixed(0)} vs expected)
                              </span>
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Monthly</p>
                          <p className="font-mono">
                            ${paperResult.data.goalProgress.monthly.current.toFixed(0)} / ${paperResult.data.goalProgress.monthly.target.toFixed(0)}
                            <span className="ml-1 text-muted-foreground">({paperResult.data.goalProgress.monthly.pct.toFixed(0)}%)</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Remaining ${paperResult.data.goalProgress.monthly.remaining.toFixed(0)} · {paperResult.data.goalProgress.monthly.status}
                            {paperResult.data.goalProgress.monthly.dailyTargetToHitGoal != null && paperResult.data.goalProgress.monthly.status === "behind" && (
                              <span className="block mt-0.5 text-amber-600 dark:text-amber-400">
                                Need ${paperResult.data.goalProgress.monthly.dailyTargetToHitGoal.toFixed(0)}/day to hit goal
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </DashboardCard>
                )}

                {/* Signal Sources */}
                {paperResult.data.signalStatus && (
                  <DashboardCard title="Signal sources">
                    <div className="space-y-3">
                      <div className="flex gap-4 text-sm">
                        <span className="font-mono">Signals: {paperResult.data.signalStatus.signalCount}</span>
                        <span className="text-muted-foreground">
                          Last update: {paperResult.data.signalStatus.lastUpdate
                            ? new Date(paperResult.data.signalStatus.lastUpdate).toLocaleTimeString()
                            : "—"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {(paperResult.data.signalStatus.dataSources ?? []).map((ds) => (
                          <span
                            key={ds.name}
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
                              ds.available ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-red-500/10 text-red-700 dark:text-red-400",
                            )}
                          >
                            {ds.available ? "✓" : "✗"} {ds.name}
                          </span>
                        ))}
                        {(paperResult.data.signalStatus.dataSources ?? []).length === 0 && (
                          <span className="text-muted-foreground text-sm">No data sources</span>
                        )}
                      </div>
                    </div>
                  </DashboardCard>
                )}

                {/* Thompson Sampling (Bandit) Sources */}
                {paperResult.data.banditSummary && (
                  <DashboardCard title="Thompson Sampling (Bandit) sources">
                    <div className="space-y-4">
                      <p className="text-sm font-mono">Total trades processed: {paperResult.data.banditSummary.totalTrades}</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Top 3 sources</p>
                          <ul className="space-y-1">
                            {(paperResult.data.banditSummary.topSources ?? []).map((s) => (
                              <li key={s.source} className="flex justify-between text-sm">
                                <span>{s.source}</span>
                                <span className="font-mono text-green-600 dark:text-green-400">{(s.winRate * 100).toFixed(1)}%</span>
                              </li>
                            ))}
                            {(paperResult.data.banditSummary.topSources ?? []).length === 0 && <li className="text-muted-foreground">—</li>}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Bottom 3 sources</p>
                          <ul className="space-y-1">
                            {(paperResult.data.banditSummary.bottomSources ?? []).map((s) => (
                              <li key={s.source} className="flex justify-between text-sm">
                                <span>{s.source}</span>
                                <span className="font-mono text-amber-600 dark:text-amber-400">{(s.winRate * 100).toFixed(1)}%</span>
                              </li>
                            ))}
                            {(paperResult.data.banditSummary.bottomSources ?? []).length === 0 && <li className="text-muted-foreground">—</li>}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </DashboardCard>
                )}

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
