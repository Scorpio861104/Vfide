import { NextRequest } from 'next/server';
import { GET } from '@/app/api/leaderboard/headhunter/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/leaderboard/headhunter', () => {
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return headhunter leaderboard', async () => {
      withRateLimit.mockResolvedValue(null);

      // Note: The API requires year and quarter params, and returns data (not leaderboard)
      // Without a subgraph URL, it returns an empty data array with a message
      const request = new NextRequest('http://localhost:3000/api/leaderboard/headhunter?year=2025&quarter=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual([]);
      expect(data.meta.year).toBe(2025);
      expect(data.meta.quarter).toBe(1);
    });

    it('should return 400 when year and quarter are missing', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/leaderboard/headhunter');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Year and quarter are required');
    });

    it('should return 400 for malformed quarter parameter', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/leaderboard/headhunter?year=2025&quarter=1abc');
      const response = await GET(request);

      expect(response.status).toBe(400);
    });

    it('should return 400 for out-of-range quarter parameter', async () => {
      withRateLimit.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/leaderboard/headhunter?year=2025&quarter=5');
      const response = await GET(request);

      expect(response.status).toBe(400);
    });
  });
});
