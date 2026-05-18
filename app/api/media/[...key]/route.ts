import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogg: 'audio/ogg',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Media proxy unavailable in production' }, { status: 404 });
  }

  try {
    const { key } = await params;
    const relativePath = key.join('/').replace(/\.\./g, '');
    const BASE_DIR = resolve('/tmp/vfide-media');
    const absolutePath = resolve(BASE_DIR, relativePath);
    // Guard against path traversal — resolved path must stay within base dir
    if (!absolutePath.startsWith(BASE_DIR + '/') && absolutePath !== BASE_DIR) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }
    const file = await readFile(absolutePath);
    const extension = relativePath.split('.').pop()?.toLowerCase() || 'bin';

    return new NextResponse(file, {
      headers: {
        'Content-Type': CONTENT_TYPES[extension] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }
}
