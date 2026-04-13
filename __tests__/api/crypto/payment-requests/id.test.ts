import { NextRequest, NextResponse } from 'next/server';
import { GET, PUT, PATCH } from '@/app/api/crypto/payment-requests/[id]/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
}));

describe('/api/crypto/payment-requests/[id]', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');

  const mockUser = { address: '0x1111111111111111111111111111111111111123' };
  const mockPaymentRequest = {
    id: 1,
    from_user_id: 42,
    to_user_id: 99,
    amount: '1.5',
    status: 'pending',
  };
  const unauthorizedResponse = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    it('should return payment request by id when user is a party', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: mockUser });
      // First query: fetch the payment request
      query.mockResolvedValueOnce({ rows: [mockPaymentRequest] });
      // Second query: user lookup to verify ownership (user is from_user_id=42)
      query.mockResolvedValueOnce({ rows: [{ id: 42 }] });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests/1');
      const response = await GET(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.request).toBeDefined();
    });

    it('should return 401 when unauthenticated', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests/1');
      const response = await GET(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(401);
    });

    it('should return 403 when user is not a party to the request', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: mockUser });
      query.mockResolvedValueOnce({ rows: [mockPaymentRequest] });
      // User is neither from_user_id (42) nor to_user_id (99)
      query.mockResolvedValueOnce({ rows: [{ id: 999 }] });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests/1');
      const response = await GET(request, { params: Promise.resolve({ id: '1' }) });

      expect(response.status).toBe(403);
    });

    it('should return 404 when payment request not found', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: mockUser });
      query.mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests/999');
      const response = await GET(request, { params: Promise.resolve({ id: '999' }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });

    it('should return 400 for non-numeric id parameter', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: mockUser });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests/bad-id');
      const response = await GET(request, { params: Promise.resolve({ id: 'bad-id' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid id parameter');
      expect(query).not.toHaveBeenCalled();
    });
  });

  describe('PUT', () => {
    it('should return 400 for malformed JSON in PUT', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: mockUser });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests/1', {
        method: 'PUT',
        body: '{"status":"accepted"',
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should return 400 for non-object body in PUT', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: mockUser });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests/1', {
        method: 'PUT',
        body: JSON.stringify(['invalid']),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
    });

    it('should update payment request status when user is a party', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: mockUser });
      // First query: fetch existing payment request
      query.mockResolvedValueOnce({ rows: [mockPaymentRequest] });
      // Second query: user lookup (user is from_user_id=42)
      query.mockResolvedValueOnce({ rows: [{ id: 42 }] });
      // Third query: update
      query.mockResolvedValueOnce({ rows: [{ ...mockPaymentRequest, status: 'accepted' }] });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests/1', {
        method: 'PUT',
        body: JSON.stringify({ status: 'accepted' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.request).toBeDefined();
    });

    it('should return 400 for invalid status value', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: mockUser });
      query.mockResolvedValueOnce({ rows: [mockPaymentRequest] });
      query.mockResolvedValueOnce({ rows: [{ id: 42 }] });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests/1', {
        method: 'PUT',
        body: JSON.stringify({ status: 'invalid_status' }),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
    });

    it('should return 401 for unauthorized users', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests/1', {
        method: 'PUT',
        body: JSON.stringify({}),
      });

      const response = await PUT(request, { params: Promise.resolve({ id: '1' }) });
      expect(response.status).toBe(401);
    });
  });

  describe('PATCH', () => {
    it('should return 400 for malformed JSON in PATCH', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: mockUser });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests/1', {
        method: 'PATCH',
        body: '{"status":"completed"',
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid JSON');
    });

    it('should return 400 for non-object body in PATCH', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: mockUser });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests/1', {
        method: 'PATCH',
        body: JSON.stringify(['invalid']),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
    });

    it('should update status and txHash when user is a party', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: mockUser });
      // First query: fetch existing payment request
      query.mockResolvedValueOnce({ rows: [mockPaymentRequest] });
      // Second query: user lookup (user is to_user_id=99)
      query.mockResolvedValueOnce({ rows: [{ id: 99 }] });
      // Third query: update
      query.mockResolvedValueOnce({ rows: [{ ...mockPaymentRequest, status: 'completed', tx_hash: '0x' + 'a'.repeat(64) }] });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests/1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed', txHash: '0x' + 'a'.repeat(64) }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should return 401 for unauthenticated PATCH', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue(unauthorizedResponse);

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests/1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid status in PATCH', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: mockUser });
      query.mockResolvedValueOnce({ rows: [mockPaymentRequest] });
      query.mockResolvedValueOnce({ rows: [{ id: 42 }] });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests/1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'bad_status' }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
    });

    it('should return 400 when txHash is not a string', async () => {
      withRateLimit.mockResolvedValue(null);
      requireAuth.mockResolvedValue({ user: mockUser });

      const request = new NextRequest('http://localhost:3000/api/crypto/payment-requests/1', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed', txHash: 123 }),
      });

      const response = await PATCH(request, { params: Promise.resolve({ id: '1' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request body');
      expect(query).not.toHaveBeenCalled();
    });
  });
});
