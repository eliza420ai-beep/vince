import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardPageLayout from "@/frontend/components/dashboard/layout";
import RebelsRanking from "@/frontend/components/dashboard/rebels-ranking";
import DashboardCard from "@/frontend/components/dashboard/card";
import { MarketLeaderboardSection } from "@/frontend/components/dashboard/leaderboard/market-leaderboard-section";
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/frontend/components/ui/tooltip";
import { Input } from "@/frontend/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/frontend/components/ui/select";
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
  fetchUsageWithError,
  fetchKnowledgeWithError,
  fetchKnowledgeQualityResults,
  submitKnowledgeUpload,
  fetchPolymarketPriorityMarkets,
  fetchPolymarketEdgeStatus,
  fetchPolymarketEdgeSignals,
  fetchPolymarketDeskStatus,
  fetchPolymarketDeskTrades,
  fetchPolymarketDeskPositions,
  fetchSubstackPostsWithError,
  LEADERBOARDS_STALE_MS,
} from "@/frontend/lib/leaderboardsApi";
import type {
  PaperResponse,
  KnowledgeResponse,
} from "@/frontend/lib/leaderboardsApi";
import type { RebelRanking } from "@/frontend/types/dashboard";
import type {
  LeaderboardEntry,
  ReferralCodeResponse,
} from "@elizaos/api-client";
import {
  Trophy,
  RefreshCw,
  Copy,
  Check,
  BarChart3,
  Flame,
  Newspaper,
  Bot,
  BookOpen,
  ExternalLink,
  Palette,
  Upload,
  Youtube,
  DollarSign,
} from "lucide-react";
import { UUID } from "@elizaos/core";
import { cn } from "@/frontend/lib/utils";

const MANDO_MINUTES_URL = "https://www.mandominutes.com/Latest";

/** Data API cost estimates (monthly/yearly). From TREASURY.md; update when tiers change. */
const DATA_SOURCES_COSTS: {
  name: string;
  monthly: number;
  yearly: number;
  notes: string;
}[] = [
  {
    name: "Nansen",
    monthly: 0,
    yearly: 0,
    notes: "100 credits/mo free; API Standard ~$999/mo",
  },
  {
    name: "Sanbase (Santiment)",
    monthly: 0,
    yearly: 0,
    notes: "1K calls/mo free; Pro ~$99+/mo",
  },
  {
    name: "CoinGlass",
    monthly: 29,
    yearly: 350,
    notes: "Hobbyist $29/mo; $350/yr",
  },
  {
    name: "Birdeye",
    monthly: 0,
    yearly: 0,
    notes: "Free tier; Pro/API per tier",
  },
  {
    name: "Glassnode",
    monthly: 29,
    yearly: 0,
    notes: "Starter ~$29/mo; Advanced ~$799/mo",
  },
  {
    name: "X (Twitter) API",
    monthly: 100,
    yearly: 1200,
    notes: "Basic tier; Pro $5K/mo",
  },
  {
    name: "Helius",
    monthly: 0,
    yearly: 0,
    notes: "Free tier; Developer $49/mo",
  },
  { name: "OpenSea", monthly: 0, yearly: 0, notes: "Free tier; NFT floors" },
  { name: "Firecrawl", monthly: 0, yearly: 0, notes: "Optional; free tier" },
  {
    name: "Supabase",
    monthly: 25,
    yearly: 300,
    notes: "Pro ~$25/mo; feature store",
  },
  {
    name: "Binance, Deribit, Hyperliquid, CoinGecko, DexScreener",
    monthly: 0,
    yearly: 0,
    notes: "Public/free APIs",
  },
];

/** Hardware: 2x Mac Studio @ $5K each. LOCALSONLY.md cost model. */
const HARDWARE_2X_MAC_STUDIO = { unitCost: 5000, units: 2, totalCapEx: 10000 };
const CLOUD_INFERENCE_EQUIV_MONTHLY = 932; // ~2B tokens/mo ≈ $932 (LOCALSONLY)
const HARDWARE_POWER_MONTHLY = 40; // ~2 Mac Studios under load, $0.12/kWh

/** Display names for signal sources on the Trading Bot tab */
const SIGNAL_SOURCE_DISPLAY_NAMES: Record<string, string> = {
  XSentiment: "X (Twitter) sentiment",
  NewsSentiment: "News sentiment",
  VolumeRatio: "Volume (24h vs 7d avg)",
};
function signalSourceDisplayName(name: string): string {
  return SIGNAL_SOURCE_DISPLAY_NAMES[name] ?? name;
}

type MainTab =
  | "knowledge"
  | "markets"
  | "memetics"
  | "news"
  | "more"
  | "trading_bot"
  | "digital_art"
  | "usage"
  | "polymarket";

// Type assertion for gamification service (will be available after API client rebuild)
const gamificationClient = (elizaClient as any).gamification;

/** Agent from list (id, name, ...). Used to pick VINCE for Markets API. */
type AgentFromList = { id?: string; name?: string };

interface LeaderboardPageProps {
  agentId: UUID;
  /** Agent list from API; Markets data is fetched using the VINCE agent (plugin-vince). */
  agents?: AgentFromList[];
}

