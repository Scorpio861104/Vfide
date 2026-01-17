/**
 * Message Reaction API Route
 * 
 * Handles adding/removing reactions to messages.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { validateRequest, checkRateLimit } from '@/lib/api-validation';
import { apiLogger } from '@/services/logger.service';

interface ReactionRequest {
  messageId: string;
  conversationId: string;
  reactionType?: 'emoji' | 'custom_image';
  emoji?: string;
  imageUrl?: string;
  imageName?: string;
  userAddress: string;
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`messages-reaction-post:${clientId}`, { maxRequests: 30, windowMs: 60000 });
  if (!rateLimit.success) return rateLimit.errorResponse;

  // Authentication required
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.errorResponse;

  try {
    const body: ReactionRequest = await request.json();

    // Validation
    const validation = validateRequest(body, {
      messageId: { required: true, type: 'string' },
      conversationId: { required: true, type: 'string' },
      userAddress: { required: true, type: 'address' }
    });
    if (!validation.valid) return validation.errorResponse;
    const { messageId, conversationId, reactionType = 'emoji', emoji, imageUrl, imageName, userAddress } = body;

    if (!messageId || !conversationId || !userAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate reaction based on type
    if (reactionType === 'emoji') {
      if (!emoji) {
        return NextResponse.json(
          { error: 'Emoji is required for emoji reactions' },
          { status: 400 }
        );
      }
      const emojiRegex = /^[\p{Emoji}]+$/u;
      if (!emojiRegex.test(emoji)) {
        return NextResponse.json(
          { error: 'Invalid emoji' },
          { status: 400 }
        );
      }
    } else if (reactionType === 'custom_image') {
      if (!imageUrl) {
        return NextResponse.json(
          { error: 'Image URL is required for custom image reactions' },
          { status: 400 }
        );
      }
      // Validate URL format
      try {
        new URL(imageUrl);
      } catch {
        return NextResponse.json(
          { error: 'Invalid image URL' },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid reaction type' },
        { status: 400 }
      );
    }

    // Check if reaction exists
    const reactionIdentifier = reactionType === 'emoji' ? emoji : imageUrl;
    const identifierColumn = reactionType === 'emoji' ? 'mr.emoji' : 'mr.image_url';
    
    const existingResult = await query(
      `SELECT id FROM message_reactions mr
       JOIN users u ON mr.user_id = u.id
       WHERE mr.message_id = $1 
         AND ${identifierColumn} = $2 
         AND mr.reaction_type = $3
         AND u.wallet_address = $4`,
      [messageId, reactionIdentifier, reactionType, userAddress.toLowerCase()]
    );

    if (existingResult.rows.length > 0) {
      // Remove reaction
      await query(
        `DELETE FROM message_reactions mr
         USING users u
         WHERE mr.user_id = u.id
           AND mr.message_id = $1
           AND ${identifierColumn} = $2
           AND mr.reaction_type = $3
           AND u.wallet_address = $4`,
        [messageId, reactionIdentifier, reactionType, userAddress.toLowerCase()]
      );
    } else {
      // Add reaction
      if (reactionType === 'emoji') {
        await query(
          `INSERT INTO message_reactions (message_id, user_id, reaction_type, emoji, created_at)
           SELECT $1, u.id, $2, $3, NOW()
           FROM users u
           WHERE u.wallet_address = $4`,
          [messageId, reactionType, emoji, userAddress.toLowerCase()]
        );
      } else {
        await query(
          `INSERT INTO message_reactions (message_id, user_id, reaction_type, image_url, image_name, created_at)
           SELECT $1, u.id, $2, $3, $4, NOW()
           FROM users u
           WHERE u.wallet_address = $5`,
          [messageId, reactionType, imageUrl, imageName || 'custom', userAddress.toLowerCase()]
        );
      }
    }

    // Get all reactions for the message
    const reactionsResult = await query(
      `SELECT 
         mr.reaction_type,
         mr.emoji,
         mr.image_url,
         mr.image_name,
         json_agg(json_build_object(
           'address', u.wallet_address,
           'username', u.username,
           'avatar', u.avatar_url
         )) as users
       FROM message_reactions mr
       JOIN users u ON mr.user_id = u.id
       WHERE mr.message_id = $1
       GROUP BY mr.reaction_type, mr.emoji, mr.image_url, mr.image_name`,
      [messageId]
    );

    interface ReactionRow {
      reaction_type: 'emoji' | 'custom_image';
      emoji: string | null;
      image_url: string | null;
      image_name: string | null;
      users: Array<{ address: string; username: string; avatar: string }>;
    }

    const reactions = reactionsResult.rows.reduce((acc: Record<string, unknown>, row: ReactionRow) => {
      const key = row.reaction_type === 'emoji' ? row.emoji! : row.image_url!;
      acc[key] = {
        type: row.reaction_type,
        emoji: row.emoji,
        imageUrl: row.image_url,
        imageName: row.image_name,
        users: row.users
      };
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
    apiLogger.error('Error updating reaction', { error });
    return NextResponse.json(
      { error: 'Failed to update reaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Rate limiting
  const clientId = request.headers.get('x-forwarded-for') || 'unknown';
  const rateLimit = checkRateLimit(`messages-reaction-delete:${clientId}`, { maxRequests: 30, windowMs: 60000 });
  if (!rateLimit.success) return rateLimit.errorResponse;

  // Authentication required
  const auth = await requireAuth(request);
  if (!auth.authenticated) return auth.errorResponse;

  try {
    const body: ReactionRequest = await request.json();

    // Validation
    const validation = validateRequest(body, {
      messageId: { required: true, type: 'string' },
      conversationId: { required: true, type: 'string' },
      userAddress: { required: true, type: 'address' }
    });
    if (!validation.valid) return validation.errorResponse;
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
    apiLogger.error('Error removing reaction', { error });
    return NextResponse.json(
      { error: 'Failed to remove reaction' },
      { status: 500 }
    );
  }
}
