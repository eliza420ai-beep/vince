import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardPageLayout from "@/frontend/components/dashboard/layout";
import RebelsRanking from "@/frontend/components/dashboard/rebels-ranking";
import DashboardCard from "@/frontend/components/dashboard/card";
import { Button } from "@/frontend/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/frontend/components/ui/tabs";
import { elizaClient } from "@/frontend/lib/elizaClient";
import type { RebelRanking } from "@/frontend/types/dashboard";
import type { LeaderboardEntry } from "@elizaos/api-client";
import { Trophy, RefreshCw, Copy, Check } from "lucide-react";
import { UUID } from "@elizaos/core";

// Type assertion for gamification service (will be available after API client rebuild)
const gamificationClient = (
  elizaClient as {
    gamification?: {
      getLeaderboard: (
        agentId: UUID,
        scope: "weekly" | "all_time",
        limit: number,
      ) => Promise<{
        scope: string;
        entries: LeaderboardEntry[];
        userRank: number;
        limit: number;
      }>;
      getReferralCode: (agentId: UUID) => Promise<{
        referralLink: string;
        stats: {
          totalReferrals: number;
          activatedReferrals: number;
          totalPointsEarned: number;
        };
      }>;
    };
  }
).gamification;

interface PointsPageProps {
  agentId: UUID;
}

// Available default avatars for randomization
const defaultAvatars = [
  "/avatars/user_joyboy.png",
  "/avatars/user_krimson.png",
  "/avatars/user_mati.png",
  "/avatars/user_pek.png",
];

// Simple hash function to deterministically select avatar based on username
const getRandomAvatar = (username: string): string => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    const char = username.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  const index = Math.abs(hash) % defaultAvatars.length;
  return defaultAvatars[index];
};

// Check if avatar is the default krimson avatar (early users have this)
const isKrimsonAvatar = (avatar: string | undefined): boolean => {
  if (!avatar) return false;
  return avatar.includes("user_krimson.png") || avatar.includes("user_krimson");
};

export default function PointsPage({ agentId }: PointsPageProps) {
  const [scope, setScope] = useState<"weekly" | "all_time">("weekly");
  const [copied, setCopied] = useState(false);

  const {
    data: leaderboardData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["leaderboard", agentId, scope],
    queryFn: async () => {
      if (!gamificationClient) {
        throw new Error("Gamification service not available");
      }
      try {
        return await gamificationClient.getLeaderboard(agentId, scope, 50);
      } catch (err: unknown) {
        const e = err as { response?: { status?: number }; status?: number };
        const status = e?.response?.status ?? e?.status;
        if (status === 404) {
          return { scope, entries: [], userRank: 0, limit: 50 };
        }
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  // Transform leaderboard entries to RebelRanking format
  const rebels: RebelRanking[] = (leaderboardData?.entries ?? []).map(
    (entry: LeaderboardEntry, index: number) => {
      const username = entry.username ?? "Anonymous";
      const avatar =
        !entry.avatar || isKrimsonAvatar(entry.avatar)
          ? getRandomAvatar(username)
          : entry.avatar;
      return {
        id: entry.rank ?? index + 1,
        name: username,
        handle: username.toUpperCase(),
        streak: "",
        points: entry.points ?? 0,
        avatar,
        featured: index < 3,
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
      if (!gamificationClient) {
        throw new Error("Gamification service not available");
      }
      return await gamificationClient.getReferralCode(agentId);
    },
    enabled: !!agentId,
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

  const hasUserRank =
    leaderboardData?.userRank != null && leaderboardData.userRank > 0;
  const leaderboardMaxHeight = hasUserRank
    ? "calc(100vh - 340px)"
    : "calc(100vh - 240px)";

  return (
    <DashboardPageLayout
      header={{
        title: "Points",
        description:
          scope === "weekly" ? "Weekly Sprint Rankings" : "All-Time Rankings",
      }}
    >
      <div className="flex flex-col h-full">
        <Tabs
          value={scope}
          onValueChange={(v) => setScope(v as "weekly" | "all_time")}
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
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
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

        {/* User Rank Card */}
        {hasUserRank && (
          <div className="mt-6 mb-4 flex-shrink-0">
            <DashboardCard title="Your Rank">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold font-mono">
                    #{leaderboardData!.userRank}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {scope === "weekly" ? "Weekly Ranking" : "All-Time Ranking"}
                  </div>
                </div>
              </div>
            </DashboardCard>
          </div>
        )}

        {/* Referral Link Card */}
        {agentId && (
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
