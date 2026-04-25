/**
 * Message Reaction API Route
 * 
 * Handles adding/removing reactions to messages.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { isAddress } from 'viem';
import { logger } from '@/lib/logger';
import { z } from 'zod4';

const MAX_ID_LENGTH = 128;
const MAX_IMAGE_NAME_LENGTH = 120;
const MAX_EMOJI_LENGTH = 16;
const DEFAULT_IMAGE_HOST_ALLOWLIST = ['images.vfide.io', 'cdn.vfide.io'];

function getAllowedImageHosts(): Set<string> {
  const configured = process.env.REACTION_IMAGE_HOST_ALLOWLIST
    ?.split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);

  return new Set((configured && configured.length > 0 ? configured : DEFAULT_IMAGE_HOST_ALLOWLIST));
}

const messageReactionPostSchema = z.object({
  messageId: z.string().trim().min(1).max(MAX_ID_LENGTH),
  conversationId: z.string().trim().min(1).max(MAX_ID_LENGTH),
  reactionType: z.enum(['emoji', 'custom_image']).optional(),
  emoji: z.string().trim().min(1).max(MAX_EMOJI_LENGTH).optional(),
  imageUrl: z.string().trim().min(1).optional(),
  imageName: z.string().trim().min(1).max(MAX_IMAGE_NAME_LENGTH).optional(),
  userAddress: z.string().trim().refine((value) => isAddress(value), {
    message: 'Invalid Ethereum address format',
  }),
});

const messageReactionDeleteSchema = z.object({
  messageId: z.string().trim().min(1).max(MAX_ID_LENGTH),
  conversationId: z.string().trim().min(1).max(MAX_ID_LENGTH),
  emoji: z.string().trim().min(1).max(MAX_EMOJI_LENGTH),
  userAddress: z.string().trim().refine((value) => isAddress(value), {
    message: 'Invalid Ethereum address format',
  }),
});

function normalizeRequiredString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function ensureConversationParticipant(
  messageId: string,
  conversationId: string,
  userAddress: string
): Promise<boolean> {
  const membershipResult = await query(
    `SELECT m.id
     FROM messages m
     JOIN users sender ON m.sender_id = sender.id
     JOIN users recipient ON m.recipient_id = recipient.id
     WHERE m.id = $1
       AND m.conversation_id = $2
       AND (
         sender.wallet_address = $3
         OR recipient.wallet_address = $3
       )
     LIMIT 1`,
    [messageId, conversationId, userAddress.toLowerCase()]
  );

  return membershipResult.rows.length > 0;
}

export async function POST(request: NextRequest) {
  // Rate limiting: 30 requests per minute for reactions
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authenticatedAddress = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';
  if (!authenticatedAddress || !isAddress(authenticatedAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof messageReactionPostSchema>;
  try {
    const rawBody = await request.json();
    const parsed = messageReactionPostSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Message Reaction POST] Invalid JSON body', error);
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  try {
    const reactionType = body.reactionType || 'emoji';
    const normalizedEmoji = normalizeRequiredString(body.emoji);
    const normalizedImageUrl = normalizeRequiredString(body.imageUrl);
    const normalizedImageName = normalizeRequiredString(body.imageName);
    const messageId = body.messageId;
    const conversationId = body.conversationId;
    const userAddress = body.userAddress;

    const normalizedUserAddress = userAddress.toLowerCase();

    // Verify authenticated user matches userAddress
    if (authenticatedAddress !== normalizedUserAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const isParticipant = await ensureConversationParticipant(messageId, conversationId, normalizedUserAddress);
    if (!isParticipant) {
      return NextResponse.json(
        { error: 'You can only react to messages in your own conversations' },
        { status: 403 }
      );
    }

    // Validate reaction based on type
    if (reactionType === 'emoji') {
      if (!normalizedEmoji) {
        return NextResponse.json(
          { error: 'Emoji is required for emoji reactions' },
          { status: 400 }
        );
      }
      if (normalizedEmoji.length > MAX_EMOJI_LENGTH) {
        return NextResponse.json(
          { error: 'Emoji reaction is too long' },
          { status: 400 }
        );
      }
      const emojiRegex = /^[\p{Emoji}]+$/u;
      if (!emojiRegex.test(normalizedEmoji)) {
        return NextResponse.json(
          { error: 'Invalid emoji' },
          { status: 400 }
        );
      }
    } else if (reactionType === 'custom_image') {
      if (!normalizedImageUrl) {
        return NextResponse.json(
          { error: 'Image URL is required for custom image reactions' },
          { status: 400 }
        );
      }
      // Validate URL format
      try {
        const parsedUrl = new URL(normalizedImageUrl);
        if (parsedUrl.protocol !== 'https:') {
          throw new Error('Invalid protocol');
        }

        const allowedHosts = getAllowedImageHosts();
        if (!allowedHosts.has(parsedUrl.hostname.toLowerCase())) {
          return NextResponse.json(
            { error: 'Image host is not allowed' },
            { status: 400 }
          );
        }
      } catch (error) {
        logger.debug('[Message Reaction POST] Invalid image URL', error);
        return NextResponse.json(
          { error: 'Invalid image URL' },
          { status: 400 }
        );
      }

      if (normalizedImageName && normalizedImageName.length > MAX_IMAGE_NAME_LENGTH) {
        return NextResponse.json(
          { error: `imageName too long (max ${MAX_IMAGE_NAME_LENGTH})` },
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
    const reactionIdentifier = reactionType === 'emoji' ? normalizedEmoji : normalizedImageUrl;
    const identifierColumn = reactionType === 'emoji' ? 'mr.emoji' : 'mr.image_url';

    if (!reactionIdentifier) {
      return NextResponse.json(
        { error: 'Reaction identifier missing' },
        { status: 400 }
      );
    }
    
    const existingResult = await query(
      `SELECT id FROM message_reactions mr
       JOIN users u ON mr.user_id = u.id
       WHERE mr.message_id = $1 
         AND ${identifierColumn} = $2 
         AND mr.reaction_type = $3
         AND u.wallet_address = $4`,
      [messageId, reactionIdentifier, reactionType, normalizedUserAddress]
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
        [messageId, reactionIdentifier, reactionType, normalizedUserAddress]
      );
    } else {
      // Add reaction
      if (reactionType === 'emoji') {
        await query(
          `INSERT INTO message_reactions (message_id, user_id, reaction_type, emoji, created_at)
           SELECT $1, u.id, $2, $3, NOW()
           FROM users u
           WHERE u.wallet_address = $4`,
          [messageId, reactionType, normalizedEmoji, normalizedUserAddress]
        );
      } else {
        await query(
          `INSERT INTO message_reactions (message_id, user_id, reaction_type, image_url, image_name, created_at)
           SELECT $1, u.id, $2, $3, $4, NOW()
           FROM users u
           WHERE u.wallet_address = $5`,
          [messageId, reactionType, normalizedImageUrl, normalizedImageName || 'custom', normalizedUserAddress]
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

    const reactions = (reactionsResult.rows as ReactionRow[]).reduce((acc: Record<string, unknown>, row: ReactionRow) => {
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
    logger.error('Error updating reaction:', error);
    return NextResponse.json(
      { error: 'Failed to update reaction' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  // Rate limiting: 30 requests per minute for reactions
  const rateLimitResponse = await withRateLimit(request, 'write');
  if (rateLimitResponse) return rateLimitResponse;

  // Require authentication
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  const authenticatedAddress = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';
  if (!authenticatedAddress || !isAddress(authenticatedAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: z.infer<typeof messageReactionDeleteSchema>;
  try {
    const rawBody = await request.json();
    const parsed = messageReactionDeleteSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    body = parsed.data;
  } catch (error) {
    logger.debug('[Message Reaction DELETE] Invalid JSON body', error);
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  try {
    const messageId = body.messageId;
    const conversationId = body.conversationId;
    const emoji = body.emoji;
    const userAddress = body.userAddress;

    const normalizedUserAddress = userAddress.toLowerCase();

    // Verify authenticated user matches userAddress
    if (authenticatedAddress !== normalizedUserAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const isParticipant = await ensureConversationParticipant(messageId, conversationId, normalizedUserAddress);
    if (!isParticipant) {
      return NextResponse.json(
        { error: 'You can only react to messages in your own conversations' },
        { status: 403 }
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
      [messageId, emoji, normalizedUserAddress]
    );

    return NextResponse.json({
      success: true,
      message: 'Reaction removed',
    });
  } catch (error) {
    logger.error('Error removing reaction:', error);
    return NextResponse.json(
      { error: 'Failed to remove reaction' },
      { status: 500 }
    );
  }
}
