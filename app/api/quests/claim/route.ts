/**
 * Quests API — disabled.
 * VFIDE does not use quest or challenge-based engagement systems.
 */

import { NextRequest, NextResponse } from 'next/server';

const DISABLED = NextResponse.json(
  { error: 'Quests are not available on this platform.' },
  { status: 410 }
);

export async function GET(_request: NextRequest) { return DISABLED; }
export async function POST(_request: NextRequest) { return DISABLED; }
export async function PUT(_request: NextRequest) { return DISABLED; }
export async function PATCH(_request: NextRequest) { return DISABLED; }
export async function DELETE(_request: NextRequest) { return DISABLED; }
