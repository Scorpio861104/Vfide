/**
 * VFIDE Event Catalog (Wave 47 — Unified Ecosystem Architecture).
 *
 * One vocabulary for every meaningful action in the ecosystem. A feature announces what happened by
 * emitting one of these events; any layer can subscribe and react. This is the foundation that lets
 * tools coordinate instead of standing alone.
 *
 * SCOPE / HONESTY: this catalog + the bus + subscribers are the CLIENT-SIDE coordination layer. They
 * give real, immediate in-session coordination (the Nexus reacts, the activity timeline records, a
 * notification fires) the moment an action happens. For DURABLE, cross-device coordination the
 * matching event must also be emitted server-side from the relevant API route and persisted — see
 * `serverEmitContract` below. Client emission never replaces the server as source of truth; it
 * coordinates the live UI and announces intent.
 */

import type { InstitutionId } from '@/lib/civilization/model';

/** Every meaningful ecosystem action. */
export type VfideEventType =
  // Identity / ownership
  | 'USER_REGISTERED'
  | 'WALLET_CREATED'
  | 'VAULT_PROTECTED'
  | 'VAULT_RECOVERED'
  // Commerce
  | 'STORE_CREATED'
  | 'MERCHANT_ACTIVATED'
  | 'MERCHANT_VERIFIED'
  | 'PRODUCT_CREATED'
  | 'PRODUCT_PUBLISHED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_SENT'
  | 'INVOICE_CREATED'
  | 'INVOICE_PAID'
  | 'SUBSCRIPTION_STARTED'
  | 'SUBSCRIPTION_CANCELLED'
  | 'BOOKING_CREATED'
  | 'BOOKING_COMPLETED'
  | 'ORDER_CREATED'
  | 'ORDER_COMPLETED'
  | 'CUSTOMER_CREATED'
  | 'LOYALTY_REWARD_ISSUED'
  // Trust
  | 'TRUST_VERIFICATION_COMPLETED'
  | 'CONTACT_VERIFIED'
  | 'GOVERNANCE_PARTICIPATED'
  // Continuity / protection / preparedness
  | 'RECOVERY_CONFIGURED'
  | 'RECOVERY_COMPLETED'
  | 'GUARDIAN_ASSIGNED'
  | 'GUARDIAN_REMOVED'
  | 'SUCCESSOR_ASSIGNED'
  | 'CONTINUITY_PLAN_CREATED'
  | 'EMERGENCY_OPERATOR_ASSIGNED'
  | 'MERCHANT_SUCCESSION_CONFIGURED'
  | 'BUSINESS_TRANSFER_INITIATED'
  // Knowledge
  | 'COURSE_COMPLETED'
  // Safety & risk (Wave 51)
  | 'RISK_WARNING_DISPLAYED'
  | 'PROTECTIVE_CONFIRMATION_ACCEPTED'
  | 'SUCCESSOR_CHANGED'
  | 'RECOVERY_UPDATED'
  | 'OWNERSHIP_TRANSFER_INITIATED'
  | 'DISPUTE_OPENED'
  | 'DISPUTE_RESOLVED'
  | 'SHIPMENT_VERIFIED'
  // Professional Services (Commerce Operations Phase 1)
  | 'ENGAGEMENT_PROPOSED'
  | 'ENGAGEMENT_ACCEPTED'
  | 'MILESTONE_FUNDED'
  | 'MILESTONE_SUBMITTED'
  | 'MILESTONE_ACCEPTED'
  | 'MILESTONE_AUTO_ACCEPTED'
  | 'MILESTONE_REJECTED'
  | 'MILESTONE_RELEASED'
  // Governance granularity (Wave 52)
  | 'PROPOSAL_EXECUTED';

/** The layers (subscribers) that may care about an event. Mapped to the civilization model. */
export type EcosystemLayer =
  | InstitutionId // ownership | trust | commerce | opportunity | continuity | capability | stewardship
  | 'protection'
  | 'preparedness'
  | 'analytics'
  | 'nexus'
  | 'timeline'
  | 'notifications';

