'use client';

/**
 * ActiveTab — view alerts that haven't been disabled, watch live price,
 * fire a browser notification on trigger.
 *
 * Price alerts are intentionally a per-browser, client-side feature: the
 * user sets thresholds for VFIDE/USD and we poll /api/crypto/price every
 * 30 seconds while the tab is open. When the threshold is crossed we
 * fire a Web Notification (permission required) and mark the alert as
 * "triggered" in the UI.
 *
 * Limitations the user needs to know about:
 *   - Alerts don't follow you across devices. Each browser keeps its own
 *     list in localStorage.
 *   - Alerts only fire while at least one tab with this page is open.
 *     Closing all tabs stops the polling.
 *   - Browser notifications require explicit permission.
 *
 * The honest disclosure banner below makes those constraints visible
 * instead of letting the user assume "I set an alert, I'll get notified
 * even if my laptop is closed" — which would be false.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, BellOff, Trash2, TrendingUp, TrendingDown, Loader2, Info } from 'lucide-react';

interface PriceAlert {
  id: string;
  token: string;
  targetPrice: number;
  direction: 'above' | 'below';
  active: boolean;
  createdAt: string;
  /** Last time the trigger fired; lets us avoid spamming notifications */
  lastFiredAt?: number;
}

const STORAGE_KEY = 'vfide_price_alerts';
const POLL_INTERVAL_MS = 30_000;
const RE_FIRE_INTERVAL_MS = 30 * 60_000; // 30 min between re-fires for same alert

