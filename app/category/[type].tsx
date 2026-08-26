import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, Platform, Dimensions, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { mapApiProduct, mapApiOccasion, mapApiMood, mapApiCategory } from '@/lib/data';
import type { Product } from '@/lib/data';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 52) / 2;

function GridProductCard({ item, lang, isRTL }: { item: Product; lang: string; isRTL: boolean }) {
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
        <Text style={[styles.productName, isRTL && { textAlign: 'right' }]} numberOfLines={2}>{name}</Text>
        <Text style={[styles.productPrice, isRTL && { textAlign: 'right' }]}>{item.price} {currency}</Text>
      </View>
    </Pressable>
  );
}

export default function CategoryScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const { t, lang, isRTL } = useApp();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const [sortBy, setSortBy] = useState<'popular' | 'price_asc' | 'price_desc'>('popular');

  const queryParams = useMemo(() => {
    if (type === 'featured') return '?featured=true';
    if (type?.startsWith('occasion_')) return `?occasionId=${type.replace('occasion_', '')}`;
    if (type?.startsWith('mood_')) return `?moodId=${type.replace('mood_', '')}`;
    return '';
  }, [type]);

  const { data: rawProducts, isLoading: productsLoading } = useQuery<any[]>({
    queryKey: [`/api/products${queryParams}`],
  });

  const { data: rawCategories } = useQuery<any[]>({
    queryKey: ['/api/categories'],
  });

  const { data: rawOccasions } = useQuery<any[]>({
    queryKey: ['/api/occasions'],
  });

  const { data: rawMoods } = useQuery<any[]>({
    queryKey: ['/api/moods'],
  });

  const products = useMemo(() => (rawProducts || []).map(mapApiProduct), [rawProducts]);
  const categories = useMemo(() => (rawCategories || []).map(mapApiCategory), [rawCategories]);
  const occasions = useMemo(() => (rawOccasions || []).map(mapApiOccasion), [rawOccasions]);
  const moods = useMemo(() => (rawMoods || []).map(mapApiMood), [rawMoods]);

  const { title, filteredProducts } = useMemo(() => {
    let title = '';
    let filtered: Product[] = products;

    if (type === 'flowers') {
      title = t('flowers');
      const flowersCat = categories.find(c => c.slug === 'flowers');
      if (flowersCat) {
        filtered = products.filter(p => p.categoryId === flowersCat.id);
      }
    } else if (type === 'gifts') {
      title = t('gifts');
      const giftsCat = categories.find(c => c.slug === 'gifts');
      if (giftsCat) {
        filtered = products.filter(p => p.categoryId === giftsCat.id);
      }
    } else if (type === 'featured') {
      title = t('featured');
    } else if (type?.startsWith('occasion_')) {
      const occasionId = type.replace('occasion_', '');
      const occasion = occasions.find(o => o.id === occasionId);
      title = occasion ? (lang === 'ar' ? occasion.nameAr : occasion.nameEn) : '';
    } else if (type?.startsWith('mood_')) {
      const moodId = type.replace('mood_', '');
      const mood = moods.find(m => m.id === moodId);
      title = mood ? (lang === 'ar' ? mood.nameAr : mood.nameEn) : '';
    } else if (type === 'all_occasions') {
      title = t('shopByOccasion');
    } else {
      title = t('categories');
    }

    if (sortBy === 'price_asc') {
      filtered = [...filtered].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_desc') {
      filtered = [...filtered].sort((a, b) => b.price - a.price);
    }

    return { title, filteredProducts: filtered };
  }, [type, lang, t, sortBy, products, categories, occasions, moods]);

  if (productsLoading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + webTopInset + 8 }, isRTL && { flexDirection: 'row-reverse' }]}>
        <Pressable onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={22} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={styles.headerBtn} />
      </View>

      <View style={[styles.sortBar, isRTL && { flexDirection: 'row-reverse' }]}>
        <Text style={styles.resultCount}>{filteredProducts.length} {lang === 'ar' ? 'منتج' : 'products'}</Text>
        <View style={[styles.sortBtns, isRTL && { flexDirection: 'row-reverse' }]}>
          {[
            { key: 'popular' as const, label: lang === 'ar' ? 'شائع' : 'Popular' },
            { key: 'price_asc' as const, label: lang === 'ar' ? 'الأقل' : 'Low' },
            { key: 'price_desc' as const, label: lang === 'ar' ? 'الأعلى' : 'High' },
          ].map(s => (
            <Pressable
              key={s.key}
              onPress={() => setSortBy(s.key)}
              style={[styles.sortChip, sortBy === s.key && styles.sortChipActive]}
            >
              <Text style={[styles.sortChipText, sortBy === s.key && styles.sortChipTextActive]}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {filteredProducts.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="search" size={40} color={Colors.textTertiary} />
          <Text style={styles.emptyText}>{t('noProductsFound')}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          numColumns={2}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <GridProductCard item={item} lang={lang} isRTL={isRTL} />
          )}
        />
      )}
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
  headerTitle: { fontSize: 18, fontFamily: 'CormorantGaramond_600SemiBold', color: Colors.text, flex: 1, textAlign: 'center' },
  sortBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resultCount: { fontSize: 13, fontFamily: 'Inter_400Regular', color: Colors.textSecondary },
  sortBtns: { flexDirection: 'row', gap: 6 },
  sortChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sortChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sortChipText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  sortChipTextActive: { color: Colors.white },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, fontFamily: 'Inter_500Medium', color: Colors.textSecondary },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  row: { gap: 12, marginBottom: 12 },
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
  productImage: { width: '100%', height: '100%' },
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
  productInfo: { padding: 10, gap: 4 },
  productName: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: Colors.text },
  productPrice: { fontSize: 14, fontFamily: 'Inter_700Bold', color: Colors.primary },
});
