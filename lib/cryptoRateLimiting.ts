/**
 * Rate limiting for reward system
 * Prevents token farming and abuse
 */

export interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  cooldownMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  reason?: string;
}

// Cooldown periods for different reward types
export const REWARD_COOLDOWNS = {
  message_sent: 60 * 1000, // 1 minute between message rewards
  reaction_given: 30 * 1000, // 30 seconds between reaction rewards
  reaction_received: 30 * 1000,
  daily_login: 24 * 60 * 60 * 1000, // Once per day
  profile_complete: Infinity, // One-time reward
  first_payment: Infinity,
  referral: 60 * 60 * 1000, // 1 hour between referral rewards
  group_created: 60 * 60 * 1000, // 1 hour between group rewards
  badge_earned: Infinity,
} as const;

// Maximum rewards per action type per day
export const DAILY_LIMITS = {
  message_sent: 100, // Max 100 message rewards per day
  reaction_given: 200,
  reaction_received: 500,
  daily_login: 1,
  profile_complete: 1,
  first_payment: 1,
  referral: 10,
  group_created: 5,
  badge_earned: 10,
} as const;

// Token amounts per action
export const REWARD_AMOUNTS = {
  message_sent: 10,
  reaction_given: 2,
  reaction_received: 5,
  daily_login: 50,
  profile_complete: 100,
  first_payment: 200,
  referral: 500,
  group_created: 100,
  badge_earned: 50,
} as const;

interface UserRateLimitData {
  lastAttempt: number;
  attempts: number;
  dailyCount: number;
  dailyResetAt: number;
}

// In-memory store (should be Redis in production)
const rateLimitStore = new Map<string, Map<string, UserRateLimitData>>();

/**
 * Get rate limit key (reserved for future Redis integration)
 */
function _getRateLimitKey(userId: string, actionType: string): string {
  return `${userId}:${actionType}`;
}

/**
 * Check if action is within rate limits
 */
export function checkRateLimit(
  userId: string,
  actionType: keyof typeof REWARD_COOLDOWNS
): RateLimitResult {
  const now = Date.now();
  const cooldown = REWARD_COOLDOWNS[actionType];
  const dailyLimit = DAILY_LIMITS[actionType];

  // Get user's rate limit data
  if (!rateLimitStore.has(actionType)) {
    rateLimitStore.set(actionType, new Map());
  }

  const actionStore = rateLimitStore.get(actionType)!;
  let userData = actionStore.get(userId);

  // Initialize if first attempt
  if (!userData) {
    userData = {
      lastAttempt: 0,
      attempts: 0,
      dailyCount: 0,
      dailyResetAt: now + 24 * 60 * 60 * 1000,
    };
    actionStore.set(userId, userData);
  }

  // Reset daily count if needed
  if (now >= userData.dailyResetAt) {
    userData.dailyCount = 0;
    userData.dailyResetAt = now + 24 * 60 * 60 * 1000;
  }

  // Check cooldown
  const timeSinceLastAttempt = now - userData.lastAttempt;
  if (timeSinceLastAttempt < cooldown) {
    const resetAt = new Date(userData.lastAttempt + cooldown);
    const remaining = Math.ceil((cooldown - timeSinceLastAttempt) / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetAt,
      reason: `Please wait ${remaining} seconds before ${actionType.replace('_', ' ')} again`,
    };
  }

  // Check daily limit
  if (userData.dailyCount >= dailyLimit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(userData.dailyResetAt),
      reason: `Daily limit reached for ${actionType.replace('_', ' ')} (${dailyLimit} per day)`,
    };
  }

  // Allow the action
  userData.lastAttempt = now;
  userData.attempts += 1;
  userData.dailyCount += 1;

  return {
    allowed: true,
    remaining: dailyLimit - userData.dailyCount,
    resetAt: new Date(userData.dailyResetAt),
  };
}

/**
 * Record a successful reward grant (called after blockchain confirmation)
 */
export function recordRewardGrant(userId: string, actionType: keyof typeof REWARD_COOLDOWNS): void {
  const actionStore = rateLimitStore.get(actionType);
  if (!actionStore) return;

  const userData = actionStore.get(userId);
  if (!userData) return;

  // Update last attempt time (already updated in checkRateLimit, but ensure it's current)
  userData.lastAttempt = Date.now();
}

