import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireAuth } from '@/lib/auth/middleware';
import { withRateLimit } from '@/lib/auth/rateLimit';
import { validateBody, sendGroupMessageSchema } from '@/lib/auth/validation';
import { buildGroupPayloadSignatureMessage } from '@/lib/messageEncryption';
import { logger } from '@/lib/logger';
import { getRequestCorrelationContext } from '@/lib/security/requestContext';
import { isAddress, verifyMessage } from 'viem';

interface GroupMessageRow {
  id: number;
  group_id: number;
  sender_id: number;
  content: string;
  is_encrypted: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  sender_address?: string;
  sender_username?: string;
  sender_avatar?: string;
}

type GroupMessageResponseRow = GroupMessageRow & {
  signature_valid: boolean;
};

const MAX_GROUP_MESSAGES_LIMIT = 200;
const MAX_GROUP_MESSAGES_OFFSET = 10000;
const MAX_GROUP_MESSAGES_PER_MINUTE_PER_SENDER = 30;
const MAX_GROUP_PAYLOAD_AGE_MS = 10 * 60 * 1000;
const MAX_GROUP_MEMBERS_PER_MESSAGE = 200;
const MAX_MEMBER_BUNDLE_CHARS = 20000;
const MAX_EPHEMERAL_PUBKEY_CHARS = 1024;
const MAX_CIPHERTEXT_CHARS = 16384;
const MAX_IV_CHARS = 256;
const MAX_SIG_CHARS = 2048;
const MAX_NONCE_CHARS = 128;
const HEX_STRING_REGEX = /^[0-9a-fA-F]+$/;
const BASE64_STRING_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;
const ETH_SIGNATURE_REGEX = /^0x[0-9a-fA-F]{130}$/;
const STRICT_GROUP_MESSAGES_GET_ENV = 'VFIDE_STRICT_GROUP_MESSAGE_GET';

type ParsedEncryptedGroupPayload = {
  v: 2;
  groupId: string;
  ts: number;
  members: string[];
  encryptedForMembers: Record<string, string>;
  groupSig: string;
};

function parseStrictIntegerParam(value: string | null): number | null {
  if (value === null) return null;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  return Number.parseInt(trimmed, 10);
}

function isEncryptedDirectMessagePayload(content: string): boolean {
  try {
    const payload = JSON.parse(content) as Record<string, unknown>;
    if (!payload || typeof payload !== 'object') return false;

    const v = payload.v;
    const ephemeralPublicKey = payload.ephemeralPublicKey;
    const ciphertext = payload.ciphertext;
    const iv = payload.iv;
    const sig = payload.sig;
    const ts = payload.ts;
    const nonce = payload.nonce;

    if (v !== 1) return false;
    if (
      typeof ephemeralPublicKey !== 'string' ||
      ephemeralPublicKey.length < 64 ||
      ephemeralPublicKey.length > MAX_EPHEMERAL_PUBKEY_CHARS ||
      !HEX_STRING_REGEX.test(ephemeralPublicKey)
    ) return false;
    if (
      typeof ciphertext !== 'string' ||
      ciphertext.length < 16 ||
      ciphertext.length > MAX_CIPHERTEXT_CHARS ||
      !BASE64_STRING_REGEX.test(ciphertext)
    ) return false;
    if (
      typeof iv !== 'string' ||
      iv.length < 8 ||
      iv.length > MAX_IV_CHARS ||
      !BASE64_STRING_REGEX.test(iv)
    ) return false;
    if (typeof sig !== 'string' || sig.length > MAX_SIG_CHARS || !ETH_SIGNATURE_REGEX.test(sig)) return false;
    if (typeof ts !== 'number' || !Number.isSafeInteger(ts) || ts <= 0) return false;
    if (
      typeof nonce !== 'string' ||
      nonce.length < 16 ||
      nonce.length > MAX_NONCE_CHARS ||
      !HEX_STRING_REGEX.test(nonce)
    ) return false;

    return true;
  } catch {
    return false;
  }
}

