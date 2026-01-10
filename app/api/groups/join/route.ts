/**
 * Join Group via Invite API Route
 * 
 * Handles joining a group using an invite code.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query, getClient } from '@/lib/db';

/**
 * POST /api/groups/join
 * Join a group using an invite code
 */
export async function POST(request: NextRequest) {
  const client = await getClient();
  
  try {
    const body = await request.json();
    const { code, userId } = body;

    if (!code || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Get invite link
    const linkResult = await client.query(
      `SELECT * FROM group_invites WHERE code = $1`,
      [code]
    );
    
    if (linkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 404 }
      );
    }

    const link = linkResult.rows[0];

    // Check if invite is valid
    if (!link.is_active) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'This invite link has been revoked' },
        { status: 400 }
      );
    }

    if (link.expires_at && new Date() > new Date(link.expires_at)) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'This invite link has expired' },
        { status: 400 }
      );
    }

    if (link.max_uses && link.current_uses >= link.max_uses) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'This invite link has reached its usage limit' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const memberCheckResult = await client.query(
      `SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [link.group_id, userId]
    );
    
    if (memberCheckResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'You are already a member of this group' },
        { status: 400 }
      );
    }

    // If requires approval, create pending request (future feature)
    if (link.metadata?.requireApproval) {
      await client.query('ROLLBACK');
      return NextResponse.json({
        success: true,
        status: 'pending',
        message: 'Your request to join has been sent to the group admins',
        groupId: link.group_id,
      });
    }

    // Add user to group
    await client.query(
      `INSERT INTO group_members (group_id, user_id, role, joined_at)
       VALUES ($1, $2, 'member', NOW())`,
      [link.group_id, userId]
    );

    // Update invite usage count
    await client.query(
      `UPDATE group_invites SET current_uses = current_uses + 1 WHERE id = $1`,
      [link.id]
    );

    // Update group member count
    await client.query(
      `UPDATE groups SET member_count = member_count + 1 WHERE id = $1`,
      [link.group_id]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      success: true,
      status: 'joined',
      groupId: link.group_id,
      message: 'Successfully joined the group',
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Join Group API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to join group' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
