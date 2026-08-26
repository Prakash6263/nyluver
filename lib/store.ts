import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CartItem, Order } from './data';
import type { Language } from './i18n';

const KEYS = {
  LANGUAGE: 'nyluver_language',
  CART: 'nyluver_cart',
  ORDERS: 'nyluver_orders',
  ONBOARDED: 'nyluver_onboarded',
  POINTS: 'nyluver_points',
  RECIPIENTS: 'nyluver_recipients',
};

export async function getLanguage(): Promise<Language | null> {
  const val = await AsyncStorage.getItem(KEYS.LANGUAGE);
  return val as Language | null;
}

export async function setLanguage(lang: Language): Promise<void> {
  await AsyncStorage.setItem(KEYS.LANGUAGE, lang);
}

export async function getOnboarded(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.ONBOARDED);
  return val === 'true';
}

export async function setOnboarded(val: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.ONBOARDED, val.toString());
}

export async function getCart(): Promise<CartItem[]> {
  const val = await AsyncStorage.getItem(KEYS.CART);
  return val ? JSON.parse(val) : [];
}

export async function saveCart(cart: CartItem[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.CART, JSON.stringify(cart));
}

export async function getOrders(): Promise<Order[]> {
  const val = await AsyncStorage.getItem(KEYS.ORDERS);
  return val ? JSON.parse(val) : [];
}

export async function saveOrders(orders: Order[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.ORDERS, JSON.stringify(orders));
}

export async function getPoints(): Promise<number> {
  const val = await AsyncStorage.getItem(KEYS.POINTS);
  return val ? parseInt(val, 10) : 0;
}

export async function savePoints(points: number): Promise<void> {
  await AsyncStorage.setItem(KEYS.POINTS, points.toString());
}

export async function getSavedRecipients(): Promise<{ name: string; phone: string }[]> {
  const val = await AsyncStorage.getItem(KEYS.RECIPIENTS);
  return val ? JSON.parse(val) : [];
}

export async function saveSavedRecipients(recipients: { name: string; phone: string }[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.RECIPIENTS, JSON.stringify(recipients));
}
