import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/quests/onboarding/route';

describe('/api/quests/onboarding', () => {
  it('GET returns 410 — feature disabled', async () => {
    const request = new NextRequest('http://localhost:3000/test', { method: 'GET' });
    const response = await GET(request);
    expect(response.status).toBe(410);
    const data = await response.json();
    expect(data.error).toBeTruthy();
  });

  it('POST returns 410 — feature disabled', async () => {
    const request = new NextRequest('http://localhost:3000/test', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const response = await POST(request);
    expect(response.status).toBe(410);
  });
});
