'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { safeLocalStorage } from '@/lib/utils';

const CART_STORAGE_KEY = 'vfide.storefront-cart';

export interface CartItem {
  id: string;
  name: string;
  slug: string;
  price: number;
  qty: number;
  merchantSlug: string;
  imageUrl?: string;
  productType?: string;
  description?: string | null;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, 'qty'>, quantity?: number) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function parseStoredCart(value: string | null): CartItem[] {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item): item is Partial<CartItem> => Boolean(item && typeof item === 'object'))
      .map((item) => ({
        id: String(item.id ?? ''),
        name: String(item.name ?? ''),
        slug: String(item.slug ?? ''),
        price: Number(item.price ?? 0),
        qty: Math.max(1, Number(item.qty ?? 1)),
        merchantSlug: String(item.merchantSlug ?? ''),
        imageUrl: typeof item.imageUrl === 'string' ? item.imageUrl : undefined,
        productType: typeof item.productType === 'string' ? item.productType : undefined,
        description: typeof item.description === 'string' ? item.description : null,
      }))
      .filter((item) => item.id && item.name && item.slug && item.merchantSlug && Number.isFinite(item.price));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(parseStoredCart(safeLocalStorage.getItem(CART_STORAGE_KEY)));
  }, []);

  useEffect(() => {
    safeLocalStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: Omit<CartItem, 'qty'>, quantity = 1) => {
    setItems((current) => {
      const normalizedQuantity = Math.max(1, quantity);
      const sameMerchantItems = current.filter((entry) => entry.merchantSlug === item.merchantSlug);
      const existing = sameMerchantItems.find((entry) => entry.id === item.id);

      if (existing) {
        return sameMerchantItems.map((entry) =>
          entry.id === item.id ? { ...entry, qty: entry.qty + normalizedQuantity } : entry
        );
      }

      return [
        ...sameMerchantItems,
        {
          ...item,
          qty: normalizedQuantity,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((current) =>
      current.flatMap((item) => {
        if (item.id !== id) return [item];
        if (quantity <= 0) return [];
        return [{ ...item, qty: Math.max(1, quantity) }];
      })
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((sum, item) => sum + item.qty, 0),
    subtotal: items.reduce((sum, item) => sum + item.price * item.qty, 0),
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  }), [addItem, clearCart, items, removeItem, updateQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
