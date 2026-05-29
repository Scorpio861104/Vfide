/**
 * /api/crypto/ens/[address]
 * GET — reverse-resolve an Ethereum address to an ENS name.
 *       Uses public ENS API; gracefully returns null if not found.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;

  if (!ADDRESS_RE.test(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  try {
    // Attempt ENS reverse lookup via public RPC (no API key required)
    const response = await fetch(
      `https://api.ensideas.com/ens/resolve/${address}`,
      { next: { revalidate: 3600 } } // cache 1h
    );

    if (!response.ok) {
      return NextResponse.json({ ensName: null });
    }

    const data = await response.json();
    return NextResponse.json({ ensName: data?.name ?? null });
  } catch {
    // ENS lookup is best-effort — never hard-fail the UI
    return NextResponse.json({ ensName: null });
  }
}
