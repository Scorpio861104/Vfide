/**
 * Playbook Engine — progress (Platform Transformation, Wave 5).
 *
 * Derives playbook progress from the SAME real participant signals the Seer reads (continuity readiness, ProofScore,
 * merchant activity). Deterministic and conservative: a step is marked complete only when a real signal confirms it;
 * where the signal cannot confirm, the step is 'unknown' (never falsely complete). This keeps a playbook's progress
 * honest rather than a decorative checklist.
 */
import { getPlaybook, type ResolvedPlaybook } from '@/lib/playbooks/model';
import type { SeerInputs } from '@/lib/seer/headquartersObservations';

export type StepState = 'done' | 'todo' | 'unknown' | 'coming';

export interface StepProgress { capabilityId: string; action: string; state: StepState }
export interface PlaybookProgress {
  playbook: ResolvedPlaybook;
  steps: StepProgress[];
  done: number;       // confirmed-complete steps
  total: number;      // live steps that can be completed now
  comingCount: number;
}

/** Confirm a single capability's completion from real signals. null = cannot determine from available signals. */
function capabilityComplete(capabilityId: string, s: SeerInputs): boolean | null {
  if (!s.isConnected) return null;
  switch (capabilityId) {
    // a vault exists once any continuity progress is present
    case 'vaults':
      return s.continuityReadiness === 'protected' || s.continuityReadiness === 'partial';
    // these are only confirmed complete when the continuity plan is fully protected
    case 'guardians': case 'recovery': case 'proof-of-life': case 'heirs': case 'inheritance':
    case 'continuity': case 'continuity-readiness': case 'recovery-readiness': case 'family-protection':
    case 'family-preparedness':
      return s.continuityReadiness === 'protected';
    // trust: confirmed once a ProofScore exists
    case 'proofscore': case 'evidence':
      return s.proofScore !== null;
    // commerce: confirmed once the merchant account is active
    case 'merchant-ops': case 'products': case 'services': case 'marketplace': case 'inventory':
    case 'shipping': case 'analytics':
      return s.merchantActive;
    default:
      return null; // governance, growth, workforce, employees, etc. — no signal to confirm
  }
}

export function playbookProgress(playbookId: string, s: SeerInputs): PlaybookProgress | undefined {
  const playbook = getPlaybook(playbookId);
  if (!playbook) return undefined;
  const steps: StepProgress[] = playbook.steps.map((step) => {
    let state: StepState;
    if (step.status === 'coming') state = 'coming';
    else {
      const done = capabilityComplete(step.capability.id, s);
      state = done === true ? 'done' : done === false ? 'todo' : 'unknown';
    }
    return { capabilityId: step.capability.id, action: step.action, state };
  });
  const liveSteps = steps.filter((x) => x.state !== 'coming');
  return {
    playbook,
    steps,
    done: steps.filter((x) => x.state === 'done').length,
    total: liveSteps.length,
    comingCount: steps.filter((x) => x.state === 'coming').length,
  };
}

/**
 * The single most relevant playbook to recommend right now, deterministically. Prefers closing a protection gap,
 * then building trust, then growing a business — and never recommends a playbook that cannot be started.
 */
export function recommendedPlaybook(s: SeerInputs): string | null {
  if (!s.isConnected) return null;
  if (s.continuityReadiness === 'incomplete' || s.continuityReadiness === 'unknown') return 'protect-assets';
  if (s.continuityReadiness === 'partial') return 'complete-continuity';
  if (s.proofScore !== null && s.proofScore < 4000) return 'improve-trust';
  if (s.merchantActive) return 'grow-business';
  return 'improve-preparedness';
}
