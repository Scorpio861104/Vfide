/**
 * Headquarters Architecture — the canonical model (Platform Transformation, Wave 1).
 *
 * Five headquarters (Ownership, Business, Preparedness, Trust, Governance) plus the Command Center briefing and a
 * Profile. Each headquarters answers one question and aggregates a set of capabilities. Every capability carries an
 * honest status (live / partial / coming — the same discipline as lib/seer/coverage's LIVE/PARTIAL/NOT_BUILT) and
 * searchable keywords, so the platform can adapt EMPHASIS while guaranteeing UNIVERSAL DISCOVERABILITY.
 *
 * This model MAPS onto the existing seven-institution civilization model and real routes; it does not replace it,
 * so the 372 existing components keep working while the new environment is built alongside.
 *
 * Honesty (Veritas Law): the current network is testnet. A 'live' capability is usable now on testnet; 'coming'
 * means not yet available to participants (e.g. Continuity Lock and Chain of Return exist in Solidity but are not
 * compiled/deployed/wired). Nothing here implies maturity or adoption that does not exist.
 */
import type { DomainId } from '@/lib/design/hqTokens';

export type { DomainId };
export type CapabilityStatus = 'live' | 'partial' | 'coming';

export interface Capability {
  id: string;
  label: string;            // named by what the participant controls, not how it is built
  summary: string;          // one plain sentence
  href: string;
  domain: DomainId;
  status: CapabilityStatus;
  keywords: string[];       // guarantees searchability even when de-emphasized
}

export interface Headquarters {
  id: DomainId;
  label: string;
  question: string;         // the briefing question this headquarters answers
  homeHref: string;
  capabilities: Capability[];
}

const cap = (
  id: string, label: string, summary: string, href: string, domain: DomainId,
  status: CapabilityStatus, keywords: string[],
): Capability => ({ id, label, summary, href, domain, status, keywords });

// ── OWNERSHIP ────────────────────────────────────────────────────────────────
const OWNERSHIP: Headquarters = {
  id: 'ownership', label: 'Ownership', question: 'What do I own, and how protected is it?', homeHref: '/vault',
  capabilities: [
    cap('vaults', 'Vaults', 'Hold and move your assets — only your key signs.', '/vault', 'ownership', 'live', ['vault', 'assets', 'funds', 'wallet', 'card']),
    cap('recovery', 'Recovery', 'Regain access if you lose your device.', '/vault/recover', 'ownership', 'live', ['recover', 'lost phone', 'lost device', 'restore access']),
    cap('guardians', 'Guardians', 'People who can help you recover — never control your funds.', '/guardians', 'ownership', 'live', ['guardian', 'trusted', 'social recovery', 'multisig']),
    cap('proof-of-life', 'Proof of Life', 'Show you are active so inheritance never starts early.', '/continuity', 'ownership', 'live', ['proof of life', 'active', 'check in', 'liveness']),
    cap('heirs', 'Heirs', 'Name who inherits, with the shares you choose.', '/inheritance', 'ownership', 'live', ['heir', 'beneficiary', 'inherit', 'family', 'shares']),
    cap('inheritance', 'Inheritance', 'How your assets pass on, on your terms.', '/inheritance', 'ownership', 'live', ['inheritance', 'estate', 'pass on', 'claim']),
    cap('continuity', 'Continuity', 'Keep everything reachable across life events.', '/continuity', 'ownership', 'live', ['continuity', 'plan', 'readiness', 'protect']),
    cap('continuity-lock', 'Continuity Lock', 'Locks the hand-off to completion so it cannot be stalled.', '/vault/lock', 'ownership', 'coming', ['continuity lock', 'hand-off', 'lock', 'protect heirs']),
    cap('chain-of-return', 'Chain of Return', 'If an heir cannot inherit, their share passes to their own children.', '/inheritance', 'ownership', 'coming', ['chain of return', 'multi generation', 'grandchildren', 'cascade']),
  ],
};

// ── BUSINESS ─────────────────────────────────────────────────────────────────
const BUSINESS: Headquarters = {
  id: 'business', label: 'Business', question: 'How is my business performing?', homeHref: '/merchant',
  capabilities: [
    cap('products', 'Products', 'List and manage what you sell.', '/merchant', 'business', 'live', ['product', 'catalog', 'listing', 'sell']),
    cap('services', 'Services', 'Offer services alongside products.', '/merchant', 'business', 'partial', ['service', 'booking', 'offer']),
    cap('marketplace', 'Marketplace', 'Reach buyers across the network.', '/marketplace', 'business', 'live', ['marketplace', 'discover', 'shop', 'buyers']),
    cap('inventory', 'Inventory', 'Track stock and fulfillment.', '/merchant/inventory', 'business', 'live', ['inventory', 'stock', 'warehouse']),
    cap('workforce', 'Workforce', 'Build and manage a team.', '/headhunter', 'business', 'partial', ['workforce', 'team', 'hire', 'headhunter']),
    cap('employees', 'Employees', 'Pay and coordinate the people you work with.', '/headhunter', 'business', 'partial', ['employee', 'payroll', 'staff', 'pay team']),
    cap('shipping', 'Shipping', 'Record shipments and confirm delivery.', '/merchant/shipping', 'business', 'live', ['shipping', 'delivery', 'fulfillment', 'tracking']),
    cap('merchant-ops', 'Merchant Operations', 'Run day-to-day commerce.', '/merchant', 'business', 'live', ['merchant', 'operations', 'pos', 'payments', 'invoices']),
    cap('analytics', 'Analytics', 'See how sales and trust are trending.', '/merchant/analytics', 'business', 'live', ['analytics', 'reports', 'revenue', 'metrics']),
    cap('growth', 'Growth', 'Find opportunities to expand.', '/insights', 'business', 'partial', ['growth', 'opportunity', 'expand', 'scale']),
  ],
};

