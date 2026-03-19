/**
 * Hosted Checkout Page
 * 
 * Public payment page for invoices and payment links.
 * Merchants share /checkout/[id] URLs with customers.
 * No customer authentication required to view — wallet connection to pay.
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAccount } from 'wagmi';
import { usePayMerchant } from '@/hooks/useMerchantHooks';
import { getAuthHeaders } from '@/lib/auth/client';
import { Shield, Clock, CheckCircle, AlertTriangle, FileText, ExternalLink } from 'lucide-react';

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

interface InvoiceData {
  id: number;
  invoice_number: string;
  merchant_address: string;
  customer_address: string | null;
  customer_name: string | null;
  status: string;
  token: string;
  subtotal: string;
  tax_rate: string;
  tax_amount: string;
  total: string;
  currency_display: string;
  memo: string | null;
  due_date: string | null;
  paid_at: string | null;
  tx_hash: string | null;
  created_at: string;
  items: InvoiceItem[];
  merchant_name?: string;
}

type CheckoutStatus = 'loading' | 'ready' | 'paying' | 'confirming' | 'paid' | 'error' | 'not_found' | 'already_paid';

export default function CheckoutPage() {
  const params = useParams();
  const paymentLinkId = params?.id as string;
  const { address, isConnected } = useAccount();
  const { payMerchant, isPaying } = usePayMerchant();

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [status, setStatus] = useState<CheckoutStatus>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [txHash, setTxHash] = useState('');

  // Fetch invoice data
  useEffect(() => {
    if (!paymentLinkId) return;

    const fetchInvoice = async () => {
      try {
        const res = await fetch(`/api/merchant/checkout/${paymentLinkId}`);
        if (res.status === 404) {
          setStatus('not_found');
          return;
        }
        if (!res.ok) {
          setStatus('error');
          setErrorMessage('Failed to load invoice');
          return;
        }
        const data = await res.json();
        const inv = data.invoice as InvoiceData;
        setInvoice(inv);

        if (inv.status === 'paid') {
          setStatus('already_paid');
          setTxHash(inv.tx_hash ?? '');
        } else if (inv.status === 'cancelled') {
          setStatus('error');
          setErrorMessage('This invoice has been cancelled');
        } else {
          setStatus('ready');

          // Mark as viewed if currently sent
          if (inv.status === 'sent') {
            fetch(`/api/merchant/checkout/${paymentLinkId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'view' }),
            }).catch(() => {});
          }
        }
      } catch {
        setStatus('error');
        setErrorMessage('Failed to load checkout');
      }
    };

    fetchInvoice();
  }, [paymentLinkId]);

  // Handle payment
  const handlePay = useCallback(async () => {
    if (!invoice || !address || !isConnected) return;

    setStatus('paying');

    try {
      const result = await payMerchant(
        invoice.merchant_address as `0x${string}`,
        invoice.token as `0x${string}`,
        String(invoice.total),
        `INV-${invoice.invoice_number}`,
      );

      setStatus('confirming');

      // Mark invoice as paid
      const hash = typeof result === 'string' ? result : '';
      setTxHash(hash);

      await fetch(`/api/merchant/checkout/${paymentLinkId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ action: 'pay', tx_hash: hash }),
      });

      setStatus('paid');
    } catch (err) {
      setStatus('ready');
      setErrorMessage(err instanceof Error ? err.message : 'Payment failed');
    }
  }, [invoice, address, isConnected, payMerchant, paymentLinkId]);

  // ─────────────────────────── Render

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (status === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Invoice Not Found</h1>
          <p className="text-gray-500 mt-2">This payment link may have expired or been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-2">
            <Shield className="w-4 h-4" />
            <span>Secured by VFIDE</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            {status === 'paid' || status === 'already_paid' ? 'Payment Complete' : 'Checkout'}
          </h1>
        </div>

        {/* Invoice Card */}
        {invoice && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
            {/* Merchant & Invoice Header */}
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Invoice</p>
                  <p className="font-mono font-medium text-gray-800 dark:text-gray-200">
                    {invoice.invoice_number}
                  </p>
                </div>
                <StatusBadge status={status === 'paid' || status === 'already_paid' ? 'paid' : invoice.status} />
              </div>

              {invoice.due_date && status === 'ready' && (
                <div className="flex items-center gap-1.5 mt-3 text-sm text-gray-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Due {new Date(invoice.due_date).toLocaleDateString()}</span>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="p-6 space-y-3">
              {invoice.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <div>
                    <p className="text-gray-800 dark:text-gray-200">{item.description}</p>
                    {item.quantity !== 1 && (
                      <p className="text-xs text-gray-500">
                        {item.quantity} x {Number(item.unit_price).toFixed(4)} {invoice.currency_display}
                      </p>
                    )}
                  </div>
                  <p className="font-medium text-gray-800 dark:text-gray-200">
                    {Number(item.amount).toFixed(4)} {invoice.currency_display}
                  </p>
                </div>
              ))}

              {/* Totals */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-3 mt-3 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>{Number(invoice.subtotal).toFixed(4)} {invoice.currency_display}</span>
                </div>
                {Number(invoice.tax_rate) > 0 && (
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>Tax ({Number(invoice.tax_rate)}%)</span>
                    <span>{Number(invoice.tax_amount).toFixed(4)} {invoice.currency_display}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold text-gray-800 dark:text-gray-200 pt-1">
                  <span>Total</span>
                  <span>{Number(invoice.total).toFixed(4)} {invoice.currency_display}</span>
                </div>
              </div>

              {/* Memo */}
              {invoice.memo && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mt-3">
                  <p className="text-xs text-gray-500 mb-1">Note</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{invoice.memo}</p>
                </div>
              )}
            </div>

            {/* Payment Action */}
            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
              {(status === 'paid' || status === 'already_paid') && (
                <div className="text-center">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-green-600 dark:text-green-400 font-semibold mb-2">Payment Successful</p>
                  {txHash && (
                    <a
                      href={`https://explorer.zksync.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                    >
                      View Transaction <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {status === 'ready' && (
                <>
                  {!isConnected ? (
                    <div className="text-center">
                      <p className="text-sm text-gray-500 mb-3">Connect your wallet to pay</p>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Connect Wallet</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => void handlePay()}
                      disabled={isPaying}
                      className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400
                                 text-white font-semibold rounded-xl transition-colors"
                    >
                      {isPaying ? 'Processing...' : `Pay ${Number(invoice.total).toFixed(4)} ${invoice.currency_display}`}
                    </button>
                  )}
                </>
              )}

              {status === 'paying' && (
                <div className="text-center py-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Confirm in your wallet...</p>
                </div>
              )}

              {status === 'confirming' && (
                <div className="text-center py-2">
                  <div className="animate-pulse text-blue-600 font-medium">Confirming on-chain...</div>
                </div>
              )}

              {errorMessage && status !== 'paid' && status !== 'already_paid' && (
                <div className="flex items-start gap-2 mt-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Payments are processed on-chain via VFIDE MerchantPortal. No card details required.
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    viewed: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${styles[status] ?? styles.draft}`}>
      {status}
    </span>
  );
}
