/**
 * VFIDE Event Catalog (Wave 47 — Unified Ecosystem Architecture).
 *
 * One vocabulary for every meaningful action in the ecosystem.
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
  // Governance granularity (Wave 52)
  | 'PROPOSAL_EXECUTED';

/** The layers (subscribers) that may care about an event. */
export type EcosystemLayer =
  | InstitutionId
  | 'protection'
  | 'preparedness'
  | 'analytics'
  | 'nexus'
  | 'timeline'
  | 'notifications';

export interface VfideEvent {
  type: VfideEventType;
  at: number;
  payload?: Record<string, unknown>;
  source?: string;
}

export interface EventRoute {
  layers: EcosystemLayer[];
  nexusNode?: 'ownership' | 'trust' | 'commerce' | 'continuity' | 'governance' | 'knowledge' | 'protection';
  timeline: string;
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
  RISK_WARNING_DISPLAYED: { layers: ['trust', 'timeline'], timeline: 'You were warned before a risky action', notify: false },
  PROTECTIVE_CONFIRMATION_ACCEPTED: { layers: ['trust', 'timeline'], timeline: 'You confirmed a risky action after a warning', notify: false },
  SUCCESSOR_CHANGED: { layers: ['continuity', 'preparedness', 'trust', 'nexus', 'timeline', 'notifications'], nexusNode: 'continuity', timeline: 'You changed who takes over', notify: true },
  RECOVERY_UPDATED: { layers: ['continuity', 'protection', 'preparedness', 'nexus', 'timeline', 'notifications'], nexusNode: 'protection', timeline: 'You updated your recovery settings', notify: true },
  OWNERSHIP_TRANSFER_INITIATED: { layers: ['ownership', 'continuity', 'commerce', 'nexus', 'timeline', 'notifications'], nexusNode: 'continuity', timeline: 'An ownership transfer was started', notify: true },
  DISPUTE_OPENED: { layers: ['commerce', 'trust', 'timeline', 'notifications'], nexusNode: 'commerce', timeline: 'A dispute was opened', notify: true },
  DISPUTE_RESOLVED: { layers: ['commerce', 'trust', 'timeline', 'notifications'], nexusNode: 'trust', timeline: 'A dispute was resolved', notify: true },
  SHIPMENT_VERIFIED: { layers: ['commerce', 'trust', 'timeline'], nexusNode: 'commerce', timeline: 'A delivery was verified', notify: false },
  PROPOSAL_EXECUTED: { layers: ['stewardship', 'trust', 'nexus', 'timeline', 'notifications'], nexusNode: 'governance', timeline: 'A governance proposal was executed', notify: true },
};

export const serverEmitContract = {
  note: 'API routes should persist these same VfideEventType values after a successful write so coordination survives refresh and reaches other devices.',
} as const;
