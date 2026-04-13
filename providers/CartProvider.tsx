'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export interface CartItem {
  id: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
    const qty = Math.max(1, Math.floor(quantity));
    setItems((current) => {
      const existing = current.find((entry) => entry.id === item.id);
      if (existing) {
        return current.map((entry) =>
          entry.id === item.id ? { ...entry, quantity: entry.quantity + qty } : entry
        );
      }
      return [...current, { ...item, quantity: qty }];
    });
  };

  const clear = () => setItems([]);

  const value = useMemo<CartContextValue>(() => ({ items, addItem, clear }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) {
    throw new Error('useCart must be used within CartProvider');
  }
  return value;
}
