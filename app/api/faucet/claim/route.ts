import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { createWalletClient, createPublicClient, http, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { withRateLimit } from '@/lib/auth/rateLimit';

import { VFIDETestnetFaucetABI } from '@/lib/abis';
import { CONTRACT_ADDRESSES, ZERO_ADDRESS, isConfiguredContractAddress } from '@/lib/contracts';

const claimSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  referrer: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

function isTestnetEnvironment(): boolean {
  return process.env.NEXT_PUBLIC_IS_TESTNET === 'true';
}

function isUnsafeLocalSignerEnabled(): boolean {
  // Local private-key signing is intentionally disabled by default.
  // Production deployments must use an external signer (KMS/HSM/relayer).
  return process.env.FAUCET_ENABLE_UNSAFE_LOCAL_SIGNER === 'true' && process.env.NODE_ENV !== 'production';
}

export const POST = withAuth(async (request: NextRequest, user: JWTPayload) => {
  if (!isTestnetEnvironment()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const rateLimitResponse = await withRateLimit(request, 'claim');
  if (rateLimitResponse) return rateLimitResponse;
  try {
    const rawBody = await request.json().catch(() => null);
    const parsed = claimSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Valid wallet address required' }, { status: 400 });
    }

    const { address, referrer } = parsed.data;

    if (!address || !isAddress(address)) {
      return NextResponse.json({ error: 'Valid wallet address required' }, { status: 400 });
    }

    if (user.address.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Address must match authenticated wallet' }, { status: 403 });
    }

    if (referrer && referrer.toLowerCase() === address.toLowerCase()) {
      return NextResponse.json({ error: 'Referrer cannot be the claiming wallet' }, { status: 400 });
    }

    let referrerAddr: `0x${string}` = ZERO_ADDRESS;

    const faucetAddress = CONTRACT_ADDRESSES.VFIDETestnetFaucet;
    const operatorKey = process.env.FAUCET_OPERATOR_PRIVATE_KEY;
    const rpcUrl = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org';

    if (!isConfiguredContractAddress(faucetAddress)) {
      return NextResponse.json({ error: 'Faucet not configured' }, { status: 503 });
    }

    if (!isUnsafeLocalSignerEnabled()) {
      return NextResponse.json({ error: 'Faucet signer unavailable' }, { status: 503 });
    }

    if (!operatorKey || !/^0x[a-fA-F0-9]{64}$/.test(operatorKey)) {
      return NextResponse.json({ error: 'Faucet signer unavailable' }, { status: 503 });
    }

    const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
    const account = privateKeyToAccount(operatorKey as `0x${string}`);
    const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(rpcUrl) });

    const remaining = await publicClient.readContract({
      address: faucetAddress, abi: VFIDETestnetFaucetABI,
      functionName: 'getRemainingToday',
    });

    if (Number(remaining) === 0) {
      return NextResponse.json({ error: 'Daily limit reached. Try again tomorrow.' }, { status: 429 });
    }

    if (referrer && isAddress(referrer)) {
      const referrerHasClaimed = await publicClient.readContract({
        address: faucetAddress,
        abi: VFIDETestnetFaucetABI,
        functionName: 'hasClaimed',
        args: [referrer as `0x${string}`],
      });

      if (!referrerHasClaimed) {
        return NextResponse.json({ error: 'Referrer must have a prior successful claim' }, { status: 400 });
      }

      referrerAddr = referrer as `0x${string}`;
    }

    const hash = await walletClient.writeContract({
      address: faucetAddress, abi: VFIDETestnetFaucetABI,
      functionName: 'claim', args: [address as `0x${string}`, referrerAddr as `0x${string}`],
    });

    return NextResponse.json({
      success: true,
      txHash: hash,
      message: 'Faucet transaction submitted. Tokens and gas will arrive shortly.',
    });
  } catch (error: unknown) {
    const shortMessage = typeof (error as { shortMessage?: unknown })?.shortMessage === 'string'
      ? (error as { shortMessage: string }).shortMessage
      : '';
    const message = shortMessage || (error instanceof Error ? error.message : 'Claim failed');
    if (message.includes('AlreadyClaimed')) return NextResponse.json({ error: 'Already claimed' }, { status: 409 });
    if (message.includes('DailyCapReached')) return NextResponse.json({ error: 'Daily limit reached' }, { status: 429 });
    if (message.includes('Insufficient')) return NextResponse.json({ error: 'Faucet empty. Contact team.' }, { status: 503 });
    logger.error('[Faucet]', message);
    return NextResponse.json({ error: 'Claim failed. Try again.' }, { status: 500 });
  }
});

export async function GET() {
  if (!isTestnetEnvironment()) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const faucetAddress = CONTRACT_ADDRESSES.VFIDETestnetFaucet;
    const rpcUrl = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org';
    if (!isConfiguredContractAddress(faucetAddress)) return NextResponse.json({ error: 'Faucet not configured' }, { status: 503 });

    const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
    const remaining = await publicClient.readContract({
      address: faucetAddress, abi: VFIDETestnetFaucetABI, functionName: 'getRemainingToday',
    });

    return NextResponse.json({ remainingToday: Number(remaining), faucetAddress });
  } catch {
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
