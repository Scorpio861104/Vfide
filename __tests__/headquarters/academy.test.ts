/**
 * Headquarters Academy - content + mapping tests (Platform Transformation, Wave 4).
 * Verifies embedded learning is complete and honest.
 */
import { describe, it, expect } from '@jest/globals';
import { PREPAREDNESS_CONTENT, GOVERNANCE_CONTENT, HQ_ACADEMY_MAP } from '@/lib/academy/headquartersContent';
import type { LearnPanel } from '@/lib/academy/headquartersContent';
import { HQ_ORDER } from '@/lib/headquarters/model';

const ALL_PANELS: LearnPanel[] = [...PREPAREDNESS_CONTENT, ...GOVERNANCE_CONTENT];

describe('Academy: every headquarters has learning', () => {
  it('MAP-01 the academy map covers all five headquarters', () => {
    for (const d of HQ_ORDER) expect(HQ_ACADEMY_MAP[d]).toBeTruthy();
    expect(Object.keys(HQ_ACADEMY_MAP).sort()).toEqual([...HQ_ORDER].sort());
  });
  it('MAP-02 each domain maps to a distinct learning source', () => {
    const sources = HQ_ORDER.map((d) => HQ_ACADEMY_MAP[d]);
    expect(new Set(sources).size).toBe(sources.length);
  });
});

describe('Academy: panels are well-formed', () => {
  it('FORM-01 the two new academies each have multiple panels', () => {
    expect(PREPAREDNESS_CONTENT.length).toBeGreaterThanOrEqual(3);
    expect(GOVERNANCE_CONTENT.length).toBeGreaterThanOrEqual(3);
  });
  ALL_PANELS.forEach((p, i) => {
    it('FORM-panel-' + i + ' is well-formed', () => {
      expect(p.headline.length).toBeGreaterThan(0);
      expect(p.teaser.length).toBeGreaterThan(0);
      expect(p.explanation.length).toBeGreaterThan(40);
      expect(p.benefits.length).toBeGreaterThan(0);
      expect(p.benefits.every((b) => b.trim().length > 0)).toBe(true);
    });
  });
});

describe('Academy: honesty', () => {
  it('HON-01 the business-continuity panel hedges that it is still being built', () => {
    const panel = PREPAREDNESS_CONTENT.find((p) => p.headline.toLowerCase().includes('business'));
    expect(panel).toBeTruthy();
    expect(panel!.explanation.toLowerCase()).toContain('still being built');
  });
  it('HON-02 governance copy reassures funds are never at risk and the treasury is separate from the vault', () => {
    const joined = GOVERNANCE_CONTENT.map((p) => p.explanation + ' ' + p.benefits.join(' ')).join(' ').toLowerCase();
    expect(joined).toContain('never at risk');
    expect(joined).toContain('vault');
  });
  it('HON-03 preparedness copy reinforces participant control', () => {
    const joined = PREPAREDNESS_CONTENT.map((p) => p.benefits.join(' ')).join(' ').toLowerCase();
    expect(joined).toContain('control');
  });
});
