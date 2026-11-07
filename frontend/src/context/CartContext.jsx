import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const CartContext = createContext(null);

const CART_KEY = 'ekantin_cart';
const HISTORY_KEY = 'ekantin_riwayat';
const NAME_KEY = 'ekantin_customer_name';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => read(CART_KEY, []));
  const [history, setHistory] = useState(() => read(HISTORY_KEY, []));
  const [customerName, setCustomerNameState] = useState(() => read(NAME_KEY, ''));

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const setCustomerName = (name) => {
    setCustomerNameState(name);
    localStorage.setItem(NAME_KEY, JSON.stringify(name));
  };

  // key unik per kombinasi item (menu + opsi)
  const itemKey = (item) =>
    `${item.id}_${item.temperature || ''}_${item.extraRice || 0}_${item.requestedPrice || ''}`;

  const addItem = (item) => {
    setItems((prev) => {
      const key = itemKey(item);
      const existing = prev.find((i) => itemKey(i) === key);
      if (existing) {
        return prev.map((i) =>
          itemKey(i) === key ? { ...i, quantity: i.quantity + item.quantity } : i
        );
      }
      return [...prev, { ...item, key }];
    });
  };

  const updateQuantity = (key, quantity) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((i) => i.key !== key)
        : prev.map((i) => (i.key === key ? { ...i, quantity } : i))
    );
  };

  const removeItem = (key) => setItems((prev) => prev.filter((i) => i.key !== key));
  const clearCart = () => setItems([]);

  const addHistory = (order) => {
    setHistory((prev) => {
      const exists = prev.find((h) => h.id === order.id);
      if (exists) return prev.map((h) => (h.id === order.id ? { ...h, ...order } : h));
      return [{ ...order, savedAt: new Date().toISOString() }, ...prev].slice(0, 50);
    });
  };

  const updateHistory = (id, patch) => {
    setHistory((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  };

  const clearTodayHistory = () => setHistory([]);

  const total = useMemo(
    () =>
      items.reduce((sum, i) => {
        const unit = i.requestedPrice || i.price;
        return sum + unit * i.quantity + (i.extraRice || 0) * 2000;
      }, 0),
    [items]
  );

  const count = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);

  const value = useMemo(
    () => ({
      items,
      total,
      count,
      history,
      customerName,
      setCustomerName,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
      addHistory,
      updateHistory,
      clearTodayHistory,
    }),
    [items, total, count, history, customerName]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart harus dipakai di dalam CartProvider');
  return ctx;
}
