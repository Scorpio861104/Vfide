'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Banknote, CheckCircle2, ChevronRight, Clock, Smartphone } from 'lucide-react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OffRampButton, OffRampStatus } from '@/components/compliance/OffRampIntegration';
import { useTranslation } from '@/lib/locale/useTranslation';

interface WithdrawHistory {
  id: number;
  amount: string;
  token: string;
  provider: string;
  network: string;
  status: string;
  created_at: string;
}

const NETWORKS = [
  { id: 'mpesa', name: 'M-Pesa' },
  { id: 'mtn_momo', name: 'MTN MoMo' },
  { id: 'airtel', name: 'Airtel Money' },
  { id: 'bank', name: 'Bank Transfer' },
];

export default function OffRampWithdraw({ merchantAddress }: { merchantAddress?: string }) {
  const { address } = useAccount();
  const { t } = useTranslation();
  const walletAddress = merchantAddress ?? address;

  const [amount, setAmount] = useState('');
  const [token, setToken] = useState('USDC');
  const [network, setNetwork] = useState('mpesa');
  const [mobileNumber, setMobileNumber] = useState('');
  const [history, setHistory] = useState<WithdrawHistory[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (!walletAddress) {
      setHistory([]);
      return;
    }

    let cancelled = false;
    fetch(`/api/merchant/withdraw?merchant=${encodeURIComponent(walletAddress)}`)
      .then((response) => response.ok ? response.json() : { withdrawals: [] })
      .then((data) => {
        if (!cancelled) {
          setHistory(Array.isArray(data?.withdrawals) ? data.withdrawals : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setHistory([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  const handleSubmit = async () => {
    if (!walletAddress || !amount || !mobileNumber) return;

    setSubmitting(true);
    setResult(null);
    try {
      const response = await fetch('/api/merchant/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantAddress: walletAddress,
          amount: Number(amount),
          token,
          network,
          mobileNumber,
          provider: 'yellowcard',
          fiatCurrency: network === 'bank' ? 'USD' : 'KES',
        }),
      });

      const data = await response.json().catch(() => ({ success: false, message: 'Withdrawal request failed.' }));
      setResult({ success: Boolean(data?.success), message: data?.message });

      if (response.ok) {
        const refresh = await fetch(`/api/merchant/withdraw?merchant=${encodeURIComponent(walletAddress)}`);
        const refreshData = await refresh.json().catch(() => ({ withdrawals: [] }));
        setHistory(Array.isArray(refreshData?.withdrawals) ? refreshData.withdrawals : []);
        setAmount('');
        setMobileNumber('');
      }
    } catch {
      setResult({ success: false, message: 'Withdrawal request failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Banknote className="h-5 w-5 text-emerald-300" />
          Cash out to local rails
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>
          Turn stablecoin balances into mobile-money or bank withdrawals using the repo’s existing off-ramp request flow.
        </p>

        {walletAddress ? (
          <>
            <div className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                <Smartphone className="h-4 w-4" />
                Quick withdrawal
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs text-gray-400">{t('common.amount', 'Amount')}</span>
                  <input
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none transition focus:border-cyan-500/40"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-400">Token</span>
                  <select
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-white outline-none transition focus:border-cyan-500/40"
                  >
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                    <option value="VFIDE">VFIDE</option>
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-400">{t('merchant.withdraw.network', 'Payout network')}</span>
                  <select
                    value={network}
                    onChange={(event) => setNetwork(event.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-white outline-none transition focus:border-cyan-500/40"
                  >
                    {NETWORKS.map((option) => (
                      <option key={option.id} value={option.id}>{option.name}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs text-gray-400">{t('merchant.withdraw.mobile_number', 'Mobile number')}</span>
                  <input
                    value={mobileNumber}
                    onChange={(event) => setMobileNumber(event.target.value)}
                    type="tel"
                    placeholder="+254712345678"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none transition focus:border-cyan-500/40"
                  />
                </label>
              </div>
              <Button onClick={handleSubmit} disabled={submitting || !amount || !mobileNumber} className="w-full gap-2">
                {submitting ? t('merchant.withdraw.processing', 'Processing...') : 'Request payout'}
                <ChevronRight className="h-4 w-4" />
              </Button>
              {result ? (
                <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${result.success ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-amber-500/30 bg-amber-500/10 text-amber-100'}`}>
                  {result.success ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  <span>{result.message ?? (result.success ? 'Withdrawal requested successfully.' : 'Withdrawal request failed.')}</span>
                </div>
              ) : null}
            </div>

            <div className="space-y-4">
              <OffRampButton walletAddress={walletAddress} className="w-full justify-center" />
              <OffRampStatus walletAddress={walletAddress} />
            </div>

            {history.length > 0 ? (
              <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">{t('merchant.withdraw.history', 'Withdrawal history')}</div>
                <div className="space-y-2">
                  {history.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2">
                      <div>
                        <div className="font-medium text-white">{Number(entry.amount).toFixed(2)} {entry.token}</div>
                        <div className="text-xs text-gray-400">{entry.network} · {entry.provider}</div>
                      </div>
                      <div className="text-right text-xs">
                        <div className="inline-flex items-center gap-1 text-amber-200">
                          <Clock className="h-3 w-3" />
                          <span className="capitalize">{entry.status}</span>
                        </div>
                        <div className="mt-1 text-gray-500">{new Date(entry.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="rounded-lg border border-dashed p-4">
            Connect a wallet to create and track a withdrawal request.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
