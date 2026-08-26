import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Dimensions, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/colors';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Feather } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function LanguageScreen() {
  const { lang, setLang, onboarded, isLoading, setOnboarded } = useApp();
  const { user, isLoading: authLoading } = useAuth();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!isLoading && !authLoading) {
      if (onboarded && user) {
        router.replace('/(tabs)');
      } else if (onboarded && !user) {
        router.replace('/auth');
      }
    }
  }, [isLoading, authLoading, onboarded, user]);

  if (isLoading || authLoading || onboarded) {
    return (
      <View style={[styles.container, { backgroundColor: Colors.primary }]}>
        <LinearGradient colors={[Colors.primary, '#0F2419']} style={StyleSheet.absoluteFill} />
      </View>
    );
  }

  const handleContinue = () => {
    setOnboarded(true);
    router.replace('/auth');
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.primary, '#0F2419', '#0A1A12']} style={StyleSheet.absoluteFill} />

      <View style={[styles.decorCircle1]} />
      <View style={[styles.decorCircle2]} />

      <View style={[styles.content, { paddingTop: insets.top + webTopInset + 60, paddingBottom: insets.bottom + (Platform.OS === 'web' ? 34 : 20) }]}>
        <Animated.View entering={FadeInUp.duration(800).delay(200)} style={styles.logoArea}>
          <View style={styles.logoIcon}>
            <Feather name="droplet" size={32} color={Colors.gold} />
          </View>
          <Text style={styles.brandName}>NYLUVER</Text>
          <Text style={styles.brandTagline}>Luxury Flowers & Gifts</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(800).delay(400)} style={styles.languageSection}>
          <Text style={styles.chooseText}>Choose your language</Text>
          <Text style={styles.chooseTextAr}>اختر لغتك</Text>

          <View style={styles.langButtons}>
            <Pressable
              onPress={() => setLang('en')}
              style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}
            >
              <Text style={[styles.langBtnText, lang === 'en' && styles.langBtnTextActive]}>English</Text>
            </Pressable>

            <Pressable
              onPress={() => setLang('ar')}
              style={[styles.langBtn, lang === 'ar' && styles.langBtnActive]}
            >
              <Text style={[styles.langBtnText, lang === 'ar' && styles.langBtnTextActive]}>العربية</Text>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(800).delay(600)} style={styles.bottomSection}>
          <Pressable
            onPress={handleContinue}
            style={({ pressed }) => [styles.continueBtn, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <LinearGradient
              colors={[Colors.gold, Colors.goldDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.continueBtnGradient}
            >
              <Text style={styles.continueBtnText}>
                {lang === 'ar' ? 'متابعة' : 'Continue'}
              </Text>
              <Feather name={lang === 'ar' ? 'arrow-left' : 'arrow-right'} size={20} color={Colors.primary} />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  decorCircle1: {
    position: 'absolute',
    top: -100,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(201, 169, 110, 0.06)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -50,
    left: -100,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(201, 169, 110, 0.04)',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoArea: {
    alignItems: 'center',
    gap: 16,
  },
  logoIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(201, 169, 110, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(201, 169, 110, 0.2)',
  },
  brandName: {
    fontSize: 36,
    fontFamily: 'GFSDidot_400Regular',
    color: Colors.cream,
    letterSpacing: 8,
  },
  brandTagline: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: Colors.goldLight,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  languageSection: {
    alignItems: 'center',
    width: '100%',
    gap: 8,
  },
  chooseText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.7)',
  },
  chooseTextAr: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 24,
  },
  langButtons: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  langBtn: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 169, 110, 0.3)',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  langBtnActive: {
    borderColor: Colors.gold,
    backgroundColor: 'rgba(201, 169, 110, 0.1)',
  },
  langBtnText: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    color: 'rgba(255,255,255,0.5)',
  },
  langBtnTextActive: {
    color: Colors.gold,
  },
  bottomSection: {
    width: '100%',
  },
  continueBtn: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  continueBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  continueBtnText: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
});