// ── PREPAREDNESS ─────────────────────────────────────────────────────────────
const PREPAREDNESS: Headquarters = {
  id: 'preparedness', label: 'Preparedness', question: 'How ready am I for what life brings?', homeHref: '/continuity',
  capabilities: [
    cap('family-preparedness', 'Family Preparedness', 'Make sure your family is covered.', '/continuity', 'preparedness', 'partial', ['family', 'prepared', 'protect family', 'plan']),
    cap('emergency-planning', 'Emergency Planning', 'Plan for the unexpected before it happens.', '/continuity', 'preparedness', 'coming', ['emergency', 'crisis', 'plan ahead', 'unexpected']),
    cap('recovery-readiness', 'Recovery Readiness', 'Confirm you could recover access today.', '/vault/recover', 'preparedness', 'live', ['recovery readiness', 'can i recover', 'lost access']),
    cap('continuity-readiness', 'Continuity Readiness', 'Confirm your continuity plan is complete.', '/continuity', 'preparedness', 'live', ['continuity readiness', 'plan complete', 'readiness']),
    cap('family-protection', 'Family Protection', 'Protect the people who depend on you.', '/inheritance', 'preparedness', 'partial', ['family protection', 'dependents', 'protect']),
    cap('business-continuity', 'Business Continuity', 'Keep a business running through disruption.', '/merchant', 'preparedness', 'coming', ['business continuity', 'succession', 'keep running']),
  ],
};

// ── TRUST ────────────────────────────────────────────────────────────────────
const TRUST: Headquarters = {
  id: 'trust', label: 'Trust', question: 'How is my trust building, through evidence?', homeHref: '/proofscore',
  capabilities: [
    cap('proofscore', 'ProofScore', 'Your trust, earned through real outcomes.', '/proofscore', 'trust', 'live', ['proofscore', 'trust score', 'reputation', 'rating']),
    cap('evidence', 'Evidence', 'The record behind your trust.', '/endorsements', 'trust', 'live', ['evidence', 'history', 'record', 'endorsements']),
    cap('appeals', 'Appeals', 'Contest a decision with a fair process.', '/appeals', 'trust', 'live', ['appeal', 'dispute', 'contest', 'review']),
    cap('safety', 'Safety', 'Protections that keep transactions safe.', '/fraud', 'trust', 'live', ['safety', 'secure', 'protection']),
    cap('fraud-protection', 'Fraud Protection', 'Community-verified protection from bad actors.', '/fraud', 'trust', 'live', ['fraud', 'scam', 'protection', 'report']),
    cap('risk-systems', 'Risk Systems', 'Signals that surface risk before it costs you.', '/insights', 'trust', 'partial', ['risk', 'signals', 'warning', 'exposure']),
  ],
};

// ── GOVERNANCE ───────────────────────────────────────────────────────────────
const GOVERNANCE: Headquarters = {
  id: 'governance', label: 'Governance', question: 'How is the ecosystem governed, and how do I take part?', homeHref: '/dao-hub',
  capabilities: [
    cap('dao', 'DAO', 'The community that stewards the protocol.', '/dao-hub', 'governance', 'partial', ['dao', 'community', 'stewardship']),
    cap('treasury', 'Treasury', 'Where ecosystem funds go, transparently.', '/dao-hub', 'governance', 'partial', ['treasury', 'funds', 'budget', 'spending']),
    cap('voting', 'Voting', 'Have a say in decisions that affect everyone.', '/governance', 'governance', 'partial', ['vote', 'proposal', 'decision', 'governance']),
    cap('elections', 'Elections', 'Choose who serves the ecosystem.', '/elections', 'governance', 'partial', ['election', 'representatives', 'choose', 'vote']),
    cap('stewardship', 'Stewardship', 'Care for the commons over the long term.', '/council', 'governance', 'partial', ['stewardship', 'council', 'long term', 'commons']),
  ],
};

export const HEADQUARTERS: Record<DomainId, Headquarters> = {
  ownership: OWNERSHIP, business: BUSINESS, preparedness: PREPAREDNESS, trust: TRUST, governance: GOVERNANCE,
};
export const HQ_ORDER: DomainId[] = ['ownership', 'business', 'preparedness', 'trust', 'governance'];

/** Every capability across all headquarters — the basis for universal search. */
export function allCapabilities(): Capability[] {
  return HQ_ORDER.flatMap((id) => HEADQUARTERS[id].capabilities);
}

/** The Command Center briefing questions (the spec's "the Command Center answers…"). */
export const BRIEFING_QUESTIONS = [
  { id: 'protected', label: 'Am I protected?', domain: 'ownership' as DomainId },
  { id: 'attention', label: 'What requires attention?', domain: 'trust' as DomainId },
  { id: 'opportunities', label: 'What opportunities exist?', domain: 'business' as DomainId },
  { id: 'learn', label: 'What should I learn?', domain: 'preparedness' as DomainId },
  { id: 'simulate', label: 'What should I simulate?', domain: 'preparedness' as DomainId },
  { id: 'review', label: 'What should I review?', domain: 'governance' as DomainId },
] as const;
