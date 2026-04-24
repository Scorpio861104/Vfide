import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@/lib/db', () => ({
  query: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('accountProtection durability behavior', () => {
  it('falls back to in-memory counters and locks after repeated key rotations when DB is unavailable', async () => {
    jest.resetModules();
    const { query } = require('@/lib/db');
    query.mockRejectedValue(new Error('db unavailable'));

    const { recordSecurityEvent, getAccountLock } = require('../accountProtection');
    const address = '0x1111111111111111111111111111111111111111';

    let result = { locked: false as boolean, reason: undefined as string | undefined };
    for (let i = 0; i < 4; i++) {
      result = await recordSecurityEvent(address, {
        ts: Date.now(),
        ip: '203.0.113.10',
        type: 'key_rotate',
      });
    }

    expect(result.locked).toBe(true);
    expect(result.reason).toMatch(/key rotation/i);

    const lock = await getAccountLock(address);
    expect(lock).not.toBeNull();
  });

  it('hydrates active lock from database when available', async () => {
    jest.resetModules();
    const { query } = require('@/lib/db');

    const futureUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    query.mockResolvedValueOnce({
      rows: [{ until_ts: futureUntil, reason: 'Too many failed authentication attempts' }],
    });

    const { getAccountLock } = require('../accountProtection');
    const lock = await getAccountLock('0x2222222222222222222222222222222222222222');

    expect(lock).not.toBeNull();
    expect(lock?.reason).toContain('failed authentication');
  });

  it('returns critical severity for extreme key rotation triggers when DB is unavailable', async () => {
    jest.resetModules();
    const { query } = require('@/lib/db');
    query.mockRejectedValue(new Error('db unavailable'));

    const { recordSecurityEvent } = require('../accountProtection');
    const address = '0x3333333333333333333333333333333333333333';

    let result = { locked: false as boolean, reason: undefined as string | undefined, severity: undefined as string | undefined };
    for (let i = 0; i < 10; i++) {
      result = await recordSecurityEvent(address, {
        ts: Date.now(),
        ip: '203.0.113.10',
        type: 'key_rotate',
      });
    }

    expect(result.locked).toBe(true);
    expect(result.reason).toMatch(/key rotation/i);
    expect(result.severity).toBe('critical');
  });
});
