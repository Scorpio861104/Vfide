import { features, isFeatureEnabled } from '@/lib/features';

describe('frontend scaffold feature flags', () => {
  it('exposes stable readiness flags for staged pages', () => {
    expect(features.vault).toBe(true);
    expect(features.governance).toBe(true);
    expect(features.streaming).toBe(false);
    expect(features.themeManager).toBe(false);
  });

  it('checks flags through the type-safe helper', () => {
    expect(isFeatureEnabled('leaderboard')).toBe(true);
    expect(isFeatureEnabled('socialMessaging')).toBe(false);
  });
});
