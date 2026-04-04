'use client';

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVoicePOS } from '@/hooks/useVoicePOS';
import { startScanner, stopScanner, isScannerSupported } from '@/lib/barcode';
import { useTranslation } from '@/lib/locale/useTranslation';
import { writePaymentNFC, isNFCSupported } from '@/lib/nfc';
import { printReceipt, isPrinterSupported } from '@/lib/printer';

type Product = { id: string; name: string; price: number };
type CartItem = Product & { qty: number };

const DEFAULT_PRODUCTS: Product[] = [
  { id: '1', name: 'Bread', price: 2.5 },
  { id: '2', name: 'Milk', price: 1.75 },
  { id: '3', name: 'Rice', price: 5.2 },
  { id: '4', name: 'Soap', price: 1.1 },
];

export default function SimplifiedPOS() {
  const { t } = useTranslation();
  const voice = useVoicePOS();
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [deviceStatus, setDeviceStatus] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return DEFAULT_PRODUCTS;
    return DEFAULT_PRODUCTS.filter((product) => product.name.toLowerCase().includes(query));
  }, [search]);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);

  const stopActiveStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => () => {
    void stopScanner();
    stopActiveStream();
  }, []);

  const addToCart = (product: Product) => {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      const next = existing
        ? current.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item)
        : [...current, { ...product, qty: 1 }];
      voice.announceCartAdd(product.name, 1, next.reduce((sum, item) => sum + item.price * item.qty, 0));
      return next;
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((current) => {
      const target = current.find((item) => item.id === productId);
      if (target) voice.announceCartRemove(target.name);
      return current
        .map((item) => item.id === productId ? { ...item, qty: item.qty - 1 } : item)
        .filter((item) => item.qty > 0);
    });
  };

  const handleScan = async () => {
    if (!isScannerSupported()) {
      setDeviceStatus(t('simplifiedPos.scanUnsupported', 'Barcode scan is not supported on this device.'));
      return;
    }

    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setDeviceStatus(t('simplifiedPos.cameraUnavailable', 'Camera access is not available on this device.'));
      return;
    }

    try {
      setDeviceStatus(t('simplifiedPos.scanPrompt', 'Point your camera at a product barcode.'));
      setIsScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }

      await startScanner('simplified-pos-scanner', (decodedText) => {
        const normalized = decodedText.trim().toLowerCase();
        const matched = DEFAULT_PRODUCTS.find((product) => (
          product.id === normalized ||
          product.name.toLowerCase() === normalized ||
          product.name.toLowerCase().includes(normalized)
        ));

        if (matched) {
          addToCart(matched);
          setSearch('');
          setDeviceStatus(`Scanned ${matched.name} and added it to the cart.`);
        } else {
          setSearch(decodedText);
          setDeviceStatus(`Scanned ${decodedText}. Review the search results and add the matching item.`);
        }

        setIsScanning(false);
        stopActiveStream();
        void stopScanner();
      });
    } catch (error) {
      setDeviceStatus(error instanceof Error ? error.message : 'Unable to start barcode scanner.');
      setIsScanning(false);
      stopActiveStream();
      void stopScanner();
    }
  };

  const handleWriteNFC = async () => {
    if (total <= 0) {
      setDeviceStatus(t('simplifiedPos.nfcRequiresCart', 'Add an item before creating a tap-to-pay tag.'));
      return;
    }

    if (!isNFCSupported()) {
      setDeviceStatus(t('simplifiedPos.nfcUnsupported', 'NFC tap-to-pay is not supported on this device.'));
      return;
    }

    const result = await writePaymentNFC('vfide-pos', Number(total.toFixed(2)), 'USD');
    setDeviceStatus(
      result.success
        ? t('simplifiedPos.nfcReady', 'Tap-to-pay link written to the NFC tag.')
        : `${t('simplifiedPos.nfcFailed', 'Unable to write the NFC tag.')} ${result.error ?? ''}`.trim()
    );
  };

  const handlePrintReceipt = async () => {
    if (cart.length === 0) {
      setDeviceStatus(t('simplifiedPos.printRequiresCart', 'Add an item before printing a receipt.'));
      return;
    }

    if (!isPrinterSupported()) {
      setDeviceStatus(t('simplifiedPos.printUnsupported', 'Bluetooth receipt printing is not available on this device.'));
      return;
    }

    const result = await printReceipt({
      merchantName: 'VFIDE POS',
      items: cart.map(({ name, qty, price }) => ({ name, qty, price })),
      subtotal: total,
      total,
      paymentMethod: 'VFIDE QR / Tap',
    });

    setDeviceStatus(
      result.success
        ? t('simplifiedPos.printReady', 'Receipt sent to the paired printer.')
        : `${t('simplifiedPos.printFailed', 'Unable to print the receipt.')} ${result.error ?? ''}`.trim()
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>{t('simplifiedPos.title', 'Simplified POS')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              placeholder={t('common.search', 'Search products')}
              className="min-w-[220px] flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            />
            <Button variant={voice.enabled ? 'default' : 'outline'} onClick={voice.toggle}>
              {voice.enabled ? t('common.voiceOn', 'Voice on') : t('common.voiceOff', 'Voice off')}
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            <Button type="button" variant="outline" onClick={() => void handleScan()}>
              {t('simplifiedPos.scanBarcode', 'Scan barcode')}
            </Button>
            <Button type="button" variant="outline" onClick={() => void handleWriteNFC()} disabled={total <= 0}>
              {t('simplifiedPos.writeTapToPay', 'Write tap-to-pay')}
            </Button>
            <Button type="button" variant="outline" onClick={() => void handlePrintReceipt()} disabled={cart.length === 0}>
              {t('simplifiedPos.printReceipt', 'Print receipt')}
            </Button>
          </div>

          {deviceStatus ? (
            <div role="status" className="rounded-md border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 text-sm text-cyan-100">
              {deviceStatus}
            </div>
          ) : null}

          {isScanning ? (
            <div id="simplified-pos-scanner" className="overflow-hidden rounded-lg border border-dashed border-white/10 bg-black/30 p-2">
              <video ref={videoRef} className="max-h-52 w-full rounded-md object-cover" autoPlay muted playsInline />
            </div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-2">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => addToCart(product)}
                className="rounded-lg border p-3 text-left transition hover:bg-muted"
              >
                <div className="font-medium">{product.name}</div>
                <div className="text-sm text-muted-foreground">${product.price.toFixed(2)}</div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('checkout.cart', 'Cart')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cart.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('checkout.empty', 'No items yet.')}</p>
          ) : cart.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
              <div>
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-muted-foreground">{item.qty} × ${item.price.toFixed(2)}</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => removeFromCart(item.id)}>-</Button>
            </div>
          ))}

          <div className="rounded-md bg-muted p-3">
            <div className="flex items-center justify-between text-sm">
              <span>{t('checkout.total', 'Total')}</span>
              <span className="font-semibold">${total.toFixed(2)}</span>
            </div>
          </div>

          <Button
            className="w-full"
            disabled={total <= 0}
            onClick={() => {
              voice.announceQRReady(total);
              voice.announceTotal(total);
              setDeviceStatus(t('checkout.promptReady', 'Payment prompt ready for QR, NFC, and receipt actions.'));
            }}
          >
            {t('checkout.generateQr', 'Generate payment prompt')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
