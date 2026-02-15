import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { createPublicClient, http, isAddress } from 'viem';
import { mainnet } from 'viem/chains';

const client = createPublicClient({
  chain: mainnet,
  transport: http(process.env.NEXT_PUBLIC_MAINNET_RPC || 'https://eth.llamarpc.com'),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ address: string }> }) {
  const rateLimit = await withRateLimit(request, 'read');
  if (rateLimit) return rateLimit;

  try {
    const resolvedParams = await params;
    const address = resolvedParams?.address;

    if (!address || typeof address !== 'string') {
      return NextResponse.json({ error: 'Invalid address parameter' }, { status: 400 });
    }

    if (!isAddress(address)) {
      return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });
    }

    const ensName = await client.getEnsName({ address });

    return NextResponse.json({ ensName });
  } catch (error) {
    console.error('[ENS API] Error:', error);
    return NextResponse.json({ ensName: null }, { status: 200 });
  }
}
