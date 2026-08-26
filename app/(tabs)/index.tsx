import React, { useState, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Platform, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { mapApiProduct, mapApiOccasion, mapApiMood, mapApiCategory } from '@/lib/data';
import type { Product, Occasion, Mood, Banner } from '@/lib/data';

function ProductCard({ item, lang, isRTL }: { item: Product; lang: string; isRTL: boolean }) {
  const name = lang === 'ar' ? item.nameAr : item.nameEn;
  const currency = lang === 'ar' ? 'د.ل' : 'LYD';

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: item.id } })}
      style={({ pressed }) => [styles.productCard, { opacity: pressed ? 0.95 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <View style={styles.productImageWrap}>
        <Image source={{ uri: item.images[0] }} style={styles.productImage} contentFit="cover" />
        {item.expressEligible && (
          <View style={styles.expressBadge}>
            <Feather name="zap" size={10} color={Colors.primary} />
          </View>
        )}
      </View>
      <View style={[styles.productInfo, isRTL && { alignItems: 'flex-end' }]}>
        <Text style={[styles.productName, isRTL && { textAlign: 'right' }]} numberOfLines={1}>{name}</Text>
        <Text style={[styles.productPrice, isRTL && { textAlign: 'right' }]}>{item.price} {currency}</Text>
      </View>
    </Pressable>
  );
}

function OccasionChip({ item, lang, isRTL }: { item: Occasion; lang: string; isRTL: boolean }) {
  const name = lang === 'ar' ? item.nameAr : item.nameEn;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/category/[type]', params: { type: `occasion_${item.id}` } })}
      style={({ pressed }) => [styles.occasionChip, { backgroundColor: item.color, opacity: pressed ? 0.85 : 1 }]}
    >
      <View style={styles.occasionIcon}>
        <Feather name={item.icon as any} size={20} color={Colors.primary} />
      </View>
      <Text style={[styles.occasionText, isRTL && { textAlign: 'right' }]}>{name}</Text>
    </Pressable>
  );
}

