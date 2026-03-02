/**
 * Quests weekly claim API — disabled.
 */

import { NextRequest, NextResponse } from 'next/server';

const DISABLED = NextResponse.json(
  { error: 'Quests are not available on this platform.' },
  { status: 410 }
);

export async function GET(_request: NextRequest) { return DISABLED; }
export async function POST(_request: NextRequest) { return DISABLED; }
