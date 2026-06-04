-- Migration: per-user community post likes
--
-- Replaces the prior raw-counter behaviour in PATCH /api/community/posts/[id],
-- where `likes` was a bare INTEGER bumped on every like/unlike with no record of
-- WHO liked a post. Without a per-user record the "toggle" was not idempotent:
-- any authenticated user could replay 'like' to inflate, or 'unlike' to deflate,
-- any post's count. This table makes likes per-user; the route derives the
-- cached community_posts.likes counter from COUNT(*) of these rows.
--
-- Posture matches its sibling community_posts (no RLS, no explicit grants).
-- Own-row writes are enforced at the application layer (the route resolves the
-- user_id from the authenticated JWT, never from client input). Adding RLS to
-- the community/* tables as a group is a separate follow-up.

CREATE TABLE IF NOT EXISTS post_likes (
  post_id    BIGINT      NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);