function parseEncryptedGroupMessagePayload(content: string, routeGroupId?: number): ParsedEncryptedGroupPayload | null {
  try {
    const payload = JSON.parse(content) as Record<string, unknown>;
    if (!payload || typeof payload !== 'object') return null;

    const v = payload.v;
    const groupId = payload.groupId;
    const ts = payload.ts;
    const members = payload.members;
    const encryptedForMembers = payload.encryptedForMembers;
    const groupSig = payload.groupSig;

    if (v !== 2) return null;
    if (typeof groupId !== 'string' || groupId.trim().length === 0 || !/^\d+$/.test(groupId.trim())) return null;
    if (typeof ts !== 'number' || !Number.isSafeInteger(ts) || ts <= 0) return null;
    if (typeof groupSig !== 'string' || !ETH_SIGNATURE_REGEX.test(groupSig)) return null;

    const normalizedGroupId = groupId.trim();

    if (routeGroupId !== undefined) {
      const routeGroupIdString = String(routeGroupId);
      if (normalizedGroupId !== routeGroupIdString) return null;
    }

    if (Math.abs(Date.now() - ts) > MAX_GROUP_PAYLOAD_AGE_MS) {
      return null;
    }

    if (!Array.isArray(members) || members.length === 0 || members.length > MAX_GROUP_MEMBERS_PER_MESSAGE) return null;
    if (!encryptedForMembers || typeof encryptedForMembers !== 'object' || Array.isArray(encryptedForMembers)) return null;

    const memberSet = new Set<string>();
    for (const member of members) {
      if (typeof member !== 'string' || member.length < 64 || !HEX_STRING_REGEX.test(member)) {
        return null;
      }
      memberSet.add(member);
    }

    if (memberSet.size !== members.length) {
      return null;
    }

    const encryptedMap = encryptedForMembers as Record<string, unknown>;
    if (Object.keys(encryptedMap).length !== memberSet.size) {
      return null;
    }

    const normalizedMembers = Array.from(memberSet);
    const normalizedEncryptedForMembers: Record<string, string> = {};
    for (const member of memberSet) {
      const memberCipher = encryptedMap[member];
      if (
        typeof memberCipher !== 'string' ||
        memberCipher.length < 32 ||
        memberCipher.length > MAX_MEMBER_BUNDLE_CHARS
      ) {
        return null;
      }
      if (!isEncryptedDirectMessagePayload(memberCipher)) {
        return null;
      }
      normalizedEncryptedForMembers[member] = memberCipher;
    }

    return {
      v: 2,
      groupId: normalizedGroupId,
      ts,
      members: normalizedMembers,
      encryptedForMembers: normalizedEncryptedForMembers,
      groupSig,
    };
  } catch {
    return null;
  }
}

function isMissingGroupMessagesTable(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return msg.includes('relation "group_messages" does not exist') || msg.includes('group_messages does not exist');
}

function isStrictGroupMessagesGetEnabled(): boolean {
  const configuredValue = process.env[STRICT_GROUP_MESSAGES_GET_ENV];
  if (configuredValue === 'true') return true;
  if (configuredValue === 'false') return false;

  // Default to fail-closed in production when override is not configured.
  return process.env.NODE_ENV === 'production';
}

function emitGroupPayloadTamperEvent(params: {
  groupId: number;
  requester: string;
  fetchedRows: number;
  droppedUnauthenticated: number;
  strictMode: boolean;
  blocked: boolean;
  requestId: string;
  ipHash: string;
  ipSource: string;
}): void {
  logger.warn('security.group_payload_tamper_detected', {
    ...params,
    securityEvent: 'group_payload_tamper_detected',
  });
}

/**
 * GET /api/groups/messages?groupId=123&limit=50&offset=0
 * Return encrypted group messages for a group if the requester is a member.
 */
