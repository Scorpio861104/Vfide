'use client';

/**
 * Buyer-side QR scanner page.
 *
 * Reached via:
 *   - PieMenu long-press → "Scan QR" quick action
 *   - Direct navigation to /scan
 *
 * Behavior:
 *   - Requests rear camera via getUserMedia
 *   - Attaches stream to a fullscreen <video>
 *   - Runs the lib/barcode scanner (BarcodeDetector on Android,
 *     jsQR fallback on iOS Safari)
 *   - On decode, validates the URL is a VFIDE payment link and
 *     redirects to /pay?merchant=...&amount=...&sig=...
 *
 * Safety:
 *   - We refuse to redirect anywhere except the same origin's /pay
 *     route. This prevents a malicious QR from opening an attacker's
 *     phishing URL (e.g. `https://fake-vfide.example/pay`).
 *   - If the QR is plain text (not a URL) we surface it and don't
 *     auto-redirect.
 */

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { ScanContent } from './components/ScanContent';
import { useLocale } from '@/lib/locale/LocaleProvider';

export default function ScanPage() {
  const { locale } = useLocale();
  void locale;

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 md:pt-[3.5rem] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
      </div>
    }>
      <ScanContent />
    </Suspense>
  );
}
