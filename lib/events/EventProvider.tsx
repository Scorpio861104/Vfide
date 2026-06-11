'use client';

/**
 * EventProvider (Wave 47) — the React layer over the event bus.
 *
 * Provides:
 *   • useEmitEvent()       — emit a typed ecosystem event from anywhere in the UI.
 *   • useActivityTimeline() — the live, in-session chronological record of what the user has done,
 *                             built automatically from every emitted event via EVENT_ROUTES.
 *   • useEcosystemSignal()  — subscribe a component to live events (e.g. the Nexus reacting).
 *
 * The provider auto-records every event into the timeline and routes `notify` events to the existing
 * toast system when available. This is the live in-session coordination layer; durable cross-device
 * coordination is the server-emit rollout described in eventTypes.ts.
 *
 * SSR-safe: all bus interaction happens in effects / event handlers, never during render.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { eventBus } from './eventBus';
import { EVENT_ROUTES, type VfideEvent, type VfideEventType } from './eventTypes';

export interface TimelineEntry {
  id: string;
  type: VfideEventType;
  at: number;
  /** Plain, human line (from EVENT_ROUTES.timeline). */
  text: string;
  nexusNode?: string;
}

interface EventContextValue {
  emit: (type: VfideEventType, payload?: Record<string, unknown>, source?: string) => void;
  timeline: TimelineEntry[];
}

const EventContext = createContext<EventContextValue | null>(null);

let _seq = 0;

export function EventProvider({ children }: { children: ReactNode }) {
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  // Hydrate from durable storage (Wave 47 rollout). Loads the user's recent persisted events so the
  // timeline survives refresh and reflects other devices, then live session events stack on top.
  // Best-effort: if unauthenticated or the endpoint is unavailable, we simply start empty.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/events?limit=50', { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        const rows: Array<{ id: string; event_type: VfideEventType; created_at: string }> = data?.events ?? [];
        if (cancelled || !Array.isArray(rows) || rows.length === 0) return;
        const hydrated: TimelineEntry[] = rows
          .map((r) => {
            const route = EVENT_ROUTES[r.event_type];
            if (!route) return null;
            return {
              id: `srv_${r.id}`,
              type: r.event_type,
              at: new Date(r.created_at).getTime(),
              text: route.timeline,
              nexusNode: route.nexusNode,
            } as TimelineEntry;
          })
          .filter((x): x is TimelineEntry => x !== null);
        // Merge durable history under any live entries already captured, de-duped, newest first.
        setTimeline((live) => {
          const seen = new Set(live.map((e) => e.id));
          const merged = [...live, ...hydrated.filter((e) => !seen.has(e.id))];
          return merged.sort((a, b) => b.at - a.at).slice(0, 100);
        });
      } catch {
        /* offline / unauthenticated — start empty, live events still work */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Record every event into the session timeline + fire notifications for `notify` routes.
    const off = eventBus.onAny((event: VfideEvent) => {
      const route = EVENT_ROUTES[event.type];
      if (!route) return;

      setTimeline((prev) => {
        const entry: TimelineEntry = {
          id: `evt_${event.at}_${_seq++}`,
          type: event.type,
          at: event.at,
          text: route.timeline,
          nexusNode: route.nexusNode,
        };
        // newest first, capped
        return [entry, ...prev].slice(0, 100);
      });

      if (route.notify) {
        // Best-effort bridge to the existing toast system; never throw if it's not present.
        try {
          window.dispatchEvent(new CustomEvent('vfide:notify', { detail: { text: route.timeline, type: event.type } }));
        } catch {
          /* no-op */
        }
      }
    });
    return off;
  }, []);

  const emit = useCallback((type: VfideEventType, payload?: Record<string, unknown>, source?: string) => {
    eventBus.emit(type, payload, source);
  }, []);

  const value = useMemo<EventContextValue>(() => ({ emit, timeline }), [emit, timeline]);

  return <EventContext.Provider value={value}>{children}</EventContext.Provider>;
}

/** Emit a typed ecosystem event. Safe to call outside the provider (falls back to the bus). */
export function useEmitEvent() {
  const ctx = useContext(EventContext);
  return useCallback(
    (type: VfideEventType, payload?: Record<string, unknown>, source?: string) => {
      if (ctx) ctx.emit(type, payload, source);
      else eventBus.emit(type, payload, source);
    },
    [ctx],
  );
}

/** The live in-session activity timeline (newest first). Empty array outside the provider. */
export function useActivityTimeline(): TimelineEntry[] {
  const ctx = useContext(EventContext);
  return ctx?.timeline ?? [];
}

/**
 * Subscribe a component to live events. `onEvent` fires for each matching event (or all, if `types`
 * is omitted). Use for live reactions like the Nexus pulsing a node when its layer sees activity.
 */
export function useEcosystemSignal(onEvent: (event: VfideEvent) => void, types?: VfideEventType[]) {
  const cb = useRef(onEvent);
  cb.current = onEvent;
  const key = types ? types.join(',') : '*';

  useEffect(() => {
    const handler = (event: VfideEvent) => {
      if (!types || types.includes(event.type)) cb.current(event);
    };
    const off = eventBus.onAny(handler);
    return off;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
