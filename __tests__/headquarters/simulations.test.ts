/**
 * Simulation Bureau — tests (Platform Transformation, Wave 6).
 * Engines are deterministic; walk-throughs use the REAL protocol constants; calculators are pure math; and every
 * simulator is framed as educational with no prediction or advice language.
 */
import { describe, it, expect } from '@jest/globals';
import {
  SIMULATORS, liveSimulators, getSimulator, recommendedSimulation, type Simulator,
} from '@/lib/simulations/model';
import {
  lostPhoneWalkthrough, inheritanceEventWalkthrough, emergencyFund, incomeLossRunway, longTermThinkingIllustration,
  VETO_DAYS, CLAIM_DAYS, MEMORIAL_DAYS, FINALIZE_FLOOR_DAYS, RECOVERY_EXPIRY_DAYS,
} from '@/lib/simulations/engines';
import type { SeerInputs } from '@/lib/seer/headquartersObservations';

const LIVE_WITH_ENGINES = ['lost-phone', 'inheritance-event', 'emergency-fund', 'income-loss', 'long-term-thinking'];

describe('Simulations: catalog', () => {
  it('CAT-01 every live simulator has an engine implemented', () => {
    expect(liveSimulators().map((s) => s.id).sort()).toEqual([...LIVE_WITH_ENGINES].sort());
  });
  it('CAT-02 every simulator has a valid kind and category', () => {
    for (const s of SIMULATORS) {
      expect(['walkthrough', 'calculator', 'illustration']).toContain(s.kind);
      expect(['ownership', 'preparedness', 'business', 'financial', 'market']).toContain(s.category);
    }
  });
});

describe('Simulations: walk-throughs use the REAL protocol constants', () => {
  it('WALK-01 the inheritance walk-through reflects the real 30 / 90 / 14 / 365 day windows', () => {
    const text = inheritanceEventWalkthrough().map((s) => `${s.detail} ${s.timing}`).join(' ');
    expect(text).toContain(String(VETO_DAYS));
    expect(text).toContain(String(CLAIM_DAYS));
    expect(text).toContain(String(FINALIZE_FLOOR_DAYS));
    expect(text).toContain(String(MEMORIAL_DAYS));
  });
  it('WALK-02 the lost-phone walk-through reflects the real recovery window and is non-custodial in tone', () => {
    const text = lostPhoneWalkthrough().map((s) => `${s.detail} ${s.timing}`).join(' ').toLowerCase();
    expect(text).toContain(String(RECOVERY_EXPIRY_DAYS));
    expect(text).toContain('never');     // "guardians can never take your assets"
    expect(text).toContain('your key');  // assets need the owner's key
  });
  it('WALK-03 the constants match the deployed protocol values', () => {
    expect([VETO_DAYS, CLAIM_DAYS, FINALIZE_FLOOR_DAYS, MEMORIAL_DAYS, RECOVERY_EXPIRY_DAYS]).toEqual([30, 90, 14, 365, 30]);
  });
});

describe('Simulations: calculators are pure math', () => {
  it('FUND-01 1,000 saved at 100/month covers 10 months', () => {
    expect(emergencyFund({ monthlyExpenses: 100, savings: 1000 }).monthsCovered).toBe(10);
  });
  it('FUND-02 zero expenses yields no figure (asks for input), not a divide error', () => {
    expect(emergencyFund({ monthlyExpenses: 0, savings: 1000 }).monthsCovered).toBeNull();
  });
  it('FUND-03 deterministic', () => {
    expect(emergencyFund({ monthlyExpenses: 250, savings: 3000 })).toEqual(emergencyFund({ monthlyExpenses: 250, savings: 3000 }));
  });
  it('RUN-01 income covering expenses → savings not drawn down', () => {
    const r = incomeLossRunway({ monthlyExpenses: 100, savings: 1000, newMonthlyIncome: 100 });
    expect(r.covered).toBe(true);
    expect(r.monthsCovered).toBeNull();
  });
  it('RUN-02 a 50/month shortfall against 1,000 lasts 20 months', () => {
    const r = incomeLossRunway({ monthlyExpenses: 150, savings: 1000, newMonthlyIncome: 100 });
    expect(r.covered).toBe(false);
    expect(r.monthsCovered).toBe(20);
  });
});

describe('Simulations: illustration is a fixed deterministic example', () => {
  it('ILLU-01 deterministic and shows reactive < steady on the example', () => {
    const a = longTermThinkingIllustration();
    expect(a).toEqual(longTermThinkingIllustration());
    expect(a.reactiveEndValue).toBeLessThan(a.steadyEndValue);
  });
  it('ILLU-02 the lesson explicitly disclaims advice and prediction', () => {
    const lesson = longTermThinkingIllustration().lesson.toLowerCase();
    expect(lesson).toContain('not');
    expect(lesson).toMatch(/not (a )?(market data|prediction|advice)|not.*advice/);
  });
});

describe('Simulations: educational framing (no predictions, no advice)', () => {
  const ADVICE_WORDS = ['you should', 'we recommend you', 'guaranteed', 'will earn', 'will profit', 'buy now', 'sell now'];
  it('HON-01 every simulator framing signals it is educational and not a prediction/advice', () => {
    for (const s of SIMULATORS) {
      const f = s.framing.toLowerCase();
      expect(f).toContain('educational');
      expect(f.includes('not a prediction') || f.includes('not advice') || f.includes('not financial advice') || f.includes('not market data')).toBe(true);
    }
  });
  it('HON-02 no simulator framing contains advice or prediction language', () => {
    for (const s of SIMULATORS) {
      const f = s.framing.toLowerCase();
      for (const w of ADVICE_WORDS) expect(f).not.toContain(w);
    }
  });
});

describe('Simulations: recommendation only points to live simulators', () => {
  const base: SeerInputs = { isConnected: true, proofScore: 6000, continuityReadiness: 'protected', merchantActive: false, configured: [] };
  it('REC-01 recommendation is always a live simulator', () => {
    const states: SeerInputs[] = [
      base,
      { ...base, isConnected: false },
      { ...base, continuityReadiness: 'incomplete' },
      { ...base, continuityReadiness: 'partial' },
    ];
    for (const s of states) {
      const id = recommendedSimulation(s);
      const sim = getSimulator(id) as Simulator;
      expect(sim.status).toBe('live');
    }
  });
  it('REC-02 an incomplete protection plan suggests the recovery walk-through', () => {
    expect(recommendedSimulation({ ...base, continuityReadiness: 'incomplete' })).toBe('lost-phone');
  });
});
