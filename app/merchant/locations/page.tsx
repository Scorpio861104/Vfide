'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ArrowLeft, MapPin, Plus, CheckCircle2 } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';

interface LocationRecord {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  country: string | null;
  active: boolean;
}

export default function MerchantLocationsPage() {
  const { address } = useAccount();
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', address: '', city: '', country: '' });

  const loadLocations = useCallback(async () => {
    if (!address) return;

    try {
      const response = await fetch(`/api/merchant/locations?merchant=${address}`);
      const data = await response.json().catch(() => ({ locations: [] }));
      if (response.ok) {
        setLocations(Array.isArray(data.locations) ? data.locations : []);
      }
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  const handleAdd = useCallback(async () => {
    if (!address || !form.name.trim()) return;

    await fetch('/api/merchant/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchantAddress: address, ...form }),
    });

    setForm({ name: '', address: '', city: '', country: '' });
    setShowAdd(false);
    await loadLocations();
  }, [address, form, loadLocations]);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-24 text-white">
        <div className="container mx-auto max-w-3xl px-4 pb-16">
          <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200">
            <ArrowLeft size={16} /> Back to Merchant Hub
          </Link>

          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold"><MapPin className="text-cyan-400" /> Store locations</h1>
              <p className="mt-2 text-gray-400">Register each market stall, branch, or pickup point so staff and buyers know where orders are fulfilled.</p>
            </div>
            <button type="button" onClick={() => setShowAdd((current) => !current)} className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200">
              <Plus size={16} /> Add location
            </button>
          </div>

          {showAdd && (
            <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <input value={form.name} onChange={(event) =>  setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white" />
              <input value={form.address} onChange={(event) =>  setForm((current) => ({ ...current, address: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white" />
              <div className="grid gap-3 md:grid-cols-2">
                <input value={form.city} onChange={(event) =>  setForm((current) => ({ ...current, city: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white" />
                <input value={form.country} onChange={(event) =>  setForm((current) => ({ ...current, country: event.target.value }))} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white" />
              </div>
              <button type="button" onClick={() => void handleAdd()} disabled={!form.name.trim()} className="rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Save location</button>
            </div>
          )}

          {!address ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">Connect the merchant wallet to manage locations.</div>
          ) : loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-gray-400">Loading locations…</div>
          ) : locations.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-400">
              <MapPin className="mx-auto mb-3 text-gray-600" /> No locations yet.
            </div>
          ) : (
            <div className="space-y-3">
              {locations.map((location) => (
                <div key={location.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div>
                    <div className="font-semibold text-white">{location.name}</div>
                    <div className="text-sm text-gray-400">{[location.address, location.city, location.country].filter(Boolean).join(', ') || 'No address provided'}</div>
                  </div>
                  {location.active && <CheckCircle2 className="text-emerald-300" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