export interface VfideEvent {
  type: VfideEventType;
  /** When it happened (client clock; server events carry their own). */
  at: number;
  /** Optional structured detail — kept loose; subscribers read what they need. */
  payload?: Record<string, unknown>;
  /** Who emitted it (for debugging / provenance). */
  source?: string;
}

/**
 * Declarative map: for each event, which layers should know, which Nexus node it touches, and a
 * plain-language line for the activity timeline / notifications. This is the "what systems should
 * know?" answer from the integration audit, encoded so it can't drift from the code.
 */
export interface EventRoute {
  /** Layers that should react. */
  layers: EcosystemLayer[];
  /** The Nexus node this strengthens/activates, if any. */
  nexusNode?: 'ownership' | 'trust' | 'commerce' | 'continuity' | 'governance' | 'knowledge' | 'protection';
  /** Plain, human past-tense line for the timeline (grandmother-readable). */
  timeline: string;
  /** Whether this should also surface as a notification by default. */
  notify?: boolean;
}

export const EVENT_ROUTES: Record<VfideEventType, EventRoute> = {
  USER_REGISTERED: { layers: ['ownership', 'timeline'], nexusNode: 'ownership', timeline: 'You joined VFIDE', notify: false },
  WALLET_CREATED: { layers: ['ownership', 'nexus', 'timeline'], nexusNode: 'ownership', timeline: 'Your wallet was created', notify: true },
  VAULT_PROTECTED: { layers: ['ownership', 'protection', 'nexus', 'timeline', 'notifications'], nexusNode: 'protection', timeline: 'You protected your vault', notify: true },
  VAULT_RECOVERED: { layers: ['ownership', 'protection', 'continuity', 'nexus', 'timeline', 'notifications'], nexusNode: 'protection', timeline: 'You recovered access to your vault', notify: true },

  STORE_CREATED: { layers: ['commerce', 'trust', 'nexus', 'timeline', 'notifications'], nexusNode: 'commerce', timeline: 'You opened your store', notify: true },
  MERCHANT_ACTIVATED: { layers: ['commerce', 'trust', 'nexus', 'timeline', 'notifications'], nexusNode: 'commerce', timeline: 'Your store is active', notify: true },
  MERCHANT_VERIFIED: { layers: ['commerce', 'trust', 'nexus', 'timeline', 'notifications'], nexusNode: 'trust', timeline: 'Your store was verified', notify: true },
  PRODUCT_CREATED: { layers: ['commerce', 'timeline'], nexusNode: 'commerce', timeline: 'You added a product', notify: false },
  PRODUCT_PUBLISHED: { layers: ['commerce', 'trust', 'timeline'], nexusNode: 'commerce', timeline: 'You published a product', notify: false },
  PAYMENT_RECEIVED: { layers: ['commerce', 'trust', 'analytics', 'nexus', 'timeline', 'notifications'], nexusNode: 'commerce', timeline: 'You received a payment', notify: true },
  PAYMENT_SENT: { layers: ['commerce', 'analytics', 'timeline'], nexusNode: 'commerce', timeline: 'You sent a payment', notify: false },
  INVOICE_CREATED: { layers: ['commerce', 'timeline'], nexusNode: 'commerce', timeline: 'You created an invoice', notify: false },
  INVOICE_PAID: { layers: ['commerce', 'trust', 'analytics', 'nexus', 'timeline', 'notifications'], nexusNode: 'commerce', timeline: 'An invoice was paid', notify: true },
  SUBSCRIPTION_STARTED: { layers: ['commerce', 'analytics', 'timeline'], nexusNode: 'commerce', timeline: 'A subscription started', notify: true },
  SUBSCRIPTION_CANCELLED: { layers: ['commerce', 'analytics', 'timeline'], nexusNode: 'commerce', timeline: 'A subscription was cancelled', notify: false },
  BOOKING_COMPLETED: { layers: ['commerce', 'analytics', 'timeline'], nexusNode: 'commerce', timeline: 'A booking was completed', notify: false },
  BOOKING_CREATED: { layers: ['commerce', 'timeline'], nexusNode: 'commerce', timeline: 'A booking was made', notify: false },
  ORDER_CREATED: { layers: ['commerce', 'timeline'], nexusNode: 'commerce', timeline: 'A new order came in', notify: true },
  ORDER_COMPLETED: { layers: ['commerce', 'trust', 'analytics', 'timeline'], nexusNode: 'commerce', timeline: 'You completed an order', notify: false },
  CUSTOMER_CREATED: { layers: ['commerce', 'timeline'], nexusNode: 'commerce', timeline: 'A new customer was added', notify: false },
  LOYALTY_REWARD_ISSUED: { layers: ['commerce', 'timeline'], nexusNode: 'commerce', timeline: 'You issued a loyalty reward', notify: false },

  TRUST_VERIFICATION_COMPLETED: { layers: ['trust', 'nexus', 'timeline', 'notifications'], nexusNode: 'trust', timeline: 'A verification was completed', notify: true },
  CONTACT_VERIFIED: { layers: ['trust', 'continuity', 'protection', 'nexus', 'timeline'], nexusNode: 'trust', timeline: 'A trusted contact was verified', notify: true },
  GOVERNANCE_PARTICIPATED: { layers: ['stewardship', 'trust', 'nexus', 'timeline', 'notifications'], nexusNode: 'governance', timeline: 'You took part in governance', notify: true },

  RECOVERY_CONFIGURED: { layers: ['continuity', 'protection', 'preparedness', 'nexus', 'timeline', 'notifications'], nexusNode: 'protection', timeline: 'You set up account recovery', notify: true },
  RECOVERY_COMPLETED: { layers: ['continuity', 'protection', 'nexus', 'timeline', 'notifications'], nexusNode: 'protection', timeline: 'Account recovery completed', notify: true },
  GUARDIAN_ASSIGNED: { layers: ['continuity', 'protection', 'preparedness', 'trust', 'nexus', 'timeline', 'notifications'], nexusNode: 'protection', timeline: 'You added a trusted person', notify: true },
  GUARDIAN_REMOVED: { layers: ['continuity', 'protection', 'preparedness', 'nexus', 'timeline', 'notifications'], nexusNode: 'protection', timeline: 'You removed a trusted person', notify: true },
  SUCCESSOR_ASSIGNED: { layers: ['continuity', 'preparedness', 'nexus', 'timeline', 'notifications'], nexusNode: 'continuity', timeline: 'You chose who takes over', notify: true },
  CONTINUITY_PLAN_CREATED: { layers: ['continuity', 'preparedness', 'nexus', 'timeline', 'notifications'], nexusNode: 'continuity', timeline: 'You created a continuity plan', notify: true },
  EMERGENCY_OPERATOR_ASSIGNED: { layers: ['continuity', 'protection', 'preparedness', 'nexus', 'timeline', 'notifications'], nexusNode: 'protection', timeline: 'You assigned an emergency operator', notify: true },
  MERCHANT_SUCCESSION_CONFIGURED: { layers: ['continuity', 'commerce', 'preparedness', 'nexus', 'timeline', 'notifications'], nexusNode: 'continuity', timeline: 'You set up business succession', notify: true },
  BUSINESS_TRANSFER_INITIATED: { layers: ['continuity', 'commerce', 'nexus', 'timeline', 'notifications'], nexusNode: 'continuity', timeline: 'A business transfer was started', notify: true },

  COURSE_COMPLETED: { layers: ['capability', 'trust', 'nexus', 'timeline'], nexusNode: 'knowledge', timeline: 'You completed a lesson', notify: false },

  // Safety & risk (Wave 51). Some (DISPUTE_*, SHIPMENT_VERIFIED) are defined ahead of their features
  // — the catalog reserves the vocabulary; they are NOT emitted until a real dispute/shipping backend
  // exists. The rest have real triggers wired this wave.
  RISK_WARNING_DISPLAYED: { layers: ['trust', 'timeline'], timeline: 'You were warned before a risky action', notify: false },
  PROTECTIVE_CONFIRMATION_ACCEPTED: { layers: ['trust', 'timeline'], timeline: 'You confirmed a risky action after a warning', notify: false },
  SUCCESSOR_CHANGED: { layers: ['continuity', 'preparedness', 'trust', 'nexus', 'timeline', 'notifications'], nexusNode: 'continuity', timeline: 'You changed who takes over', notify: true },
  RECOVERY_UPDATED: { layers: ['continuity', 'protection', 'preparedness', 'nexus', 'timeline', 'notifications'], nexusNode: 'protection', timeline: 'You updated your recovery settings', notify: true },
  OWNERSHIP_TRANSFER_INITIATED: { layers: ['ownership', 'continuity', 'commerce', 'nexus', 'timeline', 'notifications'], nexusNode: 'continuity', timeline: 'An ownership transfer was started', notify: true },
  DISPUTE_OPENED: { layers: ['commerce', 'trust', 'timeline', 'notifications'], nexusNode: 'commerce', timeline: 'A dispute was opened', notify: true },
  DISPUTE_RESOLVED: { layers: ['commerce', 'trust', 'timeline', 'notifications'], nexusNode: 'trust', timeline: 'A dispute was resolved', notify: true },
  SHIPMENT_VERIFIED: { layers: ['commerce', 'trust', 'timeline'], nexusNode: 'commerce', timeline: 'A delivery was verified', notify: false },
  ENGAGEMENT_PROPOSED: { layers: ['commerce', 'timeline', 'notifications'], nexusNode: 'commerce', timeline: 'You were sent an engagement proposal', notify: true },
  ENGAGEMENT_ACCEPTED: { layers: ['commerce', 'trust', 'timeline', 'notifications'], nexusNode: 'commerce', timeline: 'An engagement was accepted', notify: true },
  MILESTONE_FUNDED: { layers: ['commerce', 'timeline', 'notifications'], nexusNode: 'commerce', timeline: 'A milestone was funded', notify: true },
  MILESTONE_SUBMITTED: { layers: ['commerce', 'timeline', 'notifications'], nexusNode: 'commerce', timeline: 'A deliverable was submitted for review', notify: true },
  MILESTONE_ACCEPTED: { layers: ['commerce', 'trust', 'timeline', 'notifications'], nexusNode: 'commerce', timeline: 'A milestone was accepted', notify: true },
  MILESTONE_AUTO_ACCEPTED: { layers: ['commerce', 'trust', 'timeline', 'notifications'], nexusNode: 'commerce', timeline: 'A milestone was auto-accepted after the review window', notify: true },
  MILESTONE_REJECTED: { layers: ['commerce', 'timeline', 'notifications'], nexusNode: 'commerce', timeline: 'A milestone was rejected and disputed', notify: true },
  MILESTONE_RELEASED: { layers: ['commerce', 'trust', 'timeline', 'notifications'], nexusNode: 'commerce', timeline: 'A milestone payment was released', notify: true },
  PROPOSAL_EXECUTED: { layers: ['stewardship', 'trust', 'nexus', 'timeline', 'notifications'], nexusNode: 'governance', timeline: 'A governance proposal was executed', notify: true },
};

/**
 * The contract for DURABLE coordination (not built here — defines the rollout). For each event that
 * changes server state, the owning API route should, after its write commits, persist an event row
 * (e.g. an `ecosystem_events` table) and the client should reconcile on next fetch. This file is the
 * shared source of truth both sides import, so client and server can never disagree on event names,
 * routes, or timeline copy.
 */
export const serverEmitContract = {
  note: 'API routes should persist these same VfideEventType values after a successful write so coordination survives refresh and reaches other devices. Client emission handles live in-session UX only.',
} as const;
