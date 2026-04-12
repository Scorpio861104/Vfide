import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod4';
import { createWalletClient, createPublicClient, http, parseAbi, isAddress } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { requireAuth } from '@/lib/auth/middleware';

const FAUCET_ABI = parseAbi([
  'function claim(address user, address referrer) external',
  'function hasClaimed(address) external view returns (bool)',
  'function getRemainingToday() external view returns (uint256)',
]);

const claimSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  referrer: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

export async function POST(request: NextRequest) {
  const rateLimitResponse = await withRateLimit(request, 'claim');
  if (rateLimitResponse) return rateLimitResponse;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

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

    if (authResult.user.address.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Address must match authenticated wallet' }, { status: 403 });
    }

    const referrerAddr = referrer && isAddress(referrer) ? referrer : '0x0000000000000000000000000000000000000000';

    const faucetAddress = process.env.NEXT_PUBLIC_FAUCET_ADDRESS;
    const operatorKey = process.env.FAUCET_OPERATOR_PRIVATE_KEY;
    const rpcUrl = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org';

    if (!faucetAddress || !operatorKey) {
      return NextResponse.json({ error: 'Faucet not configured' }, { status: 503 });
    }

    const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
    const account = privateKeyToAccount(operatorKey as `0x${string}`);
    const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(rpcUrl) });

    const alreadyClaimed = await publicClient.readContract({
      address: faucetAddress as `0x${string}`, abi: FAUCET_ABI,
      functionName: 'hasClaimed', args: [address as `0x${string}`],
    });

    if (alreadyClaimed) {
      return NextResponse.json({ error: 'Already claimed', alreadyClaimed: true }, { status: 409 });
    }

    const remaining = await publicClient.readContract({
      address: faucetAddress as `0x${string}`, abi: FAUCET_ABI,
      functionName: 'getRemainingToday',
    });

    if (Number(remaining) === 0) {
      return NextResponse.json({ error: 'Daily limit reached. Try again tomorrow.' }, { status: 429 });
    }

    const hash = await walletClient.writeContract({
      address: faucetAddress as `0x${string}`, abi: FAUCET_ABI,
      functionName: 'claim', args: [address as `0x${string}`, referrerAddr as `0x${string}`],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({
      success: true, txHash: hash, blockNumber: Number(receipt.blockNumber),
      message: 'Testnet VFIDE + gas ETH sent to your wallet!',
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
}

export async function GET() {
  try {
    const faucetAddress = process.env.NEXT_PUBLIC_FAUCET_ADDRESS;
    const rpcUrl = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC || 'https://sepolia.base.org';
    if (!faucetAddress) return NextResponse.json({ error: 'Faucet not configured' }, { status: 503 });

    const publicClient = createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
    const remaining = await publicClient.readContract({
      address: faucetAddress as `0x${string}`, abi: FAUCET_ABI, functionName: 'getRemainingToday',
    });

    return NextResponse.json({ remainingToday: Number(remaining), faucetAddress });
  } catch {
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
