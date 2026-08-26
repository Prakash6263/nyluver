import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';

interface MenuItemProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  isRTL: boolean;
  color?: string;
}

function MenuItem({ icon, label, value, onPress, isRTL, color }: MenuItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.85 : 1 }, isRTL && { flexDirection: 'row-reverse' }]}
    >
      <View style={[styles.menuIcon, { backgroundColor: (color || Colors.primary) + '12' }]}>
        <Feather name={icon as any} size={18} color={color || Colors.primary} />
      </View>
      <View style={[styles.menuContent, isRTL && { alignItems: 'flex-end' }]}>
        <Text style={[styles.menuLabel, isRTL && { textAlign: 'right' }]}>{label}</Text>
        {value && <Text style={[styles.menuValue, isRTL && { textAlign: 'right' }]}>{value}</Text>}
      </View>
      <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={Colors.textTertiary} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { t, lang, isRTL, setLang, points, setOnboarded } = useApp();
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const userName = user?.name || '';
  const userEmail = user?.email || '';

  const toggleLanguage = () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLang(lang === 'en' ? 'ar' : 'en');
  };

  const handleSignOut = async () => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
    setOnboarded(false);
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + webTopInset + 12 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={[styles.pageTitle, isRTL && { textAlign: 'right' }]}>{t('profile')}</Text>

        <Animated.View entering={FadeInDown.duration(500).delay(50)} style={styles.userCard}>
          <View style={styles.avatar}>
            <Feather name="user" size={24} color={Colors.cream} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, isRTL && { textAlign: 'right' }]}>{userName}</Text>
            <Text style={[styles.userEmail, isRTL && { textAlign: 'right' }]}>{userEmail}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.pointsCard}>
          <View style={[styles.pointsRow, isRTL && { flexDirection: 'row-reverse' }]}>
            <View style={styles.pointsIcon}>
              <Ionicons name="diamond-outline" size={24} color={Colors.gold} />
            </View>
            <View style={isRTL ? { alignItems: 'flex-end' } : undefined}>
              <Text style={[styles.pointsLabel, isRTL && { textAlign: 'right' }]}>{t('loyaltyPoints')}</Text>
              <Text style={[styles.pointsValue, isRTL && { textAlign: 'right' }]}>{points} {t('points')}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.menuSection}>
          <MenuItem
            icon="globe"
            label={t('language')}
            value={lang === 'en' ? 'English' : 'العربية'}
            onPress={toggleLanguage}
            isRTL={isRTL}
          />
          <MenuItem
            icon="map-pin"
            label={t('city')}
            value={t('tripoli')}
            isRTL={isRTL}
          />
          <MenuItem
            icon="users"
            label={t('savedRecipients')}
            isRTL={isRTL}
          />
          <MenuItem
            icon="repeat"
            label={t('subscriptions')}
            isRTL={isRTL}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.menuSection}>
          <MenuItem
            icon="message-circle"
            label={t('support')}
            isRTL={isRTL}
          />
          <MenuItem
            icon="info"
            label={t('aboutUs')}
            isRTL={isRTL}
          />
          <MenuItem
            icon="shield"
            label={t('privacyPolicy')}
            isRTL={isRTL}
          />
          <MenuItem
            icon="file-text"
            label={t('termsConditions')}
            isRTL={isRTL}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(400)} style={[styles.menuSection, { marginBottom: 120 }]}>
          <MenuItem
            icon="log-out"
            label={t('signOut')}
            isRTL={isRTL}
            color={Colors.error}
            onPress={handleSignOut}
          />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  scrollContent: { paddingHorizontal: 20 },
  pageTitle: {
    fontSize: 28,
    fontFamily: 'CormorantGaramond_700Bold',
    color: Colors.text,
    marginBottom: 20,
  },
  userCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  userName: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: Colors.text,
  },
  userEmail: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pointsCard: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pointsIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(201, 169, 110, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.7)',
  },
  pointsValue: {
    fontSize: 22,
    fontFamily: 'CormorantGaramond_700Bold',
    color: Colors.gold,
  },
  menuSection: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuContent: { flex: 1 },
  menuLabel: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    color: Colors.text,
  },
  menuValue: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 1,
  },
});
