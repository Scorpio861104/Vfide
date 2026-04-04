export type BarcodeCallback = (decodedText: string, format: string) => void;

let detectorActive = false;

export async function startScanner(_elementId: string, onScan: BarcodeCallback): Promise<void> {
  if (!isScannerSupported()) {
    throw new Error('Barcode scanning is not supported on this device');
  }

  detectorActive = true;

  if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
    const detector = new (window as unknown as { BarcodeDetector: new (options?: { formats?: string[] }) => { detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string; format?: string }>> } }).BarcodeDetector({
      formats: ['qr_code', 'ean_13', 'upc_a', 'code_128'],
    });

    const video = document.querySelector('video');
    if (!video) return;

    const scanFrame = async () => {
      if (!detectorActive) return;
      try {
        const results = await detector.detect(video as ImageBitmapSource);
        const first = results[0];
        if (first?.rawValue) {
          onScan(first.rawValue, first.format || 'unknown');
          detectorActive = false;
          return;
        }
      } catch {
        // ignore transient camera/decode errors
      }
      window.requestAnimationFrame(scanFrame);
    };

    window.requestAnimationFrame(scanFrame);
  }
}

export async function stopScanner(): Promise<void> {
  detectorActive = false;
}

export function isScannerSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && (typeof window === 'undefined' || 'BarcodeDetector' in window);
}
