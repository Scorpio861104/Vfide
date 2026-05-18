'use client';

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import {
  ArrowLeft,
  CalendarDays,
  Plus,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
} from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

// ── Types ───────────────────────────────────────────────────────────────────

type BookingStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show';

interface BookingSlot {
  id: number;
  product_id: number;
  product_name?: string;
  day_of_week?: number | null;
  specific_date?: string | null;
  start_time: string;
  end_time: string;
  max_bookings: number;
  current_bookings?: number;
}

interface Booking {
  id: number;
  product_id: number;
  product_name?: string;
  slot_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  customer_address?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  notes?: string | null;
}

interface Service {
  id: number;
  name: string;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_META: Record<BookingStatus, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  confirmed: { label: 'Confirmed', icon: CheckCircle2,  color: 'text-blue-300',    bg: 'bg-blue-500/10 border-blue-500/30' },
  cancelled: { label: 'Cancelled', icon: XCircle,       color: 'text-zinc-400',    bg: 'bg-zinc-800/40 border-zinc-700/40' },
  completed: { label: 'Completed', icon: CheckCircle2,  color: 'text-emerald-300', bg: 'bg-emerald-500/10 border-emerald-500/30' },
  no_show:   { label: 'No-show',   icon: AlertTriangle, color: 'text-amber-300',   bg: 'bg-amber-500/10 border-amber-500/30' },
};

// ── Page ────────────────────────────────────────────────────────────────────