export default function LeaderboardPage({
  agentId,
  agents,
}: LeaderboardPageProps) {
  // Markets (HIP-3, Crypto, Memes, etc.) come from plugin-vince — use VINCE agent so the route exists
  const vinceAgent = agents?.find(
    (a) => (a.name ?? "").toUpperCase() === "VINCE",
  );
  const elizaAgent = agents?.find(
    (a) => (a.name ?? "").toUpperCase() === "ELIZA",
  );
  const oracleAgent = agents?.find(
    (a) => (a.name ?? "").toUpperCase() === "ORACLE",
  );
  const leaderboardsAgentId = (vinceAgent?.id ??
    agents?.[0]?.id ??
    agentId) as string;
  // Upload is Eliza-only: use her agent so the request is handled by plugin-eliza
  const uploadAgentId = (elizaAgent?.id ?? leaderboardsAgentId) as string;
  const oracleAgentId = (oracleAgent?.id ?? null) as string | null;
  const [mainTab, setMainTab] = useState<MainTab>("trading_bot");
  const [scope, setScope] = useState<"weekly" | "all_time">("weekly");
  const [copied, setCopied] = useState(false);
  const [uploadText, setUploadText] = useState("");
  const [uploadTextStatus, setUploadTextStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [uploadTextMessage, setUploadTextMessage] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeStatus, setYoutubeStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [youtubeMessage, setYoutubeMessage] = useState("");
  const [polymarketSort, setPolymarketSort] = useState<
    "yes" | "volume" | "closes"
  >("yes");
  const [testQualityCopied, setTestQualityCopied] = useState(false);
  const [cursorActualCost, setCursorActualCost] = useState<string>("");

  const KNOWLEDGE_QUALITY_COMMAND =
    "RUN_NETWORK_TESTS=1 bun test src/plugins/plugin-vince/src/__tests__/knowledgeQuality.e2e.test.ts";

  const {
    data: leaderboardsResult,
    isLoading: leaderboardsLoading,
    refetch: refetchLeaderboards,
    isFetching: leaderboardsFetching,
  } = useQuery({
    queryKey: ["leaderboards", leaderboardsAgentId],
    queryFn: () => fetchLeaderboardsWithError(leaderboardsAgentId),
    enabled:
      (mainTab === "markets" ||
        mainTab === "memetics" ||
        mainTab === "news" ||
        mainTab === "more" ||
        mainTab === "digital_art") &&
      !!leaderboardsAgentId,
    staleTime: LEADERBOARDS_STALE_MS,
  });

  const {
    data: paperResult,
    isLoading: paperLoading,
    isFetching: paperFetching,
    refetch: refetchPaper,
  } = useQuery<{
    data: PaperResponse | null;
    error: string | null;
    status: number | null;
  }>({
    queryKey: ["paper", leaderboardsAgentId],
    queryFn: () => fetchPaperWithError(leaderboardsAgentId),
    enabled: mainTab === "trading_bot" && !!leaderboardsAgentId,
    staleTime: 60 * 1000,
  });

  const {
    data: usageResult,
    isLoading: usageLoading,
    isFetching: usageFetching,
    refetch: refetchUsage,
  } = useQuery({
    queryKey: ["usage", leaderboardsAgentId],
    queryFn: () => fetchUsageWithError(leaderboardsAgentId),
    enabled: mainTab === "usage" && !!leaderboardsAgentId,
    staleTime: 60 * 1000,
  });

  const queryClient = useQueryClient();
  const {
    data: knowledgeResult,
    isLoading: knowledgeLoading,
    isFetching: knowledgeFetching,
    refetch: refetchKnowledge,
  } = useQuery<{
    data: KnowledgeResponse | null;
    error: string | null;
    status: number | null;
  }>({
    queryKey: ["knowledge", leaderboardsAgentId],
    queryFn: () => fetchKnowledgeWithError(leaderboardsAgentId),
    enabled: mainTab === "knowledge" && !!leaderboardsAgentId,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 60 * 1000,
  });
  const handleRefreshKnowledge = () => {
    queryClient.invalidateQueries({
      queryKey: ["knowledge", leaderboardsAgentId],
    });
    refetchKnowledge();
  };

  const {
    data: qualityResult,
    isLoading: qualityLoading,
    refetch: refetchQuality,
  } = useQuery({
    queryKey: ["knowledge-quality", leaderboardsAgentId],
    queryFn: () => fetchKnowledgeQualityResults(leaderboardsAgentId),
    enabled: mainTab === "knowledge" && !!leaderboardsAgentId,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const {
    data: polymarketResult,
    isLoading: polymarketLoading,
    refetch: refetchPolymarket,
    isFetching: polymarketFetching,
  } = useQuery({
    queryKey: ["polymarket-priority", oracleAgentId],
    queryFn: () => fetchPolymarketPriorityMarkets(oracleAgentId!),
    enabled: mainTab === "polymarket" && !!oracleAgentId,
    staleTime: LEADERBOARDS_STALE_MS,
    refetchInterval: mainTab === "polymarket" && oracleAgentId ? 60_000 : false,
  });
  const polymarketData = polymarketResult?.data ?? null;
  const polymarketError = polymarketResult?.error ?? null;

  const {
    data: edgeStatusResult,
    isLoading: edgeStatusLoading,
    isFetching: edgeStatusFetching,
  } = useQuery({
    queryKey: ["polymarket-edge-status", oracleAgentId],
    queryFn: () => fetchPolymarketEdgeStatus(oracleAgentId!),
    enabled: mainTab === "polymarket" && !!oracleAgentId,
    staleTime: 30 * 1000,
    refetchInterval: mainTab === "polymarket" && oracleAgentId ? 30_000 : false,
  });
  const edgeStatus = edgeStatusResult?.data ?? null;

  const {
    data: edgeSignalsResult,
    isLoading: edgeSignalsLoading,
    isFetching: edgeSignalsFetching,
  } = useQuery({
    queryKey: ["polymarket-edge-signals", oracleAgentId],
    queryFn: () => fetchPolymarketEdgeSignals(oracleAgentId!, 50),
    enabled: mainTab === "polymarket" && !!oracleAgentId,
    staleTime: 30 * 1000,
    refetchInterval: mainTab === "polymarket" && oracleAgentId ? 30_000 : false,
  });
  const edgeSignalsData = edgeSignalsResult?.data ?? null;

  // Desk queries keyed by oracleAgentId so they refetch when Oracle agent changes (e.g. after server restart).
  const {
    data: deskStatusResult,
    isLoading: deskStatusLoading,
    isFetching: deskStatusFetching,
  } = useQuery({
    queryKey: ["polymarket-desk-status", oracleAgentId],
    queryFn: () => fetchPolymarketDeskStatus(oracleAgentId!),
    enabled: mainTab === "polymarket" && !!oracleAgentId,
    staleTime: 30 * 1000,
    refetchInterval: mainTab === "polymarket" && oracleAgentId ? 30_000 : false,
  });
  const deskStatus = deskStatusResult?.data ?? null;

  const {
    data: deskTradesResult,
    isLoading: deskTradesLoading,
    isFetching: deskTradesFetching,
  } = useQuery({
    queryKey: ["polymarket-desk-trades", oracleAgentId],
    queryFn: () => fetchPolymarketDeskTrades(oracleAgentId!, 50),
    enabled: mainTab === "polymarket" && !!oracleAgentId,
    staleTime: 30 * 1000,
    refetchInterval: mainTab === "polymarket" && oracleAgentId ? 30_000 : false,
  });
  const deskTradesData = deskTradesResult?.data ?? null;

  const {
    data: deskPositionsResult,
    isLoading: deskPositionsLoading,
    isFetching: deskPositionsFetching,
  } = useQuery({
    queryKey: ["polymarket-desk-positions", oracleAgentId],
    queryFn: () => fetchPolymarketDeskPositions(oracleAgentId!),
    enabled: mainTab === "polymarket" && !!oracleAgentId,
    staleTime: 30 * 1000,
    refetchInterval: mainTab === "polymarket" && oracleAgentId ? 30_000 : false,
  });
  const deskPositionsData = deskPositionsResult?.data ?? null;

  // Substack route lives on Eliza only (plugin-eliza). Must use her agentId; no fallback to VINCE.
  const elizaAgentIdForSubstack = (elizaAgent?.id ?? null) as string | null;
  const {
    data: substackResult,
    isLoading: substackLoading,
    error: substackError,
    isFetched: substackFetched,
  } = useQuery({
    queryKey: ["substack-posts", elizaAgentIdForSubstack],
    queryFn: () => fetchSubstackPostsWithError(elizaAgentIdForSubstack!),
    enabled: mainTab === "news" && !!elizaAgentIdForSubstack,
    staleTime: 20 * 60 * 1000,
    retry: 1,
  });
  const substackPosts = substackResult?.data?.posts ?? [];
  const substackApiError = substackResult?.error ?? null;

  const leaderboardsData = leaderboardsResult?.data ?? null;
  const leaderboardsError = leaderboardsResult?.error ?? null;
  const leaderboardsStatus = leaderboardsResult?.status ?? null;

  const rateLimitedUntil = leaderboardsData?.news?.xSentiment?.rateLimitedUntil;
  const [xRateLimitCountdownSec, setXRateLimitCountdownSec] = useState<
    number | null
  >(null);
  useEffect(() => {
    if (rateLimitedUntil == null) {
      setXRateLimitCountdownSec(null);
      return;
    }
    const tick = () => {
      const rem = Math.max(
        0,
        Math.ceil((rateLimitedUntil - Date.now()) / 1000),
      );
      setXRateLimitCountdownSec(rem > 0 ? rem : null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [rateLimitedUntil]);

  const paperData = paperResult?.data as PaperResponse | null | undefined;
  const knowledgeData = knowledgeResult?.data as
    | KnowledgeResponse
    | null
    | undefined;

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
                : mainTab === "usage"
                  ? "Session token usage and estimated cost (TREASURY)"
                  : mainTab === "polymarket"
                    ? "Priority prediction markets — palantir, paper bot, Hypersurface strikes, vibe check"
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
              <TabsTrigger value="polymarket">Polymarket</TabsTrigger>
              <TabsTrigger value="usage">Usage</TabsTrigger>
            </TabsList>
            {(mainTab === "markets" ||
              mainTab === "memetics" ||
              mainTab === "news" ||
              mainTab === "more" ||
              mainTab === "digital_art") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchLeaderboards()}
                disabled={leaderboardsLoading}
              >
                <RefreshCw
                  className={cn(
                    "w-4 h-4 mr-2",
                    leaderboardsLoading && "animate-spin",
                  )}
                />
                Refresh
              </Button>
            )}
            {mainTab === "trading_bot" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchPaper()}
                disabled={paperFetching}
              >
                <RefreshCw
                  className={cn(
                    "w-4 h-4 mr-2",
                    paperFetching && "animate-spin",
                  )}
                />
                Refresh
              </Button>
            )}
            {mainTab === "knowledge" && (
              <>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Upload via Discord? List reflects local knowledge/ folder;
                  updates every minute.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshKnowledge}
                  disabled={knowledgeLoading || knowledgeFetching}
                >
                  <RefreshCw
                    className={cn(
                      "w-4 h-4 mr-2",
                      (knowledgeLoading || knowledgeFetching) && "animate-spin",
                    )}
                  />
                  Refresh
                </Button>
              </>
            )}
            {mainTab === "usage" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchUsage()}
                disabled={usageFetching}
              >
                <RefreshCw
                  className={cn(
                    "w-4 h-4 mr-2",
                    usageFetching && "animate-spin",
                  )}
                />
                Refresh
              </Button>
            )}
            {mainTab === "polymarket" && oracleAgentId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchPolymarket()}
                disabled={polymarketLoading || polymarketFetching}
              >
                <RefreshCw
                  className={cn(
                    "w-4 h-4 mr-2",
                    (polymarketLoading || polymarketFetching) && "animate-spin",
                  )}
                />
                Refresh
              </Button>
            )}
          </div>

          {/* Markets tab: all data leaderboards — full data, no need to ask the agent */}
          <TabsContent
            value="markets"
            className="mt-6 flex-1 min-h-0 min-h-[280px]"
          >
            {leaderboardsLoading || leaderboardsFetching ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-48 bg-muted/50 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : leaderboardsData ? (
              <div className="space-y-8">
                {/* Hero line: always-available data */}
                <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 border border-border/50 px-4 py-3">
                  <p className="text-sm font-medium text-foreground/90">
                    HIP-3 and HL Crypto (perps) — always here. Open this page
                    anytime; no need to ask VINCE.
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
                        volumeLeaders={
                          leaderboardsData.hip3.volumeLeaders ?? []
                        }
                        oneLiner={leaderboardsData.hip3.oneLiner}
                        bias={leaderboardsData.hip3.bias}
                        categories={
                          leaderboardsData.hip3.categories
                            ? [
                                {
                                  label: "Commodities",
                                  rows:
                                    leaderboardsData.hip3.categories
                                      .commodities ?? [],
                                },
                                {
                                  label: "Indices",
                                  rows:
                                    leaderboardsData.hip3.categories.indices ??
                                    [],
                                },
                                {
                                  label: "Stocks",
                                  rows:
                                    leaderboardsData.hip3.categories.stocks ??
                                    [],
                                },
                                {
                                  label: "AI / Tech",
                                  rows:
                                    leaderboardsData.hip3.categories.aiTech ??
                                    [],
                                },
                              ]
                            : undefined
                        }
                      />
                    </div>
                  )}

                  {/* HL Crypto: full width like HIP-3, stacked categories for full-width tables */}
                  {leaderboardsData.hlCrypto &&
                    (() => {
                      const hl = leaderboardsData.hlCrypto;
                      const categories: {
                        label: string;
                        rows: typeof hl.topMovers;
                      }[] = [];
                      if ((hl.allTickers?.length ?? 0) > 0) {
                        categories.push({
                          label: "All HL tickers",
                          rows: hl.allTickers!,
                        });
                      }
                      if ((hl.openInterestLeaders?.length ?? 0) > 0) {
                        categories.push({
                          label: "Open interest leaders",
                          rows: hl.openInterestLeaders!,
                        });
                      }
                      if ((hl.crowdedLongs?.length ?? 0) > 0) {
                        categories.push({
                          label: "Crowded longs",
                          rows: hl.crowdedLongs!,
                        });
                      }
                      if ((hl.crowdedShorts?.length ?? 0) > 0) {
                        categories.push({
                          label: "Crowded shorts",
                          rows: hl.crowdedShorts!,
                        });
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
                            categories={
                              categories.length > 0 ? categories : undefined
                            }
                            categoriesLayout="stack"
                          />
                        </div>
                      );
                    })()}
                </div>

                {!leaderboardsData.hip3 && !leaderboardsData.hlCrypto && (
                  <p className="text-center text-muted-foreground py-8">
                    No market data available. Try again in a moment.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center space-y-3 min-h-[200px] flex flex-col justify-center">
                <p className="font-medium text-foreground">
                  Could not load leaderboards
                </p>
                {leaderboardsError != null && (
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {typeof leaderboardsError === "string"
                      ? leaderboardsError
                      : ((leaderboardsError as any)?.message ??
                        String(leaderboardsError))}
                  </p>
                )}
                {leaderboardsStatus === 503 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Backend may need a restart. Run{" "}
                    <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">
                      bun run build
                    </code>{" "}
                    then restart the server.
                  </p>
                )}
                {leaderboardsStatus === 404 && (
                  <>
                    <p className="text-xs text-amber-600 dark:text-amber-400 max-w-md mx-auto">
                      Plugin route not found. Run{" "}
                      <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">
                        node scripts/patch-elizaos-server-plugin-routes.cjs
                      </code>{" "}
                      after install, then{" "}
                      <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">
                        bun run build
                      </code>{" "}
                      and restart with{" "}
                      <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">
                        bun start
                      </code>
                      .
                    </p>
                    <p className="text-xs text-muted-foreground font-mono break-all">
                      Requested agent ID: {leaderboardsAgentId || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      If backend is on port 3000, test:{" "}
                      <code className="bg-muted px-1 rounded break-all">
                        curl &quot;http://localhost:3000/api/agents/
                        {leaderboardsAgentId || "AGENT_ID"}
                        /plugins/plugin-vince/vince/leaderboards?agentId=
                        {leaderboardsAgentId || "AGENT_ID"}&quot;
                      </code>
                    </p>
                  </>
                )}
                <p className="text-sm text-muted-foreground">
                  Make sure VINCE is running, then click Refresh above.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Memetics tab: Memes (Solana) + Meteora LP */}
          <TabsContent
            value="memetics"
            className="mt-6 flex-1 min-h-0 overflow-auto"
          >
            {leaderboardsLoading || leaderboardsFetching ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-48 bg-muted/50 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : leaderboardsData ? (
              <div className="space-y-8">
                <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 border border-border/50 px-4 py-3">
                  <p className="text-sm font-medium text-foreground/90">
                    Memes (Solana), Memes (BASE), Meteora LP, and Watchlist —
                    memetics-focused views.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {leaderboardsData.updatedAt != null
                      ? `Updated ${new Date(leaderboardsData.updatedAt).toLocaleTimeString()}`
                      : "Live data"}
                  </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Memes: full hot + ape + watch + avoid — clean layout, no duplicates */}
                  {leaderboardsData.memes &&
                    (() => {
                      const hot = leaderboardsData.memes.hot ?? [];
                      const ape = leaderboardsData.memes.ape ?? [];
                      const apeSymbols = new Set(ape.map((r) => r.symbol));
                      const hotOnly = hot.filter(
                        (r) => !apeSymbols.has(r.symbol),
                      );
                      const formatMcap = (v: number) =>
                        v >= 1e6
                          ? `$${(v / 1e6).toFixed(1)}M`
                          : v >= 1e3
                            ? `$${(v / 1e3).toFixed(0)}K`
                            : `$${v.toFixed(0)}`;
                      const formatChange = (n: number) =>
                        n >= 0 ? `+${n.toFixed(1)}%` : `${n.toFixed(1)}%`;

                      return (
                        <DashboardCard
                          title={leaderboardsData.memes.title}
                          className="lg:col-span-2"
                        >
                          <div className="rounded-lg bg-muted/40 dark:bg-muted/20 px-4 py-2.5 mb-5">
                            <p className="text-sm font-medium text-foreground/95">
                              {leaderboardsData.memes.moodSummary ?? ""}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Mood: {leaderboardsData.memes.mood ?? "—"}
                            </p>
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
                                      <tr
                                        key={r.symbol}
                                        className="border-b border-border/40 last:border-0 hover:bg-muted/30"
                                      >
                                        <td className="py-2 px-3 font-medium">
                                          {r.symbol}
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                          <span
                                            className={cn(
                                              "tabular-nums font-medium",
                                              (r.change24h ?? 0) >= 0
                                                ? "text-green-600 dark:text-green-400"
                                                : "text-red-600 dark:text-red-400",
                                            )}
                                          >
                                            {formatChange(r.change24h ?? 0)}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                    {hotOnly.length === 0 && (
                                      <tr>
                                        <td
                                          colSpan={2}
                                          className="py-3 px-3 text-muted-foreground text-sm"
                                        >
                                          —
                                        </td>
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
                                      <tr
                                        key={r.symbol}
                                        className="border-b border-border/40 last:border-0 hover:bg-muted/30"
                                      >
                                        <td className="py-2 px-3 font-medium">
                                          {r.symbol}
                                        </td>
                                        <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">
                                          {r.marketCap != null &&
                                            formatMcap(r.marketCap)}
                                          {r.volumeLiquidityRatio != null &&
                                            ` · ${r.volumeLiquidityRatio.toFixed(1)}x`}
                                        </td>
                                      </tr>
                                    ))}
                                    {ape.length === 0 && (
                                      <tr>
                                        <td
                                          colSpan={2}
                                          className="py-3 px-3 text-muted-foreground text-sm"
                                        >
                                          —
                                        </td>
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
                                    {(leaderboardsData.memes.watch ?? [])
                                      .slice(0, 6)
                                      .map((r) => (
                                        <tr
                                          key={r.symbol}
                                          className="border-b border-border/40 last:border-0 hover:bg-muted/30"
                                        >
                                          <td className="py-2 px-3 font-medium">
                                            {r.symbol}
                                          </td>
                                          <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">
                                            {r.volumeLiquidityRatio != null
                                              ? `${r.volumeLiquidityRatio.toFixed(1)}x`
                                              : "—"}
                                          </td>
                                        </tr>
                                      ))}
                                    {(leaderboardsData.memes.watch?.length ??
                                      0) === 0 && (
                                      <tr>
                                        <td
                                          colSpan={2}
                                          className="py-3 px-3 text-muted-foreground text-sm"
                                        >
                                          —
                                        </td>
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

                  {/* Memes (BASE): same layout as Solana */}
                  {leaderboardsData.memesBase &&
                    (() => {
                      const section = leaderboardsData.memesBase!;
                      const hot = section.hot ?? [];
                      const ape = section.ape ?? [];
                      const apeSymbols = new Set(ape.map((r) => r.symbol));
                      const hotOnly = hot.filter(
                        (r) => !apeSymbols.has(r.symbol),
                      );
                      const formatMcap = (v: number) =>
                        v >= 1e6
                          ? `$${(v / 1e6).toFixed(1)}M`
                          : v >= 1e3
                            ? `$${(v / 1e3).toFixed(0)}K`
                            : `$${v.toFixed(0)}`;
                      const formatChange = (n: number) =>
                        n >= 0 ? `+${n.toFixed(1)}%` : `${n.toFixed(1)}%`;

                      return (
                        <DashboardCard
                          title={section.title}
                          className="lg:col-span-2"
                        >
                          <div className="rounded-lg bg-muted/40 dark:bg-muted/20 px-4 py-2.5 mb-5">
                            <p className="text-sm font-medium text-foreground/95">
                              {section.moodSummary ?? ""}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Mood: {section.mood ?? "—"}
                            </p>
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
                                      <tr
                                        key={r.symbol}
                                        className="border-b border-border/40 last:border-0 hover:bg-muted/30"
                                      >
                                        <td className="py-2 px-3 font-medium">
                                          {r.symbol}
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                          <span
                                            className={cn(
                                              "tabular-nums font-medium",
                                              (r.change24h ?? 0) >= 0
                                                ? "text-green-600 dark:text-green-400"
                                                : "text-red-600 dark:text-red-400",
                                            )}
                                          >
                                            {formatChange(r.change24h ?? 0)}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                    {hotOnly.length === 0 && (
                                      <tr>
                                        <td
                                          colSpan={2}
                                          className="py-3 px-3 text-muted-foreground text-sm"
                                        >
                                          —
                                        </td>
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
                                      <tr
                                        key={r.symbol}
                                        className="border-b border-border/40 last:border-0 hover:bg-muted/30"
                                      >
                                        <td className="py-2 px-3 font-medium">
                                          {r.symbol}
                                        </td>
                                        <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">
                                          {r.marketCap != null &&
                                            formatMcap(r.marketCap)}
                                          {r.volumeLiquidityRatio != null &&
                                            ` · ${r.volumeLiquidityRatio.toFixed(1)}x`}
                                        </td>
                                      </tr>
                                    ))}
                                    {ape.length === 0 && (
                                      <tr>
                                        <td
                                          colSpan={2}
                                          className="py-3 px-3 text-muted-foreground text-sm"
                                        >
                                          —
                                        </td>
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
                                    {(section.watch ?? [])
                                      .slice(0, 6)
                                      .map((r) => (
                                        <tr
                                          key={r.symbol}
                                          className="border-b border-border/40 last:border-0 hover:bg-muted/30"
                                        >
                                          <td className="py-2 px-3 font-medium">
                                            {r.symbol}
                                          </td>
                                          <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">
                                            {r.volumeLiquidityRatio != null
                                              ? `${r.volumeLiquidityRatio.toFixed(1)}x`
                                              : "—"}
                                          </td>
                                        </tr>
                                      ))}
                                    {(section.watch?.length ?? 0) === 0 && (
                                      <tr>
                                        <td
                                          colSpan={2}
                                          className="py-3 px-3 text-muted-foreground text-sm"
                                        >
                                          —
                                        </td>
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
                  {leaderboardsData.meteora &&
                    (leaderboardsData.meteora.topPools?.length ?? 0) > 0 &&
                    (() => {
                      const topPools = leaderboardsData.meteora!.topPools ?? [];
                      const memePools =
                        leaderboardsData.meteora!.memePools ?? [];
                      const allPoolsByApy =
                        leaderboardsData.meteora!.allPoolsByApy ?? [];
                      const topNames = new Set(topPools.map((p) => p.name));
                      const memeOnly = memePools
                        .filter((p) => !topNames.has(p.name))
                        .slice(0, 8);

                      const poolKey = (p: { id?: string; name: string }) =>
                        p.id ?? p.name;

                      const PoolTable = ({
                        pools,
                        emptyMsg,
                      }: {
                        pools: typeof topPools;
                        emptyMsg: string;
                      }) => (
                        <div className="rounded-md border border-border/60 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/50">
                                <th className="text-left py-2 px-3 font-medium">
                                  Pair
                                </th>
                                <th className="text-right py-2 px-3 font-medium">
                                  TVL
                                </th>
                                <th className="text-right py-2 px-3 font-medium w-12">
                                  bp
                                </th>
                                <th className="text-right py-2 px-3 font-medium">
                                  APY
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {pools.map((p) => (
                                <tr
                                  key={poolKey(p)}
                                  className="border-b border-border/40 last:border-0 hover:bg-muted/30"
                                >
                                  <td className="py-2 px-3 font-medium">
                                    {p.name}
                                  </td>
                                  <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">
                                    {p.tvlFormatted}
                                  </td>
                                  <td className="py-2 px-3 text-right text-muted-foreground tabular-nums text-xs">
                                    {p.binWidth != null
                                      ? (p.binWidth * 100).toFixed(0)
                                      : "—"}
                                  </td>
                                  <td className="py-2 px-3 text-right tabular-nums font-medium text-green-600 dark:text-green-400">
                                    {p.apy != null
                                      ? `${(p.apy * 100).toFixed(1)}%`
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                              {pools.length === 0 && (
                                <tr>
                                  <td
                                    colSpan={4}
                                    className="py-4 px-3 text-muted-foreground text-center text-sm"
                                  >
                                    {emptyMsg}
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      );

                      return (
                        <DashboardCard
                          title={leaderboardsData.meteora!.title}
                          className="lg:col-span-2"
                        >
                          <div className="rounded-lg bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 px-4 py-2.5 mb-5">
                            <p className="text-sm font-medium text-foreground/95">
                              {leaderboardsData.meteora!.oneLiner ?? ""}
                            </p>
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
                                      <th className="text-left py-2 px-3 font-medium w-12">
                                        Rank
                                      </th>
                                      <th className="text-left py-2 px-3 font-medium">
                                        Pair
                                      </th>
                                      <th className="text-right py-2 px-3 font-medium">
                                        APY
                                      </th>
                                      <th className="text-right py-2 px-3 font-medium">
                                        TVL
                                      </th>
                                      <th className="text-left py-2 px-3 font-medium text-muted-foreground text-xs">
                                        Table / note
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {allPoolsByApy.map((p, i) => (
                                      <tr
                                        key={poolKey(p)}
                                        className="border-b border-border/40 last:border-0 hover:bg-muted/30"
                                      >
                                        <td className="py-2 px-3 font-medium tabular-nums">
                                          {i + 1}
                                        </td>
                                        <td className="py-2 px-3 font-medium">
                                          {p.name}
                                        </td>
                                        <td className="py-2 px-3 text-right tabular-nums font-medium text-green-600 dark:text-green-400">
                                          {p.apy != null
                                            ? `${(p.apy * 100).toFixed(1)}%`
                                            : "—"}
                                        </td>
                                        <td className="py-2 px-3 text-right text-muted-foreground tabular-nums">
                                          {p.tvlFormatted}
                                        </td>
                                        <td className="py-2 px-3 text-muted-foreground text-xs">
                                          {p.category ?? "—"}
                                        </td>
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
                                <BarChart3 className="w-3.5 h-3.5" /> Top pools
                                by TVL
                              </div>
                              <PoolTable
                                pools={topPools.slice(0, 10)}
                                emptyMsg="—"
                              />
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
                  {leaderboardsData.memes?.leftcurve &&
                    (leaderboardsData.memes.leftcurve.headlines?.length ?? 0) >
                      0 && (
                      <DashboardCard
                        title={leaderboardsData.memes.leftcurve.title}
                        className="lg:col-span-2"
                      >
                        <ul className="space-y-2 text-sm max-h-[40vh] overflow-y-auto pr-1">
                          {leaderboardsData.memes.leftcurve.headlines.map(
                            (h, i) => (
                              <li key={i} className="flex gap-2 items-start">
                                <span className="flex-1 line-clamp-2">
                                  {h.text}
                                </span>
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
                            ),
                          )}
                        </ul>
                      </DashboardCard>
                    )}
                  {/* Watchlist */}
                  {leaderboardsData.more?.watchlist &&
                    (leaderboardsData.more.watchlist.tokens?.length ?? 0) >
                      0 && (
                      <DashboardCard
                        title="Watchlist"
                        className="lg:col-span-2"
                      >
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-2 font-medium">
                                  Symbol
                                </th>
                                <th className="text-left py-2 font-medium">
                                  Chain
                                </th>
                                <th className="text-left py-2 font-medium">
                                  Priority
                                </th>
                                <th className="text-right py-2 font-medium">
                                  Target Mcap
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(
                                leaderboardsData.more.watchlist.tokens ?? []
                              ).map((t) => (
                                <tr
                                  key={t.symbol}
                                  className="border-b border-border/50"
                                >
                                  <td className="py-1.5 font-medium">
                                    {t.symbol}
                                  </td>
                                  <td className="py-1.5 text-muted-foreground">
                                    {t.chain ?? "—"}
                                  </td>
                                  <td className="py-1.5 text-muted-foreground">
                                    {t.priority ?? "—"}
                                  </td>
                                  <td className="py-1.5 text-right font-mono">
                                    {t.targetMcap != null
                                      ? `$${(t.targetMcap / 1e6).toFixed(1)}M`
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </DashboardCard>
                    )}
                </div>

                {!leaderboardsData.memes &&
                  !leaderboardsData.meteora &&
                  !(
                    leaderboardsData.more?.watchlist &&
                    (leaderboardsData.more.watchlist.tokens?.length ?? 0) > 0
                  ) && (
                    <p className="text-center text-muted-foreground py-8">
                      No memetics data available. Try again in a moment.
                    </p>
                  )}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center space-y-3 min-h-[200px] flex flex-col justify-center">
                <p className="font-medium text-foreground">
                  Could not load memetics data
                </p>
                <p className="text-sm text-muted-foreground">
                  Make sure VINCE is running, then click Refresh above.
                </p>
              </div>
            )}
          </TabsContent>

          {/* News tab: X vibe check (top) + MandoMinutes TLDR + headlines */}
          <TabsContent
            value="news"
            className="mt-6 flex-1 min-h-0 overflow-auto"
          >
            {(leaderboardsLoading || leaderboardsFetching) &&
            !leaderboardsData?.news ? (
              <div className="space-y-4">
                <div className="h-24 bg-muted/50 rounded-xl animate-pulse" />
                <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
              </div>
            ) : leaderboardsData?.news ? (
              <div className="flex flex-col gap-6">
                {/* X (Twitter) sentiment — same data feeds the trading algo */}
                {leaderboardsData.news.xSentiment && (
                  <DashboardCard
                    title="X (Twitter) vibe check"
                    className="shrink-0"
                  >
                    <p className="text-xs text-muted-foreground mb-2">
                      Based on last 24h of CT · same signal feeds the trading
                      algo.
                    </p>
                    {leaderboardsData.news.xSentiment.oldestUpdatedAt !=
                      null && (
                      <p className="text-[11px] text-muted-foreground mb-2">
                        Cache: oldest asset updated{" "}
                        {Math.floor(
                          (Date.now() -
                            leaderboardsData.news.xSentiment.oldestUpdatedAt) /
                            60_000,
                        )}
                        m ago
                        {leaderboardsData.news.xSentiment.newestUpdatedAt !=
                          null &&
                        leaderboardsData.news.xSentiment.newestUpdatedAt !==
                          leaderboardsData.news.xSentiment.oldestUpdatedAt
                          ? `; newest ${Math.floor((Date.now() - leaderboardsData.news.xSentiment.newestUpdatedAt) / 60_000)}m ago`
                          : ""}
                        . Full cycle ~1–4h (one asset per hour).
                      </p>
                    )}
                    {(leaderboardsData.news.xSentiment.overall ||
                      leaderboardsData.news.xSentiment.oneLiner) && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                        {leaderboardsData.news.xSentiment.overall && (
                          <span
                            className={cn(
                              "text-sm font-medium",
                              leaderboardsData.news.xSentiment.overall ===
                                "bullish" &&
                                "text-green-600 dark:text-green-400",
                              leaderboardsData.news.xSentiment.overall ===
                                "bearish" && "text-red-600 dark:text-red-400",
                              leaderboardsData.news.xSentiment.overall ===
                                "mixed" && "text-amber-600 dark:text-amber-400",
                            )}
                          >
                            Overall:{" "}
                            {leaderboardsData.news.xSentiment.overall
                              .charAt(0)
                              .toUpperCase() +
                              leaderboardsData.news.xSentiment.overall.slice(1)}
                          </span>
                        )}
                        {leaderboardsData.news.xSentiment.oneLiner && (
                          <span className="text-xs text-muted-foreground">
                            {leaderboardsData.news.xSentiment.oneLiner}
                          </span>
                        )}
                      </div>
                    )}
                    {leaderboardsData.news.listSentiment &&
                      leaderboardsData.news.listSentiment.confidence > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-1">
                            List (curated)
                          </p>
                          <div
                            className={cn(
                              "rounded-lg border px-3 py-2 text-center inline-block min-w-[120px]",
                              leaderboardsData.news.listSentiment.sentiment ===
                                "bullish" &&
                                "border-green-500/40 bg-green-500/5",
                              leaderboardsData.news.listSentiment.sentiment ===
                                "bearish" && "border-red-500/40 bg-red-500/5",
                              leaderboardsData.news.listSentiment.sentiment ===
                                "neutral" && "border-border bg-muted/30",
                            )}
                          >
                            <span
                              className={cn(
                                "text-sm font-medium",
                                leaderboardsData.news.listSentiment
                                  .sentiment === "bullish" &&
                                  "text-green-600 dark:text-green-400",
                                leaderboardsData.news.listSentiment
                                  .sentiment === "bearish" &&
                                  "text-red-600 dark:text-red-400",
                              )}
                            >
                              {leaderboardsData.news.listSentiment.sentiment ===
                              "bullish"
                                ? "Bullish"
                                : leaderboardsData.news.listSentiment
                                      .sentiment === "bearish"
                                  ? "Bearish"
                                  : "Neutral"}
                            </span>
                            <span className="text-muted-foreground text-xs ml-1">
                              ({leaderboardsData.news.listSentiment.confidence}
                              %)
                            </span>
                            {leaderboardsData.news.listSentiment
                              .hasHighRiskEvent && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 ml-2 cursor-help">
                                    Risk event
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Unusual risk keywords in recent CT posts for
                                  this list.
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      )}
                    {xRateLimitCountdownSec != null &&
                      xRateLimitCountdownSec > 0 && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
                          X API rate limited. Retry in {xRateLimitCountdownSec}s
                        </p>
                      )}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {leaderboardsData.news.xSentiment.assets.map((row) => {
                        const updatedAt = row.updatedAt;
                        const hasData = updatedAt != null && updatedAt !== 0;
                        const ageMin = hasData
                          ? Math.floor((Date.now() - updatedAt) / 60_000)
                          : null;
                        const isStale = ageMin != null && ageMin > 120; // 2h — stagger is one per hour, so per-asset refresh can be 1–24h depending on asset count
                        return (
                          <div
                            key={row.asset}
                            className={cn(
                              "rounded-lg border px-3 py-2 text-center",
                              row.sentiment === "bullish" &&
                                "border-green-500/40 bg-green-500/5",
                              row.sentiment === "bearish" &&
                                "border-red-500/40 bg-red-500/5",
                              row.sentiment === "neutral" &&
                                "border-border bg-muted/30",
                            )}
                          >
                            <span className="font-semibold text-foreground">
                              {row.asset}
                            </span>
                            <div className="text-xs mt-1">
                              <span
                                className={cn(
                                  row.sentiment === "bullish" &&
                                    "text-green-600 dark:text-green-400",
                                  row.sentiment === "bearish" &&
                                    "text-red-600 dark:text-red-400",
                                )}
                              >
                                {row.sentiment === "bullish"
                                  ? "Bullish"
                                  : row.sentiment === "bearish"
                                    ? "Bearish"
                                    : "Neutral"}
                              </span>
                              {row.confidence > 0 && (
                                <span className="text-muted-foreground ml-1">
                                  ({row.confidence}%)
                                </span>
                              )}
                            </div>
                            {row.hasHighRiskEvent && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 block cursor-help">
                                    Risk event
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Unusual risk keywords in recent CT posts for
                                  this asset.
                                </TooltipContent>
                              </Tooltip>
                            )}
                            {hasData ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span
                                    className={cn(
                                      "text-[10px] block mt-1 cursor-help",
                                      isStale
                                        ? "text-amber-600 dark:text-amber-400"
                                        : "text-muted-foreground",
                                    )}
                                  >
                                    {isStale
                                      ? "Stale"
                                      : ageMin === 0
                                        ? "Updated just now"
                                        : `Updated ${ageMin}m ago`}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  Staggered refresh: one asset per hour; full
                                  cycle 1–24h depending on asset count.
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-[10px] text-muted-foreground block mt-1">
                                Pending refresh
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {leaderboardsData.news.xSentiment.assets.every(
                      (a) =>
                        a.confidence === 0 &&
                        (a.updatedAt == null || a.updatedAt === 0),
                    ) && (
                      <p className="text-xs text-muted-foreground mt-2 text-center">
                        First refresh in ~1 hour (one asset per interval). Same
                        data feeds the trading algo.
                      </p>
                    )}
                    <details className="mt-3 pt-2 border-t border-border/50 group">
                      <summary className="text-xs text-muted-foreground cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                        How X improves the paper bot
                      </summary>
                      <p className="text-xs text-muted-foreground mt-2 pl-0">
                        X sentiment votes long/short when confidence ≥ 40%
                        (config: X_SENTIMENT_CONFIDENCE_FLOOR). Default weight
                        0.5× in the aggregator (~20 sources). When CT agrees
                        with funding/regime, the bot can open or size trades.
                        When X contributed to a trade, it appears in{" "}
                        <strong>Trading Bot</strong> → Open positions → Why this
                        trade → Sources as &quot;X (Twitter) sentiment&quot;.
                      </p>
                    </details>
                    <p className="text-xs text-muted-foreground mt-2 pt-1 border-t border-border/50">
                      Richer vibe in chat: ask ECHO for &quot;X pulse&quot; or
                      &quot;CT vibe&quot;.
                    </p>
                  </DashboardCard>
                )}

                {/* TLDR strip (MandoMinutes) */}
                <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 border border-border/50 px-4 py-3 shrink-0">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    TLDR
                  </p>
                  <p className="text-sm font-medium text-foreground/90">
                    {leaderboardsData.news.oneLiner}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Sentiment: {leaderboardsData.news.sentiment} ·{" "}
                    {leaderboardsData.news.headlines.length} headlines
                  </p>
                </div>

                {/* MandoMinutes headlines + deep dive */}
                <DashboardCard
                  title={leaderboardsData.news.title}
                  className="min-h-0 flex-1 flex flex-col"
                >
                  <ul className="space-y-2 text-sm max-h-[60vh] overflow-y-auto pr-1">
                    {(leaderboardsData.news.headlines ?? []).map((h, i) => (
                      <li key={i} className="flex gap-2 items-start">
                        {h.sentiment && (
                          <span
                            className={cn(
                              "shrink-0 w-6 pt-0.5",
                              h.sentiment === "bullish" &&
                                "text-green-600 dark:text-green-400",
                              h.sentiment === "bearish" &&
                                "text-red-600 dark:text-red-400",
                            )}
                          >
                            {h.sentiment === "bullish"
                              ? "🟢"
                              : h.sentiment === "bearish"
                                ? "🔴"
                                : "⚪"}
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
                    <p className="text-muted-foreground py-4">
                      No headlines yet. Run MANDO_MINUTES or ask VINCE for news.
                    </p>
                  )}
                </DashboardCard>

                {/* Ikigai Studio Substack — always show card so we can see loading/error state */}
                <DashboardCard
                  title="Ikigai Studio Substack"
                  className="min-h-0 flex-shrink-0"
                >
                  <p className="text-xs text-muted-foreground mb-3">
                    Recent essays from{" "}
                    <a
                      href="https://ikigaistudio.substack.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      ikigaistudio.substack.com
                    </a>
                  </p>
                  {!elizaAgentIdForSubstack ? (
                    <p className="text-sm text-muted-foreground">
                      Select the <strong>Eliza</strong> agent in the sidebar (or
                      ensure she is running) to load recent posts here.
                    </p>
                  ) : substackLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : substackApiError || substackError ? (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Couldn&apos;t load:{" "}
                      {substackApiError ??
                        (substackError instanceof Error
                          ? substackError.message
                          : String(substackError))}
                      . Ensure the backend is running and the{" "}
                      <strong>Eliza</strong> agent is started.
                    </p>
                  ) : substackPosts.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {substackPosts.map((p, i) => (
                        <li key={i} className="flex gap-2 items-start">
                          <span className="flex-1 line-clamp-2">{p.title}</span>
                          {p.date ? (
                            <span className="shrink-0 text-muted-foreground text-xs">
                              {p.date.slice(0, 10)}
                            </span>
                          ) : null}
                          <a
                            href={p.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-primary hover:underline flex items-center gap-1 text-xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Read
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No posts returned. Backend may need{" "}
                      <code className="text-xs bg-muted px-1 rounded">
                        SUBSTACK_FEED_URL
                      </code>{" "}
                      (default: ikigaistudio.substack.com/feed).
                    </p>
                  )}
                </DashboardCard>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center">
                  <Newspaper className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="font-medium text-foreground">No news data</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Switch to Markets to load data, or ask VINCE for &quot;mando
                    minutes&quot;.
                  </p>
                </div>
                <DashboardCard
                  title="Ikigai Studio Substack"
                  className="min-h-0 flex-shrink-0"
                >
                  <p className="text-xs text-muted-foreground mb-3">
                    Recent essays from{" "}
                    <a
                      href="https://ikigaistudio.substack.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      ikigaistudio.substack.com
                    </a>
                  </p>
                  {!elizaAgentIdForSubstack ? (
                    <p className="text-sm text-muted-foreground">
                      Select the <strong>Eliza</strong> agent in the sidebar (or
                      ensure she is running) to load recent posts here.
                    </p>
                  ) : substackLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : substackApiError || substackError ? (
                    <p className="text-sm text-amber-600 dark:text-amber-400">
                      Couldn&apos;t load:{" "}
                      {substackApiError ??
                        (substackError instanceof Error
                          ? substackError.message
                          : String(substackError))}
                      . Ensure the backend is running and the{" "}
                      <strong>Eliza</strong> agent is started.
                    </p>
                  ) : substackPosts.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {substackPosts.map((p, i) => (
                        <li key={i} className="flex gap-2 items-start">
                          <span className="flex-1 line-clamp-2">{p.title}</span>
                          {p.date ? (
                            <span className="shrink-0 text-muted-foreground text-xs">
                              {p.date.slice(0, 10)}
                            </span>
                          ) : null}
                          <a
                            href={p.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-primary hover:underline flex items-center gap-1 text-xs"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Read
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No posts returned. Backend may need{" "}
                      <code className="text-xs bg-muted px-1 rounded">
                        SUBSTACK_FEED_URL
                      </code>{" "}
                      (default: ikigaistudio.substack.com/feed).
                    </p>
                  )}
                </DashboardCard>
              </div>
            )}
          </TabsContent>

          {/* Digital Art tab: curated NFT collections — floor prices and thin-floor opportunities */}
          <TabsContent
            value="digital_art"
            className="mt-6 flex-1 min-h-0 overflow-auto"
          >
            {(leaderboardsLoading || leaderboardsFetching) &&
            !leaderboardsData?.digitalArt ? (
              <div className="space-y-4">
                <div className="h-24 bg-muted/50 rounded-xl animate-pulse" />
                <div className="h-64 bg-muted/50 rounded-xl animate-pulse" />
              </div>
            ) : leaderboardsData?.digitalArt ? (
              <div className="space-y-6">
                <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 border border-border/50 px-4 py-3">
                  <p className="text-sm font-medium text-foreground/90">
                    {leaderboardsData.digitalArt.oneLiner}
                  </p>
                  {leaderboardsData.digitalArt.criteriaNote && (
                    <p className="text-xs text-muted-foreground mt-2 font-medium">
                      {leaderboardsData.digitalArt.criteriaNote}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {leaderboardsData.updatedAt != null
                      ? `Updated ${new Date(leaderboardsData.updatedAt).toLocaleTimeString()}`
                      : "Live data"}
                  </p>
                </div>
                <DashboardCard title={leaderboardsData.digitalArt.title}>
                  {(leaderboardsData.digitalArt.collections ?? []).length >
                  0 ? (
                    <div className="rounded-md border border-border/60 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/60 bg-muted/30">
                            <th className="py-2.5 px-3 text-left font-semibold">
                              Collection
                            </th>
                            <th className="py-2.5 px-3 text-right font-semibold">
                              Floor
                            </th>
                            <th
                              className="py-2.5 px-2 text-right font-semibold"
                              title="Recent sale prices. All below floor = excluded from gem-on-floor candidates."
                            >
                              Sales
                            </th>
                            <th className="py-2.5 px-3 text-right font-semibold">
                              Thickness
                            </th>
                            <th
                              className="py-2.5 px-2 text-right font-semibold"
                              title="Volume 7d (ETH)"
                            >
                              Vol 7d
                            </th>
                            <th
                              className="py-2.5 px-2 text-right font-semibold"
                              title="Items within 5% of floor"
                            >
                              Near
                            </th>
                            <th className="py-2.5 px-2 text-right font-semibold">
                              2nd
                            </th>
                            <th className="py-2.5 px-2 text-right font-semibold">
                              3rd
                            </th>
                            <th className="py-2.5 px-2 text-right font-semibold">
                              4th
                            </th>
                            <th className="py-2.5 px-2 text-right font-semibold">
                              5th
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {leaderboardsData.digitalArt.collections.map((c) => {
                            const g = c.gaps ?? {
                              to2nd: 0,
                              to3rd: 0,
                              to4th: 0,
                              to5th: 0,
                              to6th: 0,
                            };
                            const fmt = (v: number) =>
                              v > 0 ? `${v.toFixed(3)} ETH` : "—";
                            const salesLabel = c.allSalesBelowFloor
                              ? "⚠️ All below floor"
                              : c.maxRecentSaleEth != null &&
                                  c.maxRecentSaleEth > 0
                                ? `${c.maxRecentSaleEth.toFixed(2)} max (${(c.recentSalesPrices ?? []).length})`
                                : "—";
                            const categoryLabel =
                              c.category === "blue_chip"
                                ? "Blue Chip"
                                : c.category === "generative"
                                  ? "Generative"
                                  : c.category === "photography"
                                    ? "Photo"
                                    : null;
                            const vol7d =
                              c.volume7d != null && c.volume7d > 0
                                ? c.volume7d >= 1000
                                  ? `${(c.volume7d / 1000).toFixed(1)}K ETH`
                                  : `${c.volume7d.toFixed(1)} ETH`
                                : "—";
                            return (
                              <tr
                                key={c.slug}
                                className="border-b border-border/40 last:border-0 hover:bg-muted/30"
                              >
                                <td className="py-2 px-3">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-medium">
                                      {c.name}
                                    </span>
                                    {categoryLabel && (
                                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                        {categoryLabel}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <div className="tabular-nums">
                                    {c.floorPrice.toFixed(2)} ETH
                                    {c.floorPriceUsd != null &&
                                      c.floorPriceUsd > 0 && (
                                        <div className="text-[10px] text-muted-foreground">
                                          ${(c.floorPriceUsd / 1000).toFixed(1)}
                                          K
                                        </div>
                                      )}
                                  </div>
                                </td>
                                <td
                                  className={`py-2 px-2 text-right tabular-nums text-xs ${c.allSalesBelowFloor ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"}`}
                                  title={
                                    (c.recentSalesPrices ?? []).length > 0
                                      ? `Recent: ${(c.recentSalesPrices ?? []).map((p: number) => p.toFixed(2)).join(", ")} ETH`
                                      : undefined
                                  }
                                >
                                  {salesLabel}
                                </td>
                                <td className="py-2 px-3 text-right capitalize">
                                  {c.floorThickness}
                                </td>
                                <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                                  {vol7d}
                                </td>
                                <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                                  {c.nftsNearFloor != null &&
                                  c.nftsNearFloor > 0
                                    ? c.nftsNearFloor
                                    : "—"}
                                </td>
                                <td
                                  className="py-2 px-2 text-right tabular-nums text-muted-foreground"
                                  title={
                                    c.gapPctTo2nd != null
                                      ? `Gap ${c.gapPctTo2nd.toFixed(1)}% of floor`
                                      : undefined
                                  }
                                >
                                  {fmt(g.to2nd)}
                                </td>
                                <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                                  {fmt(g.to3rd)}
                                </td>
                                <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                                  {fmt(g.to4th)}
                                </td>
                                <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                                  {fmt(g.to5th)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground py-6">
                      No NFT data yet. Set OPENSEA_API_KEY for curated
                      collection floor prices.
                    </p>
                  )}
                </DashboardCard>

                {/* All curated collections by volume (no strict gem criteria; filter: volume 7d > 0) */}
                {(leaderboardsData.digitalArt.volumeLeaders ?? []).length >
                  0 && (
                  <DashboardCard
                    title="All collections by volume"
                    subtitle="Filter: 7d volume &gt; 0 · Sorted by most volume"
                  >
                    <div className="rounded-md border border-border/60 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/60 bg-muted/30">
                            <th className="py-2.5 px-3 text-left font-semibold">
                              Collection
                            </th>
                            <th className="py-2.5 px-3 text-right font-semibold">
                              Floor
                            </th>
                            <th
                              className="py-2.5 px-2 text-right font-semibold"
                              title="Recent sale prices"
                            >
                              Sales
                            </th>
                            <th className="py-2.5 px-3 text-right font-semibold">
                              Thickness
                            </th>
                            <th
                              className="py-2.5 px-2 text-right font-semibold"
                              title="Volume 7d (ETH)"
                            >
                              Vol 7d
                            </th>
                            <th
                              className="py-2.5 px-2 text-right font-semibold"
                              title="Items within 5% of floor"
                            >
                              Near
                            </th>
                            <th className="py-2.5 px-2 text-right font-semibold">
                              2nd
                            </th>
                            <th className="py-2.5 px-2 text-right font-semibold">
                              3rd
                            </th>
                            <th className="py-2.5 px-2 text-right font-semibold">
                              4th
                            </th>
                            <th className="py-2.5 px-2 text-right font-semibold">
                              5th
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {(
                            leaderboardsData.digitalArt.volumeLeaders ?? []
                          ).map((c) => {
                            const g = c.gaps ?? {
                              to2nd: 0,
                              to3rd: 0,
                              to4th: 0,
                              to5th: 0,
                              to6th: 0,
                            };
                            const fmt = (v: number) =>
                              v > 0 ? `${v.toFixed(3)} ETH` : "—";
                            const salesLabel = c.allSalesBelowFloor
                              ? "⚠️ All below floor"
                              : c.maxRecentSaleEth != null &&
                                  c.maxRecentSaleEth > 0
                                ? `${c.maxRecentSaleEth.toFixed(2)} max (${(c.recentSalesPrices ?? []).length})`
                                : "—";
                            const categoryLabel =
                              c.category === "blue_chip"
                                ? "Blue Chip"
                                : c.category === "generative"
                                  ? "Generative"
                                  : c.category === "photography"
                                    ? "Photo"
                                    : null;
                            const vol7d =
                              c.volume7d != null && c.volume7d > 0
                                ? c.volume7d >= 1000
                                  ? `${(c.volume7d / 1000).toFixed(1)}K ETH`
                                  : `${c.volume7d.toFixed(1)} ETH`
                                : "—";
                            return (
                              <tr
                                key={c.slug}
                                className="border-b border-border/40 last:border-0 hover:bg-muted/30"
                              >
                                <td className="py-2 px-3">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-medium">
                                      {c.name}
                                    </span>
                                    {categoryLabel && (
                                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                        {categoryLabel}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 text-right">
                                  <div className="tabular-nums">
                                    {c.floorPrice.toFixed(2)} ETH
                                    {c.floorPriceUsd != null &&
                                      c.floorPriceUsd > 0 && (
                                        <div className="text-[10px] text-muted-foreground">
                                          ${(c.floorPriceUsd / 1000).toFixed(1)}
                                          K
                                        </div>
                                      )}
                                  </div>
                                </td>
                                <td
                                  className={`py-2 px-2 text-right tabular-nums text-xs ${c.allSalesBelowFloor ? "text-amber-600 dark:text-amber-400 font-medium" : "text-muted-foreground"}`}
                                  title={
                                    (c.recentSalesPrices ?? []).length > 0
                                      ? `Recent: ${(c.recentSalesPrices ?? []).map((p: number) => p.toFixed(2)).join(", ")} ETH`
                                      : undefined
                                  }
                                >
                                  {salesLabel}
                                </td>
                                <td className="py-2 px-3 text-right capitalize">
                                  {c.floorThickness}
                                </td>
                                <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                                  {vol7d}
                                </td>
                                <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                                  {c.nftsNearFloor != null &&
                                  c.nftsNearFloor > 0
                                    ? c.nftsNearFloor
                                    : "—"}
                                </td>
                                <td
                                  className="py-2 px-2 text-right tabular-nums text-muted-foreground"
                                  title={
                                    c.gapPctTo2nd != null
                                      ? `Gap ${c.gapPctTo2nd.toFixed(1)}% of floor`
                                      : undefined
                                  }
                                >
                                  {fmt(g.to2nd)}
                                </td>
                                <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                                  {fmt(g.to3rd)}
                                </td>
                                <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                                  {fmt(g.to4th)}
                                </td>
                                <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">
                                  {fmt(g.to5th)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </DashboardCard>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center">
                <Palette className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">
                  No Digital Art data
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Switch to Markets to load data, or set OPENSEA_API_KEY for NFT
                  floor prices.
                </p>
              </div>
            )}
          </TabsContent>

          {/* More tab: Fear & Greed, Options, Binance Intel, CoinGlass, Deribit skew, Sanbase, Nansen, Cross-venue funding, OI cap, Alerts */}
          <TabsContent
            value="more"
            className="mt-6 flex-1 min-h-0 overflow-auto"
          >
            {(leaderboardsLoading || leaderboardsFetching) &&
            !leaderboardsData?.more ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="h-32 bg-muted/50 rounded-xl animate-pulse"
                  />
                ))}
              </div>
            ) : leaderboardsData?.more ? (
              <div className="space-y-6">
                <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 border border-border/50 px-4 py-3">
                  <p className="text-sm font-medium text-foreground/90">
                    Fear & Greed, Options, Binance Intel, CoinGlass, Deribit
                    skew, Sanbase, Nansen, Cross-venue funding, OI cap, Alerts
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
                          <p className="font-medium capitalize">
                            {leaderboardsData.more.fearGreed.label}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {leaderboardsData.more.fearGreed.classification}
                          </p>
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
                            <span className="font-mono">
                              BTC DVOL:{" "}
                              {leaderboardsData.more.options.btcDvol.toFixed(1)}
                              %
                            </span>
                          )}
                          {leaderboardsData.more.options.ethDvol != null && (
                            <span className="font-mono">
                              ETH DVOL:{" "}
                              {leaderboardsData.more.options.ethDvol.toFixed(1)}
                              %
                            </span>
                          )}
                        </div>
                        {leaderboardsData.more.options.btcTldr && (
                          <p className="text-xs text-muted-foreground">
                            {leaderboardsData.more.options.btcTldr}
                          </p>
                        )}
                        {leaderboardsData.more.options.ethTldr && (
                          <p className="text-xs text-muted-foreground">
                            {leaderboardsData.more.options.ethTldr}
                          </p>
                        )}
                      </div>
                    </DashboardCard>
                  )}

                  {/* Volume insights (24h vs 7d avg — same signal paper bot uses for sizing) */}
                  {leaderboardsData.more.volumeInsights &&
                    (leaderboardsData.more.volumeInsights.assets?.length ?? 0) >
                      0 && (
                      <DashboardCard
                        title="Volume (24h vs 7d avg)"
                        className="lg:col-span-2"
                      >
                        <div className="space-y-4">
                          <div className="rounded-lg bg-muted/40 border border-border/50 p-4 text-sm text-muted-foreground space-y-2">
                            <p className="font-medium text-foreground">
                              Why volume matters
                            </p>
                            <p>
                              Volume confirms whether price moves are backed by
                              real flow or just thin, noisy action. High volume
                              vs the 7-day average suggests conviction and
                              momentum; low or &quot;dead&quot; volume often
                              means fakeouts and whipsaws. The paper bot uses
                              this ratio to size positions: it increases size
                              when volume confirms the move and reduces size
                              when volume is weak so we don’t trade full size in
                              unreliable conditions.
                            </p>
                            <p className="pt-1 text-xs">
                              <strong>Bot sizing:</strong> Spike (≥2×) +20% ·
                              Elevated (≥1.5×) +10% · Normal (0.8–1.5×) no
                              change · Low (&lt;0.8×) −20% · Dead (&lt;0.5×)
                              −50%
                            </p>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border">
                                  <th className="text-left py-2 font-medium">
                                    Asset
                                  </th>
                                  <th className="text-right py-2 font-medium">
                                    24h vol
                                  </th>
                                  <th className="text-right py-2 font-medium">
                                    Ratio
                                  </th>
                                  <th className="text-right py-2 font-medium">
                                    Interpretation
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {leaderboardsData.more.volumeInsights.assets.map(
                                  (a) => {
                                    const interp = a.interpretation;
                                    const badgeClass =
                                      interp === "spike"
                                        ? "text-green-600 dark:text-green-400 font-medium"
                                        : interp === "elevated"
                                          ? "text-green-600/80 dark:text-green-400/80"
                                          : interp === "dead_session"
                                            ? "text-amber-600 dark:text-amber-400 font-medium"
                                            : interp === "low"
                                              ? "text-amber-600/80 dark:text-amber-400/80"
                                              : "text-muted-foreground";
                                    return (
                                      <tr
                                        key={a.asset}
                                        className="border-b border-border/50"
                                      >
                                        <td className="py-1.5 font-medium">
                                          {a.asset}
                                        </td>
                                        <td className="py-1.5 text-right font-mono tabular-nums">
                                          {a.volume24hFormatted ?? "—"}
                                        </td>
                                        <td className="py-1.5 text-right font-mono tabular-nums">
                                          {a.volumeRatio != null
                                            ? `${a.volumeRatio.toFixed(2)}×`
                                            : "—"}
                                        </td>
                                        <td
                                          className={`py-1.5 text-right capitalize ${badgeClass}`}
                                        >
                                          {interp.replace("_", " ")}
                                        </td>
                                      </tr>
                                    );
                                  },
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </DashboardCard>
                    )}

                  {/* Cross-venue funding */}
                  {leaderboardsData.more.crossVenue &&
                    (leaderboardsData.more.crossVenue.assets?.length ?? 0) >
                      0 && (
                      <DashboardCard
                        title="Cross-venue funding"
                        className="lg:col-span-2"
                      >
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-2 font-medium">
                                  Coin
                                </th>
                                <th className="text-right py-2 font-medium">
                                  HL
                                </th>
                                <th className="text-right py-2 font-medium">
                                  CEX
                                </th>
                                <th className="text-left py-2 font-medium">
                                  Arb
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {leaderboardsData.more.crossVenue.assets.map(
                                (a) => (
                                  <tr
                                    key={a.coin}
                                    className="border-b border-border/50"
                                  >
                                    <td className="py-1.5 font-medium">
                                      {a.coin}
                                    </td>
                                    <td className="py-1.5 text-right font-mono">
                                      {a.hlFunding != null
                                        ? (a.hlFunding * 100).toFixed(4) + "%"
                                        : "—"}
                                    </td>
                                    <td className="py-1.5 text-right font-mono">
                                      {a.cexFunding != null
                                        ? (a.cexFunding * 100).toFixed(4) + "%"
                                        : "—"}
                                    </td>
                                    <td className="py-1.5 text-muted-foreground">
                                      {a.arb ?? "—"}
                                    </td>
                                  </tr>
                                ),
                              )}
                            </tbody>
                          </table>
                        </div>
                        {leaderboardsData.more.crossVenue.arbOpportunities
                          ?.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Arb:{" "}
                            {leaderboardsData.more.crossVenue.arbOpportunities.join(
                              ", ",
                            )}
                          </p>
                        )}
                      </DashboardCard>
                    )}

                  {/* OI cap */}
                  {leaderboardsData.more.oiCap &&
                    leaderboardsData.more.oiCap.length > 0 && (
                      <DashboardCard title="Perps at OI cap">
                        <ul className="flex flex-wrap gap-2">
                          {leaderboardsData.more.oiCap.map((s) => (
                            <li
                              key={s}
                              className="px-2 py-1 rounded bg-muted/50 text-sm font-mono"
                            >
                              {s}
                            </li>
                          ))}
                        </ul>
                      </DashboardCard>
                    )}

                  {/* Regime */}
                  {leaderboardsData.more.regime &&
                    (leaderboardsData.more.regime.btc ||
                      leaderboardsData.more.regime.eth) && (
                      <DashboardCard title="Market regime">
                        <div className="flex gap-4 text-sm">
                          {leaderboardsData.more.regime.btc && (
                            <span>BTC: {leaderboardsData.more.regime.btc}</span>
                          )}
                          {leaderboardsData.more.regime.eth && (
                            <span>ETH: {leaderboardsData.more.regime.eth}</span>
                          )}
                        </div>
                      </DashboardCard>
                    )}

                  {/* Binance Intelligence */}
                  {leaderboardsData.more.binanceIntel && (
                    <DashboardCard title="Binance Intelligence">
                      <div className="space-y-2 text-sm">
                        <div className="flex gap-4">
                          {leaderboardsData.more.binanceIntel.topTraderRatio !=
                            null && (
                            <span className="font-mono">
                              Top L/S:{" "}
                              {leaderboardsData.more.binanceIntel.topTraderRatio.toFixed(
                                2,
                              )}
                            </span>
                          )}
                          {leaderboardsData.more.binanceIntel
                            .takerBuySellRatio != null && (
                            <span className="font-mono">
                              Taker B/S:{" "}
                              {leaderboardsData.more.binanceIntel.takerBuySellRatio.toFixed(
                                2,
                              )}
                            </span>
                          )}
                        </div>
                        {leaderboardsData.more.binanceIntel.fundingExtreme && (
                          <p className="text-amber-600 dark:text-amber-400 text-xs">
                            Funding extreme:{" "}
                            {leaderboardsData.more.binanceIntel
                              .fundingDirection ?? "—"}
                          </p>
                        )}
                        {(leaderboardsData.more.binanceIntel.bestLong ||
                          leaderboardsData.more.binanceIntel.bestShort) && (
                          <p className="text-xs text-muted-foreground">
                            Cross-ex: spread{" "}
                            {leaderboardsData.more.binanceIntel
                              .crossExchangeSpread != null
                              ? (
                                  leaderboardsData.more.binanceIntel
                                    .crossExchangeSpread * 100
                                ).toFixed(4) + "%"
                              : "—"}
                            {leaderboardsData.more.binanceIntel.bestLong &&
                              ` · Long ${leaderboardsData.more.binanceIntel.bestLong}`}
                            {leaderboardsData.more.binanceIntel.bestShort &&
                              ` · Short ${leaderboardsData.more.binanceIntel.bestShort}`}
                          </p>
                        )}
                      </div>
                    </DashboardCard>
                  )}

                  {/* CoinGlass Extended */}
                  {leaderboardsData.more.coinglassExtended &&
                    (leaderboardsData.more.coinglassExtended.funding?.length >
                      0 ||
                      leaderboardsData.more.coinglassExtended.longShort
                        ?.length > 0 ||
                      leaderboardsData.more.coinglassExtended.openInterest
                        ?.length > 0) && (
                      <DashboardCard
                        title="CoinGlass Extended"
                        className="lg:col-span-2"
                      >
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-2 font-medium">
                                  Asset
                                </th>
                                <th className="text-right py-2 font-medium">
                                  Funding
                                </th>
                                <th className="text-right py-2 font-medium">
                                  L/S
                                </th>
                                <th className="text-right py-2 font-medium">
                                  OI
                                </th>
                                <th className="text-right py-2 font-medium">
                                  OI Δ24h
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const fundingMap = new Map(
                                  (
                                    leaderboardsData.more.coinglassExtended
                                      ?.funding ?? []
                                  ).map((f) => [f.asset, f.rate]),
                                );
                                const lsMap = new Map(
                                  (
                                    leaderboardsData.more.coinglassExtended
                                      ?.longShort ?? []
                                  ).map((ls) => [ls.asset, ls.ratio]),
                                );
                                const oiMap = new Map(
                                  (
                                    leaderboardsData.more.coinglassExtended
                                      ?.openInterest ?? []
                                  ).map((oi) => [oi.asset, oi]),
                                );
                                const assets = [
                                  ...new Set([
                                    ...fundingMap.keys(),
                                    ...lsMap.keys(),
                                    ...oiMap.keys(),
                                  ]),
                                ].slice(0, 10);
                                return assets.map((asset) => {
                                  const rate = fundingMap.get(asset);
                                  const ratio = lsMap.get(asset);
                                  const oi = oiMap.get(asset);
                                  return (
                                    <tr
                                      key={asset}
                                      className="border-b border-border/50"
                                    >
                                      <td className="py-1.5 font-medium">
                                        {asset}
                                      </td>
                                      <td className="py-1.5 text-right font-mono">
                                        {rate != null
                                          ? (rate * 100).toFixed(4) + "%"
                                          : "—"}
                                      </td>
                                      <td className="py-1.5 text-right font-mono">
                                        {ratio != null ? ratio.toFixed(2) : "—"}
                                      </td>
                                      <td className="py-1.5 text-right font-mono">
                                        {oi != null
                                          ? `$${(oi.value / 1e9).toFixed(2)}B`
                                          : "—"}
                                      </td>
                                      <td className="py-1.5 text-right font-mono">
                                        {oi?.change24h != null
                                          ? (oi.change24h >= 0 ? "+" : "") +
                                            oi.change24h.toFixed(1) +
                                            "%"
                                          : "—"}
                                      </td>
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
                  {leaderboardsData.more.deribitSkew &&
                    (leaderboardsData.more.deribitSkew.btc ||
                      leaderboardsData.more.deribitSkew.eth) && (
                      <DashboardCard title="Deribit IV Skew">
                        <div className="flex gap-4 text-sm">
                          {leaderboardsData.more.deribitSkew.btc && (
                            <span>
                              BTC:{" "}
                              <span
                                className={cn(
                                  "font-medium",
                                  leaderboardsData.more.deribitSkew.btc
                                    .skewInterpretation === "fearful" &&
                                    "text-amber-600 dark:text-amber-400",
                                  leaderboardsData.more.deribitSkew.btc
                                    .skewInterpretation === "bullish" &&
                                    "text-green-600 dark:text-green-400",
                                )}
                              >
                                {
                                  leaderboardsData.more.deribitSkew.btc
                                    .skewInterpretation
                                }
                              </span>
                            </span>
                          )}
                          {leaderboardsData.more.deribitSkew.eth && (
                            <span>
                              ETH:{" "}
                              <span
                                className={cn(
                                  "font-medium",
                                  leaderboardsData.more.deribitSkew.eth
                                    .skewInterpretation === "fearful" &&
                                    "text-amber-600 dark:text-amber-400",
                                  leaderboardsData.more.deribitSkew.eth
                                    .skewInterpretation === "bullish" &&
                                    "text-green-600 dark:text-green-400",
                                )}
                              >
                                {
                                  leaderboardsData.more.deribitSkew.eth
                                    .skewInterpretation
                                }
                              </span>
                            </span>
                          )}
                        </div>
                      </DashboardCard>
                    )}

                  {/* Sanbase On-Chain */}
                  {leaderboardsData.more.sanbaseOnChain &&
                    (leaderboardsData.more.sanbaseOnChain.btc ||
                      leaderboardsData.more.sanbaseOnChain.eth) && (
                      <DashboardCard title="Sanbase On-Chain">
                        <div className="space-y-3 text-sm">
                          {leaderboardsData.more.sanbaseOnChain.btc && (
                            <div>
                              <p className="font-medium mb-1">BTC</p>
                              <p className="text-xs text-muted-foreground">
                                Flows:{" "}
                                {leaderboardsData.more.sanbaseOnChain.btc.flows}{" "}
                                · Whales:{" "}
                                {
                                  leaderboardsData.more.sanbaseOnChain.btc
                                    .whales
                                }
                              </p>
                              <p className="text-xs mt-0.5">
                                {leaderboardsData.more.sanbaseOnChain.btc.tldr}
                              </p>
                            </div>
                          )}
                          {leaderboardsData.more.sanbaseOnChain.eth && (
                            <div>
                              <p className="font-medium mb-1">ETH</p>
                              <p className="text-xs text-muted-foreground">
                                Flows:{" "}
                                {leaderboardsData.more.sanbaseOnChain.eth.flows}{" "}
                                · Whales:{" "}
                                {
                                  leaderboardsData.more.sanbaseOnChain.eth
                                    .whales
                                }
                              </p>
                              <p className="text-xs mt-0.5">
                                {leaderboardsData.more.sanbaseOnChain.eth.tldr}
                              </p>
                            </div>
                          )}
                        </div>
                      </DashboardCard>
                    )}

                  {/* Nansen Smart Money */}
                  {leaderboardsData.more.nansenSmartMoney &&
                    (leaderboardsData.more.nansenSmartMoney.tokens?.length >
                      0 ||
                      leaderboardsData.more.nansenSmartMoney.creditRemaining !=
                        null) && (
                      <DashboardCard
                        title="Nansen Smart Money"
                        className="lg:col-span-2"
                      >
                        {leaderboardsData.more.nansenSmartMoney
                          .creditRemaining != null && (
                          <p className="text-xs text-muted-foreground mb-2">
                            Credits:{" "}
                            {
                              leaderboardsData.more.nansenSmartMoney
                                .creditRemaining
                            }
                            /100
                          </p>
                        )}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border">
                                <th className="text-left py-2 font-medium">
                                  Symbol
                                </th>
                                <th className="text-left py-2 font-medium">
                                  Chain
                                </th>
                                <th className="text-right py-2 font-medium">
                                  Net Flow
                                </th>
                                <th className="text-right py-2 font-medium">
                                  Buy Vol
                                </th>
                                <th className="text-right py-2 font-medium">
                                  24h %
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(
                                leaderboardsData.more.nansenSmartMoney.tokens ??
                                []
                              ).map((t) => (
                                <tr
                                  key={`${t.symbol}-${t.chain}`}
                                  className="border-b border-border/50"
                                >
                                  <td className="py-1.5 font-medium">
                                    {t.symbol}
                                  </td>
                                  <td className="py-1.5 text-muted-foreground">
                                    {t.chain}
                                  </td>
                                  <td className="py-1.5 text-right font-mono">
                                    ${(t.netFlow / 1000).toFixed(1)}K
                                  </td>
                                  <td className="py-1.5 text-right font-mono">
                                    ${(t.buyVolume / 1000).toFixed(1)}K
                                  </td>
                                  <td
                                    className={cn(
                                      "py-1.5 text-right font-mono",
                                      t.priceChange24h >= 0
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-red-600 dark:text-red-400",
                                    )}
                                  >
                                    {(t.priceChange24h >= 0 ? "+" : "") +
                                      t.priceChange24h.toFixed(1)}
                                    %
                                  </td>
                                </tr>
                              ))}
                              {(
                                leaderboardsData.more.nansenSmartMoney.tokens ??
                                []
                              ).length === 0 && (
                                <tr>
                                  <td
                                    colSpan={5}
                                    className="py-4 text-center text-muted-foreground text-xs"
                                  >
                                    No smart money tokens
                                  </td>
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
                        <span>
                          Unread: {leaderboardsData.more.alerts.unread}
                        </span>
                        <span className="text-amber-600 dark:text-amber-400">
                          High: {leaderboardsData.more.alerts.highPriority}
                        </span>
                      </div>
                      <ul className="space-y-2 max-h-48 overflow-y-auto">
                        {(leaderboardsData.more.alerts.items ?? []).map(
                          (a, i) => (
                            <li
                              key={i}
                              className="rounded border border-border/50 px-3 py-2 text-xs"
                            >
                              <span className="font-medium">{a.type}</span> ·{" "}
                              {a.title} — {a.message}
                              <span className="block text-muted-foreground mt-0.5">
                                {new Date(a.timestamp).toLocaleString()}
                              </span>
                            </li>
                          ),
                        )}
                        {(leaderboardsData.more.alerts.items ?? []).length ===
                          0 && (
                          <li className="text-muted-foreground">No alerts</li>
                        )}
                      </ul>
                    </DashboardCard>
                  )}
                </div>

                {!leaderboardsData.more.fearGreed &&
                  !leaderboardsData.more.options &&
                  !leaderboardsData.more.volumeInsights &&
                  !leaderboardsData.more.crossVenue &&
                  !leaderboardsData.more.oiCap &&
                  !leaderboardsData.more.alerts &&
                  !leaderboardsData.more.regime &&
                  !leaderboardsData.more.binanceIntel &&
                  !leaderboardsData.more.coinglassExtended &&
                  !leaderboardsData.more.deribitSkew &&
                  !leaderboardsData.more.sanbaseOnChain &&
                  !leaderboardsData.more.nansenSmartMoney && (
                    <p className="text-center text-muted-foreground py-8">
                      No MORE data available. Try again in a moment.
                    </p>
                  )}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center space-y-3 min-h-[200px] flex flex-col justify-center">
                <p className="font-medium text-foreground">
                  Could not load MORE data
                </p>
                <p className="text-sm text-muted-foreground">
                  Make sure VINCE is running, then click Refresh above.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Polymarket tab: priority markets and why we track */}
          <TabsContent
            value="polymarket"
            className="mt-6 flex-1 min-h-0 overflow-auto"
          >
            <div className="space-y-6">
              {/* Edge engine status (multi-strategy: overreaction, model fair value, Synth) */}
              {oracleAgentId && (
                <DashboardCard title="Edge engine">
                  {(edgeStatusLoading || edgeStatusFetching) && !edgeStatus ? (
                    <p className="text-sm text-muted-foreground">
                      Checking status…
                    </p>
                  ) : edgeStatus?.running ? (
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span
                        className={cn(
                          "font-medium",
                          edgeStatus.paused
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-green-600 dark:text-green-400",
                        )}
                      >
                        {edgeStatus.paused ? "Paused" : "Running"}
                      </span>
                      <span className="text-muted-foreground">
                        Contracts: {edgeStatus.contractsWatched ?? 0}
                      </span>
                      {edgeStatus.btcLastPrice != null &&
                        edgeStatus.btcLastPrice > 0 && (
                          <span className="text-muted-foreground">
                            BTC: $
                            {edgeStatus.btcLastPrice.toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        )}
                      {edgeStatus.strategies &&
                        Object.keys(edgeStatus.strategies).length > 0 && (
                          <span className="text-muted-foreground">
                            Strategies:{" "}
                            {Object.entries(edgeStatus.strategies)
                              .map(
                                ([name, s]) =>
                                  `${name} (${s.signalCount ?? 0})`,
                              )
                              .join(", ")}
                          </span>
                        )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Not running or edge engine not available on Oracle.
                    </p>
                  )}
                </DashboardCard>
              )}

              {/* Paper trading: desk status (trades today, volume, execution P&L) */}
              {oracleAgentId && (
                <DashboardCard title="Paper trading">
                  {(deskStatusLoading || deskStatusFetching) && !deskStatus ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : deskStatus ? (
                    <>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-medium text-foreground">
                          Trades today: {deskStatus.tradesToday}
                        </span>
                        <span className="text-muted-foreground">
                          Volume: $
                          {deskStatus.volumeTodayUsd.toLocaleString(undefined, {
                            maximumFractionDigits: 0,
                          })}
                        </span>
                        <span
                          className={cn(
                            "font-mono font-medium",
                            deskStatus.tradesToday === 0
                              ? "text-muted-foreground"
                              : (deskStatus.executionPnlTodayUsd ?? 0) >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400",
                          )}
                        >
                          Execution P&L:{" "}
                          {deskStatus.tradesToday === 0 ? (
                            <>
                              —{" "}
                              <span className="text-xs font-normal">
                                (no fills yet)
                              </span>
                            </>
                          ) : (
                            <>
                              $
                              {(deskStatus.executionPnlTodayUsd ?? 0).toFixed(
                                2,
                              )}
                              <span className="text-xs font-normal text-muted-foreground ml-0.5">
                                (paper)
                              </span>
                            </>
                          )}
                        </span>
                        {(deskPositionsData?.positions?.length ?? 0) > 0 && (
                          <>
                            <span className="text-muted-foreground">
                              Open positions:{" "}
                              {deskPositionsData?.positions?.length ?? 0}
                            </span>
                            <span
                              className={cn(
                                "font-mono font-medium",
                                (deskPositionsData?.positions?.reduce(
                                  (s, p) => s + p.unrealizedPnl,
                                  0,
                                ) ?? 0) >= 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400",
                              )}
                            >
                              Paper P&L:{" "}
                              {(deskPositionsData?.positions?.reduce(
                                (s, p) => s + p.unrealizedPnl,
                                0,
                              ) ?? 0) >= 0
                                ? "+"
                                : ""}
                              $
                              {(
                                deskPositionsData?.positions?.reduce(
                                  (s, p) => s + p.unrealizedPnl,
                                  0,
                                ) ?? 0
                              ).toFixed(2)}
                            </span>
                          </>
                        )}
                        {deskStatus.pendingSignalsCount > 0 && (
                          <span className="text-muted-foreground">
                            Pending signals: {deskStatus.pendingSignalsCount}
                          </span>
                        )}
                      </div>
                      {deskStatus.tradesToday === 0 &&
                        (deskPositionsData?.positions?.length ?? 0) === 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            P&L is from filled trades only. Once Risk → Otaku
                            fills orders, paper gains/losses will appear here.
                          </p>
                        )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Desk not available or DB not configured.
                    </p>
                  )}
                </DashboardCard>
              )}

              {/* Open paper positions (pending sized orders with live P&L) */}
              {oracleAgentId && (
                <DashboardCard title="Open paper positions">
                  {(deskPositionsLoading || deskPositionsFetching) &&
                  !deskPositionsData ? (
                    <p className="text-sm text-muted-foreground">
                      Loading positions…
                    </p>
                  ) : (deskPositionsData?.positions?.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      No open paper positions. Pending sized orders appear here
                      once Risk approves signals (signals → sized orders).
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {(deskPositionsData?.positions ?? []).map((pos) => (
                        <div
                          key={pos.id}
                          className="rounded-lg border border-border bg-muted/20 p-4 space-y-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                "font-semibold",
                                pos.side === "YES"
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400",
                              )}
                            >
                              {pos.side}{" "}
                              {pos.question.length > 60
                                ? pos.question.slice(0, 60) + "…"
                                : pos.question}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              Entry {(pos.entryPrice * 100).toFixed(1)}%
                            </span>
                            <span
                              className={cn(
                                "font-mono font-medium",
                                (pos.unrealizedPnl ?? 0) >= 0
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-red-600 dark:text-red-400",
                              )}
                            >
                              P&L {pos.unrealizedPnl >= 0 ? "+" : ""}$
                              {pos.unrealizedPnl.toFixed(2)} (
                              {pos.unrealizedPnlPct >= 0 ? "+" : ""}
                              {pos.unrealizedPnlPct.toFixed(2)}%)
                            </span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                            <span className="text-muted-foreground">
                              Opened:{" "}
                              {pos.openedAt
                                ? new Date(pos.openedAt).toLocaleString(
                                    undefined,
                                    {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    },
                                  )
                                : "—"}
                            </span>
                            <span className="text-muted-foreground">
                              Size: ${pos.sizeUsd.toFixed(0)}
                            </span>
                            <span className="text-muted-foreground">
                              Current: {(pos.currentPrice * 100).toFixed(1)}%
                            </span>
                            <span className="text-muted-foreground">
                              Edge: {pos.edgeBps >= 0 ? "+" : ""}
                              {pos.edgeBps} bps
                            </span>
                            <span className="text-muted-foreground">
                              Strategy: {pos.strategy}
                            </span>
                          </div>
                          {pos.metadata &&
                          Object.keys(pos.metadata).length > 0 ? (
                            <div className="text-sm">
                              <p className="font-medium text-foreground mb-1">
                                Why this position
                              </p>
                              <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                                {Object.entries(pos.metadata).map(
                                  ([k, v]) =>
                                    v != null &&
                                    String(v).trim() !== "" && (
                                      <li key={k}>
                                        {k.replace(/_/g, " ")}:{" "}
                                        {typeof v === "object"
                                          ? JSON.stringify(v)
                                          : String(v)}
                                      </li>
                                    ),
                                )}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Why this position: — (no rationale stored)
                            </p>
                          )}
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                            <span>
                              Confidence {(pos.confidence * 100).toFixed(0)}%
                            </span>
                            <span>
                              Forecast {(pos.forecastProb * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </DashboardCard>
              )}

              {/* Polymarket paper trading — Recent trades (desk fills) */}
              {oracleAgentId && (
                <DashboardCard title="Polymarket paper trading — Recent trades">
                  {(deskTradesLoading || deskTradesFetching) &&
                  !deskTradesData ? (
                    <p className="text-sm text-muted-foreground">
                      Loading trades…
                    </p>
                  ) : (deskTradesData?.trades?.length ?? 0) === 0 ? (
                    <div className="text-sm text-muted-foreground py-4 space-y-1">
                      <p>
                        No fills yet. Trades appear when the desk pipeline runs:
                        Risk approves a signal and Otaku executes on the CLOB.
                      </p>
                      <p>
                        If you see many signals but no trades, ensure Risk and
                        Otaku (Executor) are configured and polling the desk
                        (signals → sized orders → fills).
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground uppercase">
                            <th className="pb-2 pr-3">Time</th>
                            <th className="pb-2 pr-3">Side</th>
                            <th className="pb-2 pr-3">Market</th>
                            <th className="pb-2 pr-3">Size $</th>
                            <th className="pb-2 pr-3">Arrival</th>
                            <th className="pb-2 pr-3">Fill</th>
                            <th className="pb-2">P&L $</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(deskTradesData?.trades ?? []).map((t) => (
                            <tr
                              key={t.id}
                              className="border-b border-border/50"
                            >
                              <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                                {t.createdAt
                                  ? new Date(t.createdAt).toLocaleString(
                                      undefined,
                                      {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )
                                  : "—"}
                              </td>
                              <td className="py-2 pr-3 font-mono">{t.side}</td>
                              <td
                                className="py-2 pr-3 font-mono truncate max-w-[8rem]"
                                title={t.marketId}
                              >
                                {t.marketId.slice(0, 8)}…
                              </td>
                              <td className="py-2 pr-3 font-mono">
                                $
                                {t.sizeUsd.toLocaleString(undefined, {
                                  maximumFractionDigits: 0,
                                })}
                              </td>
                              <td className="py-2 pr-3 font-mono">
                                {t.arrivalPrice != null
                                  ? (t.arrivalPrice * 100).toFixed(1) + "%"
                                  : "—"}
                              </td>
                              <td className="py-2 pr-3 font-mono">
                                {(t.fillPrice * 100).toFixed(1)}%
                              </td>
                              <td
                                className={cn(
                                  "py-2 font-mono font-medium",
                                  (t.executionPnlUsd ?? 0) >= 0
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-red-600 dark:text-red-400",
                                )}
                              >
                                {t.executionPnlUsd != null
                                  ? `${t.executionPnlUsd >= 0 ? "+" : ""}$${t.executionPnlUsd.toFixed(2)}`
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </DashboardCard>
              )}

              {/* Edge engine — Recent signals */}
              {oracleAgentId && (
                <DashboardCard title="Polymarket edge — Recent signals">
                  {(edgeSignalsLoading || edgeSignalsFetching) &&
                  !edgeSignalsData ? (
                    <p className="text-sm text-muted-foreground">
                      Loading signals…
                    </p>
                  ) : (edgeSignalsData?.signals?.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground py-4">
                      No edge signals yet. Signals appear when overreaction,
                      model fair value, or Synth strategies detect edge; they
                      feed the desk pipeline (Risk → Executor).
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground uppercase">
                            <th className="pb-2 pr-3">Time</th>
                            <th className="pb-2 pr-3">Strategy</th>
                            <th className="pb-2 pr-3">Side</th>
                            <th className="pb-2 pr-3">Market</th>
                            <th className="pb-2 pr-3">Edge bps</th>
                            <th className="pb-2 pr-3">Forecast</th>
                            <th className="pb-2">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(edgeSignalsData?.signals ?? []).map((s) => (
                            <tr
                              key={s.id}
                              className="border-b border-border/50"
                            >
                              <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                                {s.createdAt
                                  ? new Date(s.createdAt).toLocaleString(
                                      undefined,
                                      {
                                        month: "short",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )
                                  : "—"}
                              </td>
                              <td className="py-2 pr-3 font-mono">
                                {s.strategy}
                              </td>
                              <td className="py-2 pr-3 font-mono">{s.side}</td>
                              <td
                                className="py-2 pr-3 font-mono truncate max-w-[8rem]"
                                title={s.marketId}
                              >
                                {s.marketId.slice(0, 8)}…
                              </td>
                              <td className="py-2 pr-3 font-mono">
                                {s.edgeBps != null
                                  ? `${s.edgeBps >= 0 ? "+" : ""}${s.edgeBps.toFixed(0)} bps`
                                  : "—"}
                              </td>
                              <td className="py-2 pr-3 font-mono">
                                {s.forecastProb != null
                                  ? (s.forecastProb * 100).toFixed(1) + "%"
                                  : "—"}
                              </td>
                              <td className="py-2 font-mono">
                                {s.marketPrice != null
                                  ? (s.marketPrice * 100).toFixed(1) + "%"
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </DashboardCard>
              )}

              {/* Why we track — static fallback + API copy when available */}
              <DashboardCard title="Why we track these markets">
                <p className="text-sm font-medium text-foreground/95">
                  {polymarketData?.whyWeTrack ??
                    "Priority markets are a palantir into what the market thinks. We use them for: (1) Paper bot — short-term perps on Hyperliquid. (2) Hypersurface strike selection — weekly predictions are the most important. (3) Macro vibe check."}
                </p>
                {polymarketData?.intentSummary && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {polymarketData.intentSummary}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Read-only. No wallet or auth; for positions use Oracle in chat
                  with a wallet address.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Data from last fetch; use Refresh for latest.
                </p>
              </DashboardCard>

              {(polymarketLoading || polymarketFetching) && !polymarketData ? (
                <div className="space-y-4">
                  <div className="h-32 bg-muted/50 rounded-xl animate-pulse" />
                  <div className="h-24 bg-muted/50 rounded-xl animate-pulse" />
                </div>
              ) : !oracleAgentId ? (
                <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center space-y-3 min-h-[120px] flex flex-col justify-center">
                  <p className="font-medium text-foreground">
                    Oracle agent not found
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Enable the Oracle agent for live priority markets data.
                  </p>
                </div>
              ) : polymarketError ? (
                <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center space-y-3 min-h-[120px] flex flex-col justify-center">
                  <p className="font-medium text-foreground">
                    Could not load priority markets
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {polymarketError}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ensure the Oracle agent is running, then click Refresh.
                    Start the Oracle agent from the Agents panel if it is
                    stopped.
                  </p>
                </div>
              ) : (polymarketData?.markets &&
                  polymarketData.markets.length > 0) ||
                (polymarketData?.tagSections &&
                  Object.keys(polymarketData.tagSections).length > 0) ? (
                (() => {
                  type PM = (typeof polymarketData.markets)[number];
                  const TAG_SECTION_ORDER = [
                    "bitcoin",
                    "ethereum",
                    "solana",
                    "microstrategy",
                    "etf",
                    "stocks",
                    "fed-rates",
                    "treasuries",
                    "geopolitics",
                    "economy",
                  ] as const;
                  type PolymarketSection =
                    | "Crypto"
                    | "Stocks"
                    | "Macro & Geopolitics"
                    | "Other";
                  const SECTION_ORDER: PolymarketSection[] = [
                    "Crypto",
                    "Stocks",
                    "Macro & Geopolitics",
                    "Other",
                  ];
                  const getPolymarketSection = (
                    category: string | undefined,
                  ): PolymarketSection => {
                    const c = (category ?? "").toLowerCase().trim();
                    if (!c) return "Other";
                    if (/crypto|bitcoin|ethereum|solana|defi/.test(c))
                      return "Crypto";
                    if (
                      /finance|stocks|ipo|indices|commodities|equities/.test(c)
                    )
                      return "Stocks";
                    if (
                      /economy|politics|geopolitics|economics|fed|treasuries/.test(
                        c,
                      )
                    )
                      return "Macro & Geopolitics";
                    return "Other";
                  };
                  const openMarkets = polymarketData.markets.filter(
                    (m) =>
                      (!m.endDateIso ||
                        new Date(m.endDateIso).getTime() > Date.now()) &&
                      (m.yesPrice == null || m.yesPrice >= 0.05),
                  );
                  const bySection = openMarkets.reduce<
                    Record<PolymarketSection, PM[]>
                  >(
                    (acc, m) => {
                      const section = getPolymarketSection(m.category);
                      if (!acc[section]) acc[section] = [];
                      acc[section].push(m);
                      return acc;
                    },
                    {} as Record<PolymarketSection, PM[]>,
                  );
                  const sortMarkets = (list: PM[]): PM[] => {
                    const copy = [...list];
                    if (polymarketSort === "yes") {
                      copy.sort(
                        (a, b) => (b.yesPrice ?? 0) - (a.yesPrice ?? 0),
                      );
                    } else if (polymarketSort === "volume") {
                      copy.sort(
                        (a, b) => Number(b.volume ?? 0) - Number(a.volume ?? 0),
                      );
                    } else {
                      copy.sort((a, b) => {
                        const ta = a.endDateIso
                          ? new Date(a.endDateIso).getTime()
                          : 0;
                        const tb = b.endDateIso
                          ? new Date(b.endDateIso).getTime()
                          : 0;
                        return ta - tb;
                      });
                    }
                    return copy;
                  };
                  const weekFromNow = Date.now() + 7 * 24 * 60 * 60 * 1000;
                  const closeThisWeek = openMarkets.filter((m) => {
                    if (!m.endDateIso) return false;
                    const t = new Date(m.endDateIso).getTime();
                    return t >= Date.now() && t <= weekFromNow;
                  }).length;
                  const formatCloses = (endDateIso: string | undefined) => {
                    if (!endDateIso) return "—";
                    const d = new Date(endDateIso);
                    const now = Date.now();
                    const diffDays = Math.round(
                      (d.getTime() - now) / (24 * 60 * 60 * 1000),
                    );
                    if (diffDays < 0) return "Closed";
                    if (diffDays <= 1) return "1d";
                    if (diffDays <= 7) return `${diffDays}d`;
                    return d.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    });
                  };
                  const yesTint = (yesPrice: number | undefined) => {
                    if (yesPrice == null) return "";
                    if (yesPrice >= 0.6) return "bg-emerald-500/10";
                    if (yesPrice <= 0.4) return "bg-red-500/10";
                    return "";
                  };
                  const formatVolume = (vol: string | undefined) =>
                    vol != null
                      ? Number(vol) >= 1e6
                        ? `$${(Number(vol) / 1e6).toFixed(1)}M`
                        : Number(vol) >= 1e3
                          ? `$${(Number(vol) / 1e3).toFixed(0)}K`
                          : `$${Number(vol).toFixed(0)}`
                      : "—";
                  /** Build Polymarket View URL: prefer market slug/conditionId (direct to specific market) over event (parent with all outcomes). */
                  const getPolymarketViewUrl = (m: PM): string => {
                    if (m.slug != null && m.slug !== "") {
                      return `https://polymarket.com/market/${m.slug}`;
                    }
                    if (m.conditionId != null && m.conditionId !== "") {
                      return `https://polymarket.com/market/${m.conditionId}`;
                    }
                    if (
                      m.eventSlug != null &&
                      m.eventSlug !== "" &&
                      m.eventId != null &&
                      m.eventId !== ""
                    ) {
                      return `https://polymarket.com/event/${m.eventSlug}-${m.eventId}`;
                    }
                    if (m.eventSlug != null && m.eventSlug !== "") {
                      return `https://polymarket.com/event/${m.eventSlug}`;
                    }
                    return `https://polymarket.com/market/${m.conditionId}`;
                  };
                  const wc = polymarketData.weeklyCrypto;
                  const openWeeklyMarkets = (wc?.markets ?? []).filter(
                    (m) =>
                      !m.endDateIso ||
                      new Date(m.endDateIso).getTime() > Date.now(),
                  );
                  const cryptoEtf = polymarketData.cryptoEtf;
                  const openCryptoEtfMarkets = (
                    cryptoEtf?.markets ?? []
                  ).filter(
                    (m) =>
                      !m.endDateIso ||
                      new Date(m.endDateIso).getTime() > Date.now(),
                  );
                  return (
                    <>
                      {openCryptoEtfMarkets.length > 0 && (
                        <DashboardCard title="Crypto ETF">
                          <p className="text-sm text-muted-foreground mb-3">
                            {cryptoEtf?.oneLiner ??
                              "Crypto ETF flows and related markets — same view as polymarket.com/crypto/etf."}
                          </p>
                          <a
                            href={
                              cryptoEtf?.link ??
                              "https://polymarket.com/crypto/etf"
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline mb-4"
                          >
                            View on Polymarket{" "}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border">
                                  <th className="text-left py-2 font-medium">
                                    Market
                                  </th>
                                  <th className="text-right py-2 font-medium">
                                    YES %
                                  </th>
                                  <th className="text-right py-2 font-medium">
                                    Volume
                                  </th>
                                  <th className="text-right py-2 font-medium">
                                    Closes
                                  </th>
                                  <th className="text-right py-2 font-medium">
                                    Link
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {openCryptoEtfMarkets.slice(0, 15).map((m) => (
                                  <tr
                                    key={m.conditionId}
                                    className="border-b border-border/50"
                                  >
                                    <td
                                      className="py-2 font-medium text-foreground/95 max-w-[320px] truncate"
                                      title={m.question}
                                    >
                                      {m.question}
                                    </td>
                                    <td
                                      className={cn(
                                        "text-right font-mono py-2 pr-2 rounded-r",
                                        yesTint(m.yesPrice),
                                      )}
                                    >
                                      {m.yesPrice != null
                                        ? `${Math.round(m.yesPrice * 100)}%`
                                        : "—"}
                                    </td>
                                    <td className="text-right font-mono text-muted-foreground">
                                      {formatVolume(m.volume)}
                                    </td>
                                    <td className="text-right text-muted-foreground whitespace-nowrap">
                                      {formatCloses(m.endDateIso)}
                                    </td>
                                    <td className="text-right">
                                      <a
                                        href={getPolymarketViewUrl(m)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline inline-flex items-center gap-1"
                                      >
                                        View{" "}
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </DashboardCard>
                      )}
                      {openWeeklyMarkets.length > 0 && (
                        <DashboardCard title="Weekly Crypto vibe check">
                          <p className="text-sm text-muted-foreground mb-3">
                            {wc?.oneLiner ??
                              "Market odds for BTC/ETH/SOL this week — vibe check for Hypersurface weekly options."}
                          </p>
                          <a
                            href={
                              wc?.link ?? "https://polymarket.com/crypto/weekly"
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-primary font-medium hover:underline mb-4"
                          >
                            View on Polymarket{" "}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-border">
                                  <th className="text-left py-2 font-medium">
                                    Market
                                  </th>
                                  <th className="text-right py-2 font-medium">
                                    YES %
                                  </th>
                                  <th className="text-right py-2 font-medium">
                                    Volume
                                  </th>
                                  <th className="text-right py-2 font-medium">
                                    Closes
                                  </th>
                                  <th className="text-right py-2 font-medium">
                                    Link
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {openWeeklyMarkets.slice(0, 15).map((m) => (
                                  <tr
                                    key={m.conditionId}
                                    className="border-b border-border/50"
                                  >
                                    <td
                                      className="py-2 font-medium text-foreground/95 max-w-[320px] truncate"
                                      title={m.question}
                                    >
                                      {m.question}
                                    </td>
                                    <td
                                      className={cn(
                                        "text-right font-mono py-2 pr-2 rounded-r",
                                        yesTint(m.yesPrice),
                                      )}
                                    >
                                      {m.yesPrice != null
                                        ? `${Math.round(m.yesPrice * 100)}%`
                                        : "—"}
                                    </td>
                                    <td className="text-right font-mono text-muted-foreground">
                                      {formatVolume(m.volume)}
                                    </td>
                                    <td className="text-right text-muted-foreground whitespace-nowrap">
                                      {formatCloses(m.endDateIso)}
                                    </td>
                                    <td className="text-right">
                                      <a
                                        href={getPolymarketViewUrl(m)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline inline-flex items-center gap-1"
                                      >
                                        View{" "}
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </DashboardCard>
                      )}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm text-muted-foreground">
                          {polymarketData.tagSections &&
                          Object.keys(polymarketData.tagSections).length > 0
                            ? (() => {
                                const total = Object.values(
                                  polymarketData.tagSections,
                                ).reduce(
                                  (s, sec) => s + (sec?.markets?.length ?? 0),
                                  0,
                                );
                                const closeThisWeekTag = Object.values(
                                  polymarketData.tagSections,
                                )
                                  .flatMap((sec) => sec?.markets ?? [])
                                  .filter((m) => {
                                    if (!m.endDateIso) return false;
                                    const t = new Date(m.endDateIso).getTime();
                                    return t >= Date.now() && t <= weekFromNow;
                                  }).length;
                                return (
                                  <>
                                    {total} market{total !== 1 ? "s" : ""}
                                    {closeThisWeekTag > 0
                                      ? ` · ${closeThisWeekTag} close this week`
                                      : null}
                                    {polymarketData.updatedAt != null
                                      ? ` · Updated ${new Date(polymarketData.updatedAt).toLocaleTimeString()}`
                                      : null}
                                  </>
                                );
                              })()
                            : `${openMarkets.length} market${openMarkets.length !== 1 ? "s" : ""}${closeThisWeek > 0 ? ` · ${closeThisWeek} close this week` : ""}${polymarketData.updatedAt != null ? ` · Updated ${new Date(polymarketData.updatedAt).toLocaleTimeString()}` : ""}`}
                        </p>
                        <Select
                          value={polymarketSort}
                          onValueChange={(v) =>
                            setPolymarketSort(v as "yes" | "volume" | "closes")
                          }
                        >
                          <SelectTrigger size="sm" className="w-[120px]">
                            <SelectValue placeholder="Sort by" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="yes">YES %</SelectItem>
                            <SelectItem value="volume">Volume</SelectItem>
                            <SelectItem value="closes">Closes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {polymarketData.tagSections &&
                      Object.keys(polymarketData.tagSections).length > 0 ? (
                        TAG_SECTION_ORDER.map((slug) => {
                          const sec = polymarketData.tagSections![slug];
                          if (!sec) return null;
                          const markets = sec.markets ?? [];
                          return (
                            <DashboardCard
                              key={slug}
                              title={`${sec.label} (${markets.length})`}
                              className="lg:col-span-2"
                            >
                              {markets.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4">
                                  No open markets in this section.
                                </p>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-border">
                                        <th className="text-left py-2 font-medium">
                                          Market
                                        </th>
                                        <th className="text-right py-2 font-medium">
                                          YES %
                                        </th>
                                        <th className="text-right py-2 font-medium">
                                          Volume
                                        </th>
                                        <th className="text-right py-2 font-medium">
                                          Closes
                                        </th>
                                        <th className="text-right py-2 font-medium">
                                          Link
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {sortMarkets(markets).map((m) => (
                                        <tr
                                          key={m.conditionId}
                                          className="border-b border-border/50"
                                        >
                                          <td
                                            className="py-2 font-medium text-foreground/95 max-w-[320px] truncate"
                                            title={m.question}
                                          >
                                            {m.question}
                                          </td>
                                          <td
                                            className={cn(
                                              "text-right font-mono py-2 pr-2 rounded-r",
                                              yesTint(m.yesPrice),
                                            )}
                                          >
                                            {m.yesPrice != null
                                              ? `${Math.round(m.yesPrice * 100)}%`
                                              : "—"}
                                          </td>
                                          <td className="text-right font-mono text-muted-foreground">
                                            {formatVolume(m.volume)}
                                          </td>
                                          <td className="text-right text-muted-foreground whitespace-nowrap">
                                            {formatCloses(m.endDateIso)}
                                          </td>
                                          <td className="text-right">
                                            <a
                                              href={getPolymarketViewUrl(m)}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-primary hover:underline inline-flex items-center gap-1"
                                            >
                                              View{" "}
                                              <ExternalLink className="w-3 h-3" />
                                            </a>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </DashboardCard>
                          );
                        })
                      ) : openMarkets.length === 0 ? (
                        <DashboardCard
                          title="Priority markets"
                          className="lg:col-span-2"
                        >
                          <p className="text-sm text-muted-foreground py-4">
                            No open priority markets right now. All current
                            markets have closed.
                          </p>
                        </DashboardCard>
                      ) : (
                        SECTION_ORDER.map(
                          (section) =>
                            (bySection[section]?.length ?? 0) > 0 && (
                              <DashboardCard
                                key={section}
                                title={`${section} (${bySection[section].length})`}
                                className="lg:col-span-2"
                              >
                                <div className="overflow-x-auto">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-border">
                                        <th className="text-left py-2 font-medium">
                                          Market
                                        </th>
                                        <th className="text-right py-2 font-medium">
                                          YES %
                                        </th>
                                        <th className="text-right py-2 font-medium">
                                          Volume
                                        </th>
                                        <th className="text-right py-2 font-medium">
                                          Closes
                                        </th>
                                        <th className="text-right py-2 font-medium">
                                          Link
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {sortMarkets(bySection[section]).map(
                                        (m) => (
                                          <tr
                                            key={m.conditionId}
                                            className="border-b border-border/50"
                                          >
                                            <td
                                              className="py-2 font-medium text-foreground/95 max-w-[320px] truncate"
                                              title={m.question}
                                            >
                                              {m.question}
                                            </td>
                                            <td
                                              className={cn(
                                                "text-right font-mono py-2 pr-2 rounded-r",
                                                yesTint(m.yesPrice),
                                              )}
                                            >
                                              {m.yesPrice != null
                                                ? `${Math.round(m.yesPrice * 100)}%`
                                                : "—"}
                                            </td>
                                            <td className="text-right font-mono text-muted-foreground">
                                              {formatVolume(m.volume)}
                                            </td>
                                            <td className="text-right text-muted-foreground whitespace-nowrap">
                                              {formatCloses(m.endDateIso)}
                                            </td>
                                            <td className="text-right">
                                              <a
                                                href={getPolymarketViewUrl(m)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline inline-flex items-center gap-1"
                                              >
                                                View{" "}
                                                <ExternalLink className="w-3 h-3" />
                                              </a>
                                            </td>
                                          </tr>
                                        ),
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              </DashboardCard>
                            ),
                        )
                      )}
                    </>
                  );
                })()
              ) : polymarketData?.markets &&
                polymarketData.markets.length === 0 ? (
                <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center space-y-3 min-h-[120px] flex flex-col justify-center">
                  <p className="font-medium text-foreground">
                    No priority markets right now
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Try again later or click Refresh.
                  </p>
                </div>
              ) : null}
            </div>
          </TabsContent>

          {/* Usage / TREASURY tab: session token usage and estimated cost */}
          <TabsContent
            value="usage"
            className="mt-6 flex-1 min-h-0 overflow-auto"
          >
            <div className="space-y-6">
              {(usageLoading || usageFetching) && !usageResult?.data ? (
                <div className="space-y-4">
                  <div className="h-32 bg-muted/50 rounded-xl animate-pulse" />
                  <div className="h-24 bg-muted/50 rounded-xl animate-pulse" />
                </div>
              ) : usageResult?.error ? (
                <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center space-y-3 min-h-[120px] flex flex-col justify-center">
                  <p className="font-medium text-foreground">
                    Could not load usage data
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {usageResult.error}
                  </p>
                </div>
              ) : usageResult?.data ? (
                <>
                  <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 border border-border/50 px-4 py-3">
                    <p className="text-sm font-medium text-foreground/90">
                      Session token usage for cost visibility (TREASURY)
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {usageResult.data?.estimatedCostFromDefault ? (
                        <>
                          Cost uses avg ~$0.006/1K tokens. Set{" "}
                          <code className="rounded bg-muted px-1">
                            VINCE_USAGE_COST_PER_1K_TOKENS
                          </code>{" "}
                          for accuracy.
                        </>
                      ) : (
                        <>
                          Cost from{" "}
                          <code className="rounded bg-muted px-1">
                            VINCE_USAGE_COST_PER_1K_TOKENS
                          </code>
                          .
                        </>
                      )}
                    </p>
                    <a
                      href="/TREASURY.md"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-2"
                    >
                      TREASURY.md <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <DashboardCard title="Totals">
                    <div className="flex flex-wrap gap-6 items-baseline">
                      <div>
                        <p className="text-2xl font-semibold font-mono">
                          {(
                            usageResult.data?.totalTokens ?? 0
                          ).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total tokens
                          {usageResult.data?.estimatedFromRuns
                            ? " (est. from runs)"
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-right ml-auto">
                        <DollarSign className="w-5 h-5 text-muted-foreground shrink-0" />
                        <div className="text-right">
                          <p className="text-2xl font-semibold font-mono">
                            $
                            {(usageResult.data?.estimatedCostUsd ?? 0).toFixed(
                              2,
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Est. cost (period)
                            {usageResult.data?.estimatedCostFromDefault
                              ? " · approx. avg"
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Period:{" "}
                      {usageResult.data?.period?.from?.slice(0, 10) ?? "—"} →{" "}
                      {usageResult.data?.period?.to?.slice(0, 10) ?? "—"}
                    </p>
                  </DashboardCard>
                  <DashboardCard title="By day">
                    {(usageResult.data?.byDay?.length ?? 0) === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">
                        No run events in this period.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-2 font-medium">
                                Date
                              </th>
                              <th className="text-right py-2 font-medium">
                                Tokens
                              </th>
                              <th className="text-right py-2 font-medium">
                                Runs
                              </th>
                              <th className="text-right py-2 font-medium">
                                Est. cost
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(usageResult.data?.byDay ?? []).map((row) => {
                              const data = usageResult.data;
                              const total = data?.totalTokens ?? 0;
                              const costUsd = data?.estimatedCostUsd ?? 0;
                              const dayCost =
                                total > 0 ? (row.tokens / total) * costUsd : 0;
                              return (
                                <tr
                                  key={row.date}
                                  className="border-b border-border/50"
                                >
                                  <td className="py-2">{row.date}</td>
                                  <td className="text-right font-mono">
                                    {row.tokens.toLocaleString()}
                                  </td>
                                  <td className="text-right font-mono">
                                    {row.runs}
                                  </td>
                                  <td className="text-right font-mono">
                                    ${(Number(dayCost) || 0).toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </DashboardCard>
                </>
              ) : !usageResult?.error ? (
                <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center space-y-3 min-h-[120px] flex flex-col justify-center">
                  <p className="font-medium text-foreground">
                    No agent usage data
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Make sure VINCE is running and chat runs have completed,
                    then click Refresh.
                  </p>
                </div>
              ) : null}

              {/* Cursor usage — always shown; often highest cost */}
              <DashboardCard title="Cursor usage">
                <p className="text-xs text-muted-foreground mb-3">
                  Cursor is often the highest cost. Enter the total from
                  Cursor&apos;s &quot;Included Usage&quot; report (from{" "}
                  <a
                    href="https://cursor.com/settings"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Cursor settings
                    <ExternalLink className="w-3 h-3" />
                  </a>{" "}
                  → Usage tab).
                </p>
                <div className="space-y-2">
                  <label
                    htmlFor="cursor-actual-cost"
                    className="text-xs font-medium text-foreground"
                  >
                    Actual cost from Cursor dashboard (Included Usage total)
                  </label>
                  <Input
                    id="cursor-actual-cost"
                    type="text"
                    placeholder="e.g. 1064.30"
                    value={cursorActualCost}
                    onChange={(e) => setCursorActualCost(e.target.value)}
                    className="max-w-[180px] font-mono"
                  />
                </div>
                {cursorActualCost.trim()
                  ? (() => {
                      const actualNum = parseFloat(
                        cursorActualCost.replace(/[^0-9.-]/g, ""),
                      );
                      const hasValid =
                        Number.isFinite(actualNum) && actualNum >= 0;
                      if (!hasValid) return null;
                      return (
                        <div className="mt-4 flex flex-wrap gap-6 items-baseline">
                          <div className="flex items-center gap-1 text-right ml-auto">
                            <DollarSign className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div className="text-right">
                              <p className="text-xl font-semibold font-mono">
                                ${actualNum.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Actual cost (from Cursor dashboard)
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  : null}
              </DashboardCard>

              {/* Data sources — monthly/yearly cost estimates (TREASURY) */}
              <DashboardCard title="Data sources (monthly / yearly)">
                <p className="text-xs text-muted-foreground mb-3">
                  Estimated costs for data APIs. Many have free tiers. See{" "}
                  <a
                    href="/TREASURY.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    TREASURY.md
                    <ExternalLink className="w-3 h-3" />
                  </a>{" "}
                  for tiers.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium">API</th>
                        <th className="text-right py-2 font-medium">Monthly</th>
                        <th className="text-right py-2 font-medium">Yearly</th>
                        <th className="text-right py-2 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {DATA_SOURCES_COSTS.map((row) => (
                        <tr
                          key={row.name}
                          className="border-b border-border/50"
                        >
                          <td className="py-2 font-medium">{row.name}</td>
                          <td className="text-right font-mono">
                            {row.monthly === 0 ? "—" : `$${row.monthly}`}
                          </td>
                          <td className="text-right font-mono">
                            {row.yearly === 0 ? "—" : `$${row.yearly}`}
                          </td>
                          <td className="py-2 text-right text-muted-foreground text-xs">
                            {row.notes}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Total paid: ~$
                  {DATA_SOURCES_COSTS.reduce((s, r) => s + r.monthly, 0)}/mo or
                  ~$
                  {DATA_SOURCES_COSTS.reduce((s, r) => s + r.yearly, 0)}/yr
                  (excludes free tiers).
                </p>
              </DashboardCard>

              {/* Hardware — 2x Mac Studio, potential savings (LOCALSONLY) */}
              <DashboardCard title="Hardware & local inference savings">
                <p className="text-xs text-muted-foreground mb-3">
                  <strong>2× Mac Studio</strong> @ $
                  {HARDWARE_2X_MAC_STUDIO.unitCost.toLocaleString()} each = $
                  {HARDWARE_2X_MAC_STUDIO.totalCapEx.toLocaleString()} CapEx.
                  See{" "}
                  <a
                    href="/LOCALSONLY.md"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-0.5"
                  >
                    LOCALSONLY.md
                    <ExternalLink className="w-3 h-3" />
                  </a>{" "}
                  for cost model.
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm mb-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      CapEx
                    </p>
                    <p className="font-mono font-semibold">
                      ${HARDWARE_2X_MAC_STUDIO.totalCapEx.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      Amortized (36 mo)
                    </p>
                    <p className="font-mono font-semibold">
                      ${Math.round(HARDWARE_2X_MAC_STUDIO.totalCapEx / 36)}/mo
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      Amortized (48 mo)
                    </p>
                    <p className="font-mono font-semibold">
                      ${Math.round(HARDWARE_2X_MAC_STUDIO.totalCapEx / 48)}/mo
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                      Est. power
                    </p>
                    <p className="font-mono font-semibold">
                      ~${HARDWARE_POWER_MONTHLY}/mo
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
                  <p className="text-xs font-medium text-foreground/90">
                    Potential savings (vs cloud inference)
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    At ~2B tokens/month, cloud equiv ≈{" "}
                    <strong>${CLOUD_INFERENCE_EQUIV_MONTHLY}/mo</strong>{" "}
                    (Claude/Opus). Local: CapEx amortized (36 mo) + power ≈ $
                    {Math.round(
                      HARDWARE_2X_MAC_STUDIO.totalCapEx / 36 +
                        HARDWARE_POWER_MONTHLY,
                    )}
                    /mo →{" "}
                    <strong>
                      ~$
                      {CLOUD_INFERENCE_EQUIV_MONTHLY -
                        Math.round(
                          HARDWARE_2X_MAC_STUDIO.totalCapEx / 36 +
                            HARDWARE_POWER_MONTHLY,
                        )}
                      /mo savings
                    </strong>
                    . At 48‑month amortization, savings increase. See
                    LOCALSONLY.md for caveats (batching, resale value, input
                    tokens).
                  </p>
                </div>
              </DashboardCard>
            </div>
          </TabsContent>

          {/* Trading Bot tab: open positions + portfolio — scrollable area so all content is reachable */}
          <TabsContent
            value="trading_bot"
            className="mt-6 flex-1 min-h-0 flex flex-col data-[state=active]:flex"
          >
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-7rem)] pb-8">
              <>
                {paperLoading && !paperData ? (
                  <div className="space-y-4">
                    <div className="h-32 bg-muted/50 rounded-xl animate-pulse" />
                    <div className="h-24 bg-muted/50 rounded-xl animate-pulse" />
                  </div>
                ) : paperData ? (
                  <div className="space-y-6">
                    {/* V3.0 Renaissance Fund banner */}
                    <div className="rounded-xl border border-border bg-gradient-to-r from-muted/80 to-muted/40 p-5 space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/80 tracking-wide">
                          V3.0
                        </span>
                        <h3 className="text-sm font-semibold">
                          Renaissance Fund 3.0
                        </h3>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Every trade expressible onchain. The daily{" "}
                        <strong>What&apos;s the Trade</strong> thesis now
                        constrains picks to Hyperliquid perps (4 core + 34 HIP-3
                        assets: stocks, indices, commodities, AI/tech).
                        Robinhood data stays as context&mdash;the LLM sees
                        offchain movers but must express the trade via
                        Hyperliquid. Feature store records WTT rubric dimensions
                        (alignment, edge, payoff, timing, invalidate) for ML
                        training. The paper bot evaluates each pick, and the
                        self-improving loop keeps getting sharper.
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[
                          "HIP-3 only picks",
                          "38 onchain assets",
                          "WTT → paper bot",
                          "Feature store + ML",
                          "Rubric scoring",
                        ].map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-foreground/5 text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      <details className="pt-1 group">
                        <summary className="text-[11px] text-muted-foreground cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                          What shipped in V3.0
                        </summary>
                        <ul className="text-[11px] text-muted-foreground mt-2 space-y-1 pl-4 list-disc">
                          <li>
                            <strong>WTT → Paper Bot integration:</strong> daily
                            thesis generates a structured pick (JSON sidecar),
                            paper bot auto-evaluates, opens trades with WTT
                            rubric metadata.
                          </li>
                          <li>
                            <strong>HIP-3 constraint:</strong> thesis prompt,
                            narrative, and extraction all enforce onchain-only
                            tickers. Hard gate rejects non-HIP-3 primary picks
                            (falls back to alt).
                          </li>
                          <li>
                            <strong>Feature store WTT block:</strong> alignment,
                            edge, payoff shape, timing forgiveness ordinals
                            stored per trade. <code>invalidateHit</code>{" "}
                            computed on close.
                          </li>
                          <li>
                            <strong>ML training:</strong> <code>wtt_*</code>{" "}
                            columns as optional features; improvement report
                            includes <code>wtt_performance</code> slice when 5+
                            WTT trades.
                          </li>
                          <li>
                            <strong>Robinhood as context:</strong> offchain
                            stock data labeled &quot;context
                            only&quot;&mdash;LLM uses it to find the best
                            onchain proxy (e.g. IREN hot → long SEMIS).
                          </li>
                          <li>
                            <strong>Env vars:</strong>{" "}
                            <code>ECHO_WTT_HIP3_ONLY=true</code> (default),{" "}
                            <code>ECHO_WTT_ROBINHOOD_ENABLED=true</code>,{" "}
                            <code>VINCE_PAPER_WTT_ENABLED</code>.
                          </li>
                        </ul>
                      </details>
                    </div>

                    <DashboardCard title="Portfolio">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">
                            Total value
                          </p>
                          <p className="font-mono font-semibold">
                            $
                            {(
                              paperData.portfolio.totalValue ?? 0
                            ).toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">
                            Realized P&L
                          </p>
                          <p
                            className={cn(
                              "font-mono font-semibold",
                              (paperData.portfolio.realizedPnl ?? 0) >= 0
                                ? "text-green-600 dark:text-green-400"
                                : "text-red-600 dark:text-red-400",
                            )}
                          >
                            $
                            {(
                              paperData.portfolio.realizedPnl ?? 0
                            ).toLocaleString(undefined, {
                              maximumFractionDigits: 0,
                            })}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">
                            Win rate
                          </p>
                          <p className="font-mono font-semibold">
                            {((paperData.portfolio.winRate ?? 0) * 100).toFixed(
                              0,
                            )}
                            %
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase">
                            Trades
                          </p>
                          <p className="font-mono font-semibold">
                            {paperData.portfolio.tradeCount ?? 0}
                          </p>
                        </div>
                      </div>
                    </DashboardCard>

                    {/* Recent trades: which trades the bot made and how much P&L */}
                    <DashboardCard title="Recent trades">
                      {(paperData.recentTrades?.length ?? 0) === 0 ? (
                        <p className="text-muted-foreground py-4 text-sm">
                          No closed trades yet. Realized P&L and trade list will
                          appear here as the paper bot closes positions.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground uppercase">
                                <th className="pb-2 pr-3">Asset</th>
                                <th className="pb-2 pr-3">Side</th>
                                <th className="pb-2 pr-3">Entry → Exit</th>
                                <th className="pb-2 pr-3 text-right">P&L</th>
                                <th className="pb-2 pr-3">Close reason</th>
                                <th className="pb-2">Closed</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(paperData.recentTrades ?? []).map((t, i) => (
                                <tr
                                  key={`${t.asset}-${t.closedAt}-${i}`}
                                  className="border-b border-border/50"
                                >
                                  <td className="py-2 pr-3 font-mono">
                                    {t.asset}
                                  </td>
                                  <td className="py-2 pr-3 capitalize">
                                    {t.direction}
                                  </td>
                                  <td className="py-2 pr-3 font-mono text-muted-foreground">
                                    $
                                    {t.entryPrice.toLocaleString(undefined, {
                                      maximumFractionDigits: 0,
                                    })}{" "}
                                    → $
                                    {t.exitPrice.toLocaleString(undefined, {
                                      maximumFractionDigits: 0,
                                    })}
                                  </td>
                                  <td
                                    className={cn(
                                      "py-2 pr-3 text-right font-mono font-medium",
                                      (t.realizedPnl ?? 0) >= 0
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-red-600 dark:text-red-400",
                                    )}
                                  >
                                    {(t.realizedPnl ?? 0) >= 0 ? "+" : ""}$
                                    {(t.realizedPnl ?? 0).toLocaleString(
                                      undefined,
                                      {
                                        maximumFractionDigits: 2,
                                        minimumFractionDigits: 2,
                                      },
                                    )}
                                  </td>
                                  <td
                                    className="py-2 pr-3 text-muted-foreground max-w-[120px] truncate"
                                    title={t.closeReason}
                                  >
                                    {t.closeReason || "—"}
                                  </td>
                                  <td className="py-2 text-muted-foreground whitespace-nowrap">
                                    {t.closedAt
                                      ? new Date(t.closedAt).toLocaleString(
                                          undefined,
                                          {
                                            month: "short",
                                            day: "numeric",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          },
                                        )
                                      : "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </DashboardCard>

                    {/* Goal Progress */}
                    {paperData.goalProgress && (
                      <DashboardCard title="Goal progress">
                        <div className="space-y-4">
                          {paperData.goalTargets && (
                            <div className="text-xs text-muted-foreground">
                              Targets: ${paperData.goalTargets.daily}/day · $
                              {paperData.goalTargets.monthly.toLocaleString()}
                              /mo
                            </div>
                          )}
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                                Daily
                              </p>
                              <p className="font-mono">
                                $
                                {paperData.goalProgress.daily.current.toFixed(
                                  0,
                                )}{" "}
                                / $
                                {paperData.goalProgress.daily.target.toFixed(0)}
                                <span className="ml-1 text-muted-foreground">
                                  ({paperData.goalProgress.daily.pct.toFixed(0)}
                                  %)
                                </span>
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Remaining $
                                {paperData.goalProgress.daily.remaining.toFixed(
                                  0,
                                )}{" "}
                                · {paperData.goalProgress.daily.pace}
                                {paperData.goalProgress.daily.paceAmount !==
                                  0 && (
                                  <span
                                    className={cn(
                                      "ml-1",
                                      paperData.goalProgress.daily.paceAmount >=
                                        0
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-amber-600 dark:text-amber-400",
                                    )}
                                  >
                                    (
                                    {paperData.goalProgress.daily.paceAmount >=
                                    0
                                      ? "+"
                                      : ""}
                                    $
                                    {paperData.goalProgress.daily.paceAmount.toFixed(
                                      0,
                                    )}{" "}
                                    vs expected)
                                  </span>
                                )}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                                Monthly
                              </p>
                              <p className="font-mono">
                                $
                                {paperData.goalProgress.monthly.current.toFixed(
                                  0,
                                )}{" "}
                                / $
                                {paperData.goalProgress.monthly.target.toFixed(
                                  0,
                                )}
                                <span className="ml-1 text-muted-foreground">
                                  (
                                  {paperData.goalProgress.monthly.pct.toFixed(
                                    0,
                                  )}
                                  %)
                                </span>
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Remaining $
                                {paperData.goalProgress.monthly.remaining.toFixed(
                                  0,
                                )}{" "}
                                · {paperData.goalProgress.monthly.status}
                                {paperData.goalProgress.monthly
                                  .dailyTargetToHitGoal != null &&
                                  paperData.goalProgress.monthly.status ===
                                    "behind" && (
                                    <span className="block mt-0.5 text-amber-600 dark:text-amber-400">
                                      Need $
                                      {paperData.goalProgress.monthly.dailyTargetToHitGoal.toFixed(
                                        0,
                                      )}
                                      /day to hit goal
                                    </span>
                                  )}
                              </p>
                            </div>
                          </div>
                        </div>
                      </DashboardCard>
                    )}

                    {/* Signal Sources */}
                    {paperData.signalStatus && (
                      <DashboardCard title="Signal sources">
                        <div className="space-y-3">
                          <div className="flex gap-4 text-sm">
                            <span className="font-mono">
                              Signals: {paperData.signalStatus.signalCount}
                            </span>
                            <span className="text-muted-foreground">
                              Last update:{" "}
                              {paperData.signalStatus.lastUpdate
                                ? new Date(
                                    paperData.signalStatus.lastUpdate,
                                  ).toLocaleTimeString()
                                : "—"}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(paperData.signalStatus.dataSources ?? []).map(
                              (ds) => (
                                <span
                                  key={ds.name}
                                  className={cn(
                                    "inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium",
                                    ds.available
                                      ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                      : "bg-red-500/10 text-red-700 dark:text-red-400",
                                  )}
                                >
                                  {ds.available ? "✓" : "✗"}{" "}
                                  {signalSourceDisplayName(ds.name)}
                                </span>
                              ),
                            )}
                            {(paperData.signalStatus.dataSources ?? [])
                              .length === 0 && (
                              <span className="text-muted-foreground text-sm">
                                No data sources
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground pt-1">
                            <strong>X:</strong> Same as News tab &quot;X
                            (Twitter) vibe check&quot;. Contributes when
                            confidence ≥ 40%; weight 0.5×. Richer vibe in chat:
                            ask ECHO for &quot;X pulse&quot; or &quot;CT
                            vibe&quot;.
                          </p>
                          <p className="text-xs text-muted-foreground pt-1">
                            <strong>Volume (24h vs 7d avg):</strong> Used for
                            position sizing only (not direction). Spike/elevated
                            → size up; low/dead → size down. See More tab for
                            live ratios.
                          </p>
                          {(paperData.recentClosedTrades?.length ?? 0) > 0 &&
                            (() => {
                              const closed = paperData.recentClosedTrades ?? [];
                              const withX = closed.filter((t) =>
                                (t.contributingSources ?? []).includes(
                                  "XSentiment",
                                ),
                              ).length;
                              return (
                                <p className="text-xs text-muted-foreground pt-1">
                                  X (Twitter) sentiment contributed to{" "}
                                  <strong>{withX}</strong> of the last{" "}
                                  <strong>{closed.length}</strong> closed
                                  trades.
                                </p>
                              );
                            })()}
                        </div>
                      </DashboardCard>
                    )}

                    {/* Thompson Sampling (Bandit) Sources */}
                    {paperData.banditSummary && (
                      <DashboardCard title="Thompson Sampling (Bandit) sources">
                        <div className="space-y-4">
                          <p className="text-sm font-mono">
                            Total trades processed:{" "}
                            {paperData.banditSummary.totalTrades}
                          </p>
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                Top 3 sources
                              </p>
                              <ul className="space-y-1">
                                {(paperData.banditSummary.topSources ?? []).map(
                                  (s) => (
                                    <li
                                      key={s.source}
                                      className="flex justify-between text-sm"
                                    >
                                      <span>
                                        {signalSourceDisplayName(s.source)}
                                      </span>
                                      <span className="font-mono text-green-600 dark:text-green-400">
                                        {(s.winRate * 100).toFixed(1)}%
                                      </span>
                                    </li>
                                  ),
                                )}
                                {(paperData.banditSummary.topSources ?? [])
                                  .length === 0 && (
                                  <li className="text-muted-foreground">—</li>
                                )}
                              </ul>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                Bottom 3 sources
                              </p>
                              <ul className="space-y-1">
                                {(
                                  paperData.banditSummary.bottomSources ?? []
                                ).map((s) => (
                                  <li
                                    key={s.source}
                                    className="flex justify-between text-sm"
                                  >
                                    <span>
                                      {signalSourceDisplayName(s.source)}
                                    </span>
                                    <span className="font-mono text-amber-600 dark:text-amber-400">
                                      {(s.winRate * 100).toFixed(1)}%
                                    </span>
                                  </li>
                                ))}
                                {(paperData.banditSummary.bottomSources ?? [])
                                  .length === 0 && (
                                  <li className="text-muted-foreground">—</li>
                                )}
                              </ul>
                            </div>
                          </div>
                          {[
                            ...(paperData.banditSummary.topSources ?? []),
                            ...(paperData.banditSummary.bottomSources ?? []),
                          ].some((s) => s.source === "XSentiment") && (
                            <p className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                              X (Twitter) sentiment&apos;s weight is learned
                              from outcomes; when it appears in Top sources
                              it&apos;s been profitable recently; when in
                              Underperforming it&apos;s been scaled down.
                            </p>
                          )}
                        </div>
                      </DashboardCard>
                    )}

                    <DashboardCard title="Open positions">
                      {paperData.openPositions.length === 0 ? (
                        <p className="text-muted-foreground py-4">
                          No open paper positions. Ask VINCE to &quot;bot
                          status&quot; or &quot;trade&quot;.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {paperData.openPositions.map((pos) => {
                            const entryTime = pos.openedAt
                              ? new Date(pos.openedAt)
                                  .toISOString()
                                  .replace("T", " ")
                                  .slice(0, 19) + "Z"
                              : "—";
                            const marginUsd =
                              pos.marginUsd ??
                              (pos.sizeUsd && pos.leverage
                                ? pos.sizeUsd / pos.leverage
                                : 0);
                            const slPct =
                              pos.entryPrice && pos.stopLossPrice
                                ? Math.abs(
                                    ((pos.stopLossPrice - pos.entryPrice) /
                                      pos.entryPrice) *
                                      100,
                                  ).toFixed(2)
                                : null;
                            const liqPct =
                              pos.entryPrice && pos.liquidationPrice
                                ? Math.abs(
                                    ((pos.liquidationPrice - pos.entryPrice) /
                                      pos.entryPrice) *
                                      100,
                                  ).toFixed(1)
                                : null;
                            const atrVal =
                              pos.entryATRPct ??
                              (pos.metadata?.entryATRPct as number | undefined);
                            const atrPct =
                              atrVal != null
                                ? `${Number(atrVal).toFixed(2)}%`
                                : "—";
                            const sources =
                              (pos.metadata?.contributingSources as
                                | string[]
                                | undefined) ?? [];
                            const supporting = pos.triggerSignals ?? [];
                            const conflicting =
                              (pos.metadata?.conflictingReasons as
                                | string[]
                                | undefined) ?? [];
                            const totalSourceCount =
                              (pos.metadata?.totalSourceCount as
                                | number
                                | undefined) ?? 0;
                            const confirmingCount =
                              (pos.metadata?.confirmingCount as
                                | number
                                | undefined) ?? 0;
                            const conflictingCount =
                              (pos.metadata?.conflictingCount as
                                | number
                                | undefined) ?? 0;
                            const strength = pos.metadata?.strength as
                              | number
                              | undefined;
                            const confidence = pos.metadata?.confidence as
                              | number
                              | undefined;
                            const session = pos.metadata?.session as
                              | string
                              | undefined;
                            const metaSlLossUsd = pos.metadata?.slLossUsd as
                              | number
                              | undefined;
                            const metaTp1ProfitUsd = pos.metadata
                              ?.tp1ProfitUsd as number | undefined;
                            const rrRatio = pos.metadata?.rrRatio as
                              | number
                              | undefined;
                            const rrLabel = pos.metadata?.rrLabel as
                              | string
                              | undefined;
                            const metaSlPct = pos.metadata?.slPct as
                              | number
                              | undefined;
                            const metaTp1Pct = pos.metadata?.tp1Pct as
                              | number
                              | undefined;
                            const tp1Price = pos.takeProfitPrices?.[0];
                            // Derive risk management from position when metadata missing (e.g. older positions)
                            const ep = pos.entryPrice ?? 0;
                            const sizeUsd = pos.sizeUsd ?? 0;
                            const slPrice = pos.stopLossPrice;
                            const slPctDerived =
                              ep && slPrice
                                ? Math.abs(((slPrice - ep) / ep) * 100)
                                : null;
                            const tp1PctDerived =
                              ep && tp1Price
                                ? Math.abs(((tp1Price - ep) / ep) * 100)
                                : null;
                            const slLossUsd =
                              metaSlLossUsd ??
                              (sizeUsd && slPctDerived != null
                                ? sizeUsd * (slPctDerived / 100)
                                : undefined);
                            const tp1ProfitUsd =
                              metaTp1ProfitUsd ??
                              (sizeUsd && tp1PctDerived != null
                                ? sizeUsd * (tp1PctDerived / 100)
                                : undefined);
                            const slPctDisplay = metaSlPct ?? slPctDerived;
                            const tp1PctDisplay = metaTp1Pct ?? tp1PctDerived;
                            const rrNum =
                              slLossUsd != null &&
                              slLossUsd > 0 &&
                              tp1ProfitUsd != null
                                ? tp1ProfitUsd / slLossUsd
                                : undefined;
                            const rrRatioDisplay = rrRatio ?? rrNum;
                            const rrLabelDisplay =
                              rrLabel ??
                              (rrNum != null
                                ? rrNum >= 1.5
                                  ? "Good"
                                  : rrNum >= 1
                                    ? "OK"
                                    : rrNum >= 0.5
                                      ? "Weak"
                                      : rrNum > 0
                                        ? "Poor"
                                        : "—"
                                : undefined);
                            const hasWhy =
                              supporting.length > 0 ||
                              conflicting.length > 0 ||
                              sources.length > 0;
                            const hasSignal =
                              strength != null ||
                              confidence != null ||
                              confirmingCount != null;
                            const hasRisk =
                              pos.stopLossPrice != null || tp1Price != null;
                            return (
                              <div
                                key={pos.id}
                                className="rounded-lg border border-border bg-muted/20 p-4 space-y-4"
                              >
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-semibold">
                                  <span
                                    className={cn(
                                      "uppercase",
                                      pos.direction === "long"
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-red-600 dark:text-red-400",
                                    )}
                                  >
                                    {pos.direction} {pos.asset}
                                  </span>
                                  <span className="font-mono">
                                    @ $
                                    {(pos.entryPrice ?? 0).toLocaleString(
                                      undefined,
                                      { maximumFractionDigits: 0 },
                                    )}
                                  </span>
                                  <span
                                    className={cn(
                                      "font-mono",
                                      (pos.unrealizedPnl ?? 0) >= 0
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-red-600 dark:text-red-400",
                                    )}
                                  >
                                    P&L $
                                    {(pos.unrealizedPnl ?? 0).toLocaleString(
                                      undefined,
                                      { maximumFractionDigits: 0 },
                                    )}
                                    {pos.unrealizedPnlPct != null &&
                                      ` (${pos.unrealizedPnlPct >= 0 ? "+" : ""}${pos.unrealizedPnlPct.toFixed(2)}%)`}
                                  </span>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                                  <div>
                                    <span className="text-muted-foreground">
                                      Entry
                                    </span>
                                    <p className="font-mono">{entryTime}</p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Notional
                                    </span>
                                    <p className="font-mono">
                                      $
                                      {(pos.sizeUsd ?? 0).toLocaleString(
                                        undefined,
                                        { maximumFractionDigits: 0 },
                                      )}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Margin
                                    </span>
                                    <p className="font-mono">
                                      $
                                      {marginUsd.toLocaleString(undefined, {
                                        maximumFractionDigits: 0,
                                      })}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">
                                      Leverage
                                    </span>
                                    <p className="font-mono">
                                      {pos.leverage}x
                                      {sizeUsd > 0 &&
                                        ` (~$${Math.round(sizeUsd / 100)}/1%)`}
                                    </p>
                                  </div>
                                  {pos.liquidationPrice != null && (
                                    <div>
                                      <span className="text-muted-foreground">
                                        Liq
                                      </span>
                                      <p className="font-mono">
                                        $
                                        {pos.liquidationPrice.toLocaleString(
                                          undefined,
                                          { maximumFractionDigits: 0 },
                                        )}
                                        {liqPct != null && ` (~${liqPct}%)`}
                                      </p>
                                    </div>
                                  )}
                                  {atrPct !== "—" && (
                                    <div>
                                      <span className="text-muted-foreground">
                                        ATR(14)
                                      </span>
                                      <p className="font-mono">
                                        {atrPct} (volatility → SL floor)
                                      </p>
                                    </div>
                                  )}
                                  {slPct != null && (
                                    <div>
                                      <span className="text-muted-foreground">
                                        SL
                                      </span>
                                      <p className="font-mono">
                                        {slPct}%
                                        {rrRatioDisplay != null
                                          ? ` (${rrRatioDisplay.toFixed(1)}:1 R:R target)`
                                          : ""}
                                      </p>
                                    </div>
                                  )}
                                  {pos.strategyName && (
                                    <div>
                                      <span className="text-muted-foreground">
                                        Strategy
                                      </span>
                                      <p className="font-mono">
                                        {pos.strategyName}
                                      </p>
                                    </div>
                                  )}
                                  {session && (
                                    <div>
                                      <span className="text-muted-foreground">
                                        Session
                                      </span>
                                      <p className="font-mono">{session}</p>
                                    </div>
                                  )}
                                </div>
                                {hasWhy && (
                                  <div className="border-t border-border/50 pt-3 space-y-3">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                                      Why this trade
                                    </p>
                                    {totalSourceCount > 0 &&
                                      (confirmingCount != null ||
                                        conflictingCount != null) && (
                                        <p className="text-xs text-muted-foreground">
                                          {pos.direction.toUpperCase()} —{" "}
                                          {confirmingCount} of{" "}
                                          {totalSourceCount} sources agreed
                                          {conflictingCount != null &&
                                          conflictingCount > 0
                                            ? ` (${conflictingCount} disagreed).`
                                            : "."}
                                          {strength != null &&
                                            confidence != null &&
                                            ` Net: Strength ${strength}% / confidence ${confidence}% met threshold. `}
                                          {supporting.length} supporting,{" "}
                                          {conflicting.length} conflicting.
                                        </p>
                                      )}
                                    {supporting.length > 0 && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">
                                          Supporting ({supporting.length})
                                        </p>
                                        <ul className="list-disc list-inside text-xs space-y-0.5">
                                          {supporting.map((s, i) => (
                                            <li key={i}>{s}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {conflicting.length > 0 && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">
                                          Conflicting ({conflicting.length})
                                        </p>
                                        <ul className="list-disc list-inside text-xs space-y-0.5">
                                          {conflicting.map((s, i) => (
                                            <li key={i}>{s}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {sources.length > 0 && (
                                      <div>
                                        <p className="text-xs text-muted-foreground mb-1">
                                          Sources
                                        </p>
                                        <p className="text-xs">
                                          {sources.map((src) => (
                                            <span key={src}>
                                              {sources.indexOf(src) > 0 && ", "}
                                              {src === "XSentiment" ? (
                                                <strong className="text-foreground">
                                                  {signalSourceDisplayName(src)}
                                                </strong>
                                              ) : (
                                                signalSourceDisplayName(src)
                                              )}
                                            </span>
                                          ))}
                                        </p>
                                        {sources.includes("XSentiment") && (
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span className="inline-block mt-1 text-[11px] text-primary cursor-help border-b border-dotted border-primary/50">
                                                X (CT) contributed to this entry
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              Same sentiment data as the News
                                              tab vibe check; 0.5× weight in the
                                              aggregator.
                                            </TooltipContent>
                                          </Tooltip>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}
                                {hasSignal && (
                                  <div className="border-t border-border/50 pt-3 space-y-1">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                                      Signal
                                    </p>
                                    <p className="text-xs font-mono">
                                      {strength != null &&
                                        `Strength ${strength}%`}
                                      {strength != null &&
                                        (confidence != null ||
                                          confirmingCount != null ||
                                          totalSourceCount > 0) &&
                                        " · "}
                                      {confidence != null &&
                                        `Confidence ${confidence}%`}
                                      {confidence != null &&
                                        (confirmingCount != null ||
                                          totalSourceCount > 0) &&
                                        " · "}
                                      {confirmingCount != null &&
                                        (totalSourceCount > 0
                                          ? `Confirming ${confirmingCount} of ${totalSourceCount}`
                                          : `Confirming ${confirmingCount}`)}
                                    </p>
                                    {strength == null &&
                                      confidence == null &&
                                      (confirmingCount != null ||
                                        totalSourceCount > 0) && (
                                        <p className="text-[11px] text-muted-foreground">
                                          Strength/confidence not recorded for
                                          this position.
                                        </p>
                                      )}
                                  </div>
                                )}
                                {hasRisk && (
                                  <div className="border-t border-border/50 pt-3 space-y-1">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                                      Risk management
                                    </p>
                                    <div className="text-xs space-y-1">
                                      {pos.stopLossPrice != null && (
                                        <p className="font-mono">
                                          SL $
                                          {pos.stopLossPrice.toLocaleString(
                                            undefined,
                                            {
                                              minimumFractionDigits: 2,
                                              maximumFractionDigits: 2,
                                            },
                                          )}
                                          {slPctDisplay != null &&
                                            ` (${slPctDisplay.toFixed(1)}%)`}
                                          {slLossUsd != null &&
                                            ` If hit -$${Math.round(slLossUsd)}`}
                                        </p>
                                      )}
                                      {tp1Price != null && (
                                        <p className="font-mono">
                                          TP $
                                          {tp1Price.toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          })}
                                          {tp1PctDisplay != null &&
                                            ` (${tp1PctDisplay.toFixed(1)}%)`}
                                          {tp1ProfitUsd != null &&
                                            ` If hit +$${Math.round(tp1ProfitUsd)}`}
                                        </p>
                                      )}
                                      {(rrRatioDisplay != null ||
                                        rrLabelDisplay) && (
                                        <p className="font-mono">
                                          R:R (TP1 vs SL){" "}
                                          {rrRatioDisplay != null
                                            ? `${rrRatioDisplay.toFixed(1)}:1`
                                            : "—"}{" "}
                                          {rrLabelDisplay
                                            ? ` ${rrLabelDisplay}`
                                            : ""}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {(pos.metadata?.mlQualityScore != null ||
                                  pos.metadata?.banditWeightsUsed === true) && (
                                  <div className="border-t border-border/50 pt-3 space-y-1">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">
                                      Recorded data influence
                                    </p>
                                    <p className="text-xs font-mono">
                                      {typeof pos.metadata?.mlQualityScore ===
                                        "number" &&
                                        `ML quality ${(Number(pos.metadata.mlQualityScore) * 100).toFixed(0)}%`}
                                      {typeof pos.metadata?.mlQualityScore ===
                                        "number" &&
                                        pos.metadata?.banditWeightsUsed ===
                                          true &&
                                        " · "}
                                      {pos.metadata?.banditWeightsUsed ===
                                        true && "Bandit weights used"}
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
                        A no-trade is also a decision. When the bot evaluates a
                        signal but does not open (e.g. strength/confidence below
                        bar, book imbalance, ML reject), it appears here—same
                        data as the terminal &quot;SIGNAL EVALUATED - NO
                        TRADE&quot; boxes. Hit Refresh to sync with the running
                        bot.
                      </p>
                      {(paperData.recentNoTrades?.length ?? 0) === 0 ? (
                        <p className="text-muted-foreground py-4 text-sm rounded-lg bg-muted/30 border border-dashed border-border px-3">
                          No no-trade evaluations in this run yet. They appear
                          as the bot evaluates signals (ETH, SOL, HYPE, etc.)
                          and skips opening when thresholds aren’t met. Refresh
                          after the bot has been running to see them.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {[...(paperData.recentNoTrades ?? [])]
                            .sort((a, b) => b.timestamp - a.timestamp)
                            .map((ev, i) => (
                              <div
                                key={`${ev.asset}-${ev.timestamp}-${i}`}
                                className="rounded-lg border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 p-3 text-xs space-y-2"
                              >
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-semibold">
                                  <span className="text-amber-600 dark:text-amber-400">
                                    ⏸️
                                  </span>
                                  <span className="font-mono">{ev.asset}</span>
                                  <span
                                    className={cn(
                                      "uppercase",
                                      ev.direction === "long"
                                        ? "text-green-600 dark:text-green-400"
                                        : "text-red-600 dark:text-red-400",
                                    )}
                                  >
                                    {ev.direction}
                                  </span>
                                  <span className="text-muted-foreground font-normal">
                                    ·
                                  </span>
                                  <span
                                    className="text-muted-foreground font-normal truncate"
                                    title={ev.reason}
                                  >
                                    {ev.reason}
                                  </span>
                                </div>
                                <p className="text-muted-foreground">
                                  <span className="font-medium text-foreground">
                                    Why no trade:
                                  </span>{" "}
                                  {ev.reason}
                                </p>
                                {ev.contributingSources && (
                                  <p className="text-[11px] text-muted-foreground">
                                    X (Twitter) sentiment:{" "}
                                    {ev.contributingSources.includes(
                                      "XSentiment",
                                    )
                                      ? "in signal (overall below threshold)"
                                      : "did not meet 40% or neutral"}
                                  </p>
                                )}
                                <div className="grid gap-x-4 gap-y-0.5 sm:grid-cols-3 font-mono text-[11px]">
                                  <p>
                                    Strength {ev.strength.toFixed(0)}% (need{" "}
                                    {ev.minStrength}%)
                                  </p>
                                  <p>
                                    Confidence {ev.confidence.toFixed(0)}% (need{" "}
                                    {ev.minConfidence}%)
                                  </p>
                                  <p>
                                    Confirming {ev.confirmingCount} (need{" "}
                                    {ev.minConfirming})
                                  </p>
                                </div>
                                <p className="text-muted-foreground text-[11px]">
                                  {new Date(ev.timestamp)
                                    .toISOString()
                                    .replace("T", " ")
                                    .slice(0, 19)}
                                  Z
                                </p>
                              </div>
                            ))}
                        </div>
                      )}
                    </DashboardCard>
                    {/* ML & recorded data influence (ONNX, bandit, improvement report) — flagship: open AI interoperability */}
                    <DashboardCard title="ML & recorded data influence">
                      {paperData.mlStatus != null ? (
                        <div className="space-y-4">
                          <div className="rounded-lg border border-primary/20 bg-primary/5 dark:bg-primary/10 px-3 py-2.5">
                            <p className="text-xs font-semibold text-foreground mb-1">
                              What this is
                            </p>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              <strong className="text-foreground">ONNX</strong>{" "}
                              (Open Neural Network Exchange) is the open format
                              for AI model interoperability—founded by Meta and
                              Microsoft, now a Linux Foundation project with
                              broad adoption (Amazon, Apple, IBM, NVIDIA, Intel,
                              AMD, Qualcomm). We use ONNX so the bot’s models
                              (signal quality, position sizing,
                              take-profit/stop-loss) are portable and trainable
                              on your trade data. Paper trades → feature store →
                              training → ONNX export → live inference; when no
                              models are loaded, rule-based fallbacks keep the
                              bot running.
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                              ONNX models (4 possible)
                            </p>
                            <p className="text-xs font-mono">
                              {paperData.mlStatus.modelsLoaded.length > 0
                                ? paperData.mlStatus.modelsLoaded.join(", ")
                                : "None loaded (rule-based fallbacks)"}
                            </p>
                            {paperData.mlStatus.modelsLoaded.length === 0 ? (
                              <p className="text-xs text-muted-foreground mt-1">
                                The four slots:{" "}
                                <span className="font-mono">
                                  signal_quality
                                </span>
                                ,{" "}
                                <span className="font-mono">
                                  position_sizing
                                </span>
                                ,{" "}
                                <span className="font-mono">tp_optimizer</span>,{" "}
                                <span className="font-mono">sl_optimizer</span>.
                                To enable: run training after 90+ closed trades,
                                or add .onnx files to{" "}
                                <span className="font-mono">
                                  .elizadb/vince-paper-bot/models/
                                </span>
                                .
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground mt-1">
                                Signal quality threshold:{" "}
                                {(
                                  paperData.mlStatus.signalQualityThreshold *
                                  100
                                ).toFixed(0)}
                                %
                                {paperData.mlStatus.suggestedMinStrength !=
                                  null &&
                                  ` · Suggested min strength: ${paperData.mlStatus.suggestedMinStrength}%`}
                                {paperData.mlStatus.suggestedMinConfidence !=
                                  null &&
                                  ` · Suggested min confidence: ${paperData.mlStatus.suggestedMinConfidence}%`}
                                {paperData.mlStatus.tpLevelSkipped != null &&
                                  ` · TP level ${paperData.mlStatus.tpLevelSkipped + 1} skipped (win rate from report)`}
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                              Thompson Sampling (bandit)
                            </p>
                            <p className="text-xs font-mono">
                              {paperData.mlStatus.banditReady
                                ? "Active"
                                : "Not active"}{" "}
                              · {paperData.mlStatus.banditTradesProcessed}{" "}
                              trades processed
                            </p>
                          </div>
                          {(paperData.recentMLInfluences?.length ?? 0) > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                                Recent influence
                              </p>
                              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                                {[...(paperData.recentMLInfluences ?? [])]
                                  .sort((a, b) => b.timestamp - a.timestamp)
                                  .map((ev, i) => (
                                    <div
                                      key={`${ev.asset}-${ev.timestamp}-${i}`}
                                      className="rounded border border-border/50 px-2 py-1.5 text-xs"
                                    >
                                      <span
                                        className={
                                          ev.type === "open"
                                            ? "text-green-600 dark:text-green-400"
                                            : "text-amber-600 dark:text-amber-400"
                                        }
                                      >
                                        {ev.type === "open"
                                          ? "Opened"
                                          : "Rejected"}
                                      </span>
                                      <span className="font-mono ml-1">
                                        {ev.asset}
                                      </span>
                                      <span className="text-muted-foreground ml-1">
                                        · {ev.message}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground py-4 text-sm">
                          ML inference service not available. When ONNX and
                          bandit are active, you’ll see models loaded,
                          thresholds from the improvement report, and when
                          recorded data influenced a reject or open.
                        </p>
                      )}
                    </DashboardCard>
                  </div>
                ) : (
                  <div className="rounded-xl border border-border bg-muted/30 px-6 py-10 text-center">
                    <Bot className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="font-medium text-foreground">
                      Could not load paper trading data
                    </p>
                    {paperResult?.error && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {paperResult.error}
                      </p>
                    )}
                  </div>
                )}
              </>
            </div>
          </TabsContent>

          {/* Knowledge tab: categories explanation + newly added knowledge + points leaderboard + referral */}
          <TabsContent
            value="knowledge"
            className="mt-6 flex-1 min-h-0 flex flex-col"
          >
            {/* Knowledge categories: what we focus on and why they matter */}
            <div className="mb-6">
              <DashboardCard title="Knowledge Categories">
                <p className="text-sm text-muted-foreground mb-4">
                  Our knowledge base is organized by category. Each category
                  feeds our agents&apos; RAG (Retrieval-Augmented Generation),
                  so responses draw on methodology and frameworks—not just live
                  APIs. Eliza leans most heavily on this knowledge for research,
                  analysis, conversation, and prompt design across all domains.
                </p>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      Trading & Crypto
                    </p>
                    <p className="text-muted-foreground">
                      <strong>bitcoin-maxi</strong>,{" "}
                      <strong>perps-trading</strong>, <strong>options</strong>,{" "}
                      <strong>defi-metrics</strong>, <strong>altcoins</strong>,{" "}
                      <strong>grinding-the-trenches</strong>,{" "}
                      <strong>airdrops</strong>. Cycle analysis, funding and IV
                      interpretation, protocol evaluation, meme
                      psychology—methodology for reading markets.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      Macro & Traditional
                    </p>
                    <p className="text-muted-foreground">
                      <strong>macro-economy</strong>, <strong>stocks</strong>,{" "}
                      <strong>venture-capital</strong>,{" "}
                      <strong>commodities</strong>. Debt cycles, liquidity
                      regimes, risk-on/risk-off—context for crypto and
                      cross-asset synthesis.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">Specialized</p>
                    <p className="text-muted-foreground">
                      <strong>art-collections</strong>, <strong>privacy</strong>
                      , <strong>security</strong>, <strong>regulation</strong>,{" "}
                      <strong>rwa</strong>. NFT valuation, on-chain privacy,
                      smart contract risk, RWA tokenization—depth for research
                      and due diligence.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      Lifestyle & Personal
                    </p>
                    <p className="text-muted-foreground">
                      <strong>the-good-life</strong>,{" "}
                      <strong>substack-essays</strong>. Day-of-week suggestions,
                      luxury, real estate, curated essays—the lifestyle overlay
                      that enriches conversation across agents.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">Technical</p>
                    <p className="text-muted-foreground">
                      <strong>prompt-templates</strong>,{" "}
                      <strong>setup-guides</strong>,{" "}
                      <strong>internal-docs</strong>. Structured prompts, tool
                      config, quality standards—Eliza leans on these for prompt
                      design and consistent output.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      Uncategorized
                    </p>
                    <p className="text-muted-foreground">
                      Uploads that don&apos;t yet fit a category. Use{" "}
                      <code className="bg-muted px-1 rounded text-xs">
                        upload:
                      </code>{" "}
                      in chat; LLM categorization or fallback assigns a folder.
                    </p>
                  </div>
                </div>
              </DashboardCard>
            </div>

            {/* Knowledge overview: newly added files (weekly + all-time) */}
            {knowledgeLoading && !knowledgeData ? (
              <div className="h-32 bg-muted/50 rounded-xl animate-pulse mb-6" />
            ) : knowledgeData ? (
              <div className="mb-6 space-y-4">
                <DashboardCard title="Newly added knowledge">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                        This week
                      </p>
                      <p className="text-2xl font-mono font-bold">
                        {knowledgeData.weekly.count}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        files added in the last 7 days
                      </p>
                      {knowledgeData.weekly.files.length > 0 && (
                        <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground max-h-48 overflow-y-auto">
                          {knowledgeData.weekly.files.map((f, i) => {
                            const folder =
                              f.folder ??
                              f.relativePath.split("/")[0] ??
                              "root";
                            const dateStr = new Date(
                              f.mtime,
                            ).toLocaleDateString();
                            return (
                              <li
                                key={`${f.path}-${i}`}
                                className="flex items-center gap-2 flex-wrap"
                                title={f.relativePath}
                              >
                                <Badge
                                  variant="outline"
                                  className="shrink-0 text-[10px] px-1.5 py-0"
                                >
                                  {folder}
                                </Badge>
                                <span className="truncate min-w-0 flex-1">
                                  {f.name}
                                </span>
                                <span className="shrink-0 text-muted-foreground/80">
                                  {dateStr}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                        All time
                      </p>
                      <p className="text-2xl font-mono font-bold">
                        {knowledgeData.allTime.count}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        files in knowledge base
                      </p>
                      {knowledgeData.allTime.files.length > 0 && (
                        <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground max-h-48 overflow-y-auto">
                          {knowledgeData.allTime.files.map((f, i) => {
                            const folder =
                              f.folder ??
                              f.relativePath.split("/")[0] ??
                              "root";
                            const dateStr = new Date(
                              f.mtime,
                            ).toLocaleDateString();
                            return (
                              <li
                                key={`${f.path}-${i}`}
                                className="flex items-center gap-2 flex-wrap"
                                title={f.relativePath}
                              >
                                <Badge
                                  variant="outline"
                                  className="shrink-0 text-[10px] px-1.5 py-0"
                                >
                                  {folder}
                                </Badge>
                                <span className="truncate min-w-0 flex-1">
                                  {f.name}
                                </span>
                                <span className="shrink-0 text-muted-foreground/80">
                                  {dateStr}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </DashboardCard>
              </div>
            ) : null}

            {/* Test knowledge quality - runs A/B comparison (with vs without knowledge) */}
            <DashboardCard title="Test knowledge quality" className="mt-6">
              <p className="text-sm text-muted-foreground mb-3">
                Runs the knowledge quality E2E test: A/B comparison (with vs
                without knowledge) across 12 domains (OPTIONS, PERPS, MEMES,
                AIRDROPS, LIFESTYLE, ART + Eliza: RESEARCH, BRAINSTORM,
                PROMPT_DESIGN + Solus: STRIKE_RITUAL, YIELD_STACK,
                SEVEN_PILLARS). Eliza (chat, brainstorm), VINCE (execution),
                Solus (wealth architect). Each agent uses knowledge differently.
                Requires{" "}
                <code className="bg-muted px-1 rounded text-xs">
                  OPENAI_API_KEY
                </code>
                . Takes ~5–10 min.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        KNOWLEDGE_QUALITY_COMMAND,
                      );
                      setTestQualityCopied(true);
                      setTimeout(() => setTestQualityCopied(false), 2000);
                    } catch {
                      // fallback: show command in alert
                      window.prompt(
                        "Copy this command:",
                        KNOWLEDGE_QUALITY_COMMAND,
                      );
                    }
                  }}
                >
                  {testQualityCopied ? (
                    <Check className="w-4 h-4 mr-2 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 mr-2" />
                  )}
                  {testQualityCopied ? "Copied!" : "Copy command"}
                </Button>
                <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-full">
                  {KNOWLEDGE_QUALITY_COMMAND}
                </code>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Run in your project root. Results show improvement per domain
                (Knowledge Integration, overall score) and whether the knowledge
                base adds measurable value.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Use{" "}
                <a
                  href={`${typeof window !== "undefined" ? window.location.origin : ""}/api/agents/${leaderboardsAgentId || ""}/plugins/plugin-vince/vince/knowledge-quality-checklist?raw=1`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  KNOWLEDGE-QUALITY-CHECKLIST.md
                </a>{" "}
                when adding new files.
              </p>
            </DashboardCard>

            {/* Latest quality results (after running the test) */}
            {qualityLoading && (
              <div className="h-24 bg-muted/50 rounded-xl animate-pulse mt-6" />
            )}
            {!qualityLoading && !qualityResult?.data && (
              <DashboardCard title="Latest quality results" className="mt-6">
                <p className="text-sm text-muted-foreground mb-3">
                  No quality results yet. Run the test command above to generate
                  results.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(
                          KNOWLEDGE_QUALITY_COMMAND,
                        );
                        setTestQualityCopied(true);
                        setTimeout(() => setTestQualityCopied(false), 2000);
                      } catch {
                        window.prompt(
                          "Copy this command:",
                          KNOWLEDGE_QUALITY_COMMAND,
                        );
                      }
                    }}
                  >
                    {testQualityCopied ? (
                      <Check className="w-4 h-4 mr-2 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4 mr-2" />
                    )}
                    {testQualityCopied ? "Copied!" : "Copy command"}
                  </Button>
                  <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-full">
                    {KNOWLEDGE_QUALITY_COMMAND}
                  </code>
                </div>
              </DashboardCard>
            )}
            {!qualityLoading && qualityResult?.data && (
              <DashboardCard title="Latest quality results" className="mt-6">
                <p className="text-xs text-muted-foreground mb-3">
                  Ran {new Date(qualityResult.data.ranAt).toLocaleString()}.{" "}
                  {qualityResult.data.note ??
                    "Eliza (chat, brainstorm), VINCE (execution), Solus (wealth architect). Each agent uses knowledge differently."}
                </p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-muted/50 rounded-lg px-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        Avg baseline
                      </p>
                      <p className="text-lg font-mono font-bold">
                        {qualityResult.data.summary.avgBaseline}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg px-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        Avg enhanced
                      </p>
                      <p className="text-lg font-mono font-bold">
                        {qualityResult.data.summary.avgEnhanced}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg px-3 py-2">
                      <p className="text-xs text-muted-foreground">
                        Improvement
                      </p>
                      <p
                        className={cn(
                          "text-lg font-mono font-bold",
                          qualityResult.data.summary.avgImprovement >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-destructive",
                        )}
                      >
                        {qualityResult.data.summary.avgImprovement >= 0
                          ? "+"
                          : ""}
                        {qualityResult.data.summary.avgImprovement}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg px-3 py-2">
                      <p className="text-xs text-muted-foreground">KI delta</p>
                      <p className="text-lg font-mono font-bold text-green-600 dark:text-green-400">
                        +{qualityResult.data.summary.avgKIImprovement}
                      </p>
                    </div>
                  </div>
                  {qualityResult.data.history &&
                    qualityResult.data.history.length > 1 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                          Trend (last 3 runs)
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {qualityResult.data.history.map((h, i) => (
                            <div
                              key={h.ranAt}
                              className="bg-muted/50 rounded px-2 py-1 text-xs"
                            >
                              <span className="text-muted-foreground">
                                {new Date(h.ranAt).toLocaleDateString()}
                              </span>
                              <span className="ml-1 font-mono">
                                +{h.avgImprovement}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      Per domain
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-1.5">Domain</th>
                            <th className="text-left py-1.5">Agent</th>
                            <th className="text-left py-1.5">Folder</th>
                            <th className="text-right py-1.5">Base</th>
                            <th className="text-right py-1.5">Enh</th>
                            <th className="text-right py-1.5">Impr</th>
                            <th className="text-right py-1.5">KI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {qualityResult.data.results.map((r, i) => {
                            const displayAgent =
                              r.agent ??
                              ([
                                "RESEARCH",
                                "BRAINSTORM",
                                "PROMPT_DESIGN",
                              ].includes(r.domain)
                                ? "eliza"
                                : [
                                      "STRIKE_RITUAL",
                                      "YIELD_STACK",
                                      "SEVEN_PILLARS",
                                    ].includes(r.domain)
                                  ? "solus"
                                  : "vince");
                            return (
                              <tr
                                key={`${r.domain}-${i}`}
                                className="border-b border-muted/50"
                              >
                                <td className="py-1.5">{r.domain}</td>
                                <td className="py-1.5 text-muted-foreground">
                                  {displayAgent}
                                </td>
                                <td className="py-1.5 text-muted-foreground font-mono text-xs">
                                  {r.folder}
                                </td>
                                <td className="text-right py-1.5">
                                  {r.baselineScore}
                                </td>
                                <td className="text-right py-1.5">
                                  {r.enhancedScore}
                                </td>
                                <td
                                  className={cn(
                                    "text-right py-1.5 font-mono",
                                    r.improvement >= 0
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-destructive",
                                  )}
                                >
                                  {r.improvement >= 0 ? "+" : ""}
                                  {r.improvement}
                                </td>
                                <td className="text-right py-1.5">
                                  {r.knowledgeIntegration}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  {qualityResult.data.gaps.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-500 uppercase mb-2">
                        Gaps — add content to these folders
                      </p>
                      <ul className="space-y-2 text-sm">
                        {qualityResult.data.gaps.map((g, i) => (
                          <li
                            key={`${g.domain}-${i}`}
                            className="flex flex-col gap-0.5"
                          >
                            <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                              {g.folder}
                            </code>
                            <p className="text-muted-foreground text-xs">
                              {g.recommendation}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      Recommendations
                    </p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                      {qualityResult.data.recommendations.map((rec, i) => (
                        <li key={i}>{rec}</li>
                      ))}
                    </ul>
                    <p className="text-xs text-muted-foreground mt-2">
                      <a
                        href={`${typeof window !== "undefined" ? window.location.origin : ""}/api/agents/${leaderboardsAgentId || ""}/plugins/plugin-vince/vince/knowledge-quality-checklist?raw=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-foreground"
                      >
                        View KNOWLEDGE-QUALITY-CHECKLIST.md
                      </a>
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => refetchQuality()}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </DashboardCard>
            )}

            {/* Upload knowledge text - disabled: use #vince-upload / #vince-upload-youtube on Discord instead */}
            {/*
            <DashboardCard title="Upload knowledge text" className="mt-6">
              <p className="text-sm text-muted-foreground mb-3">
                Paste text (articles, notes, analysis) to add to the knowledge base. Content is saved under an auto-detected category.
              </p>
              <textarea
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
                placeholder="Paste your text here (min ~50 chars)..."
                className="w-full min-h-[120px] px-3 py-2 rounded-lg border bg-background text-sm resize-y"
                disabled={uploadTextStatus === "loading"}
              />
              <div className="mt-3 flex items-center gap-3">
                <Button
                  variant="default"
                  size="sm"
                  disabled={!uploadText.trim() || uploadText.trim().length < 50 || uploadTextStatus === "loading"}
                  onClick={async () => {
                    setUploadTextStatus("loading");
                    setUploadTextMessage("");
                    const result = await submitKnowledgeUpload(uploadAgentId, {
                      type: "text",
                      content: uploadText.trim(),
                    });
                    setUploadTextStatus(result.success ? "success" : "error");
                    const msg = result.message ?? result.error ?? "";
                    setUploadTextMessage(typeof msg === "string" ? msg : String(msg?.message ?? msg?.code ?? msg));
                    if (result.success) {
                      setUploadText("");
                      refetchKnowledge();
                    }
                  }}
                >
                  {uploadTextStatus === "loading" ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {uploadTextStatus === "loading" ? "Uploading…" : "Upload"}
                </Button>
                {(uploadTextStatus === "success" || uploadTextStatus === "error") && (
                  <span className={cn("text-sm", uploadTextStatus === "success" ? "text-green-600 dark:text-green-400" : "text-destructive")}>
                    {uploadTextMessage}
                  </span>
                )}
              </div>
            </DashboardCard>
            */}
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

        {/* Add YouTube video - disabled: use #vince-upload-youtube on Discord instead */}
        {/*
        {mainTab === "knowledge" && leaderboardsAgentId && (
          <DashboardCard title="Add YouTube video" className="mt-6">
            <p className="text-sm text-muted-foreground mb-3">
              Paste a YouTube URL to transcribe and summarize the video, then save it to the knowledge base. Requires <code className="bg-muted px-1 rounded text-xs">@steipete/summarize</code> and an API key.
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="flex-1 px-3 py-2 rounded-lg border bg-background text-sm"
                disabled={youtubeStatus === "loading"}
              />
              <Button
                variant="default"
                size="sm"
                disabled={!youtubeUrl.trim() || youtubeStatus === "loading"}
                onClick={async () => {
                  setYoutubeStatus("loading");
                  setYoutubeMessage("");
                  const result = await submitKnowledgeUpload(uploadAgentId, {
                    type: "youtube",
                    content: youtubeUrl.trim(),
                  });
                  setYoutubeStatus(result.success ? "success" : "error");
                  const msg = result.message ?? result.error ?? "";
                  setYoutubeMessage(typeof msg === "string" ? msg : String(msg?.message ?? msg?.code ?? msg));
                  if (result.success) {
                    setYoutubeUrl("");
                    refetchKnowledge();
                  }
                }}
              >
                {youtubeStatus === "loading" ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Youtube className="w-4 h-4 mr-2" />
                )}
                {youtubeStatus === "loading" ? "Processing…" : "Add"}
              </Button>
            </div>
            {(youtubeStatus === "success" || youtubeStatus === "error") && (
              <p className={cn("mt-2 text-sm", youtubeStatus === "success" ? "text-green-600 dark:text-green-400" : "text-destructive")}>
                {youtubeMessage}
              </p>
            )}
          </DashboardCard>
        )}
        */}
      </div>
    </DashboardPageLayout>
  );
}
