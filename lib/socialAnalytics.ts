'use client';

/**
 * Simple analytics utility for tracking user interactions
 * Helps understand feature adoption and user flows
 */

import { buildCsrfHeaders } from '@/lib/security/csrfClient';

type EventType = 
  | 'wallet_connected'
  | 'vault_created'
  | 'payment_attempt_no_vault'
  | 'vault_info_viewed'
  | 'create_vault_clicked'
  | 'first_message_sent'
  | 'friend_added'
  | 'group_created';

interface EventData {
  userAddress?: string;
  hasVault?: boolean;
  feature?: string;
  metadata?: Record<string, unknown>;
}

class SocialAnalytics {
  private enabled: boolean;
  private events: Array<{ type: EventType; data: EventData; timestamp: number }> = [];

  constructor() {
    this.enabled = typeof window !== 'undefined' && process.env.NODE_ENV === 'production';
  }

  /**
   * Track a user interaction event
   */
  track(event: EventType, data: EventData = {}) {
    if (!this.enabled) {
      console.log('[Analytics]', event, data);
      return;
    }

    const eventRecord = {
      type: event,
      data,
      timestamp: Date.now(),
    };

    // Store in memory
    this.events.push(eventRecord);

    // Keep only last 100 events
    if (this.events.length > 100) {
      this.events.shift();
    }

    // Send to backend analytics endpoint
    this.sendToAnalytics(eventRecord);

    // Store locally for recent debugging context
    this.storeLocally(eventRecord);
  }

  /**
   * Store event locally for debugging
   */
  private storeLocally(event: typeof this.events[0]) {
    try {
      const stored = localStorage.getItem('vfide_analytics_events');
      const events = stored ? JSON.parse(stored) : [];
      events.push(event);

      // Keep only last 50 events
      if (events.length > 50) {
        events.splice(0, events.length - 50);
      }

      localStorage.setItem('vfide_analytics_events', JSON.stringify(events));
    } catch (error) {
      console.error('Failed to store analytics event:', error);
    }
  }

  private async sendToAnalytics(event: typeof this.events[0]) {
    try {
      const headers = await buildCsrfHeaders({ 'Content-Type': 'application/json' }, 'POST');
      await fetch('/api/analytics', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          userId: event.data.userAddress,
          eventType: event.type,
          eventData: {
            ...event.data,
            timestamp: event.timestamp,
          },
        }),
      });
    } catch (error) {
      console.error('Failed to store analytics event:', error);
    }
  }

  /**
   * Get analytics summary
   */
  getSummary() {
    const eventCounts: Record<string, number> = {};
    
    this.events.forEach(event => {
      eventCounts[event.type] = (eventCounts[event.type] || 0) + 1;
    });

    return {
      totalEvents: this.events.length,
      eventCounts,
      recentEvents: this.events.slice(-10),
    };
  }

  /**
   * Track vault creation funnel
   */
  trackVaultFunnel(step: 'viewed_prompt' | 'clicked_create' | 'completed') {
    const funnelData = {
      step,
      timestamp: Date.now(),
    };

    this.track('create_vault_clicked', { metadata: funnelData });
  }

  /**
   * Track feature usage by vault status
   */
  trackFeatureUsage(feature: string, hasVault: boolean) {
    this.track('payment_attempt_no_vault', {
      feature,
      hasVault,
      metadata: { attemptedAt: Date.now() },
    });
  }
}

// Export singleton instance
export const analytics = new SocialAnalytics();

/**
 * React hook for tracking events
 */
export function useAnalytics() {
  return {
    track: analytics.track.bind(analytics),
    trackVaultFunnel: analytics.trackVaultFunnel.bind(analytics),
    trackFeatureUsage: analytics.trackFeatureUsage.bind(analytics),
    getSummary: analytics.getSummary.bind(analytics),
  };
}
