import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const AVATAR_SIZES = [128, 256, 512] as const;
const MAX_INPUT_BYTES = 8 * 1024 * 1024; // 8MB pre-processing cap
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024; // 2MB per output variant

const MAGIC_BYTES = {
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  gif87a: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
  gif89a: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
  riff: [0x52, 0x49, 0x46, 0x46],
  webp: [0x57, 0x45, 0x42, 0x50],
} as const;

type AvatarVariant = {
  size: number;
  key: string;
  url: string;
};

const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const createS3Client = (): S3Client => {
  const region = requireEnv('S3_REGION');
  const accessKeyId = requireEnv('S3_ACCESS_KEY_ID');
  const secretAccessKey = requireEnv('S3_SECRET_ACCESS_KEY');
  const endpoint = process.env.S3_ENDPOINT;
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === 'true';

  return new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
    endpoint: endpoint || undefined,
    forcePathStyle,
  });
};

const getPublicBaseUrl = (): string => {
  const baseUrl = process.env.S3_PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error('Missing required environment variable: S3_PUBLIC_BASE_URL');
  }
  return baseUrl.replace(/\/+$/, '');
};

const bufferStartsWith = (buffer: Buffer, bytes: readonly number[]): boolean =>
  bytes.every((value, index) => buffer[index] === value);

const detectImageType = (buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | null => {
  if (buffer.length < 12) return null;

  if (bufferStartsWith(buffer, MAGIC_BYTES.jpeg)) return 'image/jpeg';
  if (bufferStartsWith(buffer, MAGIC_BYTES.png)) return 'image/png';
  if (bufferStartsWith(buffer, MAGIC_BYTES.gif87a) || bufferStartsWith(buffer, MAGIC_BYTES.gif89a)) {
    return 'image/gif';
  }
  if (bufferStartsWith(buffer, MAGIC_BYTES.riff) && buffer.slice(8, 12).equals(Buffer.from(MAGIC_BYTES.webp))) {
    return 'image/webp';
  }

  return null;
};

const buildAvatarKey = (address: string, size: number): string => {
  const stamp = Date.now();
  const nonce = crypto.randomUUID();
  return `avatars/${address.toLowerCase()}/${stamp}-${nonce}-${size}.webp`;
};

const uploadToS3 = async (client: S3Client, bucket: string, key: string, body: Buffer): Promise<string> => {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000, immutable',
  });

  await client.send(command);
  return `${getPublicBaseUrl()}/${key}`;
};

export async function processAvatarUpload(input: { file: File; address: string }): Promise<{ avatarUrl: string; variants: AvatarVariant[] }> {
  const bucket = requireEnv('S3_BUCKET');
  const s3 = createS3Client();

  if (input.file.size > MAX_INPUT_BYTES) {
    throw new Error('Avatar file too large. Maximum upload size is 8MB.');
  }

  const arrayBuffer = await input.file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const detectedType = detectImageType(buffer);

  if (!detectedType) {
    throw new Error('Unsupported avatar file type. Please upload a PNG, JPG, WEBP, or GIF.');
  }

  const pipeline = sharp(buffer, { failOnError: true }).rotate();
  const variants: AvatarVariant[] = [];

  for (const size of AVATAR_SIZES) {
    const resized = await pipeline
      .clone()
      .resize(size, size, { fit: 'cover', position: 'centre', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    if (resized.length > MAX_OUTPUT_BYTES) {
      throw new Error('Processed avatar is too large. Please use a smaller image.');
    }

    const key = buildAvatarKey(input.address, size);
    const url = await uploadToS3(s3, bucket, key, resized);
    variants.push({ size, key, url });
  }

  const primary = variants.find((variant) => variant.size === 256) || variants[0];
  if (!primary) {
    throw new Error('Failed to generate avatar variants.');
  }

  return { avatarUrl: primary.url, variants };
}
