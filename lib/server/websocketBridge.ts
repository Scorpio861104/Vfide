import { logger } from '@/lib/logger';

type OutboundPayload = Record<string, unknown>;

export interface WebsocketBridgeMessage {
  type: string;
  payload: OutboundPayload;
}

function toHttpBase(url: string): string {
  if (url.startsWith('wss://')) return `https://${url.slice('wss://'.length)}`;
  if (url.startsWith('ws://')) return `http://${url.slice('ws://'.length)}`;
  return url;
}

function resolveEventBridgeUrl(): string | null {
  const explicit = process.env.WS_EVENT_BRIDGE_URL?.trim();
  if (explicit) return explicit;

  const wsPublic = process.env.NEXT_PUBLIC_WS_URL?.trim();
  if (!wsPublic) return null;

  const base = toHttpBase(wsPublic).replace(/\/$/, '');
  return `${base}/event`;
}

export async function publishWebsocketEvent(message: WebsocketBridgeMessage): Promise<boolean> {
  const endpoint = resolveEventBridgeUrl();
  const secret = process.env.WS_INTERNAL_SECRET?.trim();

  if (!endpoint || !secret) {
    return false;
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify(message),
      cache: 'no-store',
    });

    if (!res.ok) {
      logger.warn('[ws-bridge] Event publish failed', {
        status: res.status,
        statusText: res.statusText,
        type: message.type,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.warn('[ws-bridge] Event publish threw', {
      type: message.type,
      error: error instanceof Error ? error.message : 'unknown-error',
    });
    return false;
  }
}
