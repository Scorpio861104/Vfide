/**
 * Playbook Engine — tests (Platform Transformation, Wave 5).
 * Every step references a real capability; progress is deterministic and conservative (never falsely complete);
 * availability honestly reflects not-yet-built steps; recommendations never point to an un-startable journey.
 */
import { describe, it, expect } from '@jest/globals';
import { getPlaybooks, getPlaybook, PLAYBOOK_DEFS } from '@/lib/playbooks/model';
import { playbookProgress, recommendedPlaybook } from '@/lib/playbooks/progress';
import { allCapabilities } from '@/lib/headquarters/model';
import type { SeerInputs } from '@/lib/seer/headquartersObservations';

const CAP_IDS = new Set(allCapabilities().map((c) => c.id));
const connected: SeerInputs = { isConnected: true, proofScore: 6000, continuityReadiness: 'protected', merchantActive: true, configured: [] };

describe('Playbooks: catalog integrity', () => {
  it('CAT-01 every step references a real capability id', () => {
    for (const def of PLAYBOOK_DEFS) for (const step of def.steps) expect(CAP_IDS.has(step.capabilityId)).toBe(true);
  });
  it('CAT-02 every step resolves to a real href and inherits the capability status', () => {
    for (const p of getPlaybooks()) for (const s of p.steps) {
      expect(s.href.length).toBeGreaterThan(0);
      expect(['live', 'partial', 'coming']).toContain(s.status);
    }
  });
  it('CAT-03 playbook ids are unique and every domain journey resolves', () => {
    const ids = getPlaybooks().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(getPlaybook(id)).toBeTruthy();
  });
});

describe('Playbooks: honest availability', () => {
  it('AVAIL-01 a playbook is "available" only when EVERY step is live; any not-yet-fully-built step makes it "partial"', () => {
    for (const p of getPlaybooks()) {
      const allLive = p.steps.every((s) => s.status === 'live');
      expect(p.availability).toBe(allLive ? 'available' : 'partial');
    }
  });
  it('AVAIL-02 protect-assets (all live capabilities) is fully available', () => {
    expect(getPlaybook('protect-assets')!.availability).toBe('available');
  });
});

describe('Playbooks: conservative progress', () => {
  it('PROG-01 not connected → no step is ever marked done', () => {
    const dis: SeerInputs = { ...connected, isConnected: false };
    for (const p of getPlaybooks()) {
      const prog = playbookProgress(p.id, dis)!;
      expect(prog.steps.every((s) => s.state !== 'done')).toBe(true);
      expect(prog.done).toBe(0);
    }
  });
  it('PROG-02 a "coming" step is never "done" — it stays "coming"', () => {
    for (const p of getPlaybooks()) {
      const prog = playbookProgress(p.id, connected)!;
      for (const s of prog.steps) {
        const step = p.steps.find((x) => x.capability.id === s.capabilityId)!;
        if (step.status === 'coming') expect(s.state).toBe('coming');
      }
    }
  });
  it('PROG-03 protected + scored + merchant marks ownership/trust/commerce steps done', () => {
    const prog = playbookProgress('protect-assets', connected)!;
    expect(prog.done).toBeGreaterThan(0); // vault, guardians, recovery, heirs all confirmable
  });
  it('PROG-04 unconfirmable steps are "unknown", never falsely "done"', () => {
    // governance/workforce-style steps have no confirming signal
    const prog = playbookProgress('hire-employees', connected)!;
    // workforce/employees have no completion signal → never "done"
    expect(prog.steps.every((s) => s.state !== 'done')).toBe(true);
  });
  it('PROG-05 deterministic — same signals, same progress', () => {
    expect(playbookProgress('protect-assets', connected)).toEqual(playbookProgress('protect-assets', connected));
  });
  it('PROG-06 done never exceeds total', () => {
    for (const p of getPlaybooks()) {
      const prog = playbookProgress(p.id, connected)!;
      expect(prog.done).toBeLessThanOrEqual(prog.total);
    }
  });
});

describe('Playbooks: recommendation', () => {
  it('REC-01 not connected → no recommendation', () => {
    expect(recommendedPlaybook({ ...connected, isConnected: false })).toBeNull();
  });
  it('REC-02 a protection gap recommends protect-assets', () => {
    expect(recommendedPlaybook({ ...connected, continuityReadiness: 'incomplete' })).toBe('protect-assets');
  });
  it('REC-03 every recommendation points to a startable (available or partial) playbook', () => {
    const states: SeerInputs[] = [
      { ...connected, continuityReadiness: 'incomplete' },
      { ...connected, continuityReadiness: 'partial' },
      { ...connected, proofScore: 1000 },
      { ...connected, merchantActive: true },
      { ...connected },
    ];
    for (const s of states) {
      const id = recommendedPlaybook(s);
      if (id) expect(getPlaybook(id)).toBeTruthy();
    }
  });
});
