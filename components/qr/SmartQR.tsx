/**
 * Smart QR Code — One code, two functions
 * 
 * Scanned with any camera app → opens the store page
 * Scanned with VFIDE app → opens payment flow directly
 * 
 * Also used for:
 * - POS payment requests (merchant shows QR, buyer scans)
 * - Store link sharing (print on business card / receipt)
 * - Product-specific payment links
 * 
 * Uses a universal link format: https://vfide.io/pay/[slug]?amount=25&ref=pos
 * The /pay route detects if the user has the app and routes accordingly.
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { QrCode, Download, Copy, Check, Share2, Printer } from 'lucide-react';
import QRCode from 'qrcode';

// ── Types ───────────────────────────────────────────────────────────────────

interface QRPaymentData {
  merchantSlug: string;
  merchantName: string;
  merchantAddress: string;
  amount?: number;          // If set, creates a payment request. If not, just a store link.
  description?: string;
  currency?: string;
  reference?: string;       // POS charge ID or order ID
}

interface SmartQRProps extends QRPaymentData {
  size?: number;
  showActions?: boolean;
  onScan?: () => void;
}

// ── QR Generation (using browser canvas) ────────────────────────────────────

async function generateQRDataUrl(text: string, size: number, fgColor: string, bgColor: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      color: {
        dark: fgColor,
        light: bgColor,
      },
      errorCorrectionLevel: 'M',
    });
  } catch {
    return '';
  }
}

// ── Build Payment URL ───────────────────────────────────────────────────────

function buildPaymentUrl(data: QRPaymentData): string {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://vfide.io';
  const url = new URL(`${base}/pay/${data.merchantSlug}`);

  if (data.amount) url.searchParams.set('amount', data.amount.toFixed(2));
  if (data.description) url.searchParams.set('desc', data.description);
  if (data.currency) url.searchParams.set('cur', data.currency);
  if (data.reference) url.searchParams.set('ref', data.reference);

  return url.toString();
}

// ── Component ───────────────────────────────────────────────────────────────

export function SmartQR({
  size = 240,
  showActions = true,
  onScan,
  ...data
}: SmartQRProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const paymentUrl = buildPaymentUrl(data);

  useEffect(() => {
    let cancelled = false;

    void generateQRDataUrl(paymentUrl, size * 2, '#ffffff', '#09090b').then((url) => {
      if (!cancelled) {
        setQrDataUrl(url);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [paymentUrl, size]);

  const copyLink = () => {
    navigator.clipboard.writeText(paymentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `vfide-${data.merchantSlug}${data.amount ? `-$${data.amount}` : ''}.png`;
    a.click();
  };

  const shareQR = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.amount ? `Pay ${data.merchantName} $${data.amount}` : data.merchantName,
          text: data.description || `Pay ${data.merchantName} on VFIDE`,
          url: paymentUrl,
        });
      } catch { /* cancelled */ }
    } else {
      copyLink();
    }
  };

  const printQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>VFIDE QR - ${data.merchantName}</title>
      <style>
        body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui; margin: 0; }
        img { width: 300px; height: 300px; }
        h2 { margin: 20px 0 5px; font-size: 24px; }
        p { color: #666; margin: 5px 0; font-size: 14px; }
        .amount { font-size: 32px; font-weight: bold; margin: 10px 0; }
      </style></head><body>
        <img src="${qrDataUrl}" alt="QR Code" />
        <h2>${data.merchantName}</h2>
        ${data.amount ? `<div class="amount">$${data.amount.toFixed(2)}</div>` : ''}
        ${data.description ? `<p>${data.description}</p>` : ''}
        <p style="font-size: 12px; color: #999; margin-top: 20px;">Scan to pay with VFIDE</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="flex flex-col items-center">
      {/* QR Code */}
      <motion.div
        ref={canvasRef}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative p-4 bg-zinc-950 rounded-2xl border border-white/10"
      >
        {qrDataUrl ? (
          <Image src={qrDataUrl} alt="Payment QR Code" width={size} height={size} className="rounded-lg" />
        ) : (
          <div style={{ width: size, height: size }} className="bg-white/5 rounded-lg flex items-center justify-center">
            <QrCode size={48} className="text-gray-600 animate-pulse" />
          </div>
        )}

        {/* Center logo overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-10 h-10 bg-zinc-950 rounded-lg flex items-center justify-center border border-white/10">
            <span className="text-cyan-400 font-black text-xs">V</span>
          </div>
        </div>
      </motion.div>

      {/* Info below QR */}
      {data.amount && (
        <div className="text-center mt-3">
          <div className="text-2xl font-bold text-white font-mono">${data.amount.toFixed(2)}</div>
          {data.description && <div className="text-gray-400 text-sm mt-0.5">{data.description}</div>}
        </div>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-2 mt-4">
          <button onClick={copyLink}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-xs hover:text-white transition-colors">
            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button onClick={downloadQR}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-xs hover:text-white transition-colors">
            <Download size={14} /> Save
          </button>
          <button onClick={shareQR}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-xs hover:text-white transition-colors">
            <Share2 size={14} /> Share
          </button>
          <button onClick={printQR}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-xs hover:text-white transition-colors">
            <Printer size={14} /> Print
          </button>
        </div>
      )}
    </div>
  );
}

export { buildPaymentUrl };
