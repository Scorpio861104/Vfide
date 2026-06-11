/**
 * Tiny typed event bus for VFIDE ecosystem signals.
 *
 * Synchronous and SSR-safe: no window/document usage.
 */

import type { VfideEvent, VfideEventType } from './eventTypes';

type Listener = (event: VfideEvent) => void;

class EventBus {
  private listeners = new Set<Listener>();
  private recent: VfideEvent[] = [];

  emit(type: VfideEventType, payload?: Record<string, unknown>, source?: string): void {
    const event: VfideEvent = {
      type,
      payload: payload ?? {},
      source,
      at: Date.now(),
    };

    this.recent = [event, ...this.recent].slice(0, 100);

    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Listener failures are isolated so one bad subscriber does not break others.
      }
    }
  }

  onAny(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getRecent(): VfideEvent[] {
    return this.recent;
  }
}

export const eventBus = new EventBus();
