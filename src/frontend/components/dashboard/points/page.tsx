import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardPageLayout from "@/frontend/components/dashboard/layout";
import DashboardCard from "@/frontend/components/dashboard/card";
import { Button } from "@/frontend/components/ui/button";
import { elizaClient } from "@/frontend/lib/elizaClient";
import type { UserSummary } from "@elizaos/api-client";
import { Coins, RefreshCw, Flame, Award, TrendingUp, MessageCircle, Zap, Users } from "lucide-react";
import { UUID } from "@elizaos/core";

// Type assertion for gamification service
const gamificationClient = (elizaClient as { gamification?: { getUserSummary: (agentId: UUID) => Promise<UserSummary> } }).gamification;

interface PointsPageProps {
  agentId: UUID;
  /** Called when user clicks Sign in from unauthenticated state */
  onSignInClick?: () => void;
}

/** How to earn points - matches plugin-gamification constants */
const EARN_POINTS_ITEMS = [
  { icon: MessageCircle, label: "Meaningful chat", pts: "2–5 pts", desc: "Send messages (25+ chars, up to 6/day)" },
  { icon: Zap, label: "Swap completed", pts: "80+ pts", desc: "Volume bonus: +1 pt per $10" },
  { icon: Zap, label: "Bridge completed", pts: "120+ pts", desc: "Volume bonus: +1.5 pts per $10" },
  { icon: Zap, label: "Transfer completed", pts: "40 pts", desc: "Outward transfers >$25" },
  { icon: Flame, label: "Daily streak", pts: "25+ pts", desc: "+10 per consecutive day (max +70)" },
  { icon: Users, label: "Referral signup", pts: "200 pts", desc: "Friend signs up with your link" },
  { icon: Users, label: "Referral activation", pts: "300 pts", desc: "Friend activates within 7 days" },
];

export default function PointsPage({ agentId, onSignInClick }: PointsPageProps) {
  const [forceRefresh, setForceRefresh] = useState(0);

  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ["pointsSummary", agentId, forceRefresh],
    queryFn: async () => {
      if (!gamificationClient) {
        throw new Error("Gamification service not available");
      }
      try {
        return await gamificationClient.getUserSummary(agentId);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number }; status?: number })?.response?.status ?? (err as { status?: number })?.status;
        if (status === 404 || status === 401 || status === 403) {
          return null; // Not authenticated or no summary
        }
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const handleRefresh = () => {
    setForceRefresh((n) => n + 1);
    refetch();
  };

  return (
    <DashboardPageLayout
      header={{
        title: "Points",
        description: "Your gamification stats & how to earn more",
      }}
    >
      <div className="flex flex-col h-full gap-6">
        {/* Header actions */}
        <div className="flex items-center justify-end flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Points summary cards */}
        {error && !isLoading ? (
          <DashboardCard title="Points Summary">
            <div className="text-center py-12">
              <p className="text-destructive mb-2">Error loading points</p>
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
          <DashboardCard title="Points Summary">
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="h-12 w-12 bg-muted rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          </DashboardCard>
        ) : summary ? (
          <>
            {/* Main stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <DashboardCard title="Total Points">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Coins className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono">
                      {summary.allTimePoints.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">All-time</div>
                  </div>
                </div>
              </DashboardCard>

              <DashboardCard title="This Week">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono">
                      {summary.weeklyPoints.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">Weekly sprint</div>
                  </div>
                </div>
              </DashboardCard>

              <DashboardCard title="Level">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Award className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-xl font-bold">{summary.levelName}</div>
                    <div className="text-xs text-muted-foreground">Level {summary.level}</div>
                  </div>
                </div>
              </DashboardCard>

              <DashboardCard title="Streak">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Flame className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-mono">{summary.streakDays}</div>
                    <div className="text-xs text-muted-foreground">Days in a row</div>
                  </div>
                </div>
              </DashboardCard>
            </div>

            {/* Next milestone */}
            {summary.nextMilestone && (
              <DashboardCard title="Next Milestone" intent="success">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-semibold">{summary.nextMilestone.levelName}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {summary.nextMilestone.pointsNeeded.toLocaleString()} points to go
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold font-mono text-primary">
                      {summary.nextMilestone.pointsNeeded.toLocaleString()}
                    </div>
                  </div>
                </div>
              </DashboardCard>
            )}

            {/* Swaps completed (if available) */}
            {summary.swapsCompleted != null && summary.swapsCompleted > 0 && (
              <DashboardCard title="Swaps Completed">
                <div className="text-2xl font-bold font-mono">{summary.swapsCompleted}</div>
              </DashboardCard>
            )}
          </>
        ) : (
          <DashboardCard title="Points Summary">
            <div className="text-center py-12">
              <Coins className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Sign in to view your points</p>
              <p className="text-sm text-muted-foreground mt-2 mb-4">
                Connect your account to see your level, streak, and earn points!
              </p>
              {onSignInClick && (
                <Button onClick={onSignInClick} variant="default">
                  Sign in
                </Button>
              )}
            </div>
          </DashboardCard>
        )}

        {/* How to earn points - always shown */}
        <DashboardCard title="How to Earn Points">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EARN_POINTS_ITEMS.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30"
              >
                <div className="rounded-md bg-primary/10 p-2 shrink-0">
                  <item.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">{item.label}</span>
                    <span className="text-xs font-mono text-primary">{item.pts}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Chat with VINCE, swap, bridge, and refer friends to climb the leaderboard!
          </p>
        </DashboardCard>
      </div>
    </DashboardPageLayout>
  );
}
