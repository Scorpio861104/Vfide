/**
 * WhatsApp Receipt — Generate shareable receipt text and open WhatsApp
 * 
 * Target: market sellers sending receipts to customers via WhatsApp.
 * No server dependency — generates text client-side.
 * Works on any phone with WhatsApp installed.
 * 
 * Usage:
 *   <WhatsAppReceipt receipt={receipt} />
 *   <WhatsAppReceipt receipt={receipt} phoneNumber="+233201234567" />
 */
'use client';

import { useState } from 'react';
import { MessageCircle, Copy, Check } from 'lucide-react';
import { safeWindowOpen } from '@/lib/security/urlValidation';

export interface ReceiptData {
  merchantName: string;
  items: { name: string; qty: number; price: number }[];
  subtotal: number;
  fee: number;
  total: number;
  txHash?: string;
  timestamp: number;
  paymentMethod: 'VFIDE' | 'stablecoin';
  buyerAddress?: string;
}

function formatReceipt(receipt: ReceiptData): string {
  const date = new Date(receipt.timestamp).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const lines = [
    `🧾 *Receipt — ${receipt.merchantName}*`,
    `📅 ${date}`,
    ``,
    `*Items:*`,
    ...receipt.items.map(item =>
      `  ${item.name} × ${item.qty} — $${(item.price * item.qty).toFixed(2)}`
    ),
    ``,
    `Subtotal: $${receipt.subtotal.toFixed(2)}`,
    receipt.fee > 0 ? `Fee: $${receipt.fee.toFixed(2)}` : null,
    `*Total: $${receipt.total.toFixed(2)} ${receipt.paymentMethod}*`,
    ``,
    receipt.txHash ? `🔗 Tx: ${receipt.txHash.slice(0, 10)}...${receipt.txHash.slice(-8)}` : null,
    ``,
    `Powered by VFIDE — trust-scored payments`,
  ].filter(Boolean).join('\n');

  return lines;
}

interface WhatsAppReceiptProps {
  receipt: ReceiptData;
  phoneNumber?: string;
  className?: string;
}

export function WhatsAppReceipt({ receipt, phoneNumber, className = '' }: WhatsAppReceiptProps) {
  const [copied, setCopied] = useState(false);
  const text = formatReceipt(receipt);
  const encoded = encodeURIComponent(text);

  const whatsappUrl = phoneNumber
    ? `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  const copyReceipt = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl font-bold hover:bg-emerald-500/30 transition-colors"
      >
        <MessageCircle size={18} />
        Send via WhatsApp
      </a>
      <button
        onClick={copyReceipt}
        className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
      >
        {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
      </button>
    </div>
  );
}

/**
 * Standalone function to open WhatsApp with receipt.
 * For programmatic use outside React components.
 */
export function sendReceiptViaWhatsApp(receipt: ReceiptData, phoneNumber?: string): void {
  const text = formatReceipt(receipt);
  const encoded = encodeURIComponent(text);
  const url = phoneNumber
    ? `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  safeWindowOpen(url, { allowRelative: false, allowedHosts: ['wa.me'] });
}
