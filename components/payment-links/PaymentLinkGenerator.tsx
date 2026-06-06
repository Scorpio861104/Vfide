'use client';
import { useState } from 'react';
import { Link2, Copy, Check, MessageCircle, ShieldCheck, AlertTriangle } from 'lucide-react';
import { isAddress } from 'viem';
import { useAccount, useSignMessage } from 'wagmi';
import { useLocale } from '@/lib/locale/LocaleProvider';
import { safeWindowOpen } from '@/lib/security/urlValidation';
// v19.10 BCOMPAT-1 FIX: cross-browser clipboard helper. Payment links
// are the central conversion path on social channels — failing the
// copy step here loses sales.
import { copyToClipboardSafe } from '@/lib/clipboardSafe';
import { buildQrSignatureMessage } from '@/lib/payments/qrSignature';

// Payment links carry merchant+amount in the URL. Without a signature those are
// tamper-able and a crafted/altered link can route a payer's funds to an attacker
// (only source=qr was previously signature-validated). The merchant signs the link
// params here, mirroring the QR flow, so /pay can reject any unsigned or tampered
// link. TTL is longer than a QR's because links are shared asynchronously.
const PAYMENT_LINK_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const LINK_SOURCE = 'link';
const LINK_SETTLEMENT = 'instant';

export function PaymentLinkGenerator({
  merchantSlug,
  merchantName,
  merchantAddress,
}: {
  merchantSlug: string;
  merchantName: string;
  merchantAddress?: string | null;
}) {
  const { formatCurrency } = useLocale();
  const { address: connectedAddress } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState('');
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vfide.io';
  const normalizedMerchantAddress = merchantAddress && isAddress(merchantAddress) ? merchantAddress : null;
  // The signature must come from the wallet the link pays, so /pay can verify it
  // against the `to` address. Require the connected wallet to match.
  const canSign =
    !!normalizedMerchantAddress &&
    !!connectedAddress &&
    connectedAddress.toLowerCase() === normalizedMerchantAddress.toLowerCase();

  const resetLink = () => { setLink(''); setSignError(null); };

  const generate = async () => {
    setSignError(null);
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setSignError('Enter a valid amount'); return; }

    // Storefront links (no merchant address) resolve the merchant server-side via
    // the /store page; merchant+amount are not trusted from the URL, so no signature
    // is required for that path.
    if (!normalizedMerchantAddress) {
      setLink(`${baseUrl}/store/${encodeURIComponent(merchantSlug)}?amount=${amount}${description ? `&desc=${encodeURIComponent(description)}` : ''}`);
      return;
    }

    if (!canSign) {
      setSignError('Connect the merchant wallet for this account to generate a secure payment link.');
      return;
    }

    setSigning(true);
    try {
      const expiresAt = Math.floor(Date.now() / 1000) + PAYMENT_LINK_TTL_SECONDS;
      const message = buildQrSignatureMessage({
        merchant: normalizedMerchantAddress,
        amount,
        orderId: '',
        source: LINK_SOURCE,
        settlement: LINK_SETTLEMENT,
        expiresAt,
      });
      const sig = await signMessageAsync({ message });
      // Carry every signed field in the URL so /pay reconstructs the exact message.
      const params = new URLSearchParams();
      params.set('to', normalizedMerchantAddress);
      params.set('amount', amount);
      params.set('source', LINK_SOURCE);
      params.set('settlement', LINK_SETTLEMENT);
      params.set('orderId', '');
      params.set('exp', String(expiresAt));
      params.set('sig', sig);
      if (description) params.set('desc', description);
      setLink(`${baseUrl}/pay?${params.toString()}`);
    } catch (e) {
      setSignError(e instanceof Error ? e.message : 'Signature rejected');
    } finally {
      setSigning(false);
    }
  };

  const copy = async () => {
    // v19.10 BCOMPAT-1 FIX: only mark as copied on actual success.
    const ok = await copyToClipboardSafe(link);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  const whatsapp = () => safeWindowOpen(`https://wa.me/?text=${encodeURIComponent(`Pay ${merchantName} ${formatCurrency(parseFloat(amount))}: ${link}`)}`, {
    allowRelative: false,
    allowedHosts: ['wa.me'],
  });

  return (<div className="space-y-4">
    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Link2 className="text-accent"/>Payment Links</h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div><label className="text-xs text-gray-500 mb-1 block">Amount</label><input type="number" value={amount} onChange={e => { setAmount(e.target.value); resetLink(); }} step="0.01" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white font-mono focus:border-accent/50 focus:outline-none"/></div>
      <div><label className="text-xs text-gray-500 mb-1 block">Description</label><input type="text" value={description} onChange={e => { setDescription(e.target.value); resetLink(); }} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white  focus:border-accent/50 focus:outline-none"/></div>
    </div>
    {normalizedMerchantAddress && !canSign && (
      <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
        <AlertTriangle size={14} className="mt-0.5 shrink-0"/>
        <span>Connect the merchant wallet ({normalizedMerchantAddress.slice(0,6)}…{normalizedMerchantAddress.slice(-4)}) to generate a tamper-proof, signed payment link.</span>
      </div>
    )}
    <button onClick={() => void generate()} disabled={signing} className="w-full flex items-center justify-center gap-2 py-3 bg-accent/20 border border-accent/30 text-accent rounded-xl font-bold text-sm disabled:opacity-50">
      <ShieldCheck size={16}/>{signing ? 'Waiting for signature…' : 'Generate secure payment link'}
    </button>
    {signError && <div className="text-xs text-red-400">{signError}</div>}
    {link&&<div className="bg-white/5 border border-white/10 rounded-xl p-3"><div className="text-xs text-gray-500 mb-1">Payment Link</div><div className="flex items-center gap-2"><code className="flex-1 text-accent text-sm truncate">{link}</code><button onClick={copy} className="p-2 rounded-lg bg-white/5 hover:bg-white/10">{copied?<Check size={14} className="text-emerald-400"/>:<Copy size={14} className="text-gray-400"/>}</button></div></div>}
    {link&&<div className="flex gap-2"><button onClick={copy} className="flex-1 flex items-center justify-center gap-2 py-3 bg-accent/20 border border-accent/30 text-accent rounded-xl font-bold text-sm"><Copy size={16}/>Copy Link</button><button onClick={whatsapp} className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl font-bold text-sm"><MessageCircle size={16}/>WhatsApp</button></div>}
  </div>);
}
