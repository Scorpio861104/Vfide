/**
 * Adaptive Engine — deterministic emphasis with universal discoverability (Platform Transformation, Wave 1).
 *
 * Encodes the spec's central rule:
 *   • ADAPTIVE EMPHASIS — visibility, priority, ordering, and recommendations adapt to the participant's goals,
 *     life/business/preparedness stage, trust maturity, configured systems, and usage.
 *   • UNIVERSAL DISCOVERABILITY — capabilities are NEVER hidden, removed, or made secret. Every capability always
 *     appears in the output; only its emphasis and order change. This is an invariant, asserted in tests.
 *
 * Deterministic by construction (no LLM, no autonomy) — the same signals always produce the same emphasis. The
 * participant always decides; this only orders what is surfaced.
 */
import { allCapabilities, type Capability, type DomainId } from '@/lib/headquarters/model';

export type Stage = 'none' | 'starting' | 'active' | 'established';
export type Emphasis = 'primary' | 'suggested' | 'available';

export interface ParticipantSignals {
  goals: DomainId[];          // declared focus areas
  lifeStage: Stage;
  businessStage: Stage;
  preparednessStage: Stage;
  trustMaturity: Stage;
  configured: string[];       // capability ids already set up
  recentlyUsed: string[];     // capability ids recently used
}

export const NEUTRAL_SIGNALS: ParticipantSignals = {
  goals: [], lifeStage: 'starting', businessStage: 'none', preparednessStage: 'starting',
  trustMaturity: 'starting', configured: [], recentlyUsed: [],
};

export interface EmphasisResult {
  capability: Capability;
  emphasis: Emphasis;
  order: number;   // lower = surfaced earlier
  score: number;
  reason: string;  // plain-language why, shown to the participant
}

const stageRank: Record<Stage, number> = { none: 0, starting: 1, active: 2, established: 3 };

/** Score a single capability against the participant's signals. Higher = more worth surfacing now. */
function scoreCapability(c: Capability, s: ParticipantSignals): { score: number; reason: string } {
  let score = 1;
  const reasons: string[] = [];

  if (s.goals.includes(c.domain)) { score += 3; reasons.push('matches a goal you set'); }

  // surface the domain that most needs attention (lowest relevant stage)
  const domainStage: Record<DomainId, Stage> = {
    ownership: s.lifeStage, business: s.businessStage, preparedness: s.preparednessStage,
    trust: s.trustMaturity, governance: 'active',
  };
  if (stageRank[domainStage[c.domain]] <= 1) { score += 2; reasons.push('an area you are still setting up'); }

  // next-step nudge: a foundational capability you have not configured yet
  if (!s.configured.includes(c.id) && (c.id === 'vaults' || c.id === 'guardians' || c.id === 'proofscore')) {
    score += 2; reasons.push('a good next step');
  }
  if (s.recentlyUsed.includes(c.id)) { score += 1; reasons.push('you used this recently'); }
  if (s.configured.includes(c.id)) { score -= 1; reasons.push('already set up'); }

  return { score, reason: reasons[0] ?? 'available whenever you need it' };
}

/** Map a score to an emphasis level. Honesty: a 'coming' capability can be suggested for awareness but is NEVER
 *  surfaced as a primary action (it is not usable yet). */
function toEmphasis(score: number, c: Capability): Emphasis {
  let level: Emphasis = score >= 4 ? 'primary' : score >= 2 ? 'suggested' : 'available';
  if (c.status === 'coming' && level === 'primary') level = 'suggested';
  return level;
}

/**
 * Compute emphasis for EVERY capability. UNIVERSAL DISCOVERABILITY INVARIANT: the returned array contains exactly
 * one entry per capability in the catalog — none is ever dropped. Only `emphasis` and `order` vary with signals.
 */
export function computeEmphasis(signals: ParticipantSignals): EmphasisResult[] {
  const scored = allCapabilities().map((c) => {
    const { score, reason } = scoreCapability(c, signals);
    return { capability: c, score, reason, emphasis: toEmphasis(score, c) };
  });
  // stable order: by score desc, then by catalog order (preserved via index)
  const withIndex = scored.map((r, i) => ({ r, i }));
  withIndex.sort((a, b) => (b.r.score - a.r.score) || (a.i - b.i));
  return withIndex.map(({ r }, order) => ({ ...r, order }));
}

/** Emphasis filtered to a single headquarters (still never hides — returns all of that domain's capabilities). */
export function emphasisForDomain(signals: ParticipantSignals, domain: DomainId): EmphasisResult[] {
  return computeEmphasis(signals).filter((r) => r.capability.domain === domain);
}

/** Universal search across ALL capabilities, regardless of emphasis — discoverability never degrades. */
export function searchCapabilities(query: string): Capability[] {
  const q = query.trim().toLowerCase();
  if (!q) return allCapabilities();
  return allCapabilities().filter((c) =>
    c.label.toLowerCase().includes(q) ||
    c.summary.toLowerCase().includes(q) ||
    c.keywords.some((k) => k.toLowerCase().includes(q)),
  );
}

/** Invariant check used by tests and guards: every catalog capability is present exactly once in the emphasis. */
export function everyCapabilityPresent(signals: ParticipantSignals): boolean {
  const result = computeEmphasis(signals);
  const ids = new Set(result.map((r) => r.capability.id));
  const all = allCapabilities();
  return ids.size === all.length && all.every((c) => ids.has(c.id));
}
