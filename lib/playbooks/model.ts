/**
 * Playbook Engine — model (Platform Transformation, Wave 5).
 *
 * Playbooks are operational journeys: an ordered set of steps toward a goal (Protect Assets, Start Selling, …).
 * Each step REFERENCES a capability by id, so it inherits that capability's real route and honest status from the
 * single source of truth (lib/headquarters/model). A playbook whose steps include a not-yet-built capability is
 * marked 'partial' — it cannot be fully completed yet, and the engine says so rather than implying otherwise.
 */
import { allCapabilities, type Capability, type CapabilityStatus, type DomainId } from '@/lib/headquarters/model';

export interface PlaybookStepDef { capabilityId: string; action: string }
export interface PlaybookDef { id: string; title: string; goal: string; domain: DomainId; steps: PlaybookStepDef[] }

export interface ResolvedStep { capability: Capability; action: string; status: CapabilityStatus; href: string }
export interface ResolvedPlaybook {
  id: string; title: string; goal: string; domain: DomainId;
  steps: ResolvedStep[];
  availability: 'available' | 'partial'; // 'partial' if any step is not yet built ('coming')
}

const PLAYBOOKS: PlaybookDef[] = [
  {
    id: 'protect-assets', title: 'Protect Assets', goal: 'Make sure your assets stay yours and reachable.', domain: 'ownership',
    steps: [
      { capabilityId: 'vaults', action: 'Create your vault' },
      { capabilityId: 'guardians', action: 'Name a guardian who can help you recover' },
      { capabilityId: 'recovery', action: 'Confirm your recovery path' },
      { capabilityId: 'heirs', action: 'Name who inherits' },
    ],
  },
  {
    id: 'complete-continuity', title: 'Complete Continuity', goal: 'Close every gap in your protection plan.', domain: 'ownership',
    steps: [
      { capabilityId: 'proof-of-life', action: 'Set up proof of life' },
      { capabilityId: 'guardians', action: 'Confirm your guardians' },
      { capabilityId: 'heirs', action: 'Name your heirs and shares' },
      { capabilityId: 'inheritance', action: 'Set how your assets pass on' },
      { capabilityId: 'continuity', action: 'Review your complete plan' },
    ],
  },
  {
    id: 'prepare-family', title: 'Prepare Family', goal: 'Make sure the people who depend on you are covered.', domain: 'preparedness',
    steps: [
      { capabilityId: 'heirs', action: 'Name your family as heirs' },
      { capabilityId: 'inheritance', action: 'Choose their shares' },
      { capabilityId: 'family-protection', action: 'Confirm family protection' },
      { capabilityId: 'continuity', action: 'Check your plan is complete' },
    ],
  },
  {
    id: 'improve-preparedness', title: 'Improve Preparedness', goal: 'Raise how ready you are for life events.', domain: 'preparedness',
    steps: [
      { capabilityId: 'recovery-readiness', action: 'Confirm you could recover today' },
      { capabilityId: 'continuity-readiness', action: 'Confirm your continuity plan' },
      { capabilityId: 'family-protection', action: 'Protect your dependents' },
    ],
  },
  {
    id: 'start-selling', title: 'Start Selling', goal: 'Go from zero to your first sale.', domain: 'business',
    steps: [
      { capabilityId: 'merchant-ops', action: 'Set up your merchant account' },
      { capabilityId: 'products', action: 'List your first product' },
      { capabilityId: 'marketplace', action: 'Go live in the marketplace' },
    ],
  },
  {
    id: 'grow-business', title: 'Grow Business', goal: 'Find what will move your business forward.', domain: 'business',
    steps: [
      { capabilityId: 'analytics', action: 'Review your analytics' },
      { capabilityId: 'inventory', action: 'Keep stock and fulfillment tight' },
      { capabilityId: 'growth', action: 'Act on growth opportunities' },
    ],
  },
  {
    id: 'hire-employees', title: 'Hire Employees', goal: 'Build and pay a team.', domain: 'business',
    steps: [
      { capabilityId: 'workforce', action: 'Build your team' },
      { capabilityId: 'employees', action: 'Pay and coordinate the people you work with' },
    ],
  },
  {
    id: 'improve-trust', title: 'Improve Trust', goal: 'Strengthen your standing through real outcomes.', domain: 'trust',
    steps: [
      { capabilityId: 'proofscore', action: 'See your ProofScore' },
      { capabilityId: 'evidence', action: 'Build the record behind it' },
      { capabilityId: 'fraud-protection', action: 'Stay protected as you transact' },
    ],
  },
];

const CAP_BY_ID = new Map(allCapabilities().map((c) => [c.id, c] as const));

export function resolvePlaybook(def: PlaybookDef): ResolvedPlaybook {
  const steps: ResolvedStep[] = [];
  for (const s of def.steps) {
    const capability = CAP_BY_ID.get(s.capabilityId);
    if (!capability) continue; // invalid id — a programming error caught by tests
    steps.push({ capability, action: s.action, status: capability.status, href: capability.href });
  }
  const availability = steps.every((s) => s.status === 'live') ? 'available' : 'partial';
  return { id: def.id, title: def.title, goal: def.goal, domain: def.domain, steps, availability };
}

export function getPlaybooks(): ResolvedPlaybook[] { return PLAYBOOKS.map(resolvePlaybook); }
export function playbooksForDomain(domain: DomainId): ResolvedPlaybook[] { return getPlaybooks().filter((p) => p.domain === domain); }
export function getPlaybook(id: string): ResolvedPlaybook | undefined {
  const def = PLAYBOOKS.find((p) => p.id === id);
  return def ? resolvePlaybook(def) : undefined;
}
/** The raw defs — exported so tests can validate every capabilityId resolves. */
export const PLAYBOOK_DEFS = PLAYBOOKS;
