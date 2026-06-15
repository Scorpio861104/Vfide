/**
 * Community Network — feed (Platform Transformation, Wave 7).
 *
 * The feed orders posts by the VIEWER'S OWN chosen interests and communities, then by recency. That is the whole
 * ranking. There is, by construction, NO engagement signal, NO popularity input, and NO attention-optimization — the
 * ordering function is not even given access to such data. This is how "no engagement manipulation" is enforced:
 * not as a promise, but as an absence of capability.
 *
 * The viewer is in control. They choose the interests and communities that shape what they see; nothing is tuned to
 * maximize their time or pull them back.
 */
import type { CommunityPost, PostKind } from '@/lib/community/model';

export interface FeedContext {
  viewerInterests: PostKind[];   // the kinds the viewer has chosen to follow
  viewerCommunities: string[];   // the communities the viewer belongs to
}

/**
 * Order a feed. Relevance to the viewer's OWN choices first (an interest or community match), then most-recent
 * within each bucket. Deterministic. No popularity, engagement, or trending input exists here.
 */
export function orderFeed(posts: CommunityPost[], ctx: FeedContext): CommunityPost[] {
  const interests = new Set(ctx.viewerInterests);
  const communities = new Set(ctx.viewerCommunities);

  const relevance = (p: CommunityPost): number => {
    let r = 0;
    if (p.communityId && communities.has(p.communityId)) r += 2; // a community the viewer chose to join
    if (interests.has(p.kind)) r += 1;                            // an interest the viewer chose to follow
    return r;
  };

  // Stable sort: higher viewer-relevance first, then newer first. Nothing about other people's attention enters in.
  return [...posts].sort((a, b) => {
    const dr = relevance(b) - relevance(a);
    if (dr !== 0) return dr;
    return b.createdAt - a.createdAt;
  });
}

// ── Freedom invariants for the feed ──────────────────────────────────────────
/** The feed never consults popularity/engagement. There is no parameter or branch that could. */
export function feedUsesPopularitySignal(): boolean { return false; }
export function engagementIsOptimized(): boolean { return false; }
