/**
 * Attachment Download/Delete API
 * 
 * Handle file downloads and deletion.
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock storage (shared with upload route)
const attachmentsStore = new Map<string, any>();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const attachment = attachmentsStore.get(id);

    if (!attachment) {
      return NextResponse.json(
        { success: false, error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Return file
    return new NextResponse(attachment.buffer, {
      headers: {
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `attachment; filename="${attachment.name}"`,
        'Content-Length': attachment.size.toString(),
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { success: false, error: 'Download failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const attachment = attachmentsStore.get(id);

    if (!attachment) {
      return NextResponse.json(
        { success: false, error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // TODO: Check permissions (user must be uploader or have delete permission)

    // Delete from storage
    attachmentsStore.delete(id);

    return NextResponse.json({
      success: true,
      message: 'Attachment deleted',
    });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { success: false, error: 'Delete failed' },
      { status: 500 }
    );
  }
}