function loadAlerts(): PriceAlert[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function saveAlerts(alerts: PriceAlert[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

export function ActiveTab() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const seenTriggers = useRef<Set<string>>(new Set());

  // Read all alerts (active and inactive — filter happens in display)
  const refresh = useCallback(() => {
    setAlerts(loadAlerts().filter((a) => a.active));
  }, []);

  useEffect(() => {
    refresh();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', refresh);
      if ('Notification' in window) {
        setNotifPermission(Notification.permission);
      }
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', refresh);
      }
    };
  }, [refresh]);

  // Fetch price with periodic refresh so triggers actually trigger.
  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        setPriceLoading(true);
        const response = await fetch('/api/crypto/price');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const price = typeof data.price === 'number'
          ? data.price
          : typeof data.usdPrice === 'number'
          ? data.usdPrice
          : null;
        if (cancelled) return;
        if (price === null) {
          setPriceError('Price feed returned no usable price');
        } else {
          setCurrentPrice(price);
          setPriceError(null);
        }
      } catch (e) {
        if (cancelled) return;
        setPriceError(e instanceof Error ? e.message : 'Failed to fetch price');
      } finally {
        if (!cancelled) setPriceLoading(false);
      }
    };

    void tick();
    const handle = setInterval(tick, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(handle); };
  }, []);

  // Trigger notifications when price crosses a threshold.
  useEffect(() => {
    if (currentPrice === null) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const all = loadAlerts();
    let changed = false;

    for (const alert of all) {
      if (!alert.active) continue;
      const isTriggered =
        (alert.direction === 'above' && currentPrice >= alert.targetPrice) ||
        (alert.direction === 'below' && currentPrice <= alert.targetPrice);

      if (!isTriggered) continue;
      // Throttle: don't re-fire the same alert within the re-fire window
      if (alert.lastFiredAt && Date.now() - alert.lastFiredAt < RE_FIRE_INTERVAL_MS) continue;
      // Also don't fire twice within this session for the same alert
      if (seenTriggers.current.has(alert.id) && alert.lastFiredAt) continue;

      try {
        new Notification(`${alert.token} ${alert.direction} $${alert.targetPrice.toFixed(4)}`, {
          body: `Current price: $${currentPrice.toFixed(4)}`,
          tag: alert.id,
        });
      } catch {
        // Browser refused (e.g. focus check failed) — just record without notif
      }
      alert.lastFiredAt = Date.now();
      seenTriggers.current.add(alert.id);
      changed = true;
    }

    if (changed) {
      saveAlerts(all);
      refresh();
    }
  }, [currentPrice, refresh]);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
    } catch {
      // Some browsers throw if called outside a user gesture; the user can retry
    }
  }, []);

  const toggle = useCallback((id: string) => {
    const all = loadAlerts();
    const updated = all.map((a) => (a.id === id ? { ...a, active: !a.active } : a));
    saveAlerts(updated);
    refresh();
  }, [refresh]);

  const remove = useCallback((id: string) => {
    const all = loadAlerts();
    saveAlerts(all.filter((a) => a.id !== id));
    refresh();
  }, [refresh]);

  return (
    <div className="space-y-4">
      {/* Local-only disclosure — alerts live in THIS browser only */}
      <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-3 flex items-start gap-3 text-sm text-amber-100">
        <Info size={16} className="text-amber-300 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-amber-200">These alerts only exist in this browser.</strong> They
          won&apos;t follow you to another device, and they only fire while at least one tab with
          this page is open. Notifications need browser permission.
        </div>
      </div>

      {/* Notification permission CTA — only if not granted */}
      {typeof window !== 'undefined' && 'Notification' in window && notifPermission !== 'granted' && (
        <div className="bg-blue-500/5 border border-blue-500/30 rounded-xl p-3 flex items-center justify-between gap-3 text-sm">
          <div className="text-blue-200">
            {notifPermission === 'denied'
              ? 'Browser notifications are blocked. To get alerts, change the notification permission for this site in your browser settings.'
              : 'Enable browser notifications so you get a popup when an alert triggers.'}
          </div>
          {notifPermission !== 'denied' && (
            <button
              onClick={requestNotificationPermission}
              className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 rounded-lg text-xs text-blue-200 font-semibold whitespace-nowrap"
            >
              Enable
            </button>
          )}
        </div>
      )}

      {/* Live price */}
      {currentPrice !== null && (
        <div className="bg-white/3 border border-white/10 rounded-xl p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <p className="text-sm text-gray-400">Current VFIDE Price:</p>
          <p className="text-sm text-white font-bold">${currentPrice.toFixed(4)}</p>
          <p className="text-xs text-gray-500 ml-auto">refreshes every 30s</p>
        </div>
      )}
      {priceLoading && currentPrice === null && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 size={12} className="animate-spin" /> Fetching price…
        </div>
      )}
      {priceError && (
        <div className="bg-red-500/5 border border-red-500/30 rounded-xl p-3 text-sm text-red-200">
          Price feed unavailable: {priceError}. Alerts can&apos;t trigger without a price.
        </div>
      )}

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center bg-white/3 border border-white/10 rounded-2xl">
          <Bell size={32} className="text-gray-600 mb-3" />
          <p className="text-gray-400 text-sm">No active alerts.</p>
          <p className="text-gray-500 text-xs mt-1">Use the Create tab to set up price alerts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((a) => {
            const triggered = currentPrice !== null && (
              (a.direction === 'above' && currentPrice >= a.targetPrice) ||
              (a.direction === 'below' && currentPrice <= a.targetPrice)
            );
            return (
              <div key={a.id} className={`p-4 rounded-xl border ${
                triggered ? 'bg-cyan-500/10 border-accent/30' : 'bg-white/3 border-white/10'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {a.direction === 'above' ? (
                      <TrendingUp size={14} className="text-green-400" />
                    ) : (
                      <TrendingDown size={14} className="text-red-400" />
                    )}
                    <div>
                      <p className="text-sm text-white font-semibold">{a.token} {a.direction} ${a.targetPrice.toFixed(4)}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(a.createdAt).toLocaleDateString()}
                        {a.lastFiredAt && (
                          <> · last fired {new Date(a.lastFiredAt).toLocaleString()}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {triggered && <span className="text-xs text-cyan-400 font-semibold">⚡ Triggered</span>}
                    <button onClick={() => toggle(a.id)} className="text-gray-500 hover:text-yellow-400 transition-colors" aria-label="Toggle alert">
                      {a.active ? <Bell size={14} /> : <BellOff size={14} />}
                    </button>
                    <button onClick={() => remove(a.id)} className="text-gray-500 hover:text-red-400 transition-colors" aria-label="Delete alert">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
