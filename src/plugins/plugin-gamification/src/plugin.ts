import type { Plugin, UUID } from "@elizaos/core";
import { logger } from "@elizaos/core";
import type { IAgentRuntime } from "@elizaos/core";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { gamificationSchema } from "./schema";
import { GamificationService } from "./services/GamificationService";
import { ReferralService } from "./services/ReferralService";
import { LeaderboardService } from "./services/LeaderboardService";
import { pointsProvider } from "./providers/pointsProvider";
import { leaderboardProvider } from "./providers/leaderboardProvider";
import { getPointsSummaryAction } from "./actions/getPointsSummary";
import { getReferralCodeAction } from "./actions/getReferralCode";
import { getLeaderboardAction } from "./actions/getLeaderboard";
import { gamificationEvents } from "./events/eventHandlers";

interface AuthTokenPayload {
  userId: string;
  email: string;
  username: string;
  isAdmin?: boolean;
  iat: number;
  exp: number;
}

/**
 * Verify JWT and extract userId from request
 * Returns userId if valid, null otherwise
 */
function verifyAuth(req: Request): { userId: string; isAdmin: boolean } | null {
  const JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    logger.error("[GamificationPlugin] JWT_SECRET not configured");
    return null;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    return { userId: decoded.userId, isAdmin: decoded.isAdmin || false };
  } catch (error) {
    logger.debug("[GamificationPlugin] Invalid auth token");
    return null;
  }
}

/**
 * Send 401 Unauthorized response
 */
function sendUnauthorized(res: Response): void {
  res.status(401).json({
    success: false,
    error: {
      code: "UNAUTHORIZED",
      message: "Auth required.",
    },
  });
}

/**
 * Get referral link base URL from runtime setting or env (default https://otaku.so)
 */
function getReferralBaseUrl(runtime: IAgentRuntime): string {
  const base =
    (runtime.getSetting("GAMIFICATION_REFERRAL_BASE_URL") as string) ||
    process.env.GAMIFICATION_REFERRAL_BASE_URL ||
    "https://otaku.so";
  return base.replace(/\/$/, "");
}

/**
 * Leaderboard route handler
 * PUBLIC endpoint - but does NOT expose raw userIds
 * Only shows anonymized display info (username, avatar, rank)
 */
async function handleGetLeaderboard(
  req: Request,
  res: Response,
  runtime: IAgentRuntime,
): Promise<void> {
  try {
    const scope = (req.query.scope as "weekly" | "all_time") || "weekly";

    // Validate and limit input
    const rawLimit = parseInt(req.query.limit as string) || 50;
    const limit = Math.min(Math.max(1, rawLimit), 100); // Clamp between 1 and 100

    // Validate scope
    if (scope !== "weekly" && scope !== "all_time") {
      res.status(400).json({ error: "Scope must be weekly or all_time." });
      return;
    }

    const gamificationService = runtime.getService(
      "gamification",
    ) as GamificationService;
    if (!gamificationService) {
      res.status(503).json({ error: "Ranking service unavailable." });
      return;
    }

    const entries = await gamificationService.getLeaderboard(scope, limit);

    // Get authenticated user's rank if they're logged in (optional auth)
    let userRank = 0;
    const auth = verifyAuth(req);
    if (auth) {
      userRank = await gamificationService.getUserRank(
        auth.userId as UUID,
        scope,
      );
    }

    // Return sanitized entries - NO raw userIds exposed
    const sanitizedEntries = entries.map((entry) => ({
      rank: entry.rank,
      points: entry.points,
      level: entry.level,
      levelName: entry.levelName,
      username: entry.username || `User #${entry.rank}`,
      avatar: entry.avatar,
    }));

    res.json({
      scope,
      entries: sanitizedEntries,
      userRank,
      limit,
    });
  } catch (error) {
    logger.error({ error }, "[GamificationPlugin] Error fetching leaderboard");
    res.status(500).json({ error: "Could not load leaderboard." });
  }
}

/**
 * User summary route handler
 * PROTECTED endpoint - requires authentication
 * Users can only view their own summary
 */
async function handleGetUserSummary(
  req: Request,
  res: Response,
  runtime: IAgentRuntime,
): Promise<void> {
  try {
    // Require authentication
    const auth = verifyAuth(req);
    if (!auth) {
      sendUnauthorized(res);
      return;
    }

    // Use authenticated userId - users can only see their own summary
    const userId = auth.userId;

    const gamificationService = runtime.getService(
      "gamification",
    ) as GamificationService;
    if (!gamificationService) {
      res.status(503).json({ error: "Ranking service unavailable." });
      return;
    }

    const summary = await gamificationService.getUserSummary(userId as UUID);

    // Don't return the userId in response (caller already knows it)
    const { userId: _omit, ...safeSummary } = summary;
    res.json(safeSummary);
  } catch (error) {
    logger.error({ error }, "[GamificationPlugin] Error fetching user summary");
    res.status(500).json({ error: "Could not load summary." });
  }
}

/**
 * Referral code route handler
 * PROTECTED endpoint - requires authentication
 * Users can only view their own referral code
 */
async function handleGetReferralCode(
  req: Request,
  res: Response,
  runtime: IAgentRuntime,
): Promise<void> {
  try {
    // Require authentication
    const auth = verifyAuth(req);
    if (!auth) {
      sendUnauthorized(res);
      return;
    }

    // Use authenticated userId - users can only see their own referral code
    const userId = auth.userId;

    const referralService = runtime.getService("referral") as ReferralService;
    if (!referralService) {
      res.status(503).json({ error: "Referral service unavailable." });
      return;
    }

    const { code, stats } = await referralService.getOrCreateCode(
      userId as UUID,
    );
    const baseUrl = getReferralBaseUrl(runtime);
    res.json({ code, stats, referralLink: `${baseUrl}?ref=${code}` });
  } catch (error) {
    logger.error(
      { error },
      "[GamificationPlugin] Error fetching referral code",
    );
    res.status(500).json({ error: "Could not load referral." });
  }
}

export const gamificationPlugin: Plugin = {
  name: "gamification",
  description: "Ranking and points for who shows up. Referrals included.",

  schema: gamificationSchema,

  async init() {
    logger.info("*** Initializing Gamification plugin ***");
  },

  services: [GamificationService, ReferralService, LeaderboardService],

  actions: [
    getPointsSummaryAction,
    getReferralCodeAction,
    getLeaderboardAction,
  ],

  providers: [pointsProvider, leaderboardProvider],

  events: gamificationEvents,

  // Routes with proper authentication:
  // - /leaderboard: PUBLIC (but no userIds exposed)
  // - /summary: PROTECTED (auth required, own data only)
  // - /referral: PROTECTED (auth required, own data only)
  routes: [
    {
      path: "/leaderboard",
      type: "GET",
      handler: handleGetLeaderboard as any,
    },
    {
      path: "/summary",
      type: "GET",
      handler: handleGetUserSummary as any,
    },
    {
      path: "/referral",
      type: "GET",
      handler: handleGetReferralCode as any,
    },
  ],
};

export default gamificationPlugin;
