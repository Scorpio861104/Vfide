'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { ShieldCheck, ClipboardList, UserRound, Wallet, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';
import { safeLocalStorage } from '@/lib/utils';

const STORAGE_KEY = 'vfide_agent_audit_log';

type AgentAction = 'payment' | 'cash-in' | 'cash-out' | 'support' | 'recovery';

interface AuditEntry {
  id: string;
  createdAt: string;
  operator: string;
  customerReference: string;
  action: AgentAction;
  amount: string;
  notes: string;
}

export default function AgentPage() {
  const { address, isConnected } = useAccount();
  const [customerReference, setCustomerReference] = useState('');
  const [action, setAction] = useState<AgentAction>('payment');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as AuditEntry[];
      setEntries(Array.isArray(parsed) ? parsed : []);
    } catch {
      setEntries([]);
    }
  }, []);

  const latestEntries = useMemo(() => entries.slice(0, 5), [entries]);

  const handleRecord = () => {
    setSaved(false);
    setError('');

    if (!isConnected || !address) {
      setError('Connect an authorized wallet before using agent mode.');
      return;
    }

    if (!customerReference.trim()) {
      setError('Enter a customer reference, phone number, or wallet address.');
      return;
    }

    const entry: AuditEntry = {
      id: `${Date.now()}`,
      createdAt: new Date().toISOString(),
      operator: address,
      customerReference: customerReference.trim(),
      action,
      amount: amount.trim(),
      notes: notes.trim(),
    };

    const updated = [entry, ...entries].slice(0, 25);
    setEntries(updated);
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSaved(true);
    setCustomerReference('');
    setAmount('');
    setNotes('');
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-cyan-500/20 bg-zinc-900/80 p-6 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-cyan-500/10 p-3 text-cyan-300">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">Authorized Agent Mode</p>
              <h1 className="mt-1 text-3xl font-bold">Assist customers while keeping an audit trail</h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-400">
                This screen is for trusted operators helping customers complete VFIDE actions. Use only with a connected wallet that your team has authorized.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-5 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-cyan-300" />
              <h2 className="text-xl font-semibold">Record an assisted action</h2>
            </div>

            {!isConnected && (
              <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                Connect a wallet first. The connected address is used as the operator identity for the audit trail.
              </div>
            )}

            <div className="grid gap-4">
              <label className="block">
                <span className="mb-1 block text-sm text-zinc-300">Customer reference</span>
                <input
                  value={customerReference}
                  onChange={(e) =>  setCustomerReference(e.target.value)}
                 
                  className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-zinc-300">Requested action</span>
                <select
                  value={action}
                  onChange={(e) =>  setAction(e.target.value as AgentAction)}
                  className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                >
                  <option value="payment">Payment assistance</option>
                  <option value="cash-in">Cash in</option>
                  <option value="cash-out">Cash out</option>
                  <option value="support">Support / troubleshooting</option>
                  <option value="recovery">Recovery help</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-zinc-300">Amount (optional)</span>
                <input
                  value={amount}
                  onChange={(e) =>  setAmount(e.target.value)}
                 
                  className="min-h-[44px] w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm text-zinc-300">Notes</span>
                <textarea
                  value={notes}
                  onChange={(e) =>  setNotes(e.target.value)}
                 
                  rows={4}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm outline-none transition focus:border-cyan-400"
                />
              </label>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              {saved && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                  Audit entry recorded. You can continue to the payment flow or keep assisting here.
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleRecord}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-300"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Record authorized request
                </button>

                <Link
                  href="/pay"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-cyan-400 hover:text-cyan-300"
                >
                  Open payment flow
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="mb-3 flex items-center gap-2">
                <Wallet className="h-5 w-5 text-cyan-300" />
                <h2 className="text-lg font-semibold">Operator identity</h2>
              </div>
              <p className="text-sm text-zinc-400">
                {isConnected && address ? `Connected wallet: ${address}` : 'No wallet connected yet.'}
              </p>
              <p className="mt-3 text-xs text-zinc-500">
                Authorization should be enforced by your organization or smart-contract allowlist before live customer operations.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
              <div className="mb-3 flex items-center gap-2">
                <UserRound className="h-5 w-5 text-cyan-300" />
                <h2 className="text-lg font-semibold">Recent audit entries</h2>
              </div>

              {latestEntries.length === 0 ? (
                <p className="text-sm text-zinc-500">No assisted actions recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {latestEntries.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium text-zinc-100">{entry.customerReference}</span>
                        <span className="text-xs uppercase tracking-wide text-cyan-300">{entry.action}</span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">{new Date(entry.createdAt).toLocaleString()}</p>
                      {entry.amount && <p className="mt-1 text-zinc-300">Amount: {entry.amount}</p>}
                      {entry.notes && <p className="mt-1 text-zinc-400">{entry.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Use agent mode only with customer consent and documented authorization. Avoid storing secrets or private keys in notes.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
