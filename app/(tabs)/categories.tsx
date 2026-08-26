import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { mapApiOccasion, mapApiMood } from '@/lib/data';

export default function CategoriesScreen() {
  const { t, lang, isRTL } = useApp();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const { data: rawOccasions, isLoading: occasionsLoading } = useQuery<any[]>({
    queryKey: ['/api/occasions'],
  });

  const { data: rawMoods, isLoading: moodsLoading } = useQuery<any[]>({
    queryKey: ['/api/moods'],
  });

  const occasions = useMemo(() => (rawOccasions || []).map(mapApiOccasion), [rawOccasions]);
  const moods = useMemo(() => (rawMoods || []).map(mapApiMood), [rawMoods]);

  const mainCategories = [
    {
      id: 'flowers',
      nameEn: 'Flowers',
      nameAr: 'زهور',
      image: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=600',
      icon: 'sun' as const,
    },
    {
      id: 'gifts',
      nameEn: 'Gifts',
      nameAr: 'هدايا',
      image: 'https://images.unsplash.com/photo-1549465220-1a8b9238f7e7?w=600',
      icon: 'gift' as const,
    },
  ];

  const isLoading = occasionsLoading || moodsLoading;

  if (isLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + webTopInset + 12 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={[styles.pageTitle, isRTL && { textAlign: 'right' }]}>{t('categories')}</Text>

        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.mainCats}>
          {mainCategories.map(cat => (
            <Pressable
              key={cat.id}
              onPress={() => router.push({ pathname: '/category/[type]', params: { type: cat.id } })}
              style={({ pressed }) => [styles.mainCatCard, { opacity: pressed ? 0.9 : 1 }]}
            >
              <Image source={{ uri: cat.image }} style={styles.mainCatImage} contentFit="cover" />
              <LinearGradient colors={['transparent', 'rgba(27,58,45,0.9)']} style={styles.mainCatOverlay}>
                <Feather name={cat.icon} size={24} color={Colors.gold} />
                <Text style={styles.mainCatName}>{lang === 'ar' ? cat.nameAr : cat.nameEn}</Text>
              </LinearGradient>
            </Pressable>
          ))}
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('shopByOccasion')}</Text>
          <View style={styles.occasionGrid}>
            {occasions.map(occ => (
              <Pressable
                key={occ.id}
                onPress={() => router.push({ pathname: '/category/[type]', params: { type: `occasion_${occ.id}` } })}
                style={({ pressed }) => [styles.occasionItem, { backgroundColor: occ.color, opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={styles.occasionIconWrap}>
                  <Feather name={occ.icon as any} size={20} color={Colors.primary} />
                </View>
                <Text style={[styles.occasionName, isRTL && { textAlign: 'right' }]} numberOfLines={1}>
                  {lang === 'ar' ? occ.nameAr : occ.nameEn}
                </Text>
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(300)} style={{ paddingBottom: 120 }}>
          <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('shopByMood')}</Text>
          <View style={styles.moodGrid}>
            {moods.map(mood => (
              <Pressable
                key={mood.id}
                onPress={() => router.push({ pathname: '/category/[type]', params: { type: `mood_${mood.id}` } })}
                style={({ pressed }) => [styles.moodItem, { opacity: pressed ? 0.85 : 1 }]}
              >
                <LinearGradient colors={mood.gradient} style={styles.moodGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Text style={styles.moodName}>{lang === 'ar' ? mood.nameAr : mood.nameEn}</Text>
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  content: { paddingHorizontal: 20 },
  pageTitle: {
    fontSize: 28,
    fontFamily: 'CormorantGaramond_700Bold',
    color: Colors.text,
    marginBottom: 20,
  },
  mainCats: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  mainCatCard: {
    flex: 1,
    height: 180,
    borderRadius: 18,
    overflow: 'hidden',
  },
  mainCatImage: { width: '100%', height: '100%' },
  mainCatOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 50,
    alignItems: 'center',
    gap: 6,
  },
  mainCatName: {
    fontSize: 18,
    fontFamily: 'CormorantGaramond_700Bold',
    color: Colors.white,
  },
  sectionTitle: {
    fontSize: 19,
    fontFamily: 'CormorantGaramond_600SemiBold',
    color: Colors.text,
    marginBottom: 14,
  },
  occasionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 28,
  },
  occasionItem: {
    width: '48%',
    flexGrow: 1,
    flexBasis: '45%',
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  occasionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  occasionName: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
    flex: 1,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moodItem: {
    width: '31%',
    flexGrow: 1,
    flexBasis: '30%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  moodGradient: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  moodName: {
    fontSize: 13,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
    letterSpacing: 0.5,
  },
});
