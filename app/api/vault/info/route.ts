import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { validateAddress } from '@/lib/inputValidation';
import { rateLimiter } from '@/lib/rateLimiter';

/**
 * GET /api/vault/info?address=0x... or ?vaultAddress=0x...
 * Get vault information by owner address or vault address
 * 
 * Rate limit: 40 req/min (normal read operation)
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const limitResult = await rateLimiter(request, 40); // 40 requests per minute
  if (limitResult) return limitResult;

  try {
    const { searchParams } = new URL(request.url);
    const ownerAddress = searchParams.get('address');
    const vaultAddress = searchParams.get('vaultAddress');

    if (!ownerAddress && !vaultAddress) {
      return NextResponse.json(
        { error: 'Either address or vaultAddress parameter required' },
        { status: 400 }
      );
    }

    // Validate address format
    let validatedAddress: string;
    try {
      validatedAddress = validateAddress(ownerAddress || vaultAddress!);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    // Query by owner address or vault address
    const result = ownerAddress
      ? await query(
          `SELECT * FROM vaults WHERE owner_address = $1`,
          [validatedAddress]
        )
      : await query(
          `SELECT * FROM vaults WHERE vault_address = $1`,
          [validatedAddress]
        );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { 
          hasVault: false,
          message: 'No vault found for this address' 
        },
        { status: 404 }
      );
    }

    const vault = result.rows[0];

    // Get guardian list
    const guardiansResult = await query(
      `SELECT guardian_address, added_at, is_mature, maturity_date, is_active
       FROM vault_guardians
       WHERE vault_address = $1 AND is_active = true
       ORDER BY added_at DESC`,
      [vault.vault_address]
    );

    // Get recent transactions count
    const txCountResult = await query(
      `SELECT COUNT(*) as count FROM vault_transactions WHERE vault_address = $1`,
      [vault.vault_address]
    );

    // Get recent security events count
    const securityEventsResult = await query(
      `SELECT COUNT(*) as count FROM vault_security_events 
       WHERE vault_address = $1 AND created_at > NOW() - INTERVAL '30 days'`,
      [vault.vault_address]
    );

    // Check for active recovery
    const recoveryResult = await query(
      `SELECT * FROM vault_recovery_events 
       WHERE vault_address = $1 
       AND event_type = 'initiated'
       ORDER BY created_at DESC
       LIMIT 1`,
      [vault.vault_address]
    );

    // Check for active inheritance claim
    const inheritanceResult = await query(
      `SELECT * FROM vault_inheritance_events 
       WHERE vault_address = $1 
       AND event_type = 'claim_initiated'
       ORDER BY created_at DESC
       LIMIT 1`,
      [vault.vault_address]
    );

    return NextResponse.json({
      hasVault: true,
      vault: {
        vaultAddress: vault.vault_address,
        ownerAddress: vault.owner_address,
        createdAt: vault.created_at,
        guardianCount: vault.guardian_count,
        hasNextOfKin: vault.has_next_of_kin,
        nextOfKinAddress: vault.next_of_kin_address,
        isLocked: vault.is_locked,
        lastActivityAt: vault.last_activity_at,
      },
      guardians: guardiansResult.rows,
      stats: {
        totalTransactions: parseInt(txCountResult.rows[0]?.count || '0'),
        recentSecurityEvents: parseInt(securityEventsResult.rows[0]?.count || '0'),
        hasActiveRecovery: recoveryResult.rows.length > 0,
        hasActiveInheritanceClaim: inheritanceResult.rows.length > 0,
      }
    });

  } catch (error) {
    console.error('Error fetching vault info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vault information' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vault/info
 * Create or update vault information
 * Called when a vault is created on-chain
 * 
 * Rate limit: 10 req/min (write operation)
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const limitResult = await rateLimiter(request, 10); // 10 requests per minute
  if (limitResult) return limitResult;

  try {
    const body = await request.json();
    const { vaultAddress, ownerAddress } = body;

    if (!vaultAddress || !ownerAddress) {
      return NextResponse.json(
        { error: 'vaultAddress and ownerAddress required' },
        { status: 400 }
      );
    }

    // Validate addresses
    let validatedVaultAddress: string;
    let validatedOwnerAddress: string;
    try {
      validatedVaultAddress = validateAddress(vaultAddress);
      validatedOwnerAddress = validateAddress(ownerAddress);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid Ethereum address format' },
        { status: 400 }
      );
    }

    // Insert or update vault record
    const result = await query(
      `INSERT INTO vaults (vault_address, owner_address, last_activity_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (owner_address)
       DO UPDATE SET 
         vault_address = EXCLUDED.vault_address,
         last_activity_at = NOW()
       RETURNING *`,
      [validatedVaultAddress, validatedOwnerAddress]
    );

    return NextResponse.json({
      success: true,
      vault: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating/updating vault info:', error);
    return NextResponse.json(
      { error: 'Failed to create/update vault information' },
      { status: 500 }
    );
  }
}
