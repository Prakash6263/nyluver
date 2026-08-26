import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { I18nManager } from 'react-native';
import type { Language, TranslationKey } from '@/lib/i18n';
import { t as translate } from '@/lib/i18n';
import type { CartItem, Order, AddOn, Product } from '@/lib/data';
import * as store from '@/lib/store';
import { getApiUrl } from '@/lib/query-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
  cart: CartItem[];
  addToCart: (product: Product, addOns: AddOn[], cardMessage: string, qty?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartItemQty: (productId: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: number;
  cartCount: number;
  orders: Order[];
  placeOrder: (order: Omit<Order, 'id' | 'createdAt'>) => Promise<Order | null>;
  points: number;
  addPoints: (p: number) => void;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>('en');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [points, setPoints] = useState(0);
  const [onboarded, setOnboardedState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [savedLang, savedCart, savedOrders, savedPoints, savedOnboarded] = await Promise.all([
        store.getLanguage(),
        store.getCart(),
        store.getOrders(),
        store.getPoints(),
        store.getOnboarded(),
      ]);
      if (savedLang) setLangState(savedLang);
      setCart(savedCart);
      setOrders(savedOrders);
      setPoints(savedPoints);
      setOnboardedState(savedOnboarded);
      setIsLoading(false);
    })();
  }, []);

  const setLang = useCallback((l: Language) => {
    setLangState(l);
    store.setLanguage(l);
    const shouldBeRTL = l === 'ar';
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.forceRTL(shouldBeRTL);
    }
  }, []);

  const tFn = useCallback((key: TranslationKey) => translate(key, lang), [lang]);
  const isRTL = lang === 'ar';

  const addToCart = useCallback((product: Product, addOns: AddOn[], cardMessage: string, qty = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      let newCart: CartItem[];
      if (existing) {
        newCart = prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + qty, addOns, cardMessage }
            : item
        );
      } else {
        newCart = [...prev, { product, quantity: qty, addOns, cardMessage }];
      }
      store.saveCart(newCart);
      return newCart;
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prev => {
      const newCart = prev.filter(item => item.product.id !== productId);
      store.saveCart(newCart);
      return newCart;
    });
  }, []);

  const updateCartItemQty = useCallback((productId: string, qty: number) => {
    setCart(prev => {
      const newCart = qty <= 0
        ? prev.filter(item => item.product.id !== productId)
        : prev.map(item => item.product.id === productId ? { ...item, quantity: qty } : item);
      store.saveCart(newCart);
      return newCart;
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    store.saveCart([]);
  }, []);

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => {
      const addOnTotal = item.addOns.reduce((a, ao) => a + ao.price, 0);
      return sum + (item.product.price + addOnTotal) * item.quantity;
    }, 0);
  }, [cart]);

  const cartCount = useMemo(() => cart.reduce((s, i) => s + i.quantity, 0), [cart]);

  const placeOrder = useCallback(async (orderData: Omit<Order, 'id' | 'createdAt'>): Promise<Order | null> => {
    try {
      const apiItems = orderData.items.map(item => ({
        productId: item.product.id,
        productNameEn: item.product.nameEn,
        productNameAr: item.product.nameAr,
        productImage: item.product.images?.[0] || '',
        quantity: item.quantity,
        unitPrice: item.product.price.toString(),
        addOns: item.addOns.map(a => ({
          addOnId: a.id,
          nameEn: a.nameEn,
          nameAr: a.nameAr,
          price: a.price.toString(),
        })),
      }));

      const addOnsTotal = orderData.items.reduce((sum, item) =>
        sum + item.addOns.reduce((a, ao) => a + ao.price, 0) * item.quantity, 0);
      const subtotal = orderData.items.reduce((sum, item) =>
        sum + item.product.price * item.quantity, 0) + addOnsTotal;
      const expressFee = orderData.isExpress ? 15 : 0;

      const token = await AsyncStorage.getItem('nyluver_auth_token');

      const baseUrl = getApiUrl();
      const url = new URL('/api/orders/app', baseUrl).toString();

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          items: apiItems,
          recipientName: orderData.recipientName,
          recipientPhone: orderData.recipientPhone,
          address: orderData.address || '',
          slotDate: orderData.slotDate,
          slotTime: orderData.slotId === 'morning' ? '10:00-13:00' : orderData.slotId === 'afternoon' ? '13:00-18:00' : '18:00-21:00',
          cardMessage: orderData.cardMessage || '',
          paymentMethod: orderData.paymentMethod,
          subtotal,
          deliveryFee: 0,
          expressFee,
          discount: 0,
          total: orderData.total,
          isExpress: orderData.isExpress,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || 'Order failed');
      }

      const serverOrder = await res.json();
      const newOrder: Order = {
        ...orderData,
        id: serverOrder.id,
        orderNumber: serverOrder.orderNumber,
        createdAt: serverOrder.createdAt,
      };

      setOrders(prev => {
        const newOrders = [newOrder, ...prev];
        store.saveOrders(newOrders);
        return newOrders;
      });

      const earnedPoints = Math.floor(orderData.total * 0.1);
      setPoints(prev => {
        const newPoints = prev + earnedPoints;
        store.savePoints(newPoints);
        return newPoints;
      });
      clearCart();
      return newOrder;
    } catch (e) {
      console.error('Failed to place order:', e);
      return null;
    }
  }, [clearCart]);

  const addPoints = useCallback((p: number) => {
    setPoints(prev => {
      const newPoints = prev + p;
      store.savePoints(newPoints);
      return newPoints;
    });
  }, []);

  const setOnboarded = useCallback((v: boolean) => {
    setOnboardedState(v);
    store.setOnboarded(v);
  }, []);

  const value = useMemo(() => ({
    lang, setLang, t: tFn, isRTL,
    cart, addToCart, removeFromCart, updateCartItemQty, clearCart, cartTotal, cartCount,
    orders, placeOrder,
    points, addPoints,
    onboarded, setOnboarded, isLoading,
  }), [lang, setLang, tFn, isRTL, cart, addToCart, removeFromCart, updateCartItemQty, clearCart, cartTotal, cartCount, orders, placeOrder, points, addPoints, onboarded, setOnboarded, isLoading]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
