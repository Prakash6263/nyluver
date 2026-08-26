import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
export default function OrderConfirmedScreen() {
  const { t, lang, isRTL, orders } = useApp();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withTiming(1, { duration: 600 });
    opacity.value = withTiming(1, { duration: 600 });
  }, []);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const lastOrder = orders[0];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.primary, '#0F2419']} style={StyleSheet.absoluteFill} />

      <View style={[styles.content, { paddingTop: insets.top + webTopInset + 40, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 20) }]}>
        <Animated.View style={[styles.checkCircle, checkStyle]}>
          <View style={styles.checkInner}>
            <Feather name="check" size={48} color={Colors.gold} />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(300)} style={styles.textArea}>
          <Text style={styles.confirmedTitle}>{t('orderConfirmed')}</Text>
          {lastOrder && (
            <Text style={styles.orderNum}>{t('orderNumber')}{lastOrder.id.slice(0, 6).toUpperCase()}</Text>
          )}
          <Text style={styles.confirmedDesc}>
            {lang === 'ar'
              ? 'سيتم التواصل مع المستلم عبر الواتساب للتأكيد'
              : 'We will contact the recipient via WhatsApp for confirmation'}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(400)} style={styles.actions}>
          {lastOrder && (
            <Pressable
              onPress={() => router.replace({ pathname: '/order/[id]', params: { id: lastOrder.id } })}
              style={({ pressed }) => [styles.trackBtn, { opacity: pressed ? 0.9 : 1 }]}
            >
              <Text style={styles.trackBtnText}>{t('trackOrder')}</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => router.replace('/(tabs)')}
            style={({ pressed }) => [styles.homeBtn, { opacity: pressed ? 0.9 : 1 }]}
          >
            <Text style={styles.homeBtnText}>{t('backToHome')}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(201, 169, 110, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(201, 169, 110, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textArea: { alignItems: 'center', gap: 10 },
  confirmedTitle: {
    fontSize: 28,
    fontFamily: 'CormorantGaramond_700Bold',
    color: Colors.cream,
  },
  orderNum: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.gold,
    letterSpacing: 1,
  },
  confirmedDesc: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 4,
  },
  actions: { width: '100%', gap: 12 },
  trackBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  trackBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
  homeBtn: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  homeBtnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.cream,
  },
});
