/**
 * Zod schemas for inbound and outbound WebSocket messages.
 *
 * Every inbound message from a client is validated against InboundMessageSchema
 * before being processed. Unknown types and extra fields are stripped by Zod
 * to prevent prototype pollution and unexpected state mutations.
 */

import { z } from 'zod';

// ─── Topic names ────────────────────────────────────────────────────────────

const TopicSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9._-]+$/, 'Topic must contain only alphanumeric characters, dots, dashes, or underscores');

// ─── Inbound message schemas ────────────────────────────────────────────────

const PingSchema = z.object({
  type: z.literal('ping'),
  payload: z.object({}).optional(),
});

const SubscribeSchema = z.object({
  type: z.literal('subscribe'),
  payload: z.object({
    topic: TopicSchema,
  }),
});

const UnsubscribeSchema = z.object({
  type: z.literal('unsubscribe'),
  payload: z.object({
    topic: TopicSchema,
  }),
});

export const InboundMessageSchema = z.discriminatedUnion('type', [
  PingSchema,
  SubscribeSchema,
  UnsubscribeSchema,
]);

export type InboundMessage = z.infer<typeof InboundMessageSchema>;

/**
 * Parse and validate an unknown value against InboundMessageSchema.
 *
 * Returns a SafeParseReturnType so the caller can handle errors without
 * try/catch — consistent with Zod's safe-parse pattern.
 */
export function parseMessage(
  raw: unknown,
): z.SafeParseReturnType<unknown, InboundMessage> {
  return InboundMessageSchema.safeParse(raw);
}

// ─── Outbound message types ─────────────────────────────────────────────────

export interface OutboundMessage {
  type: string;
  payload: Record<string, unknown>;
}
