/**
 * Message Reaction API Route
 * 
 * Handles adding/removing reactions to messages.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface ReactionRequest {
  messageId: string;
  conversationId: string;
  emoji: string;
  userAddress: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ReactionRequest = await request.json();
    const { messageId, conversationId, emoji, userAddress } = body;

    if (!messageId || !conversationId || !emoji || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate emoji
    const emojiRegex = /^[\p{Emoji}]+$/u;
    if (!emojiRegex.test(emoji)) {
      return NextResponse.json(
        { error: 'Invalid emoji' },
        { status: 400 }
      );
    }

    // Check if reaction exists
    const existingResult = await query(
      `SELECT id FROM message_reactions mr
       JOIN users u ON mr.user_id = u.id
       WHERE mr.message_id = $1 AND mr.emoji = $2 AND u.wallet_address = $3`,
      [messageId, emoji, userAddress.toLowerCase()]
    );

    if (existingResult.rows.length > 0) {
      // Remove reaction
      await query(
        `DELETE FROM message_reactions mr
         USING users u
         WHERE mr.user_id = u.id
           AND mr.message_id = $1
           AND mr.emoji = $2
           AND u.wallet_address = $3`,
        [messageId, emoji, userAddress.toLowerCase()]
      );
    } else {
      // Add reaction
      await query(
        `INSERT INTO message_reactions (message_id, user_id, emoji, created_at)
         SELECT $1, u.id, $2, NOW()
         FROM users u
         WHERE u.wallet_address = $3`,
        [messageId, emoji, userAddress.toLowerCase()]
      );
    }

    // Get all reactions for the message
    const reactionsResult = await query(
      `SELECT emoji, json_agg(u.wallet_address) as users
       FROM message_reactions mr
       JOIN users u ON mr.user_id = u.id
       WHERE mr.message_id = $1
       GROUP BY emoji`,
      [messageId]
    );

    const reactions = reactionsResult.rows.reduce((acc: Record<string, string[]>, row: { emoji: string; users: string[] }) => {
      acc[row.emoji] = row.users;
      return acc;
    }, {});

    // In production: Broadcast reaction update via WebSocket would happen here
    // For now, we just return the updated reactions

    return NextResponse.json({
      success: true,
      messageId,
      reactions,
    });
  } catch (error) {
    console.error('Error updating reaction:', error);
    return NextResponse.json(
      { error: 'Failed to update reaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body: ReactionRequest = await request.json();
    const { messageId, conversationId, emoji, userAddress } = body;

    if (!messageId || !conversationId || !emoji || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Remove reaction
    await query(
      `DELETE FROM message_reactions mr
       USING users u
       WHERE mr.user_id = u.id
         AND mr.message_id = $1
         AND mr.emoji = $2
         AND u.wallet_address = $3`,
      [messageId, emoji, userAddress.toLowerCase()]
    );

    return NextResponse.json({
      success: true,
      message: 'Reaction removed',
    });
  } catch (error) {
    console.error('Error removing reaction:', error);
    return NextResponse.json(
      { error: 'Failed to remove reaction' },
      { status: 500 }
    );
  }
}