function MoodCard({ item, lang, isRTL }: { item: Mood; lang: string; isRTL: boolean }) {
  const name = lang === 'ar' ? item.nameAr : item.nameEn;
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/category/[type]', params: { type: `mood_${item.id}` } })}
      style={({ pressed }) => [styles.moodCard, { opacity: pressed ? 0.85 : 1 }]}
    >
      <LinearGradient colors={item.gradient} style={styles.moodGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Text style={styles.moodText}>{name}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export default function HomeScreen() {
  const { t, lang, isRTL } = useApp();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const { data: rawProducts = [], isLoading: loadingProducts } = useQuery<any[]>({ queryKey: ['/api/products'] });
  const { data: rawOccasions = [] } = useQuery<any[]>({ queryKey: ['/api/occasions'] });
  const { data: rawMoods = [] } = useQuery<any[]>({ queryKey: ['/api/moods'] });
  const { data: rawBanners = [] } = useQuery<any[]>({ queryKey: ['/api/banners'] });

  const products = useMemo(() => rawProducts.map(mapApiProduct), [rawProducts]);
  const occasions = useMemo(() => rawOccasions.map(mapApiOccasion), [rawOccasions]);
  const moods = useMemo(() => rawMoods.map(mapApiMood), [rawMoods]);

  const featuredProducts = useMemo(() => products.filter(p => p.featured), [products]);
  const popularProducts = useMemo(() => products.filter(p => p.popular), [products]);

  if (loadingProducts) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.gold} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + webTopInset }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600).delay(100)} style={[styles.header, isRTL && { flexDirection: 'row-reverse' }]}>
          <View>
            <Text style={[styles.brandTitle, isRTL && { textAlign: 'right' }]}>NYLUVER</Text>
            <Text style={[styles.cityText, isRTL && { textAlign: 'right' }]}>
              <Feather name="map-pin" size={12} color={Colors.textSecondary} /> {t('tripoli')}
            </Text>
          </View>
          <Pressable style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color={Colors.text} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.searchBar}>
          <Feather name="search" size={18} color={Colors.textTertiary} />
          <TextInput
            placeholder={t('search')}
            placeholderTextColor={Colors.textTertiary}
            style={[styles.searchInput, isRTL && { textAlign: 'right' }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(300)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bannerScroll} contentContainerStyle={styles.bannerContainer}>
            {(rawBanners as Banner[]).map((banner: any, i: number) => (
              <View key={banner.id || i} style={styles.bannerCard}>
                <Image source={{ uri: banner.imageUrl }} style={styles.bannerImage} contentFit="cover" />
                <LinearGradient colors={['transparent', 'rgba(27,58,45,0.85)']} style={styles.bannerOverlay}>
                  <Text style={styles.bannerText}>
                    {lang === 'ar' ? banner.titleAr : banner.titleEn}
                  </Text>
                  <Text style={styles.bannerSubtext}>
                    {lang === 'ar' ? banner.subtitleAr || 'تسوق الآن' : banner.subtitleEn || 'Shop Now'}
                  </Text>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(400)} style={styles.section}>
          <View style={[styles.sectionHeader, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('shopByOccasion')}</Text>
            <Pressable onPress={() => router.push({ pathname: '/category/[type]', params: { type: 'all_occasions' } })}>
              <Text style={styles.viewAllText}>{t('viewAll')}</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {occasions.map(occ => (
              <OccasionChip key={occ.id} item={occ} lang={lang} isRTL={isRTL} />
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(500)} style={styles.section}>
          <View style={[styles.sectionHeader, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('shopByMood')}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {moods.map(mood => (
              <MoodCard key={mood.id} item={mood} lang={lang} isRTL={isRTL} />
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(600)} style={styles.section}>
          <View style={[styles.sectionHeader, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('featured')}</Text>
            <Pressable onPress={() => router.push({ pathname: '/category/[type]', params: { type: 'featured' } })}>
              <Text style={styles.viewAllText}>{t('viewAll')}</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {featuredProducts.map(p => (
              <ProductCard key={p.id} item={p} lang={lang} isRTL={isRTL} />
            ))}
          </ScrollView>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(700)} style={[styles.section, { paddingBottom: 120 }]}>
          <View style={[styles.sectionHeader, isRTL && { flexDirection: 'row-reverse' }]}>
            <Text style={[styles.sectionTitle, isRTL && { textAlign: 'right' }]}>{t('popular')}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
            {popularProducts.map(p => (
              <ProductCard key={p.id} item={p} lang={lang} isRTL={isRTL} />
            ))}
          </ScrollView>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const CARD_WIDTH = 170;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.cream },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  brandTitle: {
    fontSize: 24,
    fontFamily: 'GFSDidot_400Regular',
    color: Colors.primary,
    letterSpacing: 4,
  },
  cityText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: Colors.textSecondary,
    marginTop: 2,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.text,
  },
  bannerScroll: { marginBottom: 8 },
  bannerContainer: { paddingHorizontal: 20, gap: 12 },
  bannerCard: {
    width: 280,
    height: 160,
    borderRadius: 18,
    overflow: 'hidden',
  },
  bannerImage: { width: '100%', height: '100%' },
  bannerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingTop: 40,
  },
  bannerText: {
    fontSize: 18,
    fontFamily: 'CormorantGaramond_600SemiBold',
    color: Colors.white,
  },
  bannerSubtext: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    color: Colors.goldLight,
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  section: { marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 19,
    fontFamily: 'CormorantGaramond_600SemiBold',
    color: Colors.text,
  },
  viewAllText: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.gold,
  },
  horizontalList: { paddingHorizontal: 20, gap: 12 },
  occasionChip: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    gap: 8,
    minWidth: 90,
  },
  occasionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  occasionText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  moodCard: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  moodGradient: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    minWidth: 110,
    alignItems: 'center',
  },
  moodText: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: Colors.white,
    letterSpacing: 1,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  productImageWrap: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  expressBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.gold,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    padding: 10,
    gap: 4,
  },
  productName: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: Colors.text,
  },
  productPrice: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: Colors.primary,
  },
});
