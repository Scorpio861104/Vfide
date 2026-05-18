'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, X, AlertCircle, ChevronLeft } from 'lucide-react';
import { startScanner, stopScanner, isScannerSupported } from '@/lib/barcode';

type ScanState =
  | { kind: 'idle' }
  | { kind: 'starting' }
  | { kind: 'scanning' }
  | { kind: 'unsupported' }
  | { kind: 'permission_denied' }
  | { kind: 'camera_error'; message: string }
  | { kind: 'decoded'; raw: string };

/**
 * Validate that a decoded QR is a same-origin VFIDE payment URL and
 * return ONLY the relative path. Returns null if the URL is not a safe
 * redirect target.
 *
 * We allow:
 *   - https://<this-origin>/pay?... (the canonical SmartQR output)
 *   - Relative path /pay?... (rare; some QR generators omit origin)
 *
 * We REJECT:
 *   - Any cross-origin URL, even if it looks like /pay
 *   - javascript: / data: / mailto: schemes
 *   - URLs without /pay as the path
 */
function safeRedirectFromQr(raw: string): string | null {
  if (!raw || raw.length > 2000) return null;

  const trimmed = raw.trim();

  // Reject obvious scheme-attacks upfront.
  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) return null;

  // Relative path form
  if (trimmed.startsWith('/pay')) {
    return trimmed;
  }

  // Full URL — must be same-origin
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (typeof window === 'undefined') return null;
  if (parsed.origin !== window.location.origin) return null;
  if (parsed.pathname !== '/pay' && !parsed.pathname.startsWith('/pay/')) return null;

  return parsed.pathname + parsed.search;
}

export function ScanContent() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<ScanState>({ kind: 'idle' });

  const teardown = useCallback(() => {
    void stopScanner();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const start = useCallback(async () => {
    if (!isScannerSupported()) {
      setState({ kind: 'unsupported' });
      return;
    }
    setState({ kind: 'starting' });

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // playsInline + muted for iOS Safari to autoplay.
        await videoRef.current.play().catch(() => {/* user gesture path */});
      }
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        setState({ kind: 'permission_denied' });
        return;
      }
      setState({ kind: 'camera_error', message: (err as Error).message || 'Could not access camera' });
      return;
    }

    setState({ kind: 'scanning' });

    try {
      await startScanner('scan-page-video', (decoded) => {
        setState({ kind: 'decoded', raw: decoded });
        teardown();
      });
    } catch (err) {
      setState({ kind: 'camera_error', message: (err as Error).message || 'Scanner failed to start' });
      teardown();
    }
  }, [teardown]);

  // Auto-start on mount.
  useEffect(() => {
    void start();
    return () => { teardown(); };
  }, [start, teardown]);

  // Redirect when we have a valid VFIDE payment URL.
  useEffect(() => {
    if (state.kind !== 'decoded') return;
    const safePath = safeRedirectFromQr(state.raw);
    if (safePath) {
      router.replace(safePath);
    }
    // If safePath is null we render the "unrecognized QR" UI below
    // instead of redirecting.
  }, [state, router]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-zinc-950/80 backdrop-blur border-b border-zinc-800">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-zinc-300 hover:text-white"
          aria-label="Go back"
        >
          <ChevronLeft size={20} />
          <span>Back</span>
        </button>
        <h1 className="text-base font-medium">Scan to pay</h1>
        <button
          onClick={() => { teardown(); router.back(); }}
          className="text-zinc-400 hover:text-white"
          aria-label="Close scanner"
        >
          <X size={20} />
        </button>
      </header>

      {/* Viewfinder */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          playsInline
        />

        {/* Targeting reticle */}
        <div className="relative z-10 w-64 h-64 max-w-[70vw] max-h-[70vw]" aria-hidden="true">
          <div className="absolute inset-0 border-2 border-cyan-400/80 rounded-2xl" />
          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-300 rounded-tl-2xl" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-300 rounded-tr-2xl" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-300 rounded-bl-2xl" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-300 rounded-br-2xl" />
        </div>

        {/* Status overlays */}
        {state.kind === 'starting' && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-zinc-900/90 rounded-full text-sm">
            <Camera size={14} className="inline mr-2" />
            Starting camera…
          </div>
        )}

        {state.kind === 'scanning' && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-zinc-900/90 rounded-full text-sm">
            Point your camera at a payment QR
          </div>
        )}

        {state.kind === 'unsupported' && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/95 px-6">
            <div className="max-w-sm text-center space-y-4">
              <AlertCircle size={40} className="mx-auto text-amber-400" />
              <h2 className="text-lg font-semibold">Camera not available</h2>
              <p className="text-sm text-zinc-400">
                Your browser doesn&apos;t support in-app QR scanning. Use your phone&apos;s
                Camera app instead — it&apos;ll open the VFIDE payment page automatically.
              </p>
            </div>
          </div>
        )}

        {state.kind === 'permission_denied' && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/95 px-6">
            <div className="max-w-sm text-center space-y-4">
              <AlertCircle size={40} className="mx-auto text-red-400" />
              <h2 className="text-lg font-semibold">Camera access blocked</h2>
              <p className="text-sm text-zinc-400">
                Allow camera access for this site in your browser settings, then reload.
              </p>
            </div>
          </div>
        )}

        {state.kind === 'camera_error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/95 px-6">
            <div className="max-w-sm text-center space-y-4">
              <AlertCircle size={40} className="mx-auto text-red-400" />
              <h2 className="text-lg font-semibold">Camera error</h2>
              <p className="text-sm text-zinc-400">{state.message}</p>
              <button
                onClick={() => void start()}
                className="mt-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-lg text-sm font-medium"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {state.kind === 'decoded' && !safeRedirectFromQr(state.raw) && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/95 px-6">
            <div className="max-w-sm text-center space-y-4">
              <AlertCircle size={40} className="mx-auto text-amber-400" />
              <h2 className="text-lg font-semibold">Unrecognized QR</h2>
              <p className="text-sm text-zinc-400 break-words">
                This QR doesn&apos;t look like a VFIDE payment link.
              </p>
              <code className="block text-xs bg-zinc-900 p-3 rounded text-zinc-500 break-all">
                {state.raw.slice(0, 200)}{state.raw.length > 200 ? '…' : ''}
              </code>
              <button
                onClick={() => void start()}
                className="mt-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-lg text-sm font-medium"
              >
                Scan again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
