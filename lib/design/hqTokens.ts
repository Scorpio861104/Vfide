/**
 * Headquarters Visual Doctrine — design tokens (Platform Transformation, Wave 1).
 *
 * The doctrine: a premium adaptive personal headquarters — NOT a crypto exchange, banking app, or gaming UI.
 * Cool charcoal foundation (never pure black), muted architectural gold as the primary accent (never bright
 * yellow), and a muted jewel tone per domain. Sophisticated, calm, sculpted.
 *
 * Scoped, not global: these are exposed as CSS variables under a `.hq-root` wrapper (see HQTheme) so the new
 * environment adopts the doctrine without disturbing the 372 existing components that use the legacy tokens.
 */

export const HQ_FOUNDATION = {
  obsidian: '#0C0D10',   // deepest ground — near-black charcoal, never pure black
  graphite: '#15171B',   // base panel
  stone: '#1E2127',      // raised surface
  edge: '#2C313A',       // hairline border
  edgeStrong: '#3A404B', // emphasized border
} as const;

export const HQ_GOLD = {
  base: '#C7A867',       // architectural / brushed brass — muted, never #FFD700
  bright: '#DCC189',     // small highlights only
  dim: '#8E7A4D',        // recessed gold
  wash: 'rgba(199, 168, 103, 0.08)', // faint gold surface tint
} as const;

export const HQ_INK = {
  primary: '#ECEAE2',    // warm off-white
  soft: '#ACA89C',
  faint: '#6F6C62',
} as const;

export type DomainId = 'ownership' | 'business' | 'preparedness' | 'trust' | 'governance';

/** Muted jewel tone per domain (doctrine: Ownership→Gold, Business→Sapphire, Preparedness→Amber, Trust→Emerald,
 *  Governance→Violet). Desaturated for sophistication; each carries a soft surface wash + a readable text tint. */
export const DOMAIN_COLOR: Record<DomainId, { name: string; accent: string; soft: string; wash: string }> = {
  ownership:    { name: 'Gold',     accent: '#C7A867', soft: '#DCC189', wash: 'rgba(199, 168, 103, 0.10)' },
  business:     { name: 'Sapphire', accent: '#6486B0', soft: '#90ABCE', wash: 'rgba(100, 134, 176, 0.10)' },
  preparedness: { name: 'Amber',    accent: '#CF9356', soft: '#E0B486', wash: 'rgba(207, 147, 86, 0.10)' },
  trust:        { name: 'Emerald',  accent: '#5FA17F', soft: '#8AC2A4', wash: 'rgba(95, 161, 127, 0.10)' },
  governance:   { name: 'Violet',   accent: '#8E7CB6', soft: '#B2A4D2', wash: 'rgba(142, 124, 182, 0.10)' },
};

/** CSS-variable map injected by HQTheme onto the `.hq-root` wrapper. */
export function hqCssVariables(): Record<string, string> {
  return {
    '--hq-obsidian': HQ_FOUNDATION.obsidian,
    '--hq-graphite': HQ_FOUNDATION.graphite,
    '--hq-stone': HQ_FOUNDATION.stone,
    '--hq-edge': HQ_FOUNDATION.edge,
    '--hq-edge-strong': HQ_FOUNDATION.edgeStrong,
    '--hq-gold': HQ_GOLD.base,
    '--hq-gold-bright': HQ_GOLD.bright,
    '--hq-gold-dim': HQ_GOLD.dim,
    '--hq-gold-wash': HQ_GOLD.wash,
    '--hq-ink': HQ_INK.primary,
    '--hq-ink-soft': HQ_INK.soft,
    '--hq-ink-faint': HQ_INK.faint,
  };
}
