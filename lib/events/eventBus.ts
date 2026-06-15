/**
 * VfideEventBus (Wave 47) — a small, typed, synchronous pub/sub.
 *
 * Framework-agnostic and SSR-safe (pure in-memory, no window/global access). The React layer
 * (EventProvider) wraps this; non-React code can use it directly. Subscribers are isolated — a throw
 * in one never stops the others.
 */

import type { VfideEvent, VfideEventType } from './eventTypes';

type Listener = (event: VfideEvent) => void;

class VfideEventBus {
  private listeners = new Map<VfideEventType | '*', Set<Listener>>();
  private recent: VfideEvent[] = [];
  private readonly maxRecent = 100;

  /** Subscribe to one event type. Returns an unsubscribe function. */
  on(type: VfideEventType, listener: Listener): () => void {
    return this.addListener(type, listener);
  }

  /** Subscribe to ALL events. Returns an unsubscribe function. */
  onAny(listener: Listener): () => void {
    return this.addListener('*', listener);
  }

  private addListener(key: VfideEventType | '*', listener: Listener): () => void {
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(listener);
    return () => {
      set?.delete(listener);
    };
  }

  /** Emit an event to all matching subscribers. */
  emit(type: VfideEventType, payload?: Record<string, unknown>, source?: string): VfideEvent {
    const event: VfideEvent = { type, at: Date.now(), payload, source };

    this.recent.push(event);
    if (this.recent.length > this.maxRecent) this.recent.shift();

    const notify = (set?: Set<Listener>) => {
      if (!set) return;
      // Copy to a stable array so unsubscribes during dispatch don't skip listeners.
      for (const l of Array.from(set)) {
        try {
          l(event);
        } catch {
          // A failing subscriber must never break emission or sibling subscribers.
        }
      }
    };
    notify(this.listeners.get(type));
    notify(this.listeners.get('*'));

    return event;
  }

  /** The most recent events this session (newest last). Useful for hydrating a timeline view. */
  getRecent(): readonly VfideEvent[] {
    return this.recent;
  }
}

/** App-wide singleton. */
export const eventBus = new VfideEventBus();