export default function MerchantBookingsPage() {
  const { address } = useAccount();
  const [tab, setTab] = useState<'bookings' | 'slots'>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateSlot, setShowCreateSlot] = useState(false);

  const loadServices = useCallback(async () => {
    if (!address) return;
    try {
      const response = await fetch('/api/merchant/products');
      const data = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(data.products)) {
        setServices(
          data.products
            .filter((p: { product_type?: string; status?: string }) => p.product_type === 'service' && p.status === 'active')
            .map((p: { id: number; name: string }) => ({ id: p.id, name: p.name })),
        );
      }
    } catch { /* tolerate */ }
  }, [address]);

  const load = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/merchant/bookings?view=${tab}&merchant=${address}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to load bookings');
      if (tab === 'bookings') {
        setBookings(Array.isArray(data.bookings) ? data.bookings : []);
      } else {
        setSlots(Array.isArray(data.slots) ? data.slots : []);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [address, tab]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void loadServices(); }, [loadServices]);

  const updateBookingStatus = useCallback(async (id: number, status: BookingStatus) => {
    try {
      const response = await fetch('/api/merchant/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to update booking');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update booking');
    }
  }, [load]);

  const stats = useMemo(() => ({
    today: bookings.filter((b) => b.booking_date === new Date().toISOString().slice(0, 10) && b.status === 'confirmed').length,
    upcoming: bookings.filter((b) => b.status === 'confirmed' && new Date(b.booking_date) >= new Date(new Date().toDateString())).length,
    completed: bookings.filter((b) => b.status === 'completed').length,
  }), [bookings]);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-[4.5rem] text-white">
        <section className="py-12">
          <div className="container mx-auto max-w-6xl px-4">
            <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200">
              <ArrowLeft size={16} /> Back to Merchant Hub
            </Link>

            <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
                  <CalendarDays size={14} /> Bookings
                </div>
                <h1 className="text-4xl font-bold">Appointments and slots</h1>
                <p className="mt-3 max-w-3xl text-gray-400">
                  Set your availability, customers book a slot, you confirm or reschedule. Built for salons, barbers, nail techs, and any service business.
                </p>
              </div>
              {tab === 'slots' && (
                <button
                  onClick={() => setShowCreateSlot(true)}
                  disabled={!address || services.length === 0}
                  title={services.length === 0 ? 'Create a service-type product first in Inventory' : undefined}
                  className="px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                >
                  <Plus size={18} /> New slot
                </button>
              )}
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            {!address && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">
                Connect the merchant wallet to manage appointments.
              </div>
            )}

            {address && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <StatCard label="Today" value={stats.today} />
                  <StatCard label="Upcoming" value={stats.upcoming} />
                  <StatCard label="Completed (all-time)" value={stats.completed} />
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-4 border-b border-white/10">
                  {(['bookings', 'slots'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-cyan-400 text-cyan-300' : 'border-transparent text-zinc-400 hover:text-zinc-300'}`}
                    >
                      {t === 'bookings' ? 'Appointments' : 'Availability slots'}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
                  {loading ? (
                    <div className="p-12 text-center text-zinc-400">Loading…</div>
                  ) : tab === 'bookings' ? (
                    bookings.length === 0 ? (
                      <div className="p-12 text-center text-zinc-400">
                        No appointments yet. Create slots so customers can book.
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {bookings.map((b) => (
                          <BookingRow
                            key={b.id}
                            booking={b}
                            onConfirm={() => updateBookingStatus(b.id, 'confirmed')}
                            onComplete={() => updateBookingStatus(b.id, 'completed')}
                            onCancel={() => updateBookingStatus(b.id, 'cancelled')}
                            onNoShow={() => updateBookingStatus(b.id, 'no_show')}
                          />
                        ))}
                      </div>
                    )
                  ) : (
                    slots.length === 0 ? (
                      <div className="p-12 text-center text-zinc-400">
                        No availability slots yet.{' '}
                        {services.length === 0
                          ? <>First create a service-type product in <Link href="/merchant/inventory" className="text-cyan-300 hover:text-cyan-200">Inventory</Link>, then come back here.</>
                          : <>Click New slot to add one.</>}
                      </div>
                    ) : (
                      <div className="divide-y divide-white/5">
                        {slots.map((s) => <SlotRow key={s.id} slot={s} />)}
                      </div>
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </div>

      {showCreateSlot && address && (
        <CreateSlotModal
          services={services}
          onClose={() => setShowCreateSlot(false)}
          onCreated={async () => { setShowCreateSlot(false); await load(); }}
          onError={setError}
        />
      )}

      <Footer />
    </>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-wide text-zinc-400 mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function BookingRow({ booking, onConfirm, onComplete, onCancel, onNoShow }: {
  booking: Booking;
  onConfirm: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onNoShow: () => void;
}) {
  const meta = STATUS_META[booking.status];
  const Icon = meta.icon;
  const isPast = new Date(booking.booking_date) < new Date(new Date().toDateString());

  return (
    <div className="p-4 hover:bg-white/5 transition-colors flex items-start justify-between gap-4 flex-wrap">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium">{booking.product_name ?? `Service #${booking.product_id}`}</span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded border ${meta.bg} ${meta.color}`}>
            <Icon size={11} /> {meta.label}
          </span>
        </div>
        <div className="text-sm text-zinc-400">
          <Clock size={12} className="inline mr-1" />
          {new Date(booking.booking_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          {' · '}{booking.start_time}–{booking.end_time}
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          <User size={11} className="inline mr-1" />
          {booking.customer_name ?? booking.customer_email ?? booking.customer_address ?? 'Anonymous'}
          {booking.notes && <span className="ml-2">· {booking.notes}</span>}
        </div>
      </div>
      <div className="flex gap-2">
        {booking.status === 'confirmed' && !isPast && (
          <button onClick={onCancel} className="text-xs px-3 py-1.5 border border-zinc-700 text-zinc-400 rounded hover:bg-white/5">
            Cancel
          </button>
        )}
        {booking.status === 'confirmed' && isPast && (
          <>
            <button onClick={onComplete} className="text-xs px-3 py-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 rounded hover:bg-emerald-500/20">
              Mark complete
            </button>
            <button onClick={onNoShow} className="text-xs px-3 py-1.5 border border-amber-500/30 bg-amber-500/10 text-amber-300 rounded hover:bg-amber-500/20">
              No-show
            </button>
          </>
        )}
        {booking.status === 'cancelled' && (
          <button onClick={onConfirm} className="text-xs px-3 py-1.5 border border-blue-500/30 bg-blue-500/10 text-blue-300 rounded hover:bg-blue-500/20">
            Restore
          </button>
        )}
      </div>
    </div>
  );
}

function SlotRow({ slot }: { slot: BookingSlot }) {
  const when = slot.specific_date
    ? new Date(slot.specific_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
    : typeof slot.day_of_week === 'number' ? `Every ${DAYS_OF_WEEK[slot.day_of_week]}` : 'Recurring';
  return (
    <div className="p-4 flex items-center justify-between gap-4">
      <div>
        <div className="font-medium">{slot.product_name ?? `Service #${slot.product_id}`}</div>
        <div className="text-sm text-zinc-400">
          {when} · {slot.start_time}–{slot.end_time}
        </div>
        <div className="text-xs text-zinc-500 mt-1">
          {(slot.current_bookings ?? 0)} / {slot.max_bookings} booked
        </div>
      </div>
    </div>
  );
}

function CreateSlotModal({ services, onClose, onCreated, onError }: {
  services: Service[];
  onClose: () => void;
  onCreated: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const [productId, setProductId] = useState<number>(services[0]?.id ?? 0);
  const [mode, setMode] = useState<'recurring' | 'specific'>('recurring');
  const [dayOfWeek, setDayOfWeek] = useState(1); // Mon
  const [specificDate, setSpecificDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [maxBookings, setMaxBookings] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = productId > 0 && startTime < endTime && (mode === 'recurring' || specificDate.length > 0) && !submitting;

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const response = await fetch('/api/merchant/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_slot',
          product_id: productId,
          day_of_week: mode === 'recurring' ? dayOfWeek : undefined,
          specific_date: mode === 'specific' ? specificDate : undefined,
          start_time: startTime,
          end_time: endTime,
          max_bookings: maxBookings,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to create slot');
      await onCreated();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to create slot');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, productId, mode, dayOfWeek, specificDate, startTime, endTime, maxBookings, onCreated, onError]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur flex items-start sm:items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-zinc-950 border border-white/10 rounded-2xl p-6 max-w-md w-full my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold">New availability slot</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Service</span>
            <select value={productId} onChange={(e) => setProductId(Number(e.target.value))} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 outline-none">
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>

          <div>
            <span className="text-xs text-zinc-400 mb-1 block">When</span>
            <div className="flex gap-2 mb-2">
              <button onClick={() => setMode('recurring')} className={`flex-1 px-3 py-2 text-sm rounded-lg border ${mode === 'recurring' ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/10 bg-zinc-900'}`}>
                Weekly recurring
              </button>
              <button onClick={() => setMode('specific')} className={`flex-1 px-3 py-2 text-sm rounded-lg border ${mode === 'specific' ? 'border-cyan-500 bg-cyan-500/10' : 'border-white/10 bg-zinc-900'}`}>
                One-time date
              </button>
            </div>
            {mode === 'recurring' ? (
              <select value={dayOfWeek} onChange={(e) => setDayOfWeek(Number(e.target.value))} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm">
                {DAYS_OF_WEEK.map((d, i) => <option key={i} value={i}>Every {d}day</option>)}
              </select>
            ) : (
              <input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-zinc-400 mb-1 block">Start time</span>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm" />
            </label>
            <label className="block">
              <span className="text-xs text-zinc-400 mb-1 block">End time</span>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm" />
            </label>
          </div>

          <label className="block">
            <span className="text-xs text-zinc-400 mb-1 block">Max bookings per slot</span>
            <input type="number" min={1} max={20} step={1} value={maxBookings} onChange={(e) => setMaxBookings(Number(e.target.value))} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm" />
            <span className="text-xs text-zinc-500 mt-1 block">Use 1 for 1-on-1 services, higher for group classes.</span>
          </label>

          <button onClick={submit} disabled={!canSubmit} className="w-full px-5 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? 'Creating…' : 'Create slot'}
          </button>
        </div>
      </div>
    </div>
  );
}
