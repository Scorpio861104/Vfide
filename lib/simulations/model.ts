/**
 * Simulation Bureau — model (Platform Transformation, Wave 6).
 *
 * Simulators help a participant understand consequences BEFORE reality forces them to. Two honest kinds:
 *   • walkthrough — a deterministic, factual walk through real protocol mechanics (the actual recovery and
 *     inheritance flows and their real timeframes). It teaches what happens; it predicts nothing.
 *   • calculator — pure math on the participant's OWN inputs (e.g. how long given savings last at a given spend).
 *     It shows the arithmetic for the numbers entered; it is not a forecast of their situation.
 *   • illustration — a fixed example used to teach a behavioral concept; explicitly not market data, not a
 *     prediction, not advice.
 *
 * HARD RULE (Veritas + spec): educational only. NO predictions. NO financial advice. Every simulator carries that
 * framing, and the catalog honestly marks which are live vs. coming.
 */
export type SimCategory = 'ownership' | 'preparedness' | 'business' | 'financial' | 'market';
export type SimStatus = 'live' | 'coming';
export type SimKind = 'walkthrough' | 'calculator' | 'illustration';

export interface Simulator {
  id: string;
  category: SimCategory;
  title: string;
  premise: string;     // the question it answers, e.g. "What happens if you lose your phone?"
  kind: SimKind;
  status: SimStatus;
  framing: string;     // the educational disclaimer shown with every run
}

const EDU_WALK = 'A factual walk-through of how this works. It is educational — not a prediction about you.';
const EDU_CALC = 'This shows the math for the numbers you enter. It is educational — not advice or a forecast of your situation.';
const EDU_ILLU = 'A fixed, educational example of a behavioral pattern. Not market data, not a prediction, and not financial advice.';

const sim = (id: string, category: SimCategory, title: string, premise: string, kind: SimKind, status: SimStatus, framing: string): Simulator =>
  ({ id, category, title, premise, kind, status, framing });

export const SIMULATORS: Simulator[] = [
  // ── Ownership ──
  sim('lost-phone', 'ownership', 'Lost Phone', 'What happens if you lose your phone?', 'walkthrough', 'live', EDU_WALK),
  sim('inheritance-event', 'ownership', 'Inheritance Event', 'How do your assets pass on, step by step?', 'walkthrough', 'live', EDU_WALK),
  sim('lost-device', 'ownership', 'Lost Device', 'Recovering from a lost hardware device.', 'walkthrough', 'coming', EDU_WALK),
  sim('guardian-loss', 'ownership', 'Guardian Loss', 'What if a guardian becomes unavailable?', 'walkthrough', 'coming', EDU_WALK),
  sim('heir-loss', 'ownership', 'Heir Loss', 'What if a named heir cannot inherit?', 'walkthrough', 'coming', EDU_WALK),
  sim('recovery-event', 'ownership', 'Recovery Event', 'Walking through a full recovery.', 'walkthrough', 'coming', EDU_WALK),
  // ── Preparedness ──
  sim('hospitalization', 'preparedness', 'Hospitalization', 'How a temporary absence is handled.', 'walkthrough', 'coming', EDU_WALK),
  sim('guardian-failure', 'preparedness', 'Guardian Failure', 'What happens if guardians cannot act.', 'walkthrough', 'coming', EDU_WALK),
  sim('continuity-event', 'preparedness', 'Continuity Event', 'Walking through a continuity activation.', 'walkthrough', 'coming', EDU_WALK),
  // ── Financial Resilience ──
  sim('emergency-fund', 'financial', 'Emergency Fund', 'How long would your savings last?', 'calculator', 'live', EDU_CALC),
  sim('income-loss', 'financial', 'Income Loss', 'How long until savings run out if income drops?', 'calculator', 'live', EDU_CALC),
  sim('spending', 'financial', 'Spending', 'How spending changes your runway.', 'calculator', 'coming', EDU_CALC),
  sim('unexpected-expenses', 'financial', 'Unexpected Expenses', 'The effect of a one-time expense.', 'calculator', 'coming', EDU_CALC),
  // ── Business ──
  sim('cash-flow', 'business', 'Cash Flow', 'How long your runway lasts at a given burn.', 'calculator', 'coming', EDU_CALC),
  sim('revenue-growth', 'business', 'Revenue Growth', 'How steady growth compounds.', 'calculator', 'coming', EDU_CALC),
  sim('pricing', 'business', 'Pricing', 'How price changes affect margin.', 'calculator', 'coming', EDU_CALC),
  // ── Market Psychology ──
  sim('long-term-thinking', 'market', 'Long-Term Thinking', 'How reacting to swings compares to staying steady.', 'illustration', 'live', EDU_ILLU),
  sim('panic-selling', 'market', 'Panic Selling', 'The pattern behind selling at the bottom.', 'illustration', 'coming', EDU_ILLU),
  sim('volatility', 'market', 'Volatility', 'Understanding normal ups and downs.', 'illustration', 'coming', EDU_ILLU),
];

export const SIM_CATEGORY_LABEL: Record<SimCategory, string> = {
  ownership: 'Ownership', preparedness: 'Preparedness', business: 'Business', financial: 'Financial Resilience', market: 'Market Psychology',
};
export const SIM_CATEGORY_ORDER: SimCategory[] = ['ownership', 'preparedness', 'financial', 'business', 'market'];

export function getSimulator(id: string): Simulator | undefined { return SIMULATORS.find((s) => s.id === id); }
export function simulatorsByCategory(category: SimCategory): Simulator[] { return SIMULATORS.filter((s) => s.category === category); }
export function liveSimulators(): Simulator[] { return SIMULATORS.filter((s) => s.status === 'live'); }

import type { SeerInputs } from '@/lib/seer/headquartersObservations';
/** The single most relevant LIVE simulator to suggest now, deterministically. Never suggests a 'coming' one. */
export function recommendedSimulation(s: SeerInputs): string {
  if (s.continuityReadiness === 'incomplete' || s.continuityReadiness === 'unknown' || s.continuityReadiness === 'partial') {
    return 'lost-phone'; // understand recovery before you need it
  }
  return 'emergency-fund'; // a financial-resilience starting point
}
