import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';

const statusColors: Record<string, string> = {
  'Pending Payment': Colors.warning,
  'Paid': Colors.gold,
  'Awaiting Recipient': Colors.warning,
  'Accepted': Colors.success,
  'In Prep': Colors.primaryLight,
  'Ready': Colors.primary,
  'Out for Delivery': Colors.gold,
  'Delivered': Colors.success,
  'Failed Delivery': Colors.error,
  'Declined': Colors.error,
  'Cancelled': Colors.textTertiary,
  'Rescheduled': Colors.warning,
};

export default function OrdersScreen() {
  const { t, lang, isRTL, orders } = useApp();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const currency = lang === 'ar' ? 'د.ل' : 'LYD';

  if (orders.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer, { paddingTop: insets.top + webTopInset }]}>
        <Animated.View entering={FadeInDown.duration(600)} style={styles.emptyContent}>
          <View style={styles.emptyIcon}>
            <Ionicons name="receipt-outline" size={48} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>{t('noOrders')}</Text>
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
        <Text style={[styles.pageTitle, isRTL && { textAlign: 'right' }]}>{t('orderHistory')}</Text>

        {orders.map((order, index) => {
          const firstItem = order.items[0];
          const name = firstItem ? (lang === 'ar' ? firstItem.product.nameAr : firstItem.product.nameEn) : '';
          const statusColor = statusColors[order.status] || Colors.textSecondary;
          const date = new Date(order.createdAt);
          const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
          const itemCount = order.items.reduce((s, i) => s + i.quantity, 0);

          return (
            <Animated.View key={order.id} entering={FadeInDown.duration(400).delay(index * 80)}>
              <Pressable
                onPress={() => router.push({ pathname: '/order/[id]', params: { id: order.id } })}
                style={({ pressed }) => [styles.orderCard, { opacity: pressed ? 0.95 : 1 }]}
              >
                {firstItem && (
                  <Image source={{ uri: firstItem.product.images[0] }} style={styles.orderImage} contentFit="cover" />
                )}
                <View style={[styles.orderInfo, isRTL && { alignItems: 'flex-end' }]}>
                  <View style={[styles.orderTop, isRTL && { flexDirection: 'row-reverse' }]}>
                    <Text style={styles.orderNumber}>{t('orderNumber')}{order.id.slice(0, 6).toUpperCase()}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                      <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                      <Text style={[styles.statusText, { color: statusColor }]}>{order.status}</Text>
                    </View>
                  </View>
                  <Text style={[styles.orderItemName, isRTL && { textAlign: 'right' }]} numberOfLines={1}>{name}</Text>
                  <View style={[styles.orderBottom, isRTL && { flexDirection: 'row-reverse' }]}>
                    <Text style={styles.orderDate}>{dateStr}</Text>
                    <Text style={styles.orderTotal}>{order.total} {currency}</Text>
                  </View>
                  <Text style={[styles.itemCount, isRTL && { textAlign: 'right' }]}>
                    {itemCount} {itemCount === 1 ? t('item') : t('items')}
                  </Text>
                </View>
                <View style={styles.chevron}>
                  <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={Colors.textTertiary} />
                </View>
              </Pressable>
            </Animated.View>
          );
        })}

        <View style={{ height: 120 }} />
      </ScrollView>
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
  orderCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: 'center',
  },
  orderImage: { width: 80, height: 100 },
  orderInfo: { flex: 1, padding: 12, gap: 4 },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderNumber: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  orderItemName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  orderBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderDate: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  orderTotal: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.primary },
  itemCount: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textTertiary },
  chevron: { paddingRight: 12 },
});
