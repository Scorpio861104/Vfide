/**
 * Headhunter leaderboard API — disabled.
 * Referral programs are not available on VFIDE.
 */

import { NextRequest, NextResponse } from 'next/server';

const DISABLED = NextResponse.json(
  { error: 'Referral programs are not available on this platform.' },
  { status: 410 }
);

export async function GET(_request: NextRequest) { return DISABLED; }
export async function POST(_request: NextRequest) { return DISABLED; }
