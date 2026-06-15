/**
 * Simulation Bureau — engines (Platform Transformation, Wave 6).
 *
 * Deterministic, educational engines for the live simulators. Walk-throughs are grounded in the REAL protocol
 * constants (the actual recovery and inheritance timeframes), so they teach exactly what happens. Calculators are
 * pure arithmetic on the participant's own inputs. The illustration runs on a fixed example. None of them predicts a
 * participant's outcome or gives advice.
 */

// Real protocol constants (mirrors CardBoundVaultInheritanceManager + VaultRecoveryClaim).
export const VETO_DAYS = 30;
export const CLAIM_DAYS = 90;
export const FINALIZE_FLOOR_DAYS = 14;
export const MEMORIAL_DAYS = 365;
export const RECOVERY_EXPIRY_DAYS = 30;

export interface WalkStep { phase: string; title: string; detail: string; timing: string }

// ── Lost Phone — recovery walk-through (real mechanics) ──────────────────────
export function lostPhoneWalkthrough(): WalkStep[] {
  return [
    { phase: '1', title: 'Your phone is gone', detail: 'Your assets are untouched — they live in your vault on-chain, not on the device. Nobody can move them without your key.', timing: 'Immediately' },
    { phase: '2', title: 'Find your vault', detail: 'On a new device, you look up your vault using your recovery ID, email, phone, or username.', timing: 'Minutes' },
    { phase: '3', title: 'Start a recovery claim', detail: 'You begin a claim with a new wallet. This does not move funds — it asks your guardians to confirm it is really you.', timing: 'Same day' },
    { phase: '4', title: 'Guardians confirm', detail: 'The people you named as guardians approve the claim. They can confirm your identity, but they can never take your assets.', timing: 'Hours to days' },
    { phase: '5', title: 'A safety window', detail: `If the vault was recently active, a veto window lets the original owner stop a wrongful claim. A claim must complete within ${RECOVERY_EXPIRY_DAYS} days.`, timing: `Up to ${RECOVERY_EXPIRY_DAYS} days` },
    { phase: '6', title: 'Access restored', detail: 'Your new wallet controls the vault. The same assets, recovered — no loss, no third party in control.', timing: 'On completion' },
  ];
}

// ── Inheritance Event — timeline walk-through (real windows) ──────────────────
export function inheritanceEventWalkthrough(): WalkStep[] {
  return [
    { phase: '1', title: 'Proof of life lapses', detail: 'If you stop checking in and a claim is raised, the process begins — but it is built to protect a living owner first.', timing: 'Trigger' },
    { phase: '2', title: 'Veto window', detail: 'You can return at any point and cancel the whole process with your own key. Nothing moves during this window.', timing: `${VETO_DAYS} days` },
    { phase: '3', title: 'Claim window opens', detail: 'If the veto window passes, your named heirs can claim the exact shares you pre-set. Each heir reveals only their own share.', timing: `${CLAIM_DAYS} days` },
    { phase: '4', title: 'A floor before anything finalizes', detail: 'Even within the claim window, distribution cannot finalize too early — a floor protects against rushed or wrongful claims.', timing: `${FINALIZE_FLOOR_DAYS} days minimum` },
    { phase: '5', title: 'Distribution finalizes', detail: 'Shares pass to your heirs, to their own wallets. No custodian ever holds the assets in between.', timing: 'After the window' },
    { phase: '6', title: 'Memorial period', detail: 'A long memorial period keeps records settled and the vault closed gracefully.', timing: `${MEMORIAL_DAYS} days` },
  ];
}

// ── Emergency Fund — pure-math calculator ────────────────────────────────────
export interface FundInput { monthlyExpenses: number; savings: number }
export interface FundResult { monthsCovered: number | null; monthlyExpenses: number; savings: number; summary: string }
export function emergencyFund(i: FundInput): FundResult {
  const expenses = Math.max(0, i.monthlyExpenses);
  const savings = Math.max(0, i.savings);
  if (expenses === 0) return { monthsCovered: null, monthlyExpenses: expenses, savings, summary: 'Enter your monthly expenses to see how long savings would last.' };
  const months = Math.round((savings / expenses) * 10) / 10;
  return { monthsCovered: months, monthlyExpenses: expenses, savings, summary: `At ${expenses.toLocaleString()} per month, ${savings.toLocaleString()} covers about ${months} month${months === 1 ? '' : 's'}.` };
}

// ── Income Loss — runway calculator ──────────────────────────────────────────
export interface RunwayInput { monthlyExpenses: number; savings: number; newMonthlyIncome: number }
export interface RunwayResult { monthsCovered: number | null; covered: boolean; netBurn: number; summary: string }
export function incomeLossRunway(i: RunwayInput): RunwayResult {
  const expenses = Math.max(0, i.monthlyExpenses);
  const savings = Math.max(0, i.savings);
  const income = Math.max(0, i.newMonthlyIncome);
  const netBurn = expenses - income;
  if (netBurn <= 0) return { monthsCovered: null, covered: true, netBurn, summary: 'At this income, your expenses are fully covered — savings are not drawn down.' };
  const months = Math.round((savings / netBurn) * 10) / 10;
  return { monthsCovered: months, covered: false, netBurn, summary: `With a shortfall of ${netBurn.toLocaleString()} per month, ${savings.toLocaleString()} would last about ${months} month${months === 1 ? '' : 's'}.` };
}

// ── Long-Term Thinking — fixed-example behavioral illustration ────────────────
export interface IllustrationPoint { month: number; value: number }
export interface IllustrationResult {
  series: IllustrationPoint[];
  steadyEndValue: number;   // holding through the example
  reactiveEndValue: number; // selling at the example low
  lesson: string;
}
export function longTermThinkingIllustration(): IllustrationResult {
  // A FIXED illustrative example — not market data. Dip then recovery.
  const series: IllustrationPoint[] = [
    { month: 0, value: 100 }, { month: 1, value: 92 }, { month: 2, value: 74 }, { month: 3, value: 60 },
    { month: 4, value: 71 }, { month: 5, value: 88 }, { month: 6, value: 104 }, { month: 7, value: 118 },
  ];
  const low = Math.min(...series.map((p) => p.value));
  const steadyEndValue = series[series.length - 1]!.value; // held to the end
  const reactiveEndValue = low;                             // sold at the low, stayed out
  return {
    series, steadyEndValue, reactiveEndValue,
    lesson: `In this fixed example, selling at the low (${reactiveEndValue}) locked in a fall that staying steady to the end (${steadyEndValue}) did not. It illustrates how reacting to a temporary swing can harden a paper dip into a real loss. This is a teaching example about behavior — not market data, not a prediction, and not advice.`,
  };
}
