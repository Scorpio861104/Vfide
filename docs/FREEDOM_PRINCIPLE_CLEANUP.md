# Freedom Principle — Legacy Cleanup

Wave 7 established the Community Network's **Freedom Principle**: no social credit, no popularity scoring, no
ranking of people, no engagement manipulation — enforced structurally. This pass reconciles the *legacy* social
surfaces with that principle, and records what remains as an open product decision.

## Done — removed

**Content "likes" (popularity scoring).** Removed the like mechanic — persistent like counts, Heart buttons,
double-tap-to-like, and floating-heart reactions — from every legacy social-commerce component, plus the `likes`
field at its type root:
- `components/social/ShoppablePost.tsx` — like button + count removed; comments (honestly disabled), share, and buy
  kept.
- `components/social/ProductReels.tsx` — like count, double-tap-to-like, the heart animation, **and follower
  counts** removed; numeric comment/share counts removed (the action buttons stay); ProofScore (earned trust) kept.
- `components/social/LiveSelling.tsx` — like button and floating-heart reactions removed; comments, buy, and the
  factual live viewer count kept.
- `components/social/social-commerce-types.ts` — `likes?: number` removed from `ShoppablePostProps`.

**Dead gamification leaderboard (ranking of people).** `components/gamification/Leaderboard.tsx` ranked people by
XP / level / achievements / **friend count**, with crowns for "top performers." It had **zero importers** — dead
code — so it was deleted outright.

Note: `comments` (conversation) and ProofScore-weighted `MerchantReview` (feedback tied to real transactions) were
deliberately **kept** — neither ranks or scores people; they are conversation and earned, transaction-grounded
trust, consistent with the principle.

Verification: typecheck 0, full suite green (2708 / 47).

## Done — ProofScore leaderboard converted to a personal view

The **ProofScore Leaderboard** (`app/leaderboard/` route + the `app/rewards-hub/` embed) ranked people by ProofScore
("Top contributors," podiums of top individuals, "Your Rank #N") — directly contradicting the Trust principle that
the record is "never ranking, authority, or status." It is now **"Your ProofScore"**: a personal view showing the
participant's own score and where it sits on the tier ladder (their journey), plus the community's scale (total
participants) as non-ranking context. Removed: the rank number, the podiums, the ranked lists of individuals, and
the All/Month/Week ranked tabs (`AllTab`/`MonthTab`/`WeekTab` deleted). The rewards-hub tab is relabeled "Your
ProofScore." Typecheck 0, full suite green (2708 / 47).

## Open — one softer case remaining

**Headhunter referral leaderboard** — `app/headhunter/` (`LeaderboardTab`) ranks people by referral points. This
sits in an opt-in affiliate/sales context — a genuinely softer case than ranking the trust record, but it still
ranks people.

These are central, live features touching routes, hooks, and likely APIs. Removing or redesigning them is a
founder product decision, not a unilateral cleanup. Options for each:
- **Remove** the ranking surface entirely.
- **Convert to a personal view** — show a participant their *own* standing/progress without ranking them against
  others or listing ranked people (keeps the legitimate "see your own growth" function, drops the competitive
  ranking).
- **Keep** (explicitly accepting the contradiction for the referral/affiliate case).

Recommendation: at minimum, resolve the **ProofScore leaderboard**, since it contradicts a principle the product
states out loud. Converting it to a personal "your ProofScore over time" view would preserve the useful part and
end the contradiction.
