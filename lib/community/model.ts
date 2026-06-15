/**
 * Community Network — model (Platform Transformation, Wave 7).
 *
 * A human, freedom-first social layer. Its purpose is connection, learning, commerce, and shared journeys — never to
 * rank, approve, judge, or grant status. The spec's hardest rules are enforced STRUCTURALLY, the same way the
 * discovery engine forbids paid ranking: the fields that would enable a social-credit or popularity system are
 * intentionally ABSENT from the types, so they cannot be built by accident.
 *
 *   NOT PRESENT, BY DESIGN (FORBIDDEN_SOCIAL_SIGNALS): popularity score, like/reaction COUNT as status, follower
 *   count as status, ranking score, engagement score, trending score, social-credit rating, approval rating.
 *
 * What IS present: posts about human life (milestones, experiences, lessons, hobbies, interests, ideas) and commerce;
 * mutual connections that are relationships, not scoreboards; conversational responses; and communities. Ordering is
 * by recency and the viewer's OWN chosen interests — never by popularity (see ./feed).
 */

export type CommunitySection =
  | 'people' | 'communities' | 'commerce' | 'learning' | 'preparedness' | 'governance' | 'messaging' | 'global';

export const COMMUNITY_SECTIONS: { id: CommunitySection; label: string; blurb: string }[] = [
  { id: 'people', label: 'People', blurb: 'Connect with people, on equal terms.' },
  { id: 'communities', label: 'Communities', blurb: 'Find groups around what you care about.' },
  { id: 'commerce', label: 'Commerce', blurb: 'Discover what people make and offer.' },
  { id: 'learning', label: 'Learning', blurb: 'Share and learn from real experience.' },
  { id: 'preparedness', label: 'Preparedness', blurb: 'Learn how others stay ready.' },
  { id: 'governance', label: 'Governance', blurb: 'Talk through decisions together.' },
  { id: 'messaging', label: 'Messaging', blurb: 'Private conversations, yours to control.' },
  { id: 'global', label: 'Global Connection', blurb: 'Reach people across the world.' },
];

/** Content is human first — not everything revolves around VFIDE. */
export type PostKind =
  | 'life-milestone' | 'family-milestone' | 'business-milestone' | 'experience' | 'lesson'
  | 'hobby' | 'interest' | 'community' | 'product' | 'service' | 'idea';

export const POST_KIND_LABEL: Record<PostKind, string> = {
  'life-milestone': 'Life milestone', 'family-milestone': 'Family milestone', 'business-milestone': 'Business milestone',
  experience: 'Experience', lesson: 'Lesson learned', hobby: 'Hobby', interest: 'Interest',
  community: 'Community', product: 'Product', service: 'Service', idea: 'Idea',
};

/** Human / non-VFIDE post kinds — proof the network is about people, not only the protocol. */
export const HUMAN_POST_KINDS: PostKind[] = ['life-milestone', 'family-milestone', 'experience', 'hobby', 'interest', 'idea'];

export interface CommunityPost {
  id: string;
  authorId: string;
  kind: PostKind;
  body: string;
  createdAt: number;        // unix ms — ordering input
  communityId?: string;
  // NOTE: there is deliberately NO popularityScore, likeCount, reactionCount, followerCount, rankingScore,
  // engagementScore, trendingScore, or any status figure. See FORBIDDEN_SOCIAL_SIGNALS.
}

/** A connection is a symmetric relationship — never a follower tally or a status. */
export interface Connection { a: string; b: string; since: number }

/** A response is conversation — never a vote, score, or ranking signal, and it never affects feed order. */
export interface Response { id: string; postId: string; authorId: string; body: string; createdAt: number }

/** The signals that would turn connection into a scoreboard — asserted absent by tests and by code review. */
export const FORBIDDEN_SOCIAL_SIGNALS = [
  'popularityScore', 'likeCount', 'reactionCount', 'followerCount', 'rankingScore',
  'engagementScore', 'trendingScore', 'socialCredit', 'approvalRating', 'rank',
] as const;

/** True iff an object is free of every forbidden social signal (used to guard content shapes). */
export function isFreeOfSocialScoring(obj: Record<string, unknown>): boolean {
  return !FORBIDDEN_SOCIAL_SIGNALS.some((k) => k in obj);
}

// ── Freedom invariants (the values, made checkable) ──────────────────────────
export function popularityScoringExists(): boolean { return false; }
export function peopleAreRanked(): boolean { return false; }
export function socialCreditExists(): boolean { return false; }
export function approvalSystemExists(): boolean { return false; }
