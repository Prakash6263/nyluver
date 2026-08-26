import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

export default function CartScreen() {
  const { t, lang, isRTL, cart, cartTotal, removeFromCart, updateCartItemQty } = useApp();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const currency = lang === 'ar' ? 'د.ل' : 'LYD';

  const handleRemove = (productId: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeFromCart(productId);
  };

  if (cart.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer, { paddingTop: insets.top + webTopInset }]}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.emptyContent}>
          <View style={styles.emptyIcon}>
            <Ionicons name="bag-outline" size={48} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>{t('emptyCart')}</Text>
          <Pressable
            onPress={() => router.push('/(tabs)')}
            style={({ pressed }) => [styles.shopBtn, { opacity: pressed ? 0.9 : 1 }]}
          >
            <Text style={styles.shopBtnText}>{t('startShopping')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + webTopInset + 12 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={[styles.pageTitle, isRTL && { textAlign: 'right' }]}>{t('cart')}</Text>

        {cart.map((item, index) => {
          const name = lang === 'ar' ? item.product.nameAr : item.product.nameEn;
          const itemTotal = (item.product.price + item.addOns.reduce((s, a) => s + a.price, 0)) * item.quantity;

          return (
            <Animated.View key={item.product.id} entering={FadeInDown.duration(400).delay(index * 100)} style={styles.cartItem}>
              <Image source={{ uri: item.product.images[0] }} style={styles.cartItemImage} contentFit="cover" />
              <View style={[styles.cartItemInfo, isRTL && { alignItems: 'flex-end' }]}>
                <Text style={[styles.cartItemName, isRTL && { textAlign: 'right' }]} numberOfLines={2}>{name}</Text>
                {item.addOns.length > 0 && (
                  <Text style={[styles.addOnsText, isRTL && { textAlign: 'right' }]}>
                    +{item.addOns.length} {t('addOns').toLowerCase()}
                  </Text>
                )}
                <Text style={[styles.cartItemPrice, isRTL && { textAlign: 'right' }]}>{itemTotal} {currency}</Text>

                <View style={[styles.qtyRow, isRTL && { flexDirection: 'row-reverse' }]}>
                  <Pressable onPress={() => updateCartItemQty(item.product.id, item.quantity - 1)} style={styles.qtyBtn}>
                    <Feather name="minus" size={16} color={Colors.text} />
                  </Pressable>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <Pressable onPress={() => updateCartItemQty(item.product.id, item.quantity + 1)} style={styles.qtyBtn}>
                    <Feather name="plus" size={16} color={Colors.text} />
                  </Pressable>

                  <Pressable onPress={() => handleRemove(item.product.id)} style={styles.removeBtn}>
                    <Feather name="trash-2" size={16} color={Colors.error} />
                  </Pressable>
                </View>
              </View>
            </Animated.View>
          );
        })}

        <View style={[styles.summary, { marginBottom: 180 }]}>
          <View style={[styles.summaryRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.summaryLabel}>{t('subtotal')}</Text>
            <Text style={styles.summaryValue}>{cartTotal} {currency}</Text>
          </View>
          <View style={[styles.summaryRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.summaryLabel}>{t('deliveryFee')}</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>{t('free')}</Text>
          </View>
          <View style={[styles.divider]} />
          <View style={[styles.summaryRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.totalLabel}>{t('total')}</Text>
            <Text style={styles.totalValue}>{cartTotal} {currency}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 0) + 80 }]}>
        <Pressable
          onPress={() => router.push('/checkout')}
          style={({ pressed }) => [styles.checkoutBtn, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        >
          <LinearGradient colors={[Colors.primary, '#0F2419']} style={styles.checkoutGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.checkoutText}>{t('checkout')}</Text>
            <Text style={styles.checkoutPrice}>{cartTotal} {currency}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  emptyContainer: { justifyContent: 'center', alignItems: 'center' },
  emptyContent: { alignItems: 'center', gap: 16, padding: 32 },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  shopBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  shopBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: Colors.white },
  scrollContent: { paddingHorizontal: 20 },
  pageTitle: {
    fontSize: 28,
    fontFamily: 'CormorantGaramond_700Bold',
    color: Colors.text,
    marginBottom: 20,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cartItemImage: { width: 110, height: 130 },
  cartItemInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  cartItemName: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  addOnsText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.gold,
  },
  cartItemPrice: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    minWidth: 20,
    textAlign: 'center',
  },
  removeBtn: {
    marginLeft: 'auto',
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    marginTop: 16,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  summaryValue: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  divider: { height: 1, backgroundColor: Colors.border },
  totalLabel: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.text },
  totalValue: { fontSize: 18, fontFamily: 'Inter_700Bold', color: Colors.primary },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.cream,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  checkoutBtn: { borderRadius: 16, overflow: 'hidden' },
  checkoutGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  checkoutText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.white },
  checkoutPrice: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.gold },
});
