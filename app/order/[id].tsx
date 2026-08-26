import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

const statusSteps = [
  { key: 'Paid', icon: 'credit-card' },
  { key: 'Awaiting Recipient', icon: 'message-circle' },
  { key: 'Accepted', icon: 'check-circle' },
  { key: 'In Prep', icon: 'scissors' },
  { key: 'Ready', icon: 'package' },
  { key: 'Out for Delivery', icon: 'truck' },
  { key: 'Delivered', icon: 'check' },
];

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang, isRTL, orders } = useApp();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const currency = lang === 'ar' ? 'د.ل' : 'LYD';

  const order = useMemo(() => orders.find(o => o.id === id), [id, orders]);

  if (!order) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingTop: insets.top + webTopInset }]}>
        <Text style={styles.errorText}>Order not found</Text>
        <Pressable onPress={() => router.back()} style={styles.errorBtn}>
          <Text style={styles.errorBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const currentStepIndex = statusSteps.findIndex(s => s.key === order.status);
  const date = new Date(order.createdAt);
  const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8 }, isRTL && { flexDirection: 'row-reverse' }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('trackOrder')}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.orderHeader}>
          <Text style={[styles.orderId, isRTL && { textAlign: 'right' }]}>{t('orderNumber')}{order.id.slice(0, 6).toUpperCase()}</Text>
          <Text style={[styles.orderDate, isRTL && { textAlign: 'right' }]}>{t('placedOn')} {dateStr}</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.timelineSection}>
          <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('orderStatus')}</Text>
          <View style={styles.timeline}>
            {statusSteps.map((step, i) => {
              const isPast = i <= currentStepIndex;
              const isCurrent = i === currentStepIndex;
              return (
                <View key={step.key} style={[styles.timelineItem, isRTL && { flexDirection: 'row-reverse' }]}>
                  <View style={styles.timelineDotCol}>
                    <View style={[styles.timelineDot, isPast && styles.timelineDotActive, isCurrent && styles.timelineDotCurrent]}>
                      <Feather name={step.icon as any} size={14} color={isPast ? Colors.white : Colors.textTertiary} />
                    </View>
                    {i < statusSteps.length - 1 && (
                      <View style={[styles.timelineLine, isPast && styles.timelineLineActive]} />
                    )}
                  </View>
                  <View style={[styles.timelineContent, isRTL && { alignItems: 'flex-end' }]}>
                    <Text style={[styles.timelineLabel, isPast && styles.timelineLabelActive, isCurrent && styles.timelineLabelCurrent]}>
                      {step.key}
                    </Text>
                    {isCurrent && (
                      <Text style={styles.timelineCurrentTag}>
                        {lang === 'ar' ? 'الحالي' : 'Current'}
                      </Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.itemsSection}>
          <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>
            {order.items.reduce((s, i) => s + i.quantity, 0)} {t('items')}
          </Text>
          {order.items.map((item, idx) => {
            const name = lang === 'ar' ? item.product.nameAr : item.product.nameEn;
            return (
              <View key={idx} style={[styles.orderItem, isRTL && { flexDirection: 'row-reverse' }]}>
                <Image source={{ uri: item.product.images[0] }} style={styles.orderItemImage} contentFit="cover" />
                <View style={[styles.orderItemInfo, isRTL && { alignItems: 'flex-end' }]}>
                  <Text style={[styles.orderItemName, isRTL && { textAlign: 'right' }]}>{name}</Text>
                  <Text style={styles.orderItemQty}>{t('qty')}: {item.quantity}</Text>
                  {item.addOns.length > 0 && (
                    <Text style={styles.orderItemAddOns}>
                      +{item.addOns.map(a => lang === 'ar' ? a.nameAr : a.nameEn).join(', ')}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.detailsSection}>
          <View style={[styles.detailRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <Feather name="user" size={16} color={Colors.textSecondary} />
            <Text style={[styles.detailText, isRTL && { textAlign: 'right' }]}>{order.recipientName}</Text>
          </View>
          <View style={[styles.detailRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <Ionicons name="logo-whatsapp" size={16} color="#25D366" />
            <Text style={[styles.detailText, isRTL && { textAlign: 'right' }]}>{order.recipientPhone}</Text>
          </View>
          {order.address ? (
            <View style={[styles.detailRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Feather name="map-pin" size={16} color={Colors.textSecondary} />
              <Text style={[styles.detailText, isRTL && { textAlign: 'right' }]}>{order.address}</Text>
            </View>
          ) : null}
          <View style={[styles.detailRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <Feather name="clock" size={16} color={Colors.textSecondary} />
            <Text style={[styles.detailText, isRTL && { textAlign: 'right' }]}>{order.slotDate} - {order.slotId}</Text>
          </View>
          {order.isExpress && (
            <View style={[styles.detailRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Feather name="zap" size={16} color={Colors.gold} />
              <Text style={[styles.detailText, { color: Colors.gold }, isRTL && { textAlign: 'right' }]}>{t('express')}</Text>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(450)} style={[styles.totalSection, { marginBottom: 40 }]}>
          <View style={[styles.summaryRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.totalLabel}>{t('total')}</Text>
            <Text style={styles.totalValue}>{order.total} {currency}</Text>
          </View>
          <Text style={[styles.paymentInfo, isRTL && { textAlign: 'right' }]}>
            {order.paymentMethod === 'card' ? t('bankCard') : 'PayPal'}
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  errorText: { fontSize: 16, fontFamily: 'Inter_500Medium', color: Colors.textSecondary, marginBottom: 16 },
  errorBtn: { backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  errorBtnText: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: Colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: 'CormorantGaramond_600SemiBold', color: Colors.text },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  orderHeader: { marginBottom: 24 },
  orderId: { fontSize: 20, fontFamily: 'CormorantGaramond_700Bold', color: Colors.text },
  orderDate: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 4 },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    marginBottom: 16,
  },
  timelineSection: { marginBottom: 28 },
  timeline: {},
  timelineItem: {
    flexDirection: 'row',
    gap: 14,
  },
  timelineDotCol: { alignItems: 'center', width: 32 },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.creamDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
  },
  timelineDotActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  timelineDotCurrent: { borderColor: Colors.gold, backgroundColor: Colors.primary },
  timelineLine: {
    width: 2,
    height: 28,
    backgroundColor: Colors.border,
  },
  timelineLineActive: { backgroundColor: Colors.primary },
  timelineContent: { flex: 1, paddingBottom: 20 },
  timelineLabel: { fontSize: 14, fontFamily: 'Inter_500Medium', color: Colors.textTertiary },
  timelineLabelActive: { color: Colors.text },
  timelineLabelCurrent: { fontFamily: 'Inter_700Bold', color: Colors.primary },
  timelineCurrentTag: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.gold,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  itemsSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  orderItem: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  orderItemImage: { width: 60, height: 60, borderRadius: 10 },
  orderItemInfo: { flex: 1, gap: 2 },
  orderItemName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  orderItemQty: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  orderItemAddOns: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.gold },
  detailsSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailText: { fontSize: 14, fontFamily: 'Inter_400Regular', color: Colors.text, flex: 1 },
  totalSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.text },
  totalValue: { fontSize: 20, fontFamily: 'Inter_700Bold', color: Colors.primary },
  paymentInfo: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 4 },
});