/**
 * Get remaining quota for user
 */
export function getRemainingQuota(
  userId: string,
  actionType: keyof typeof REWARD_COOLDOWNS
): {
  daily: number;
  nextResetAt: Date;
  canPerformNow: boolean;
  nextAllowedAt: Date;
} {
  const now = Date.now();
  const cooldown = REWARD_COOLDOWNS[actionType];
  const dailyLimit = DAILY_LIMITS[actionType];

  const actionStore = rateLimitStore.get(actionType);
  const userData = actionStore?.get(userId);

  if (!userData) {
    return {
      daily: dailyLimit,
      nextResetAt: new Date(now + 24 * 60 * 60 * 1000),
      canPerformNow: true,
      nextAllowedAt: new Date(now),
    };
  }

  // Reset daily count if needed
  const dailyResetAt = userData.dailyResetAt;
  const dailyRemaining = now >= dailyResetAt ? dailyLimit : dailyLimit - userData.dailyCount;

  // Check cooldown
  const nextAllowedAt = userData.lastAttempt + cooldown;
  const canPerformNow = now >= nextAllowedAt && dailyRemaining > 0;

  return {
    daily: dailyRemaining,
    nextResetAt: new Date(dailyResetAt),
    canPerformNow,
    nextAllowedAt: new Date(nextAllowedAt),
  };
}

/**
 * Clear rate limit data for user (admin function)
 */
export function clearUserRateLimit(userId: string, actionType?: keyof typeof REWARD_COOLDOWNS): void {
  if (actionType) {
    const actionStore = rateLimitStore.get(actionType);
    if (actionStore) {
      actionStore.delete(userId);
    }
  } else {
    // Clear all rate limits for user
    for (const actionStore of rateLimitStore.values()) {
      actionStore.delete(userId);
    }
  }
}

/**
 * Get rate limit statistics (admin function)
 */
export function getRateLimitStats(actionType: keyof typeof REWARD_COOLDOWNS): {
  totalUsers: number;
  activeToday: number;
  totalAttempts: number;
  averageDaily: number;
} {
  const actionStore = rateLimitStore.get(actionType);
  if (!actionStore) {
    return {
      totalUsers: 0,
      activeToday: 0,
      totalAttempts: 0,
      averageDaily: 0,
    };
  }

  const now = Date.now();
  let activeToday = 0;
  let totalAttempts = 0;
  let totalDaily = 0;

  for (const userData of actionStore.values()) {
    totalAttempts += userData.attempts;

    if (now < userData.dailyResetAt) {
      activeToday += 1;
      totalDaily += userData.dailyCount;
    }
  }

  return {
    totalUsers: actionStore.size,
    activeToday,
    totalAttempts,
    averageDaily: activeToday > 0 ? totalDaily / activeToday : 0,
  };
}

/**
 * Middleware for API rate limiting
 */
export function withRateLimit(
  handler: (req: Request, context: Record<string, unknown>) => Promise<Response>,
  actionType: keyof typeof REWARD_COOLDOWNS
) {
  return async (req: Request, context: Record<string, unknown>): Promise<Response> => {
    try {
      // Extract user ID from request (you'll need to implement authentication)
      const params = context.params as { userId?: string } | undefined;
      const userId = params?.userId || 'anonymous';

      // Check rate limit
      const rateLimitResult = checkRateLimit(userId, actionType);

      if (!rateLimitResult.allowed) {
        return Response.json(
          {
            error: 'Rate limit exceeded',
            message: rateLimitResult.reason,
            resetAt: rateLimitResult.resetAt,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': DAILY_LIMITS[actionType].toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': rateLimitResult.resetAt.toISOString(),
              'Retry-After': Math.ceil(
                (rateLimitResult.resetAt.getTime() - Date.now()) / 1000
              ).toString(),
            },
          }
        );
      }

      // Call the handler
      const response = await handler(req, context);

      // Add rate limit headers to response
      const headers = new Headers(response.headers);
      headers.set('X-RateLimit-Limit', DAILY_LIMITS[actionType].toString());
      headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
      headers.set('X-RateLimit-Reset', rateLimitResult.resetAt.toISOString());

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
  };
}
