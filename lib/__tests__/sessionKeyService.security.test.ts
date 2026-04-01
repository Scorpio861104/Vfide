import { describe, expect, it } from '@jest/globals';
import {
  SessionKeyService,
  createApprovalPermission,
  createTransferPermission,
} from '../sessionKeys/sessionKeyService';

function buildTransferCallData(amount: bigint): `0x${string}` {
  const selector = 'a9059cbb';
  const recipient = '0000000000000000000000001111111111111111111111111111111111111111';
  const amountHex = amount.toString(16).padStart(64, '0');
  return `0x${selector}${recipient}${amountHex}`;
}

function buildApproveCallData(amount: bigint): `0x${string}` {
  const selector = '095ea7b3';
  const spender = '0000000000000000000000002222222222222222222222222222222222222222';
  const amountHex = amount.toString(16).padStart(64, '0');
  return `0x${selector}${spender}${amountHex}`;
}

describe('sessionKeyService drain protections', () => {
  const owner = '0x1111111111111111111111111111111111111111' as const;
  const token = '0x2222222222222222222222222222222222222222' as const;

  it('rejects transfer calldata above per-call token limit', async () => {
    const service = new SessionKeyService();
    const session = await service.createSession(owner, 1, {
      permissions: [createTransferPermission(token, 100n, 200n, 10)],
      duration: 600,
    });

    const tooLargeTransfer = buildTransferCallData(101n);
    const result = service.validateCall(session.id, token, '0xa9059cbb', 0n, tooLargeTransfer);

    expect(result.valid).toBe(false);
    expect(result.reason).toMatch(/per-call/i);
  });

  it('enforces cumulative approval amount cap', async () => {
    const service = new SessionKeyService();
    const session = await service.createSession(owner, 1, {
      permissions: [createApprovalPermission(token, 500n, 10)],
      duration: 600,
    });

    const firstApproval = buildApproveCallData(300n);
    const firstValidation = service.validateCall(session.id, token, '0x095ea7b3', 0n, firstApproval);
    expect(firstValidation.valid).toBe(true);
    service.recordCall(session.id, 0n, firstApproval);

    const secondApproval = buildApproveCallData(250n);
    const secondValidation = service.validateCall(session.id, token, '0x095ea7b3', 0n, secondApproval);

    expect(secondValidation.valid).toBe(false);
    expect(secondValidation.reason).toMatch(/total/i);
  });

  it('rejects session duration beyond configured maximum', async () => {
    const originalMaxDuration = process.env.SESSION_KEY_MAX_DURATION_SECONDS;
    process.env.SESSION_KEY_MAX_DURATION_SECONDS = '120';

    try {
      const service = new SessionKeyService();
      await expect(
        service.createSession(owner, 1, {
          permissions: [createTransferPermission(token, 100n, 200n, 1)],
          duration: 121,
        })
      ).rejects.toThrow(/maximum/i);
    } finally {
      if (originalMaxDuration === undefined) {
        delete process.env.SESSION_KEY_MAX_DURATION_SECONDS;
      } else {
        process.env.SESSION_KEY_MAX_DURATION_SECONDS = originalMaxDuration;
      }
    }
  });
});
