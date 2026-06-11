/**
 * Shared ecosystem event vocabulary + routing metadata.
 */

export type VfideNode =
  | 'ownership'
  | 'trust'
  | 'commerce'
  | 'continuity'
  | 'governance'
  | 'knowledge'
  | 'protection';

export interface EventRoute {
  layers: string[];
  nexusNode: VfideNode;
  timeline: string;
  notify?: boolean;
}

export interface VfideEvent {
  type: VfideEventType;
  payload: Record<string, unknown>;
  source?: string;
  at: number;
}

export const EVENT_ROUTES = {
  STORE_CREATED: {
    layers: ['commerce', 'trust', 'nexus', 'timeline', 'notifications'],
    nexusNode: 'commerce',
    timeline: 'You opened your store',
    notify: true,
  },
  INVOICE_CREATED: {
    layers: ['commerce', 'nexus', 'timeline', 'notifications'],
    nexusNode: 'commerce',
    timeline: 'You created a payment link',
    notify: true,
  },
  PAYMENT_RECEIVED: {
    layers: ['commerce', 'trust', 'analytics', 'nexus', 'timeline', 'notifications'],
    nexusNode: 'commerce',
    timeline: 'You received a payment',
    notify: true,
  },
  MERCHANT_ACTIVATED: {
    layers: ['commerce', 'trust', 'nexus', 'timeline', 'notifications'],
    nexusNode: 'commerce',
    timeline: 'Your shop is set up',
    notify: true,
  },
  MERCHANT_VERIFIED: {
    layers: ['commerce', 'trust', 'nexus', 'timeline', 'notifications'],
    nexusNode: 'trust',
    timeline: 'Your store was verified',
    notify: true,
  },
  RECOVERY_CONFIGURED: {
    layers: ['continuity', 'protection', 'preparedness', 'nexus', 'timeline', 'notifications'],
    nexusNode: 'protection',
    timeline: 'You set up account recovery',
    notify: true,
  },
  GUARDIAN_ASSIGNED: {
    layers: ['continuity', 'protection', 'preparedness', 'trust', 'nexus', 'timeline', 'notifications'],
    nexusNode: 'protection',
    timeline: 'You added a trusted person',
    notify: true,
  },
  EMERGENCY_OPERATOR_ASSIGNED: {
    layers: ['continuity', 'protection', 'preparedness', 'nexus', 'timeline', 'notifications'],
    nexusNode: 'protection',
    timeline: 'You assigned an emergency operator',
    notify: true,
  },
  MERCHANT_SUCCESSION_CONFIGURED: {
    layers: ['continuity', 'commerce', 'preparedness', 'nexus', 'timeline', 'notifications'],
    nexusNode: 'continuity',
    timeline: 'You set up business succession',
    notify: true,
  },
  SUCCESSOR_CHANGED: {
    layers: ['continuity', 'preparedness', 'trust', 'nexus', 'timeline', 'notifications'],
    nexusNode: 'continuity',
    timeline: 'You changed who takes over',
    notify: true,
  },
  RISK_WARNING_DISPLAYED: {
    layers: ['trust', 'timeline'],
    nexusNode: 'trust',
    timeline: 'You were warned before a risky action',
  },
  RECOVERY_UPDATED: {
    layers: ['continuity', 'protection', 'preparedness', 'nexus', 'timeline', 'notifications'],
    nexusNode: 'protection',
    timeline: 'You updated your recovery settings',
    notify: true,
  },
  OWNERSHIP_TRANSFER_INITIATED: {
    layers: ['ownership', 'continuity', 'commerce', 'nexus', 'timeline', 'notifications'],
    nexusNode: 'continuity',
    timeline: 'An ownership transfer was started',
    notify: true,
  },
  DISPUTE_OPENED: {
    layers: ['commerce', 'trust', 'timeline', 'notifications'],
    nexusNode: 'commerce',
    timeline: 'A dispute was opened',
    notify: true,
  },
  DISPUTE_RESOLVED: {
    layers: ['commerce', 'trust', 'timeline', 'notifications'],
    nexusNode: 'trust',
    timeline: 'A dispute was resolved',
    notify: true,
  },
  SHIPMENT_VERIFIED: {
    layers: ['commerce', 'trust', 'timeline'],
    nexusNode: 'commerce',
    timeline: 'A delivery was verified',
  },
  SUCCESSOR_ASSIGNED: {
    layers: ['continuity', 'preparedness', 'nexus', 'timeline', 'notifications'],
    nexusNode: 'continuity',
    timeline: 'You chose who takes over',
    notify: true,
  },
  GOVERNANCE_PARTICIPATED: {
    layers: ['stewardship', 'trust', 'nexus', 'timeline', 'notifications'],
    nexusNode: 'governance',
    timeline: 'You took part in governance',
    notify: true,
  },
  COURSE_COMPLETED: {
    layers: ['capability', 'trust', 'nexus', 'timeline'],
    nexusNode: 'knowledge',
    timeline: 'You completed a lesson',
  },
} as const satisfies Record<string, EventRoute>;

export type VfideEventType = keyof typeof EVENT_ROUTES;
