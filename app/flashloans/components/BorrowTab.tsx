'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Shield, Wallet } from 'lucide-react';

type CreatedLane = {
  id: number;
  stage: string;
  principal: string | number;
  drawn_amount: string | number;
  duration_days: number;
  interest_bps: number;
  collateral_pct: number;
};

const DEFAULT_FORM = {
  lenderAddress: '',
  arbiterAddress: '',
  principal: '1500',
  durationDays: '14',
  interestBps: '600',
  collateralPct: '125',
  drawnAmount: '1200',
};

export function BorrowTab() {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [createdLane, setCreatedLane] = useState<CreatedLane | null>(null);

  const projectedTotal = useMemo(() => {
    const drawn = Number(form.drawnAmount || 0);
    const rate = Number(form.interestBps || 0) / 10000;
    return drawn > 0 ? drawn + (drawn * rate) : 0;
  }, [form.drawnAmount, form.interestBps]);

  const handleChange = (field: keyof typeof DEFAULT_FORM, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch('/api/flashloans/lanes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lenderAddress: form.lenderAddress.trim(),
          arbiterAddress: form.arbiterAddress.trim() || undefined,
          principal: Number(form.principal),
          durationDays: Number(form.durationDays),
          interestBps: Number(form.interestBps),
          collateralPct: Number(form.collateralPct),
          drawnAmount: Number(form.drawnAmount),
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.lane) {
        setError(data?.error || 'Unable to create a flash lane right now.');
        return;
      }

      setCreatedLane(data.lane as CreatedLane);
      setStatus('Server lane created for the borrower, lender, and arbiter workflow.');
    } catch {
      setError('Unable to create a flash lane right now.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/10 bg-white/3 p-6">
          <div className="mb-5">
            <h3 className="text-lg font-bold text-white">Request a flash lane</h3>
            <p className="mt-1 text-sm text-gray-400">Create a server-backed borrower/lender lane with real lifecycle stages and dispute handling.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm text-gray-300">
              <span className="mb-1 block">Lender address</span>
              <input
                value={form.lenderAddress}
                onChange={(event) => handleChange('lenderAddress', event.target.value)}
                placeholder="0x2222..."
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
                required
              />
            </label>

            <label className="text-sm text-gray-300">
              <span className="mb-1 block">Arbiter address</span>
              <input
                value={form.arbiterAddress}
                onChange={(event) => handleChange('arbiterAddress', event.target.value)}
                placeholder="0x3333..."
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
              />
            </label>

            <label className="text-sm text-gray-300">
              <span className="mb-1 block">Principal</span>
              <input
                type="number"
                min="100"
                value={form.principal}
                onChange={(event) => handleChange('principal', event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
              />
            </label>

            <label className="text-sm text-gray-300">
              <span className="mb-1 block">Draw amount</span>
              <input
                type="number"
                min="1"
                value={form.drawnAmount}
                onChange={(event) => handleChange('drawnAmount', event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
              />
            </label>

            <label className="text-sm text-gray-300">
              <span className="mb-1 block">Duration (days)</span>
              <input
                type="number"
                min="1"
                max="30"
                value={form.durationDays}
                onChange={(event) => handleChange('durationDays', event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
              />
            </label>

            <label className="text-sm text-gray-300">
              <span className="mb-1 block">Interest (bps)</span>
              <input
                type="number"
                min="100"
                max="1200"
                value={form.interestBps}
                onChange={(event) => handleChange('interestBps', event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
              />
            </label>

            <label className="text-sm text-gray-300 md:col-span-2">
              <span className="mb-1 block">Collateral coverage (%)</span>
              <input
                type="number"
                min="110"
                max="200"
                value={form.collateralPct}
                onChange={(event) => handleChange('collateralPct', event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-white"
              />
            </label>
          </div>

          {error ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">
              <AlertCircle size={16} className="mt-0.5" />
              <span>{error}</span>
            </div>
          ) : null}

          {status ? (
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              <CheckCircle2 size={16} className="mt-0.5" />
              <span>{status}</span>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-4 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-60"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
            {submitting ? 'Creating…' : 'Create flash lane'}
          </button>
        </form>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
            <div className="mb-3 flex items-center gap-2 text-cyan-300">
              <Shield size={16} />
              <span className="text-sm font-semibold">Projected terms</span>
            </div>
            <dl className="space-y-2 text-sm text-gray-300">
              <div className="flex items-center justify-between gap-3"><dt>Borrowed</dt><dd className="font-semibold text-white">${Number(form.drawnAmount || 0).toFixed(2)}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt>Projected repayment</dt><dd className="font-semibold text-white">${projectedTotal.toFixed(2)}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt>Duration</dt><dd className="font-semibold text-white">{Number(form.durationDays || 0)} days</dd></div>
              <div className="flex items-center justify-between gap-3"><dt>Collateral buffer</dt><dd className="font-semibold text-white">{Number(form.collateralPct || 0)}%</dd></div>
            </dl>
          </div>

          {createdLane ? (
            <div className="rounded-2xl border border-white/10 bg-white/3 p-5">
              <h4 className="text-base font-semibold text-white">Lane #{createdLane.id} is ready</h4>
              <p className="mt-1 text-sm text-gray-400">Stage: <span className="font-medium text-cyan-300">{createdLane.stage}</span></p>
              <p className="mt-1 text-sm text-gray-400">Principal ${Number(createdLane.principal).toFixed(2)} · Draw ${Number(createdLane.drawn_amount).toFixed(2)}</p>
              <p className="mt-1 text-sm text-gray-400">{createdLane.duration_days} days · {createdLane.interest_bps} bps · {createdLane.collateral_pct}% collateral</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
