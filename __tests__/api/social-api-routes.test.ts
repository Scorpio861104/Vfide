/**
 * @jest-environment node
 */
import { NextRequest, NextResponse } from 'next/server';
import { describe, it, expect } from '@jest/globals';
import { GET as friendsGet } from '../../app/api/friends/route';
import { GET as messagesGet } from '../../app/api/messages/route';
import { GET as notificationsGet } from '../../app/api/notifications/route';
import { GET as groupMembersGet } from '../../app/api/groups/members/route';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

jest.mock('@/lib/auth/middleware', () => ({
  requireAuth: jest.fn(),
  isAdmin: jest.fn(),
}));

jest.mock('@/lib/auth/validation', () => ({
  validateBody: jest.fn(),
  friendRequestSchema: {},
  sendMessageSchema: {},
  notificationSchema: {},
}));

jest.mock('viem', () => ({
  isAddress: jest.fn(),
}));

describe('Social API Routes - Auth and Ownership', () => {
  const { query } = require('@/lib/db');
  const { withRateLimit } = require('@/lib/auth/rateLimit');
  const { requireAuth } = require('@/lib/auth/middleware');
  const { isAddress } = require('viem');

  const self = '0x1111111111111111111111111111111111111111';
  const other = '0x2222222222222222222222222222222222222222';

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    requireAuth.mockResolvedValue({ user: { address: self } });
    isAddress.mockReturnValue(true);
  });

  describe('Friends GET', () => {
    it('blocks access to another user friend list', async () => {
      const request = new NextRequest(`http://localhost:3000/api/friends?address=${other}`);
      const response = await friendsGet(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('own friends list');
      expect(query).not.toHaveBeenCalled();
    });

    it('allows access to own friend list', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest(`http://localhost:3000/api/friends?address=${self}&status=accepted`);
      const response = await friendsGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.friends)).toBe(true);
    });
  });

  describe('Messages GET', () => {
    it('blocks access when userAddress does not match authenticated user', async () => {
      const request = new NextRequest(
        `http://localhost:3000/api/messages?userAddress=${other}&conversationWith=${self}`
      );

      const response = await messagesGet(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('own messages');
      expect(query).not.toHaveBeenCalled();
    });

    it('returns own conversation messages', async () => {
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const request = new NextRequest(
        `http://localhost:3000/api/messages?userAddress=${self}&conversationWith=${other}`
      );

      const response = await messagesGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.messages)).toBe(true);
      expect(data.total).toBe(0);
    });
  });

  describe('Notifications GET', () => {
    it('blocks access to another user notifications', async () => {
      const request = new NextRequest(`http://localhost:3000/api/notifications?userAddress=${other}`);

      const response = await notificationsGet(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('own notifications');
      expect(query).not.toHaveBeenCalled();
    });

    it('returns own notifications', async () => {
      query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const request = new NextRequest(`http://localhost:3000/api/notifications?userAddress=${self}`);
      const response = await notificationsGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.notifications)).toBe(true);
      expect(data.total).toBe(0);
    });
  });

  describe('Group Members GET', () => {
    it('requires requester to be a group member', async () => {
      query.mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/groups/members?groupId=1');
      const response = await groupMembersGet(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns member list for authenticated member', async () => {
      query
        .mockResolvedValueOnce({ rows: [{ role: 'member' }] })
        .mockResolvedValueOnce({ rows: [] });

      const request = new NextRequest('http://localhost:3000/api/groups/members?groupId=1');
      const response = await groupMembersGet(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data.members)).toBe(true);
    });

    it('blocks reading another member record unless requester is admin or moderator', async () => {
      query.mockResolvedValueOnce({ rows: [{ role: 'member' }] });

      const request = new NextRequest(
        `http://localhost:3000/api/groups/members?groupId=1&userAddress=${other}`
      );
      const response = await groupMembersGet(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Auth and Rate Limit passthrough', () => {
    it('propagates rate-limit response', async () => {
      const rateLimited = NextResponse.json({ error: 'Rate limited' }, { status: 429 });
      withRateLimit.mockResolvedValueOnce(rateLimited);

      const request = new NextRequest(`http://localhost:3000/api/messages?userAddress=${self}&conversationWith=${other}`);
      const response = await messagesGet(request);

      expect(response.status).toBe(429);
    });

    it('propagates auth middleware response', async () => {
      const unauthorized = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      requireAuth.mockResolvedValueOnce(unauthorized);

      const request = new NextRequest(`http://localhost:3000/api/notifications?userAddress=${self}`);
      const response = await notificationsGet(request);

      expect(response.status).toBe(401);
    });
  });
});
