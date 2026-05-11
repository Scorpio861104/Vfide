/**
 * Universal QR / barcode scanner.
 *
 * Strategy:
 *   - Try the browser-native `BarcodeDetector` API first (Android Chrome,
 *     Edge, desktop Chrome). Fastest, runs off the main thread.
 *   - Fall back to jsQR for iOS Safari and any browser without
 *     BarcodeDetector. jsQR is pure JavaScript and works everywhere
 *     `getUserMedia` works (which is iOS Safari 11+).
 *
 * Both paths drive the SAME `<video>` element that the caller has already
 * attached the camera stream to (via getUserMedia in the page that uses
 * this module — see components/commerce/simplified/SimplifiedPOS.tsx for
 * the canonical wiring).
 *
 * Only QR codes are decoded in the fallback path — the BarcodeDetector
 * path also handles EAN-13, UPC-A, and Code 128 for product-barcode
 * scanning. iOS users get QR-only fallback (which is what we need for
 * VFIDE payments anyway).
 */

export type BarcodeCallback = (decodedText: string, format: string) => void;

let detectorActive = false;
let rafHandle: number | null = null;

function hasNativeDetector(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

export function isScannerSupported(): boolean {
  // We support EITHER the native API OR a jsQR fallback. The fallback
  // needs getUserMedia + canvas, both available on iOS Safari 11+.
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return false;
  }
  return true;
}

export async function startScanner(_elementId: string, onScan: BarcodeCallback): Promise<void> {
  if (!isScannerSupported()) {
    throw new Error('Camera scanning is not supported on this device');
  }

  detectorActive = true;

  const video = document.querySelector('video');
  if (!video) {
    throw new Error('Scanner could not find a <video> element to read from');
  }

  if (hasNativeDetector()) {
    await startNativeDetector(video, onScan);
  } else {
    await startJsQrFallback(video, onScan);
  }
}

export async function stopScanner(): Promise<void> {
  detectorActive = false;
  if (rafHandle !== null) {
    if (typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(rafHandle);
    }
    rafHandle = null;
  }
}

// ── Native BarcodeDetector path ─────────────────────────────────────────────
// Used on Android Chrome, Edge, desktop Chrome.

async function startNativeDetector(
  video: HTMLVideoElement,
  onScan: BarcodeCallback,
): Promise<void> {
  type DetectorResult = { rawValue?: string; format?: string };
  type DetectorCtor = new (options?: { formats?: string[] }) => {
    detect: (source: ImageBitmapSource) => Promise<DetectorResult[]>;
  };
  const Detector = (window as unknown as { BarcodeDetector: DetectorCtor }).BarcodeDetector;
  const detector = new Detector({
    formats: ['qr_code', 'ean_13', 'upc_a', 'code_128'],
  });

  const scanFrame = async () => {
    if (!detectorActive) return;
    try {
      const results = await detector.detect(video as ImageBitmapSource);
      const first = results[0];
      if (first?.rawValue) {
        onScan(first.rawValue, first.format || 'qr_code');
        detectorActive = false;
        return;
      }
    } catch {
      // Transient camera/decode errors — ignore and keep scanning.
    }
    rafHandle = window.requestAnimationFrame(scanFrame);
  };

  rafHandle = window.requestAnimationFrame(scanFrame);
}

// ── jsQR fallback path ──────────────────────────────────────────────────────
// Used on iOS Safari and any browser without BarcodeDetector.

let cachedCanvas: HTMLCanvasElement | null = null;
let cachedCtx: CanvasRenderingContext2D | null = null;

function getCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  if (!cachedCanvas) {
    cachedCanvas = document.createElement('canvas');
  }
  if (cachedCanvas.width !== width)  cachedCanvas.width = width;
  if (cachedCanvas.height !== height) cachedCanvas.height = height;
  if (!cachedCtx || cachedCtx.canvas !== cachedCanvas) {
    cachedCtx = cachedCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (!cachedCtx) {
    throw new Error('Could not get 2D canvas context for QR fallback');
  }
  return { canvas: cachedCanvas, ctx: cachedCtx };
}

async function startJsQrFallback(
  video: HTMLVideoElement,
  onScan: BarcodeCallback,
): Promise<void> {
  // Lazy-import jsQR so the BarcodeDetector path doesn't pay its ~14KB cost.
  const jsQRModule = await import('jsqr');
  const jsQR = jsQRModule.default ?? jsQRModule;

  // Throttle to ~10 scans/sec on iOS — scanning every animation frame is
  // overkill for QR detection and burns battery.
  let lastScan = 0;
  const SCAN_INTERVAL_MS = 100;

  const scanFrame = (timestamp: number) => {
    if (!detectorActive) return;

    if (timestamp - lastScan < SCAN_INTERVAL_MS) {
      rafHandle = window.requestAnimationFrame(scanFrame);
      return;
    }
    lastScan = timestamp;

    // Skip when video has no frames yet.
    if (video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
      rafHandle = window.requestAnimationFrame(scanFrame);
      return;
    }

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) {
      rafHandle = window.requestAnimationFrame(scanFrame);
      return;
    }

    try {
      const { ctx } = getCanvas(w, h);
      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);
      // dontInvert: standard QR codes have dark modules on light background.
      // Inverted codes are rare in payment use; skipping them saves CPU.
      const code = jsQR(imageData.data, w, h, { inversionAttempts: 'dontInvert' });
      if (code?.data) {
        onScan(code.data, 'qr_code');
        detectorActive = false;
        return;
      }
    } catch {
      // Transient — drop this frame and try the next.
    }

    rafHandle = window.requestAnimationFrame(scanFrame);
  };

  rafHandle = window.requestAnimationFrame(scanFrame);
}
