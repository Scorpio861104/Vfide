/**
 * Zod schemas for inbound and outbound WebSocket messages.
 *
 * Every inbound message from a client is validated against InboundMessageSchema
 * before being processed. Unknown types and extra fields are stripped by Zod
 * to prevent prototype pollution and unexpected state mutations.
 */

import { z } from 'zod4';

export const CURRENT_PROTOCOL_VERSION = 1 as const;

// ─── Topic names ────────────────────────────────────────────────────────────

const TopicSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9._-]+$/, 'Topic must contain only alphanumeric characters, dots, dashes, or underscores');

// ─── Inbound message schemas ────────────────────────────────────────────────

const PingSchema = z.object({
  v: z.literal(CURRENT_PROTOCOL_VERSION).optional(),
  type: z.literal('ping'),
  payload: z.object({}).optional(),
});

const SubscribeSchema = z.object({
  v: z.literal(CURRENT_PROTOCOL_VERSION).optional(),
  type: z.literal('subscribe'),
  payload: z.object({
    topic: TopicSchema,
  }),
});

const UnsubscribeSchema = z.object({
  v: z.literal(CURRENT_PROTOCOL_VERSION).optional(),
  type: z.literal('unsubscribe'),
  payload: z.object({
    topic: TopicSchema,
  }),
});

const JsonValueSchema: z.ZodType<unknown> = z.lazy(() =>
  z.union([
    z.string().max(4096),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema).max(64),
    z
      .record(z.string().max(128), JsonValueSchema)
      .refine((obj) => Object.keys(obj).length <= 64, 'Object exceeds maximum key count of 64'),
  ])
);

const AuthSchema = z.object({
  v: z.literal(CURRENT_PROTOCOL_VERSION).optional(),
  type: z.literal('auth'),
  payload: z.object({
    token: z.string().min(10).max(4096),
  }),
});

export const InboundMessageSchema = z.discriminatedUnion('type', [
  AuthSchema,
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
): ReturnType<typeof InboundMessageSchema.safeParse> {
  return InboundMessageSchema.safeParse(raw);
}

// ─── Outbound message types ─────────────────────────────────────────────────

export interface OutboundMessage {
  type: string;
  payload: Record<string, unknown>;
}
