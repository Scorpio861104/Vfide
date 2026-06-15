/**
 * Community Network — freedom invariants + feed tests (Platform Transformation, Wave 7).
 *
 * The values, made checkable: popularity/ranking/social-credit are structurally absent; the feed orders by the
 * viewer's OWN interests and recency with no popularity signal available to it; and the content model stays human.
 */
import { describe, it, expect } from '@jest/globals';
import {
  FORBIDDEN_SOCIAL_SIGNALS, isFreeOfSocialScoring, HUMAN_POST_KINDS, POST_KIND_LABEL, COMMUNITY_SECTIONS,
  popularityScoringExists, peopleAreRanked, socialCreditExists, approvalSystemExists,
  type CommunityPost, type PostKind,
} from '@/lib/community/model';
import { orderFeed, feedUsesPopularitySignal, engagementIsOptimized } from '@/lib/community/feed';

const ALL_KINDS = Object.keys(POST_KIND_LABEL) as PostKind[];
const post = (id: string, kind: PostKind, createdAt: number, communityId?: string): CommunityPost =>
  ({ id, authorId: 'a', kind, body: 'x', createdAt, communityId });

describe('Community: freedom invariants (structural)', () => {
  it('INV-01 a community post is free of every forbidden social signal', () => {
    const p = post('1', 'experience', 1000);
    expect(isFreeOfSocialScoring(p as unknown as Record<string, unknown>)).toBe(true);
    for (const sig of FORBIDDEN_SOCIAL_SIGNALS) expect(sig in p).toBe(false);
  });
  it('INV-02 there is no popularity, ranking, social-credit, or approval system', () => {
    expect(popularityScoringExists()).toBe(false);
    expect(peopleAreRanked()).toBe(false);
    expect(socialCreditExists()).toBe(false);
    expect(approvalSystemExists()).toBe(false);
  });
  it('INV-03 the feed uses no popularity signal and optimizes no engagement', () => {
    expect(feedUsesPopularitySignal()).toBe(false);
    expect(engagementIsOptimized()).toBe(false);
  });
  it('INV-04 the social-scoring guard actually catches a forbidden field', () => {
    expect(isFreeOfSocialScoring({ body: 'ok' })).toBe(true);
    expect(isFreeOfSocialScoring({ body: 'ok', likeCount: 5 })).toBe(false);
    expect(isFreeOfSocialScoring({ body: 'ok', rank: 1 })).toBe(false);
  });
});

describe('Community: feed orders by the viewer, not by popularity', () => {
  it('FEED-01 with no chosen interests, order is purely most-recent-first', () => {
    const posts = [post('old', 'hobby', 100), post('new', 'idea', 300), post('mid', 'lesson', 200)];
    const out = orderFeed(posts, { viewerInterests: [], viewerCommunities: [] });
    expect(out.map((p) => p.id)).toEqual(['new', 'mid', 'old']);
  });
  it('FEED-02 a post matching a viewer-chosen interest ranks above an equally-recent non-match', () => {
    const posts = [post('other', 'lesson', 100), post('mine', 'hobby', 100)];
    const out = orderFeed(posts, { viewerInterests: ['hobby'], viewerCommunities: [] });
    expect(out[0]!.id).toBe('mine');
  });
  it('FEED-03 a post in a viewer-joined community outranks an interest-only match', () => {
    const interestMatch = post('interest', 'hobby', 500);
    const communityMatch = post('community', 'lesson', 100, 'c1');
    const out = orderFeed([interestMatch, communityMatch], { viewerInterests: ['hobby'], viewerCommunities: ['c1'] });
    expect(out[0]!.id).toBe('community');
  });
  it('FEED-04 deterministic — same inputs, same order', () => {
    const posts = [post('a', 'idea', 200), post('b', 'hobby', 100)];
    const ctx = { viewerInterests: ['hobby'] as PostKind[], viewerCommunities: [] };
    expect(orderFeed(posts, ctx).map((p) => p.id)).toEqual(orderFeed(posts, ctx).map((p) => p.id));
  });
  it('FEED-05 order is fully determined by recency + viewer interest — there is no popularity field to consult', () => {
    // identical recency, no interest/community match → stable by recency only; nothing else can reorder them
    const posts = [post('first', 'idea', 100), post('second', 'lesson', 100)];
    const out = orderFeed(posts, { viewerInterests: [], viewerCommunities: [] });
    // both have equal createdAt → relative order preserved (stable), proving no hidden ranking signal
    expect(out.map((p) => p.id)).toEqual(['first', 'second']);
  });
});

describe('Community: the network stays human', () => {
  it('HUMAN-01 human, non-VFIDE post kinds exist (life, family, hobby, interest, idea)', () => {
    for (const k of ['life-milestone', 'family-milestone', 'hobby', 'interest', 'idea'] as PostKind[]) {
      expect(HUMAN_POST_KINDS).toContain(k);
    }
  });
  it('HUMAN-02 every post kind has a label', () => {
    for (const k of ALL_KINDS) expect(POST_KIND_LABEL[k].length).toBeGreaterThan(0);
  });
  it('HUMAN-03 the eight community sections are present', () => {
    const ids = COMMUNITY_SECTIONS.map((s) => s.id);
    expect(ids).toEqual(['people', 'communities', 'commerce', 'learning', 'preparedness', 'governance', 'messaging', 'global']);
  });
});
