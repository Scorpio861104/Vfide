/**
 * Message Reaction API Route
 * 
 * Handles adding/removing reactions to messages.
 */

import { NextRequest, NextResponse } from 'next/server';

interface ReactionRequest {
  messageId: string;
  conversationId: string;
  emoji: string;
  userAddress: string;
}

// In-memory message store (use database in production)
const messagesStore = new Map<string, any>();

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

    // Validate emoji (basic check)
    const emojiRegex = /^[\p{Emoji}]+$/u;
    if (!emojiRegex.test(emoji)) {
      return NextResponse.json(
        { error: 'Invalid emoji' },
        { status: 400 }
      );
    }

    // Get message from store
    const messageKey = `${conversationId}_${messageId}`;
    const message = messagesStore.get(messageKey) || {
      id: messageId,
      conversationId,
      reactions: {},
    };

    // Initialize reactions if not exists
    if (!message.reactions) {
      message.reactions = {};
    }

    // Toggle reaction
    if (!message.reactions[emoji]) {
      message.reactions[emoji] = [];
    }

    const userIndex = message.reactions[emoji].indexOf(userAddress);
    
    if (userIndex > -1) {
      // Remove reaction
      message.reactions[emoji].splice(userIndex, 1);
      
      // Clean up empty emoji arrays
      if (message.reactions[emoji].length === 0) {
        delete message.reactions[emoji];
      }
    } else {
      // Add reaction
      message.reactions[emoji].push(userAddress);
    }

    messagesStore.set(messageKey, message);

    // In production: Broadcast reaction update via WebSocket
    // broadcastReactionUpdate(conversationId, message);

    return NextResponse.json({
      success: true,
      message,
      reactions: message.reactions,
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

    const messageKey = `${conversationId}_${messageId}`;
    const message = messagesStore.get(messageKey);

    if (!message || !message.reactions || !message.reactions[emoji]) {
      return NextResponse.json({
        success: true,
        message: 'Reaction not found',
      });
    }

    // Remove user from reaction
    const userIndex = message.reactions[emoji].indexOf(userAddress);
    if (userIndex > -1) {
      message.reactions[emoji].splice(userIndex, 1);
      
      if (message.reactions[emoji].length === 0) {
        delete message.reactions[emoji];
      }
    }

    messagesStore.set(messageKey, message);

    return NextResponse.json({
      success: true,
      reactions: message.reactions,
    });
  } catch (error) {
    console.error('Error removing reaction:', error);
    return NextResponse.json(
      { error: 'Failed to remove reaction' },
      { status: 500 }
    );
  }
}
