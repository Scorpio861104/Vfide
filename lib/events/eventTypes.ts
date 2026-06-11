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
