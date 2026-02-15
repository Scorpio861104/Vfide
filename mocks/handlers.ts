/**
 * MSW (Mock Service Worker) handlers for API mocking
 * These handlers intercept API calls in both development and testing
 */

import { http, HttpResponse } from 'msw';

export const handlers = [
  // User profile endpoint
  http.get('/api/user/profile', () => {
    return HttpResponse.json({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      wallet: '0x1234567890123456789012345678901234567890',
      createdAt: new Date().toISOString(),
    });
  }),

  // Crypto balance endpoint
  http.get('/api/crypto/balance', () => {
    return HttpResponse.json({
      vfide: '1000.50',
      eth: '2.5',
      usdc: '5000.00',
    });
  }),

  // Payment requests endpoint
  http.get('/api/crypto/payment-requests', () => {
    return HttpResponse.json([
      {
        id: 1,
        amount: 100,
        currency: 'VFIDE',
        description: 'Test payment',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
    ]);
  }),

  http.post('/api/crypto/payment-requests', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    return HttpResponse.json({
      id: 42,
      ...body,
      status: 'pending',
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  // Price endpoint
  http.get('/api/crypto/price', () => {
    return HttpResponse.json({
      vfide: {
        usd: 0.15,
        eth: 0.00005,
      },
      eth: {
        usd: 3000,
      },
      lastUpdated: new Date().toISOString(),
    });
  }),

  // Quests endpoint
  http.get('/api/quests', () => {
    return HttpResponse.json([
      {
        id: 1,
        title: 'First Transaction',
        description: 'Complete your first transaction',
        reward: 100,
        status: 'active',
      },
      {
        id: 2,
        title: 'Daily Login',
        description: 'Login every day for 7 days',
        reward: 50,
        status: 'completed',
      },
    ]);
  }),

  // Error simulation for testing
  http.get('/api/test/error', () => {
    return HttpResponse.json(
      { error: 'Internal server error', message: 'Test error' },
      { status: 500 }
    );
  }),

  // Delayed response for testing loading states
  http.get('/api/test/slow', async () => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return HttpResponse.json({ message: 'Slow response' });
  }),
];
