'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { ArrowLeft, CreditCard, Clock, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Footer } from '@/components/layout/Footer';
import { useLocale } from '@/lib/locale/LocaleProvider';

interface InstallmentPayment {
  amount: string;
  paid_at: string;
}

interface InstallmentPlan {
  id: string;
  customer_address: string;
  order_id: string;
  total_amount: string;
  installment_count: number;
  installment_amount: string;
  interval_days: number;
  paid_count: number;
  next_payment_due: string | null;
  status: string;
  created_at: string;
  payments: InstallmentPayment[];
}

export default function MerchantInstallmentsPage() {
  const { address } = useAccount();
  const { formatCurrency, formatDate } = useLocale();
  const [plans, setPlans] = useState<InstallmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    if (!address) return;

    try {
      const response = await fetch(`/api/merchant/installments?merchant=${address}`);
      const data = await response.json().catch(() => ({ plans: [] }));
      if (response.ok) {
        setPlans(Array.isArray(data.plans) ? data.plans : []);
      }
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  const shortAddress = (value: string) => value ? `${value.slice(0, 6)}...${value.slice(-4)}` : 'Unknown';
  const isOverdue = (plan: InstallmentPlan) => Boolean(plan.next_payment_due && new Date(plan.next_payment_due).getTime() < Date.now() && plan.status === 'active');

  const activePlans = plans.filter((plan) => plan.status === 'active');
  const outstanding = activePlans.reduce((sum, plan) => {
    const total = Number.parseFloat(plan.total_amount) || 0;
    const paid = (Number.parseFloat(plan.installment_amount) || 0) * plan.paid_count;
    return sum + Math.max(total - paid, 0);
  }, 0);

  return (
    <>
      <div className="min-h-screen bg-zinc-950 pt-24 text-white">
        <div className="container mx-auto max-w-4xl px-4 pb-16">
          <Link href="/merchant" className="mb-6 inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200">
            <ArrowLeft size={16} /> Back to Merchant Hub
          </Link>

          <div className="mb-6">
            <h1 className="flex items-center gap-3 text-3xl font-bold">
              <CreditCard className="text-cyan-400" /> Installments & payment plans
            </h1>
            <p className="mt-2 text-gray-400">Track pay-over-time orders, overdue accounts, and the next collection date for each customer.</p>
          </div>

          {activePlans.length > 0 && (
            <div className="mb-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-center">
                <div className="text-xs text-gray-400">Active Plans</div>
                <div className="text-2xl font-bold text-cyan-300">{activePlans.length}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                <div className="text-xs text-gray-400">Outstanding</div>
                <div className="text-lg font-bold text-white">{formatCurrency(outstanding)}</div>
              </div>
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
                <div className="text-xs text-gray-400">Overdue</div>
                <div className="text-2xl font-bold text-red-300">{plans.filter(isOverdue).length}</div>
              </div>
            </div>
          )}

          {!address ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-gray-400">
              Connect the merchant wallet to review installment plans.
            </div>
          ) : loading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-gray-400">Loading installment plans…</div>
          ) : plans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-gray-400">
              <CreditCard className="mx-auto mb-3 text-gray-600" />
              No installment plans yet.
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((plan) => {
                const overdue = isOverdue(plan);
                const progress = plan.installment_count > 0 ? (plan.paid_count / plan.installment_count) * 100 : 0;
                return (
                  <div key={plan.id} className={`rounded-2xl border p-4 ${overdue ? 'border-red-500/20 bg-red-500/5' : 'border-white/10 bg-white/5'}`}>
                    <button type="button" onClick={() => setExpandedPlan((current) => current === plan.id ? null : plan.id)} className="flex w-full items-center justify-between gap-4 text-left">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-semibold text-white">{shortAddress(plan.customer_address)}</span>
                          <span className={`text-xs font-bold capitalize ${overdue ? 'text-red-300' : plan.status === 'completed' ? 'text-emerald-300' : 'text-cyan-300'}`}>
                            {overdue ? 'overdue' : plan.status}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">{plan.paid_count}/{plan.installment_count} paid · {formatCurrency(plan.installment_amount)} each</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-white">{formatCurrency(plan.total_amount)}</span>
                        {expandedPlan === plan.id ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                      </div>
                    </button>

                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-cyan-400" style={{ width: `${Math.min(progress, 100)}%` }} />
                    </div>

                    {expandedPlan === plan.id && (
                      <div className="mt-4 space-y-3 border-t border-white/5 pt-3 text-sm">
                        {plan.next_payment_due && plan.status === 'active' && (
                          <div className={`inline-flex items-center gap-1.5 ${overdue ? 'text-red-300' : 'text-gray-400'}`}>
                            {overdue ? <AlertTriangle size={14} /> : <Clock size={14} />} Next payment {formatDate(plan.next_payment_due, 'medium')}
                          </div>
                        )}
                        <div className="text-gray-400">Order: <span className="text-white">{plan.order_id}</span> · Every {plan.interval_days} days</div>
                        {plan.payments.length > 0 && (
                          <div className="space-y-1">
                            {plan.payments.map((payment, index) => (
                              <div key={`${plan.id}-${index}`} className="flex items-center justify-between text-xs text-gray-400">
                                <span className="inline-flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-400" /> {formatDate(payment.paid_at, 'short')}</span>
                                <span className="text-white">{formatCurrency(payment.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
