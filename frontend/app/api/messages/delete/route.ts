/**
 * Message Delete API Route
 * 
 * Handles message deletion (soft delete by default).
 */

import { NextRequest, NextResponse } from 'next/server';

interface DeleteMessageRequest {
  messageId: string;
  conversationId: string;
  hardDelete?: boolean; // Optional: permanently delete vs soft delete
}

// In-memory message store (use database in production)
const messagesStore = new Map<string, any>();

export async function DELETE(request: NextRequest) {
  try {
    const body: DeleteMessageRequest = await request.json();
    const { messageId, conversationId, hardDelete = false } = body;

    if (!messageId || !conversationId) {
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

    // Check if already deleted
    if (message.deletedAt) {
      return NextResponse.json(
        { error: 'Message already deleted' },
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

    let updatedMessage;

    if (hardDelete) {
      // Permanently delete (only for admins or within short timeframe)
      messagesStore.delete(messageKey);
      updatedMessage = { ...message, deleted: true };
    } else {
      // Soft delete: mark as deleted but keep in database
      updatedMessage = {
        ...message,
        deletedAt: Date.now(),
        encryptedContent: '', // Clear content for privacy
      };
      messagesStore.set(messageKey, updatedMessage);
    }

    // In production: Broadcast deletion via WebSocket
    // broadcastMessageDelete(conversationId, messageId);

    return NextResponse.json({
      success: true,
      message: updatedMessage,
      deleted: hardDelete,
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}
