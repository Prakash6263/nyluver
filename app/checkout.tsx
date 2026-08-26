import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Platform, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import type { DeliverySlot } from '@/lib/data';

const cardLotus = require('@/assets/images/card-lotus.png');

export default function CheckoutScreen() {
  const { t, lang, isRTL, cart, cartTotal, placeOrder } = useApp();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;
  const currency = lang === 'ar' ? 'د.ل' : 'LYD';

  const [recipientName, setRecipientName] = useState('');
  const [recipientPhone, setRecipientPhone] = useState('');
  const [address, setAddress] = useState('');
  const [cardMessage, setCardMessage] = useState('');
  const [selectedDate, setSelectedDate] = useState('today');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  const [isExpress, setIsExpress] = useState(false);

  const slotDefs = [
    { id: 'morning', label: 'Morning', timeEn: '10:00 - 13:00', timeAr: '١٠:٠٠ - ١٣:٠٠', startHour: 10, capacity: 50, used: Math.floor(Math.random() * 30) + 10 },
    { id: 'afternoon', label: 'Afternoon', timeEn: '13:00 - 18:00', timeAr: '١٣:٠٠ - ١٨:٠٠', startHour: 13, capacity: 50, used: Math.floor(Math.random() * 25) + 15 },
    { id: 'evening', label: 'Evening', timeEn: '18:00 - 21:00', timeAr: '١٨:٠٠ - ٢١:٠٠', startHour: 18, capacity: 50, used: Math.floor(Math.random() * 20) + 5 },
  ];

  const slots: (DeliverySlot & { expired: boolean })[] = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const isToday = selectedDate === 'today';
    return slotDefs.map(s => ({
      ...s,
      expired: isToday && currentHour >= s.startHour + 1,
    }));
  }, [selectedDate]);
  const expressFee = isExpress ? 15 : 0;
  const total = cartTotal + expressFee;

  const dates = [
    { id: 'today', label: t('today') },
    { id: 'tomorrow', label: t('tomorrow') },
  ];

  const [placing, setPlacing] = useState(false);
  const canPlace = recipientName.trim().length > 0 && recipientPhone.trim().length > 0 && selectedSlot && !placing;

  const handlePlace = async () => {
    if (!canPlace) return;
    setPlacing(true);
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const result = await placeOrder({
        items: cart,
        recipientName,
        recipientPhone,
        address,
        slotDate: selectedDate,
        slotId: selectedSlot,
        cardMessage: cardMessage.trim() || undefined,
        paymentMethod,
        status: 'Paid',
        total,
        isExpress,
      });
      if (result) {
        router.replace('/order-confirmed');
      } else {
        Alert.alert(lang === 'ar' ? 'خطأ' : 'Error', lang === 'ar' ? 'فشل في إرسال الطلب' : 'Failed to place order. Please try again.');
      }
    } catch (e) {
      Alert.alert(lang === 'ar' ? 'خطأ' : 'Error', lang === 'ar' ? 'فشل في إرسال الطلب' : 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8 }, isRTL && { flexDirection: 'row-reverse' }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t('checkout')}</Text>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.section}>
          <View style={[styles.anonBanner, isRTL && { flexDirection: 'row-reverse' }]}>
            <Feather name="eye-off" size={18} color={Colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.anonTitle, isRTL && { textAlign: 'right' }]}>{t('anonymousGift')}</Text>
              <Text style={[styles.anonDesc, isRTL && { textAlign: 'right' }]}>{t('anonymousGiftDesc')}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('recipientDetails')}</Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, isRTL && { textAlign: 'right' }]}>{t('recipientName')} *</Text>
            <TextInput
              value={recipientName}
              onChangeText={setRecipientName}
              style={[styles.input, isRTL && { textAlign: 'right' }]}
              placeholder={t('recipientName')}
              placeholderTextColor={Colors.textTertiary}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, isRTL && { textAlign: 'right' }]}>{t('whatsappNumber')} *</Text>
            <View style={[styles.phoneInput, isRTL && { flexDirection: 'row-reverse' }]}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
              <TextInput
                value={recipientPhone}
                onChangeText={setRecipientPhone}
                style={[styles.phoneTextInput, isRTL && { textAlign: 'right' }]}
                placeholder="+218 XX XXX XXXX"
                placeholderTextColor={Colors.textTertiary}
                keyboardType="phone-pad"
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, isRTL && { textAlign: 'right' }]}>{t('addressOptional')}</Text>
            <TextInput
              value={address}
              onChangeText={setAddress}
              style={[styles.input, isRTL && { textAlign: 'right' }]}
              placeholder={t('enterAddress')}
              placeholderTextColor={Colors.textTertiary}
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('selectSlot')}</Text>
          <View style={styles.dateRow}>
            {dates.map(d => (
              <Pressable
                key={d.id}
                onPress={() => { setSelectedDate(d.id); setSelectedSlot(''); }}
                style={[styles.dateChip, selectedDate === d.id && styles.dateChipActive]}
              >
                <Text style={[styles.dateChipText, selectedDate === d.id && styles.dateChipTextActive]}>{d.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.slotsGrid}>
            {slots.map(slot => {
              const remaining = slot.capacity - slot.used;
              const isFull = remaining <= 0;
              const isUnavailable = isFull || slot.expired;
              const isSelected = selectedSlot === slot.id;
              return (
                <Pressable
                  key={slot.id}
                  onPress={() => !isUnavailable && setSelectedSlot(slot.id)}
                  disabled={isUnavailable}
                  style={[styles.slotCard, isSelected && styles.slotCardSelected, isUnavailable && styles.slotCardDisabled]}
                >
                  <Text style={[styles.slotTime, isSelected && styles.slotTimeSelected, isUnavailable && styles.slotTimeDisabled]}>
                    {lang === 'ar' ? slot.timeAr : slot.timeEn}
                  </Text>
                  <Text style={[styles.slotRemaining, isUnavailable && styles.slotRemainingFull]}>
                    {slot.expired
                      ? (lang === 'ar' ? 'انتهى الوقت' : 'Closed')
                      : isFull ? t('full') : `${remaining} ${t('slotsLeft')}`}
                  </Text>
                  {isSelected && <Feather name="check" size={16} color={Colors.white} style={styles.slotCheck} />}
                </Pressable>
              );
            })}
          </View>
          <Pressable
            onPress={() => setIsExpress(!isExpress)}
            style={[styles.expressToggle, isExpress && styles.expressToggleActive, isRTL && { flexDirection: 'row-reverse' }]}
          >
            <Feather name="zap" size={18} color={isExpress ? Colors.gold : Colors.textTertiary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.expressLabel, isRTL && { textAlign: 'right' }]}>{t('express')}</Text>
              <Text style={[styles.expressDesc, isRTL && { textAlign: 'right' }]}>3-4h SLA +15 {currency}</Text>
            </View>
            <View style={[styles.toggle, isExpress && styles.toggleActive]}>
              <View style={[styles.toggleKnob, isExpress && styles.toggleKnobActive]} />
            </View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('cardMessage')}</Text>
          <TextInput
            value={cardMessage}
            onChangeText={setCardMessage}
            style={[styles.messageInput, isRTL && { textAlign: 'right' }]}
            placeholder={t('writeMessage')}
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={3}
          />
          {cardMessage.trim().length > 0 && (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.cardPreviewWrap}>
              <Text style={[styles.cardPreviewLabel, isRTL && { textAlign: 'right' }]}>
                {lang === 'ar' ? 'معاينة بطاقة الهدية' : 'Gift Card Preview'}
              </Text>
              <View style={styles.giftCard}>
                <View style={styles.giftCardInner}>
                  <View style={styles.giftCardBorder}>
                    <Text style={[styles.giftCardMessage, isRTL && { textAlign: 'right' }]}>
                      {cardMessage}
                    </Text>
                    <View style={styles.giftCardFooter}>
                      <Image source={cardLotus} style={styles.giftCardLotus} contentFit="contain" />
                      <Text style={styles.giftCardBrand}>NYLUVER</Text>
                    </View>
                  </View>
                </View>
              </View>
            </Animated.View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(500)} style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('paymentMethod')}</Text>
          <View style={styles.paymentOptions}>
            <Pressable
              onPress={() => setPaymentMethod('card')}
              style={[styles.paymentOption, paymentMethod === 'card' && styles.paymentOptionActive]}
            >
              <Ionicons name="card-outline" size={22} color={paymentMethod === 'card' ? Colors.primary : Colors.textTertiary} />
              <Text style={[styles.paymentLabel, paymentMethod === 'card' && styles.paymentLabelActive]}>{t('bankCard')}</Text>
              <Text style={styles.paymentCurrency}>{t('payInLYD')}</Text>
            </Pressable>
            <Pressable
              onPress={() => setPaymentMethod('paypal')}
              style={[styles.paymentOption, paymentMethod === 'paypal' && styles.paymentOptionActive]}
            >
              <Ionicons name="logo-paypal" size={22} color={paymentMethod === 'paypal' ? Colors.primary : Colors.textTertiary} />
              <Text style={[styles.paymentLabel, paymentMethod === 'paypal' && styles.paymentLabelActive]}>PayPal</Text>
              <Text style={styles.paymentCurrency}>{t('payInUSD')}</Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(600)} style={[styles.section, styles.summarySection]}>
          <View style={[styles.summaryRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.summaryLabel}>{t('subtotal')}</Text>
            <Text style={styles.summaryValue}>{cartTotal} {currency}</Text>
          </View>
          <View style={[styles.summaryRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.summaryLabel}>{t('deliveryFee')}</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>{t('free')}</Text>
          </View>
          {isExpress && (
            <View style={[styles.summaryRow, isRTL && { flexDirection: 'row-reverse' }]}>
              <Text style={styles.summaryLabel}>{t('expressFee')}</Text>
              <Text style={styles.summaryValue}>{expressFee} {currency}</Text>
            </View>
          )}
          <View style={styles.divider} />
          <View style={[styles.summaryRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={styles.totalLabel}>{t('total')}</Text>
            <Text style={styles.totalValue}>{total} {currency}</Text>
          </View>
        </Animated.View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 12) }]}>
        <Pressable
          onPress={handlePlace}
          disabled={!canPlace}
          style={({ pressed }) => [styles.placeBtn, !canPlace && styles.placeBtnDisabled, { transform: [{ scale: pressed && canPlace ? 0.98 : 1 }] }]}
        >
          <LinearGradient
            colors={canPlace ? [Colors.primary, '#0F2419'] : [Colors.textTertiary, Colors.textTertiary]}
            style={styles.placeBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {placing ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <Text style={styles.placeBtnText}>{t('placeOrder')}</Text>
                <Text style={styles.placeBtnPrice}>{total} {currency}</Text>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
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
  section: { marginBottom: 20 },
  anonBanner: {
    flexDirection: 'row',
    backgroundColor: Colors.primary + '08',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '15',
  },
  anonTitle: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.primary },
  anonDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    marginBottom: 12,
  },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 13, fontFamily: 'Inter_500Medium', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  phoneInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  phoneTextInput: {
    flex: 1,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  dateRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  dateChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dateChipText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  dateChipTextActive: { color: Colors.white },
  slotsGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  slotCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderColor: Colors.border,
    position: 'relative',
  },
  slotCardSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  slotCardDisabled: { opacity: 0.5 },
  slotTime: { fontSize: 11, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  slotTimeSelected: { color: Colors.white },
  slotTimeDisabled: { color: Colors.textTertiary },
  slotRemaining: { fontSize: 10, fontFamily: 'Inter_400Regular', color: Colors.success },
  slotRemainingFull: { color: Colors.error },
  slotCheck: { position: 'absolute', top: 4, right: 4 },
  expressToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expressToggleActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + '08' },
  expressLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  expressDesc: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textSecondary, marginTop: 2 },
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: { backgroundColor: Colors.gold },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.white,
  },
  toggleKnobActive: { alignSelf: 'flex-end' },
  messageInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 90,
    textAlignVertical: 'top',
  },
  cardPreviewWrap: {
    marginTop: 16,
  },
  cardPreviewLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  giftCard: {
    backgroundColor: '#F8F5F0',
    borderRadius: 14,
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  giftCardInner: {
    backgroundColor: '#F8F5F0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  giftCardBorder: {
    borderWidth: 1,
    borderColor: '#C9A96E40',
    borderRadius: 11,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
    minHeight: 180,
    justifyContent: 'space-between',
  },
  giftCardMessage: {
    fontSize: 16,
    fontFamily: 'CormorantGaramond_400Regular',
    color: '#3B3B3B',
    lineHeight: 26,
    textAlign: 'center',
    flex: 1,
  },
  giftCardFooter: {
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
  },
  giftCardLotus: {
    width: 36,
    height: 36,
    opacity: 0.7,
  },
  giftCardBrand: {
    fontSize: 10,
    fontFamily: 'GFSDidot_400Regular',
    color: '#C9A96E',
    letterSpacing: 3,
  },
  paymentOptions: { flexDirection: 'row', gap: 10 },
  paymentOption: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  paymentOptionActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '05' },
  paymentLabel: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: Colors.textSecondary },
  paymentLabelActive: { color: Colors.primary },
  paymentCurrency: { fontSize: 11, fontFamily: 'Inter_400Regular', color: Colors.textTertiary },
  summarySection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  placeBtn: { borderRadius: 16, overflow: 'hidden' },
  placeBtnDisabled: { opacity: 0.5 },
  placeBtnGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  placeBtnText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.white },
  placeBtnPrice: { fontSize: 16, fontFamily: 'Inter_700Bold', color: Colors.gold },
});
