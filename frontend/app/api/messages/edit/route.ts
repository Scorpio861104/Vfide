/**
 * Message Edit API Route
 * 
 * Handles message editing with encryption and validation.
 */

import { NextRequest, NextResponse } from 'next/server';

interface EditMessageRequest {
  messageId: string;
  conversationId: string;
  encryptedContent: string;
}

// In-memory message store (use database in production)
const messagesStore = new Map<string, any>();

export async function PATCH(request: NextRequest) {
  try {
    const body: EditMessageRequest = await request.json();
    const { messageId, conversationId, encryptedContent } = body;

    if (!messageId || !conversationId || !encryptedContent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get message from store
    const messageKey = `${conversationId}_${messageId}`;
    const message = messagesStore.get(messageKey);

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    // Check if message was already deleted
    if (message.deletedAt) {
      return NextResponse.json(
        { error: 'Cannot edit deleted message' },
        { status: 400 }
      );
    }

    // Verify the user is the sender (in production, verify with auth token)
    // const userId = await getUserIdFromToken(request);
    // if (message.from !== userId) {
    //   return NextResponse.json(
    //     { error: 'Unauthorized' },
    //     { status: 403 }
    //   );
    // }

    // Check if message is too old to edit (optional: 15 minute window)
    const fifteenMinutes = 15 * 60 * 1000;
    const messageAge = Date.now() - message.timestamp;
    if (messageAge > fifteenMinutes) {
      return NextResponse.json(
        { error: 'Message is too old to edit (15 minute limit)' },
        { status: 400 }
      );
    }

    // Update message
    const updatedMessage = {
      ...message,
      encryptedContent,
      editedAt: Date.now(),
    };

    messagesStore.set(messageKey, updatedMessage);

    // In production: Broadcast edit via WebSocket
    // broadcastMessageEdit(conversationId, updatedMessage);

    return NextResponse.json({
      success: true,
      message: updatedMessage,
    });
  } catch (error) {
    console.error('Error editing message:', error);
    return NextResponse.json(
      { error: 'Failed to edit message' },
      { status: 500 }
    );
  }
}
