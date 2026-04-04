'use client';

import { useMemo, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useVoicePOS } from '@/hooks/useVoicePOS';
import { useTranslation } from '@/lib/locale/useTranslation';

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

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return DEFAULT_PRODUCTS;
    return DEFAULT_PRODUCTS.filter((product) => product.name.toLowerCase().includes(query));
  }, [search]);

  const total = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);

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
            }}
          >
            {t('checkout.generateQr', 'Generate payment prompt')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
