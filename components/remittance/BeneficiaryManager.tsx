'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Plus, Trash2, Users } from 'lucide-react';

export interface Beneficiary {
  id: number | string;
  label?: string | null;
  name: string;
  phone: string;
  network: string;
  account_number?: string | null;
  wallet_address?: string | null;
  country: string;
  relationship: string;
}

interface BeneficiaryManagerProps {
  selectedId?: number | string | null;
  onSelect?: (beneficiary: Beneficiary | null) => void;
}

const emptyForm = {
  label: '',
  name: '',
  phone: '',
  network: 'mpesa',
  accountNumber: '',
  walletAddress: '',
  country: 'KE',
  relationship: 'family',
};

export function BeneficiaryManager({ selectedId, onSelect }: BeneficiaryManagerProps) {
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadBeneficiaries() {
    setLoading(true);
    try {
      const response = await fetch('/api/remittance/beneficiaries');
      if (!response.ok) throw new Error('Failed to fetch beneficiaries');
      const data = await response.json();
      setBeneficiaries(Array.isArray(data.beneficiaries) ? data.beneficiaries : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to fetch beneficiaries');
      setBeneficiaries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBeneficiaries();
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/remittance/beneficiaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save beneficiary');
      }

      const nextBeneficiary = data.beneficiary as Beneficiary;
      const nextList = [nextBeneficiary, ...beneficiaries];
      setBeneficiaries(nextList);
      setForm(emptyForm);
      onSelect?.(nextBeneficiary);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save beneficiary');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number | string) {
    try {
      const response = await fetch(`/api/remittance/beneficiaries?id=${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete beneficiary');
      const nextList = beneficiaries.filter((item) => item.id !== id);
      setBeneficiaries(nextList);
      if (selectedId === id) {
        onSelect?.(null);
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete beneficiary');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-white">
        <Users size={18} className="text-cyan-400" />
        <h2 className="text-xl font-bold">Saved beneficiaries</h2>
      </div>

      {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

      <div className="grid gap-3 md:grid-cols-2">
        <input value={form.name} onChange={(event) =>  setForm({ ...form, name: event.target.value })} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white" placeholder="Recipient name" />
        <input value={form.phone} onChange={(event) =>  setForm({ ...form, phone: event.target.value })} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white" placeholder="Phone / account" />
        <input value={form.label} onChange={(event) =>  setForm({ ...form, label: event.target.value })} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white" placeholder="Label (optional)" />
        <select value={form.network} onChange={(event) =>  setForm({ ...form, network: event.target.value })} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white">
          <option value="mpesa">M-Pesa</option>
          <option value="mtn_momo">MTN MoMo</option>
          <option value="gcash">GCash</option>
          <option value="bank">Bank</option>
          <option value="wallet">Wallet</option>
        </select>
        <input value={form.country} onChange={(event) =>  setForm({ ...form, country: event.target.value.toUpperCase() })} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white" placeholder="Country (KE)" maxLength={2} />
        <input value={form.relationship} onChange={(event) =>  setForm({ ...form, relationship: event.target.value })} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white" placeholder="Relationship" />
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={handleSave}
        disabled={saving || !form.name.trim() || !form.phone.trim()}
        className="inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-white disabled:opacity-60"
      >
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        Save beneficiary
      </motion.button>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400"><Loader2 size={14} className="animate-spin" /> Loading beneficiaries…</div>
      ) : (
        <div className="space-y-3">
          {beneficiaries.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/10 bg-white/5 p-4 text-sm text-gray-400">
              No beneficiaries saved yet. Add your first recipient above.
            </div>
          ) : beneficiaries.map((beneficiary) => {
            const selected = selectedId === beneficiary.id;
            return (
              <div
                key={beneficiary.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect?.(beneficiary)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect?.(beneficiary);
                  }
                }}
                className={`w-full rounded-xl border p-4 text-left transition-colors ${selected ? 'border-cyan-400 bg-cyan-500/10' : 'border-white/10 bg-white/5'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{beneficiary.label || beneficiary.name}</div>
                    <div className="text-sm text-gray-400">{beneficiary.phone} · {beneficiary.network}</div>
                    <div className="text-xs text-gray-500">{beneficiary.country} · {beneficiary.relationship}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleDelete(beneficiary.id);
                    }}
                    className="rounded-lg p-2 text-gray-400 hover:bg-white/10 hover:text-white"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
