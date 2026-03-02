/**
 * Anti-abuse gamification fairness tests.
 *
 * Validates that:
 * 1. The server-side daily XP cap is enforced (no rapid farming).
 * 2. Awards that exceed the remaining daily allowance are clamped.
 * 3. When the cap is already met, 0 XP is awarded and dailyCapped is true.
 * 4. The daily counter resets on a new calendar day.
 *
 * Also validates the client-side GamificationEngine:
 * 5. deductXP reduces effectiveLevel without touching earned XP.
 * 6. awardXP after deductXP cannot restore effectiveLevel.
 * 7. awardXP enforces MAX_XP_PER_DAY and returns correct `awarded`.
 * 8. getProgress backfills penaltyXP / effectiveLevel on legacy stored objects.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/gamification/route';
import { gamification, MAX_XP_PER_DAY } from '@/lib/gamification';

jest.mock('@/lib/db', () => ({ query: jest.fn() }));
jest.mock('@/lib/auth/rateLimit', () => ({ withRateLimit: jest.fn() }));
jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
  requireAdmin: jest.fn(),
}));
jest.mock('@/lib/auth/validation', () => ({
  validateBody: jest.fn(),
  awardXpSchema: {},
}));
jest.mock('@/lib/socialAnalytics', () => ({
  analytics: { track: jest.fn() },
}));

const TODAY = new Date().toISOString().split('T')[0];
const YESTERDAY = (() => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
})();

const mockUserAddress = '0xaabbccddee000000000000000000000000000001';

function makePostRequest(body: object) {
  return new NextRequest('http://localhost:3000/api/gamification', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

describe('/api/gamification — daily XP cap enforcement', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAdmin } = require('@/lib/auth/middleware');
  const { validateBody } = require('@/lib/auth/validation');

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAdmin.mockReturnValue(true);
  });

  it('awards XP normally when daily_xp_earned is 0', async () => {
    validateBody.mockResolvedValue({
      success: true,
      data: { userAddress: mockUserAddress, xpAmount: 200, reason: 'quest' },
    });

    // Cap-check row: no XP earned today
    query
      .mockResolvedValueOnce({ rows: [{ daily_xp_earned: 0, daily_xp_date: TODAY }] })
      // UPDATE result
      .mockResolvedValueOnce({
        rows: [{ xp: 200, level: 2, daily_xp_earned: 200, daily_xp_date: TODAY, leveled_up: true }],
      });

    const response = await POST(makePostRequest({ userAddress: mockUserAddress, xpAmount: 200 }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.xpAwarded).toBe(200);
    expect(data.dailyCapped).toBe(false);
  });

  it('clamps award to remaining daily allowance', async () => {
    // 400 already earned, trying to award 200 → only 100 should go through
    validateBody.mockResolvedValue({
      success: true,
      data: { userAddress: mockUserAddress, xpAmount: 200, reason: 'quest' },
    });

    query
      .mockResolvedValueOnce({ rows: [{ daily_xp_earned: 400, daily_xp_date: TODAY }] })
      .mockResolvedValueOnce({
        rows: [{ xp: 500, level: 3, daily_xp_earned: 500, daily_xp_date: TODAY, leveled_up: false }],
      });

    const response = await POST(makePostRequest({ userAddress: mockUserAddress, xpAmount: 200 }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.xpAwarded).toBe(100); // clamped to remaining 100
    expect(data.dailyCapped).toBe(false);
  });

  it('returns dailyCapped=true when daily cap is already met', async () => {
    validateBody.mockResolvedValue({
      success: true,
      data: { userAddress: mockUserAddress, xpAmount: 100, reason: 'quest' },
    });

    // Exactly 500 already earned today
    query.mockResolvedValueOnce({ rows: [{ daily_xp_earned: 500, daily_xp_date: TODAY }] });

    const response = await POST(makePostRequest({ userAddress: mockUserAddress, xpAmount: 100 }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.xpAwarded).toBe(0);
    expect(data.dailyCapped).toBe(true);
  });

  it('resets the daily counter when date is yesterday', async () => {
    // Yesterday's date means the counter is reset before awarding
    validateBody.mockResolvedValue({
      success: true,
      data: { userAddress: mockUserAddress, xpAmount: 300, reason: 'quest' },
    });

    query
      .mockResolvedValueOnce({ rows: [{ daily_xp_earned: 499, daily_xp_date: YESTERDAY }] })
      .mockResolvedValueOnce({
        rows: [{ xp: 300, level: 2, daily_xp_earned: 300, daily_xp_date: TODAY, leveled_up: true }],
      });

    const response = await POST(makePostRequest({ userAddress: mockUserAddress, xpAmount: 300 }));
    const data = await response.json();

    expect(response.status).toBe(200);
    // Full 300 awarded because yesterday's tally doesn't carry over
    expect(data.xpAwarded).toBe(300);
  });

  it('returns 404 when user does not exist in cap-check query', async () => {
    validateBody.mockResolvedValue({
      success: true,
      data: { userAddress: mockUserAddress, xpAmount: 100, reason: 'quest' },
    });

    query.mockResolvedValueOnce({ rows: [] }); // user not found

    const response = await POST(makePostRequest({ userAddress: mockUserAddress, xpAmount: 100 }));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User not found');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Client-side GamificationEngine tests (localStorage mocked)
// ─────────────────────────────────────────────────────────────────────────────

describe('GamificationEngine — anti-abuse fairness', () => {
  let store: Record<string, string> = {};

  const localStorageMock = {
    getItem: jest.fn((k: string) => store[k] ?? null),
    setItem: jest.fn((k: string, v: string) => { store[k] = v; }),
    removeItem: jest.fn((k: string) => { delete store[k]; }),
    key: jest.fn((i: number) => Object.keys(store)[i] ?? null),
    get length() { return Object.keys(store).length; },
    clear: jest.fn(() => { store = {}; }),
  };

  beforeAll(() => {
    Object.defineProperty(global, 'localStorage', { value: localStorageMock, configurable: true, writable: true });
  });

  beforeEach(() => {
    store = {};
    jest.clearAllMocks();
    // Re-point store accessors after clearAllMocks resets spies
    localStorageMock.getItem.mockImplementation((k: string) => store[k] ?? null);
    localStorageMock.setItem.mockImplementation((k: string, v: string) => { store[k] = v; });
    localStorageMock.removeItem.mockImplementation((k: string) => { delete store[k]; });
    localStorageMock.key.mockImplementation((i: number) => Object.keys(store)[i] ?? null);
    localStorageMock.clear.mockImplementation(() => { store = {}; });
  });

  it('starts everyone at Level 1 with xp=0 and penaltyXP=0', () => {
    const progress = gamification.getProgress('0xnewuser');
    expect(progress.level).toBe(1);
    expect(progress.xp).toBe(0);
    expect(progress.penaltyXP).toBe(0);
    expect(progress.effectiveLevel).toBe(1);
    expect(progress.dailyXPEarned).toBe(0);
  });

  it('deductXP reduces effectiveLevel without reducing earned XP', () => {
    const addr = '0xpunished001';

    // Award enough XP to reach level 5 (needs 850 XP)
    // Use multiple days to bypass daily cap
    const p0 = gamification.getProgress(addr);
    p0.xp = 850;
    p0.level = 5;
    p0.effectiveXP = 850;
    p0.effectiveLevel = 5;
    p0.penaltyXP = 0;
    p0.dailyXPEarned = 0;
    p0.dailyXPDate = '2000-01-01'; // old date so cap resets
    localStorage.setItem(`vfide_gamification_${addr}`, JSON.stringify(p0));

    const { newEffectiveLevel, penaltyXP } = gamification.deductXP(addr, 600, 'spam violation');

    // 850 - 600 = 250 effective XP → Level 3
    expect(newEffectiveLevel).toBe(3);
    expect(penaltyXP).toBe(600);

    const after = gamification.getProgress(addr);
    expect(after.xp).toBe(850);        // earned XP unchanged
    expect(after.penaltyXP).toBe(600);
    expect(after.effectiveXP).toBe(250);
    expect(after.effectiveLevel).toBe(3);
  });

  it('awardXP after deductXP does NOT restore effectiveLevel to earned level', () => {
    const addr = '0xpunished002';

    // Start at level 5 (xp=850), penaltyXP=600 → effectiveLevel=3
    const p0 = gamification.getProgress(addr);
    p0.xp = 850;
    p0.level = 5;
    p0.effectiveXP = 250;
    p0.effectiveLevel = 3;
    p0.penaltyXP = 600;
    p0.dailyXPEarned = 0;
    p0.dailyXPDate = '2000-01-01';
    localStorage.setItem(`vfide_gamification_${addr}`, JSON.stringify(p0));

    // Award a full day's worth of XP
    gamification.awardXP(addr, MAX_XP_PER_DAY, 'quest');

    const after = gamification.getProgress(addr);
    // Earned XP grows, but effectiveXP = (850+500) - 600 = 750 → still Level 4, not 5
    expect(after.xp).toBe(1350);
    expect(after.effectiveXP).toBe(750);
    expect(after.effectiveLevel).toBe(4);
    // Cannot reach level 5 (requires 850 effective XP) while penalty stands
    expect(after.effectiveLevel).toBeLessThan(5);
  });

  it('daily XP cap limits awards to MAX_XP_PER_DAY per calendar day', () => {
    const addr = '0xcapper001';

    // Award exactly the cap
    const r1 = gamification.awardXP(addr, MAX_XP_PER_DAY, 'all quests');
    expect(r1.awarded).toBe(MAX_XP_PER_DAY);

    // Try to award more on the same day → capped at 0
    const r2 = gamification.awardXP(addr, 100, 'bonus');
    expect(r2.awarded).toBe(0);

    const progress = gamification.getProgress(addr);
    expect(progress.dailyXPEarned).toBe(MAX_XP_PER_DAY);
    expect(progress.xp).toBe(MAX_XP_PER_DAY);
  });

  it('backfills legacy stored progress that is missing penaltyXP', () => {
    const addr = '0xlegacy001';

    // Store a progress object that pre-dates the anti-abuse fields
    const legacy = {
      level: 3,
      xp: 300,
      xpToNextLevel: 200,
      achievements: [],
      stats: {
        messagesSent: 5, friendsAdded: 2, groupsCreated: 0,
        paymentsSent: 0, daysActive: 3, lastActiveDate: '',
        currentStreak: 1, longestStreak: 1,
      },
    };
    localStorage.setItem(`vfide_gamification_${addr}`, JSON.stringify(legacy));

    const progress = gamification.getProgress(addr);
    expect(progress.penaltyXP).toBe(0);
    expect(progress.effectiveXP).toBe(300);
    expect(progress.effectiveLevel).toBe(3);
    expect(progress.dailyXPDate).toBe('');
    expect(progress.dailyXPEarned).toBe(0);
  });
});
