import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { mapApiProduct, mapApiAddOn } from '@/lib/data';
import type { AddOn, DeliverySlot } from '@/lib/data';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const placeholderSlots = [
  { id: 'slot-1', label: 'Morning', timeEn: '10:00 - 13:00', timeAr: '١٠:٠٠ - ١٣:٠٠', startHour: 10, capacity: 10, used: 6 },
  { id: 'slot-2', label: 'Afternoon', timeEn: '13:00 - 18:00', timeAr: '١٣:٠٠ - ١٨:٠٠', startHour: 13, capacity: 10, used: 10 },
  { id: 'slot-3', label: 'Evening', timeEn: '18:00 - 21:00', timeAr: '١٨:٠٠ - ٢١:٠٠', startHour: 18, capacity: 10, used: 3 },
];

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang, isRTL, addToCart } = useApp();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const { data: rawProduct, isLoading: productLoading } = useQuery<any>({
    queryKey: ['/api/products', id],
    enabled: !!id,
  });

  const { data: rawAddOns, isLoading: addOnsLoading } = useQuery<any[]>({
    queryKey: ['/api/add-ons'],
  });

  const product = useMemo(() => rawProduct ? mapApiProduct(rawProduct) : null, [rawProduct]);
  const allAddOns = useMemo(() => (rawAddOns || []).map(mapApiAddOn), [rawAddOns]);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  const [quantity, setQuantity] = useState(1);
  const currency = lang === 'ar' ? 'د.ل' : 'LYD';

  const todaySlots = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    return placeholderSlots.map(s => ({
      ...s,
      expired: currentHour >= s.startHour + 1,
    }));
  }, []);

  if (productLoading || addOnsLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>Product not found</Text>
      </View>
    );
  }

  const name = lang === 'ar' ? product.nameAr : product.nameEn;
  const description = lang === 'ar' ? product.descriptionAr : product.descriptionEn;
  const includes = lang === 'ar' ? product.includesAr : product.includesEn;

  const toggleAddOn = (addOn: AddOn) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAddOns(prev =>
      prev.find(a => a.id === addOn.id)
        ? prev.filter(a => a.id !== addOn.id)
        : [...prev, addOn]
    );
  };

  const addOnTotal = selectedAddOns.reduce((s, a) => s + a.price, 0);
  const totalPrice = (product.price + addOnTotal) * quantity;

  const handleAddToCart = () => {
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addToCart(product, selectedAddOns, '', quantity);
    router.back();
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        <View style={styles.imageSection}>
          <Image source={{ uri: product.images[selectedImageIndex] }} style={styles.mainImage} contentFit="cover" />

          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { top: insets.top + webTopInset + 8 }]}
          >
            <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={22} color={Colors.text} />
          </Pressable>

          {product.images.length > 1 && (
            <View style={styles.thumbRow}>
              {product.images.map((img, i) => (
                <Pressable key={i} onPress={() => setSelectedImageIndex(i)}
                  style={[styles.thumb, i === selectedImageIndex && styles.thumbActive]}>
                  <Image source={{ uri: img }} style={styles.thumbImage} contentFit="cover" />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <Animated.View entering={FadeInUp.duration(500)} style={styles.detailSection}>
          <View style={[styles.badgeRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <View style={styles.exactBadge}>
              <Feather name="check-circle" size={14} color={Colors.primary} />
              <Text style={styles.exactBadgeText}>{t('exactMatch')}</Text>
            </View>
            {product.expressEligible && (
              <View style={styles.expressBadgeDetail}>
                <Feather name="zap" size={14} color={Colors.gold} />
                <Text style={styles.expressBadgeText}>{t('express')}</Text>
              </View>
            )}
          </View>

          <Text style={[styles.productName, isRTL && { textAlign: 'right' }]}>{name}</Text>
          <Text style={[styles.productPrice, isRTL && { textAlign: 'right' }]}>{product.price} {currency}</Text>
          <Text style={[styles.productDesc, isRTL && { textAlign: 'right' }]}>{description}</Text>

          <View style={styles.includesSection}>
            <Text style={[styles.includesTitle, isRTL && { textAlign: 'right' }]}>{t('includes')}</Text>
            {includes.map((item, i) => (
              <View key={i} style={[styles.includesItem, isRTL && { flexDirection: 'row-reverse' }]}>
                <Feather name="check" size={14} color={Colors.success} />
                <Text style={[styles.includesText, isRTL && { textAlign: 'right' }]}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.slotPreview}>
            <Text style={[styles.slotPreviewTitle, isRTL && { textAlign: 'right' }]}>{t('deliverySlot')}</Text>
            <View style={styles.slotRow}>
              {todaySlots.map(slot => {
                const remaining = slot.capacity - slot.used;
                const isFull = remaining <= 0;
                const isUnavailable = isFull || slot.expired;
                return (
                  <View key={slot.id} style={[styles.slotCard, isUnavailable && styles.slotCardFull]}>
                    <Text style={[styles.slotLabel, isUnavailable && styles.slotLabelFull]}>
                      {lang === 'ar' ? slot.timeAr : slot.timeEn}
                    </Text>
                    <Text style={[styles.slotAvail, isUnavailable && styles.slotAvailFull]}>
                      {slot.expired
                        ? (lang === 'ar' ? 'انتهى الوقت' : 'Closed')
                        : isFull ? t('full') : `${remaining} ${t('slotsLeft')}`}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.addOnsSection}>
            <Text style={[styles.addOnsTitle, isRTL && { textAlign: 'right' }]}>{t('addOnTitle')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.addOnsList}>
              {allAddOns.map(addOn => {
                const isSelected = selectedAddOns.find(a => a.id === addOn.id);
                const addOnName = lang === 'ar' ? addOn.nameAr : addOn.nameEn;
                return (
                  <Pressable
                    key={addOn.id}
                    onPress={() => toggleAddOn(addOn)}
                    style={[styles.addOnCard, isSelected && styles.addOnCardActive]}
                  >
                    <View style={[styles.addOnIcon, isSelected && styles.addOnIconActive]}>
                      <Feather name={addOn.icon as any} size={18} color={isSelected ? Colors.white : Colors.primary} />
                    </View>
                    <Text style={[styles.addOnName, isSelected && styles.addOnNameActive]} numberOfLines={1}>{addOnName}</Text>
                    <Text style={[styles.addOnPrice, isSelected && styles.addOnPriceActive]}>{addOn.price} {currency}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={{ height: 140 }} />
        </Animated.View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 12) }]}>
        <View style={[styles.qtyControl, isRTL && { flexDirection: 'row-reverse' }]}>
          <Pressable onPress={() => setQuantity(q => Math.max(1, q - 1))} style={styles.qtyBtn}>
            <Feather name="minus" size={18} color={Colors.text} />
          </Pressable>
          <Text style={styles.qtyText}>{quantity}</Text>
          <Pressable onPress={() => setQuantity(q => q + 1)} style={styles.qtyBtn}>
            <Feather name="plus" size={18} color={Colors.text} />
          </Pressable>
        </View>

        <Pressable
          onPress={handleAddToCart}
          style={({ pressed }) => [styles.addBtn, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        >
          <LinearGradient colors={[Colors.primary, '#0F2419']} style={styles.addBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="bag-add-outline" size={20} color={Colors.white} />
            <Text style={styles.addBtnText}>{totalPrice} {currency}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  errorText: { fontSize: 16, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  imageSection: { position: 'relative' },
  mainImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.9 },
  backBtn: {
    position: 'absolute',
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbRow: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbActive: { borderColor: Colors.gold },
  thumbImage: { width: '100%', height: '100%' },
  detailSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: Colors.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  exactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  exactBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  expressBadgeDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.gold + '15',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  expressBadgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.goldDark },
  productName: {
    fontSize: 24,
    fontFamily: 'CormorantGaramond_700Bold',
    color: Colors.text,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
    marginBottom: 12,
  },
  productDesc: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  includesSection: { marginBottom: 20 },
  includesTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    marginBottom: 8,
  },
  includesItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  includesText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  slotPreview: { marginBottom: 24 },
  slotPreviewTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    marginBottom: 10,
  },
  slotRow: { flexDirection: 'row', gap: 8 },
  slotCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  slotCardFull: { backgroundColor: Colors.creamDark, borderColor: Colors.border, opacity: 0.6 },
  slotLabel: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  slotLabelFull: { color: Colors.textTertiary },
  slotAvail: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.success },
  slotAvailFull: { color: Colors.error },
  addOnsSection: { marginBottom: 20 },
  addOnsTitle: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    marginBottom: 10,
  },
  addOnsList: { gap: 10 },
  addOnCard: {
    width: 100,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  addOnCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '08' },
  addOnIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOnIconActive: { backgroundColor: Colors.primary },
  addOnName: { fontSize: 11, fontFamily: 'Inter_500Medium', color: Colors.text, textAlign: 'center' },
  addOnNameActive: { color: Colors.primary },
  addOnPrice: { fontSize: 12, fontFamily: 'Inter_700Bold', color: Colors.textSecondary },
  addOnPriceActive: { color: Colors.primary },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.cream,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  qtyControl: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.text, minWidth: 20, textAlign: 'center' },
  addBtn: { flex: 1, borderRadius: 14, overflow: 'hidden' },
  addBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  addBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.white },
});
