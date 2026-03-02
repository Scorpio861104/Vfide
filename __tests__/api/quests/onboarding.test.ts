import { NextRequest } from 'next/server';
import { GET } from '@/app/api/quests/onboarding/route';

jest.mock('@/lib/db', () => ({
  getClient: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/quests/onboarding', () => {
  const { getClient } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return onboarding quests', async () => {
      withRateLimit.mockResolvedValue(null);

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // user lookup
          .mockResolvedValueOnce({
            rows: [{
              step_connect_wallet: true,
              step_complete_profile: false,
              step_first_transaction: false,
              step_add_friend: false,
              step_join_group: false,
              step_vote_proposal: false,
              step_earn_badge: false,
              step_deposit_vault: false,
              step_give_endorsement: false,
              step_complete_quest: false,
              onboarding_completed: false,
              onboarding_completed_at: null,
              reward_claimed: false,
            }],
          }),
        release: jest.fn(),
      };
      getClient.mockResolvedValue(mockClient);

      const request = new NextRequest('http://localhost:3000/api/quests/onboarding?userAddress=0x123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.steps).toBeDefined();
      expect(data.steps.connectWallet).toBe(true);
    });

    it('should return 400 when userAddress is missing', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/quests/onboarding');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('required');
    });
  });
});
