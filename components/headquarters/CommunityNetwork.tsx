'use client';

/**
 * CommunityNetwork (Platform Transformation, Wave 7).
 *
 * The freedom-first social surface. Eight sections, a composer for human posts (milestones, experiences, hobbies,
 * ideas, commerce), and a feed the VIEWER shapes with their own interests. There are no like counts, no popularity,
 * no ranking of people, and nothing tuned to maximize attention — by design, not by promise. Responses are
 * conversation, never a score.
 */
import { useMemo, useState } from 'react';
import { Surface, DomainBadge } from '@/components/headquarters/HQTheme';
import {
  COMMUNITY_SECTIONS, POST_KIND_LABEL, HUMAN_POST_KINDS, type PostKind, type CommunityPost,
} from '@/lib/community/model';
import { orderFeed } from '@/lib/community/feed';
import { Users, MessageCircle, Globe2 } from 'lucide-react';

const COMPOSER_KINDS: PostKind[] = ['life-milestone', 'family-milestone', 'business-milestone', 'experience', 'lesson', 'hobby', 'interest', 'idea', 'product', 'service'];

const SEED: CommunityPost[] = [
  { id: 's1', authorId: 'Amara', kind: 'business-milestone', body: 'Made my first ten sales this month at the market stall. Slow and steady.', createdAt: Date.now() - 1000 * 60 * 60 * 5 },
  { id: 's2', authorId: 'Devi', kind: 'hobby', body: 'Finally finished the garden mural. Took three weekends and a lot of paint.', createdAt: Date.now() - 1000 * 60 * 60 * 26 },
  { id: 's3', authorId: 'Tomas', kind: 'lesson', body: 'Naming a guardian I trust took five minutes and I sleep better for it. Do it before you need it.', createdAt: Date.now() - 1000 * 60 * 60 * 50 },
  { id: 's4', authorId: 'Lin', kind: 'life-milestone', body: 'Moved into our own place this week. Years in the making.', createdAt: Date.now() - 1000 * 60 * 60 * 73 },
];

export function CommunityNetwork() {
  const [posts, setPosts] = useState<CommunityPost[]>(SEED);
  const [kind, setKind] = useState<PostKind>('experience');
  const [body, setBody] = useState('');
  const [interests, setInterests] = useState<Set<PostKind>>(new Set());

  const feed = useMemo(
    () => orderFeed(posts, { viewerInterests: [...interests], viewerCommunities: [] }),
    [posts, interests],
  );

  const post = () => {
    const text = body.trim();
    if (!text) return;
    setPosts((p) => [{ id: `me-${Date.now()}`, authorId: 'You', kind, body: text, createdAt: Date.now() }, ...p]);
    setBody('');
  };

  const toggleInterest = (k: PostKind) =>
    setInterests((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  return (
    <div className="space-y-8">
      {/* Sections */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--hq-ink-faint)' }}>Across the community</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {COMMUNITY_SECTIONS.map((s) => (
            <div key={s.id} className="rounded-xl px-3 py-2.5" style={{ background: 'var(--hq-graphite)', border: '1px solid var(--hq-edge)' }}>
              <p className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--hq-ink)' }}>
                {s.id === 'people' && <Users size={13} />}{s.id === 'messaging' && <MessageCircle size={13} />}{s.id === 'global' && <Globe2 size={13} />}
                {s.label}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--hq-ink-faint)' }}>{s.blurb}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Composer */}
      <Surface>
        <DomainBadge domain="ownership">Share something</DomainBadge>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {COMPOSER_KINDS.map((k) => (
            <button key={k} onClick={() => setKind(k)} className="rounded-full px-3 py-1 text-xs transition-colors"
              style={{ background: kind === k ? 'var(--hq-gold-wash)' : 'var(--hq-stone)', color: kind === k ? 'var(--hq-gold)' : 'var(--hq-ink-soft)', border: '1px solid var(--hq-edge)' }}>
              {POST_KIND_LABEL[k]}
            </button>
          ))}
        </div>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} placeholder="A milestone, an experience, something you made, something you learned…"
          className="mt-3 w-full resize-none rounded-xl px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--hq-stone)', border: '1px solid var(--hq-edge)', color: 'var(--hq-ink)' }} />
        <div className="mt-2 flex justify-end">
          <button onClick={post} className="rounded-xl px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
            style={{ background: 'var(--hq-gold-wash)', color: 'var(--hq-gold)', border: '1px solid var(--hq-edge)' }}>Share</button>
        </div>
      </Surface>

      {/* Interest control — the viewer shapes their own feed */}
      <div>
        <p className="text-xs" style={{ color: 'var(--hq-ink-faint)' }}>Shape your feed — choose what you want to see more of. You are in control; nothing is tuned to keep you scrolling.</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {HUMAN_POST_KINDS.map((k) => (
            <button key={k} onClick={() => toggleInterest(k)} className="rounded-full px-3 py-1 text-xs transition-colors"
              style={{ background: interests.has(k) ? 'var(--hq-gold-wash)' : 'transparent', color: interests.has(k) ? 'var(--hq-gold)' : 'var(--hq-ink-faint)', border: '1px solid var(--hq-edge)' }}>
              {POST_KIND_LABEL[k]}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-3">
        {feed.map((p) => (
          <Surface key={p.id}>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold" style={{ background: 'var(--hq-stone)', color: 'var(--hq-gold)' }}>{p.authorId.slice(0, 1)}</div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--hq-ink)' }}>{p.authorId}</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--hq-ink-faint)' }}>{POST_KIND_LABEL[p.kind]} · {relTime(p.createdAt)}</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--hq-ink-soft)' }}>{p.body}</p>
            <button className="mt-3 inline-flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80" style={{ color: 'var(--hq-ink-faint)' }}>
              <MessageCircle size={13} /> Respond
            </button>
          </Surface>
        ))}
      </div>
    </div>
  );
}

function relTime(ts: number): string {
  const h = Math.round((Date.now() - ts) / (1000 * 60 * 60));
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
