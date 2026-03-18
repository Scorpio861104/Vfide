import { NextRequest } from 'next/server';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { GET, POST } from '../../../app/api/security/guardian-attestations/route';
import { buildGuardianAttestationMessage } from '../../../lib/recovery/guardianAttestation';

const mockVerifyMessage = jest.fn();

jest.mock('viem', () => ({
  verifyMessage: (...args: unknown[]) => mockVerifyMessage(...args),
}));

jest.mock('@/lib/auth/rateLimit', () => ({
  withRateLimit: jest.fn(),
}));

describe('/api/security/guardian-attestations', () => {
  const { withRateLimit } = require('@/lib/auth/rateLimit');

  beforeEach(() => {
    jest.clearAllMocks();
    withRateLimit.mockResolvedValue(null);
    mockVerifyMessage.mockResolvedValue(true);
  });

  it('accepts valid owner-signed guardian attestation', async () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const owner = account.address.toLowerCase() as `0x${string}`;
    const payload = {
      version: 'vfide-guardian-attestation-v1' as const,
      owner,
      vault: '0x1111111111111111111111111111111111111111' as `0x${string}`,
      guardian: '0x2222222222222222222222222222222222222222' as `0x${string}`,
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    };

    const signature = await account.signMessage({
      message: buildGuardianAttestationMessage(payload),
    });

    const request = new NextRequest('http://localhost:3000/api/security/guardian-attestations', {
      method: 'POST',
      body: JSON.stringify({ ...payload, signature }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('rejects invalid signature', async () => {
    mockVerifyMessage.mockResolvedValue(false);
    const account = privateKeyToAccount(generatePrivateKey());
    const request = new NextRequest('http://localhost:3000/api/security/guardian-attestations', {
      method: 'POST',
      body: JSON.stringify({
        owner: account.address,
        vault: '0x1111111111111111111111111111111111111111',
        guardian: '0x2222222222222222222222222222222222222222',
        issuedAt: Math.floor(Date.now() / 1000),
        expiresAt: Math.floor(Date.now() / 1000) + 86400,
        signature: '0xdeadbeef',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('returns active attestations for guardian', async () => {
    const owner = privateKeyToAccount(generatePrivateKey());
    const ownerAddress = owner.address.toLowerCase() as `0x${string}`;
    const payload = {
      version: 'vfide-guardian-attestation-v1' as const,
      owner: ownerAddress,
      vault: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' as `0x${string}`,
      guardian: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb' as `0x${string}`,
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    };

    const signature = await owner.signMessage({
      message: buildGuardianAttestationMessage(payload),
    });

    await POST(
      new NextRequest('http://localhost:3000/api/security/guardian-attestations', {
        method: 'POST',
        body: JSON.stringify({ ...payload, signature }),
      })
    );

    const response = await GET(
      new NextRequest('http://localhost:3000/api/security/guardian-attestations?guardian=0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')
    );

    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(data.attestations)).toBe(true);
  });

  it('returns summary telemetry in admin mode', async () => {
    const owner = privateKeyToAccount(generatePrivateKey());
    const ownerAddress = owner.address.toLowerCase() as `0x${string}`;
    const payload = {
      version: 'vfide-guardian-attestation-v1' as const,
      owner: ownerAddress,
      vault: '0xcccccccccccccccccccccccccccccccccccccccc' as `0x${string}`,
      guardian: '0xdddddddddddddddddddddddddddddddddddddddd' as `0x${string}`,
      issuedAt: Math.floor(Date.now() / 1000),
      expiresAt: Math.floor(Date.now() / 1000) + 86400,
    };

    const signature = await owner.signMessage({
      message: buildGuardianAttestationMessage(payload),
    });

    await POST(
      new NextRequest('http://localhost:3000/api/security/guardian-attestations', {
        method: 'POST',
        body: JSON.stringify({ ...payload, signature }),
      })
    );

    const response = await GET(
      new NextRequest('http://localhost:3000/api/security/guardian-attestations?mode=summary&sinceMinutes=60&limit=10')
    );

    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.summary).toBeDefined();
    expect(typeof data.summary.total).toBe('number');
    expect(typeof data.summary.active).toBe('number');
    expect(Array.isArray(data.summary.topOwners)).toBe(true);
    expect(Array.isArray(data.summary.topGuardians)).toBe(true);
    expect(Array.isArray(data.events)).toBe(true);
  });
});
