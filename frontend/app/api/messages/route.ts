import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';

// In-memory storage for development (use database in production)
const messagesStore = new Map<string, any[]>();

/**
 * GET /api/messages?conversationId=xxx
 * Get messages for a conversation
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('conversationId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
        { status: 400 }
      );
    }

    // Get messages from store
    const messages = messagesStore.get(conversationId) || [];
    const paginatedMessages = messages.slice(offset, offset + limit);

    return NextResponse.json({
      messages: paginatedMessages,
      total: messages.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Messages GET API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages
 * Send a new message
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, from, to, encryptedContent, signature, timestamp } = body;

    // Validate required fields
    if (!conversationId || !from || !to || !encryptedContent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create message object
    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversationId,
      from,
      to,
      encryptedContent,
      signature,
      timestamp: timestamp || Date.now(),
      read: false,
      verified: !!signature,
    };

    // Store message
    const messages = messagesStore.get(conversationId) || [];
    messages.push(message);
    messagesStore.set(conversationId, messages);

    // In production, trigger WebSocket notification to recipient
    // await notifyUser(to, message);

    return NextResponse.json({
      success: true,
      message,
    }, { status: 201 });
  } catch (error) {
    console.error('[Messages POST API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/messages/:id
 * Mark message as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { messageId, conversationId, read } = body;

    if (!messageId || !conversationId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const messages = messagesStore.get(conversationId);
    if (!messages) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    const message = messages.find(m => m.id === messageId);
    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    message.read = read ?? true;
    messagesStore.set(conversationId, messages);

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error) {
    console.error('[Messages PATCH API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    );
  }
}