export async function GET(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'read');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const authAddress = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';
  if (!authAddress || !isAddress(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const correlationContext = getRequestCorrelationContext(request.headers);
    const searchParams = request.nextUrl.searchParams;
    const groupIdRaw = searchParams.get('groupId');
    const parsedLimit = parseStrictIntegerParam(searchParams.get('limit'));
    const parsedOffset = parseStrictIntegerParam(searchParams.get('offset'));

    if (!groupIdRaw || !/^\d+$/.test(groupIdRaw.trim())) {
      return NextResponse.json({ error: 'Invalid groupId format' }, { status: 400 });
    }

    if (
      (searchParams.get('limit') !== null && parsedLimit === null) ||
      (searchParams.get('offset') !== null && parsedOffset === null)
    ) {
      return NextResponse.json({ error: 'Invalid limit or offset parameter' }, { status: 400 });
    }

    const groupId = Number.parseInt(groupIdRaw.trim(), 10);
    const limit = Math.min(Math.max(parsedLimit ?? 50, 0), MAX_GROUP_MESSAGES_LIMIT);
    const offset = Math.min(Math.max(parsedOffset ?? 0, 0), MAX_GROUP_MESSAGES_OFFSET);

    const membershipResult = await query<{ role: string }>(
      `SELECT gm.role
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = $1 AND u.wallet_address = $2`,
      [groupId, authAddress]
    );

    if (membershipResult.rows.length === 0) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    const messagesResult = await query<GroupMessageRow>(
      `SELECT
         gm.*,
         u.wallet_address as sender_address,
         u.username as sender_username,
         u.avatar_url as sender_avatar
       FROM group_messages gm
       JOIN users u ON gm.sender_id = u.id
       WHERE gm.group_id = $1
       ORDER BY gm.created_at DESC
       LIMIT $2 OFFSET $3`,
      [groupId, limit, offset]
    );

    const authenticatedMessages: GroupMessageResponseRow[] = [];
    for (const row of messagesResult.rows) {
      const senderAddress = typeof row.sender_address === 'string'
        ? row.sender_address.trim().toLowerCase()
        : '';

      if (!senderAddress || !isAddress(senderAddress)) {
        continue;
      }

      const parsedPayload = parseEncryptedGroupMessagePayload(row.content, groupId);
      if (!parsedPayload) {
        continue;
      }

      const signedPayloadMessage = buildGroupPayloadSignatureMessage(parsedPayload);
      const isValidSignature = await verifyMessage({
        address: senderAddress as `0x${string}`,
        message: signedPayloadMessage,
        signature: parsedPayload.groupSig as `0x${string}`,
      });

      if (!isValidSignature) {
        continue;
      }

      authenticatedMessages.push({
        ...row,
        signature_valid: true,
      });
    }

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM group_messages WHERE group_id = $1`,
      [groupId]
    );

    const total = Number.parseInt(countResult.rows[0]?.count || '0', 10);

    const droppedUnauthenticated = messagesResult.rows.length - authenticatedMessages.length;
    const strictMode = isStrictGroupMessagesGetEnabled();
    if (droppedUnauthenticated > 0) {
      emitGroupPayloadTamperEvent({
        groupId,
        requester: authAddress,
        fetchedRows: messagesResult.rows.length,
        droppedUnauthenticated,
        strictMode,
        blocked: strictMode,
        requestId: correlationContext.requestId,
        ipHash: correlationContext.ipHash,
        ipSource: correlationContext.ipSource,
      });
    }

    if (droppedUnauthenticated > 0 && strictMode) {
      return NextResponse.json(
        {
          error: 'Unauthenticated group payloads detected; strict mode blocks this response',
          droppedUnauthenticated,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      messages: authenticatedMessages,
      droppedUnauthenticated,
      total: Number.isNaN(total) ? 0 : total,
      limit,
      offset,
    });
  } catch (error) {
    if (isMissingGroupMessagesTable(error)) {
      return NextResponse.json(
        { error: 'Group messaging schema is not initialized. Run database setup before using this endpoint.' },
        { status: 503 }
      );
    }

    logger.error('[Group Messages GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch group messages' }, { status: 500 });
  }
}

/**
 * POST /api/groups/messages
 * Persist an encrypted group message if requester belongs to the group.
 */
export async function POST(request: NextRequest) {
  const rateLimit = await withRateLimit(request, 'write');
  if (rateLimit) return rateLimit;

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const authAddress = typeof authResult.user?.address === 'string'
    ? authResult.user.address.trim().toLowerCase()
    : '';
  if (!authAddress || !isAddress(authAddress)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const validation = await validateBody(request, sendGroupMessageSchema);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      );
    }

    const { groupId, content } = validation.data;

    const parsedPayload = parseEncryptedGroupMessagePayload(content, groupId);
    if (!parsedPayload) {
      return NextResponse.json(
        { error: 'Group message content must be a valid encrypted group payload for this group and timestamp window' },
        { status: 400 }
      );
    }

    const signedPayloadMessage = buildGroupPayloadSignatureMessage(parsedPayload);
    const isValidGroupSig = await verifyMessage({
      address: authAddress as `0x${string}`,
      message: signedPayloadMessage,
      signature: parsedPayload.groupSig as `0x${string}`,
    });

    if (!isValidGroupSig) {
      return NextResponse.json(
        { error: 'Invalid authenticated group payload signature' },
        { status: 400 }
      );
    }

    const senderResult = await query<{ id: number }>(
      'SELECT id FROM users WHERE wallet_address = $1',
      [authAddress]
    );

    if (senderResult.rows.length === 0 || !senderResult.rows[0]?.id) {
      return NextResponse.json({ error: 'Sender not found' }, { status: 404 });
    }

    const senderId = senderResult.rows[0].id;

    const membershipResult = await query<{ role: string }>(
      `SELECT gm.role
       FROM group_members gm
       WHERE gm.group_id = $1 AND gm.user_id = $2`,
      [groupId, senderId]
    );

    if (membershipResult.rows.length === 0) {
      return NextResponse.json({ error: 'You are not a member of this group' }, { status: 403 });
    }

    const recentSendCountResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM group_messages
       WHERE group_id = $1
         AND sender_id = $2
         AND created_at > NOW() - INTERVAL '1 minute'`,
      [groupId, senderId]
    );

    const recentSendCount = Number.parseInt(recentSendCountResult.rows[0]?.count || '0', 10);
    if (!Number.isNaN(recentSendCount) && recentSendCount >= MAX_GROUP_MESSAGES_PER_MINUTE_PER_SENDER) {
      return NextResponse.json(
        { error: 'Group message rate limit exceeded for this sender' },
        { status: 429 }
      );
    }

    const replayResult = await query<{ id: number }>(
      `SELECT id
       FROM group_messages
       WHERE group_id = $1
         AND sender_id = $2
         AND content = $3
         AND created_at > NOW() - INTERVAL '10 minutes'
       LIMIT 1`,
      [groupId, senderId, content]
    );

    if (replayResult.rows.length > 0) {
      return NextResponse.json(
        { error: 'Duplicate encrypted payload replay detected' },
        { status: 409 }
      );
    }

    const insertResult = await query<GroupMessageRow>(
      `INSERT INTO group_messages (group_id, sender_id, content, is_encrypted, is_deleted)
       VALUES ($1, $2, $3, true, false)
       RETURNING *`,
      [groupId, senderId, content]
    );

    return NextResponse.json({
      success: true,
      message: insertResult.rows[0],
    }, { status: 201 });
  } catch (error) {
    if (isMissingGroupMessagesTable(error)) {
      return NextResponse.json(
        { error: 'Group messaging schema is not initialized. Run database setup before using this endpoint.' },
        { status: 503 }
      );
    }

    logger.error('[Group Messages POST] Error:', error);
    return NextResponse.json({ error: 'Failed to send group message' }, { status: 500 });
  }
}
