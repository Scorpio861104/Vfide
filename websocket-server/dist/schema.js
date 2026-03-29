"use strict";
/**
 * Zod schemas for inbound and outbound WebSocket messages.
 *
 * Every inbound message from a client is validated against InboundMessageSchema
 * before being processed. Unknown types and extra fields are stripped by Zod
 * to prevent prototype pollution and unexpected state mutations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InboundMessageSchema = exports.CURRENT_PROTOCOL_VERSION = void 0;
exports.parseMessage = parseMessage;
const zod4_1 = require("zod4");
exports.CURRENT_PROTOCOL_VERSION = 1;
// ─── Topic names ────────────────────────────────────────────────────────────
const TopicSchema = zod4_1.z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Topic must contain only alphanumeric characters, dots, dashes, or underscores');
// ─── Inbound message schemas ────────────────────────────────────────────────
const PingSchema = zod4_1.z.object({
    v: zod4_1.z.literal(exports.CURRENT_PROTOCOL_VERSION).optional(),
    type: zod4_1.z.literal('ping'),
    payload: zod4_1.z.object({}).optional(),
});
const SubscribeSchema = zod4_1.z.object({
    v: zod4_1.z.literal(exports.CURRENT_PROTOCOL_VERSION).optional(),
    type: zod4_1.z.literal('subscribe'),
    payload: zod4_1.z.object({
        topic: TopicSchema,
    }),
});
const UnsubscribeSchema = zod4_1.z.object({
    v: zod4_1.z.literal(exports.CURRENT_PROTOCOL_VERSION).optional(),
    type: zod4_1.z.literal('unsubscribe'),
    payload: zod4_1.z.object({
        topic: TopicSchema,
    }),
});
const MessageSchema = zod4_1.z.object({
    v: zod4_1.z.literal(exports.CURRENT_PROTOCOL_VERSION).optional(),
    type: zod4_1.z.literal('message'),
    payload: zod4_1.z.record(zod4_1.z.string(), zod4_1.z.unknown()).or(zod4_1.z.string()),
});
const AuthSchema = zod4_1.z.object({
    v: zod4_1.z.literal(exports.CURRENT_PROTOCOL_VERSION).optional(),
    type: zod4_1.z.literal('auth'),
    payload: zod4_1.z.object({
        token: zod4_1.z.string().min(10).max(4096),
    }),
});
exports.InboundMessageSchema = zod4_1.z.discriminatedUnion('type', [
    AuthSchema,
    PingSchema,
    SubscribeSchema,
    UnsubscribeSchema,
    MessageSchema,
]);
/**
 * Parse and validate an unknown value against InboundMessageSchema.
 *
 * Returns a SafeParseReturnType so the caller can handle errors without
 * try/catch — consistent with Zod's safe-parse pattern.
 */
function parseMessage(raw) {
    return exports.InboundMessageSchema.safeParse(raw);
}
