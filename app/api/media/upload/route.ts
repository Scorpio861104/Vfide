import { logger } from '@/lib/logger';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_AUDIO_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const ALLOWED_TYPES: Record<string, { maxSize: number; folder: string }> = {
  'image/jpeg': { maxSize: MAX_IMAGE_SIZE, folder: 'images' },
  'image/png': { maxSize: MAX_IMAGE_SIZE, folder: 'images' },
  'image/webp': { maxSize: MAX_IMAGE_SIZE, folder: 'images' },
  'audio/webm': { maxSize: MAX_AUDIO_SIZE, folder: 'audio' },
  'audio/mp4': { maxSize: MAX_AUDIO_SIZE, folder: 'audio' },
  'audio/ogg': { maxSize: MAX_AUDIO_SIZE, folder: 'audio' },
  'video/mp4': { maxSize: MAX_VIDEO_SIZE, folder: 'video' },
  'video/webm': { maxSize: MAX_VIDEO_SIZE, folder: 'video' },
};

function sanitizePathSegment(value: FormDataEntryValue | null, fallback = 'general'): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return sanitized || fallback;
}

function getSafeExtension(file: File): string {
  const rawExtension = file.name.split('.').pop() || file.type.split('/')[1] || 'bin';
  const sanitized = rawExtension.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  return sanitized || 'bin';
}

async function uploadToR2(key: string, body: Buffer, contentType: string): Promise<string> {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME || 'vfide-media';
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    const directory = `/tmp/vfide-media/${key.split('/').slice(0, -1).join('/')}`;
    await mkdir(directory, { recursive: true });
    await writeFile(`/tmp/vfide-media/${key}`, body);
    return `/api/media/${key}`;
  }

  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  return publicUrl ? `${publicUrl}/${key}` : `https://${bucket}.${accountId}.r2.dev/${key}`;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const purpose = formData.get('purpose');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const typeConfig = ALLOWED_TYPES[file.type];
    if (!typeConfig) {
      return NextResponse.json(
        { error: `File type ${file.type} not allowed.` },
        { status: 400 }
      );
    }

    if (file.size > typeConfig.maxSize) {
      return NextResponse.json(
        { error: `File too large. Max ${typeConfig.maxSize / 1024 / 1024}MB for ${file.type}` },
        { status: 400 }
      );
    }

    const ext = getSafeExtension(file);
    const datePrefix = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
    const purposeSegment = sanitizePathSegment(purpose, 'general');
    const key = `${typeConfig.folder}/${purposeSegment}/${datePrefix}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadToR2(key, buffer, file.type);

    return NextResponse.json({
      success: true,
      url,
      key,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    logger.error('[Media Upload] Error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
