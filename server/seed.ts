import { db } from "./db";
import * as s from "@shared/schema";
import { eq } from "drizzle-orm";

export async function seedDatabase() {
  const existingCities = await db.select().from(s.cities);
  if (existingCities.length > 0) return;

  console.log("Seeding database...");

  const [tripoli] = await db.insert(s.cities).values({
    nameEn: 'Tripoli', nameAr: 'طرابلس', country: 'Libya', currency: 'LYD',
    vatEnabled: false, vatPercent: '0', vatInclusive: true, fxRateToUSD: '0.2',
    inventoryMode: 'stock', isActive: true,
  }).returning();

  await db.insert(s.warehouses).values({
    cityId: tripoli.id, nameEn: 'Tripoli Central', nameAr: 'مستودع طرابلس المركزي', address: 'Tripoli, Libya',
  });

  const [admin] = await db.insert(s.users).values({
    phone: '+218910000000', role: 'admin', nameEn: 'Admin', nameAr: 'مدير', cityId: tripoli.id, language: 'en',
  }).returning();

  const [flowerscat] = await db.insert(s.categories).values({ nameEn: 'Flowers', nameAr: 'زهور', slug: 'flowers', icon: 'sun', sortOrder: 0 }).returning();
  const [giftscat] = await db.insert(s.categories).values({ nameEn: 'Gifts', nameAr: 'هدايا', slug: 'gifts', icon: 'gift', sortOrder: 1 }).returning();

  const occasionsData = [
    { nameEn: 'Birthday', nameAr: 'عيد ميلاد', slug: 'birthday', icon: 'gift', color: '#E8D4E8', sortOrder: 0 },
    { nameEn: 'Anniversary', nameAr: 'ذكرى سنوية', slug: 'anniversary', icon: 'heart', color: '#F5D4D4', sortOrder: 1 },
    { nameEn: 'Congratulations', nameAr: 'تهنئة', slug: 'congratulations', icon: 'star', color: '#D4E8D4', sortOrder: 2 },
    { nameEn: 'Apology', nameAr: 'اعتذار', slug: 'apology', icon: 'cloud', color: '#D4D4E8', sortOrder: 3 },
    { nameEn: 'Love', nameAr: 'حب', slug: 'love', icon: 'heart', color: '#F5D4D4', sortOrder: 4 },
    { nameEn: 'Get Well', nameAr: 'شفاء عاجل', slug: 'getwell', icon: 'sun', color: '#FFF4D4', sortOrder: 5 },
    { nameEn: 'Thank You', nameAr: 'شكراً لك', slug: 'thankyou', icon: 'thumbs-up', color: '#D4F0E8', sortOrder: 6 },
    { nameEn: 'New Baby', nameAr: 'مولود جديد', slug: 'newbaby', icon: 'smile', color: '#E8F0FF', sortOrder: 7 },
  ];
  const insertedOccasions = await db.insert(s.occasions).values(occasionsData).returning();
  const occMap = Object.fromEntries(insertedOccasions.map(o => [o.slug, o.id]));

  const moodsData = [
    { nameEn: 'Luxury', nameAr: 'فاخر', slug: 'luxury', color: '#C9A96E', gradientStart: '#C9A96E', gradientEnd: '#A88B4A', sortOrder: 0 },
    { nameEn: 'Romantic', nameAr: 'رومانسي', slug: 'romantic', color: '#D4A0A0', gradientStart: '#D4A0A0', gradientEnd: '#C08080', sortOrder: 1 },
    { nameEn: 'Minimal', nameAr: 'بسيط', slug: 'minimal', color: '#E8E4DE', gradientStart: '#F0ECE6', gradientEnd: '#E0DCD6', sortOrder: 2 },
    { nameEn: 'Warm', nameAr: 'دافئ', slug: 'warm', color: '#E8B878', gradientStart: '#E8B878', gradientEnd: '#D4A060', sortOrder: 3 },
    { nameEn: 'Elegant', nameAr: 'أنيق', slug: 'elegant', color: '#1B3A2D', gradientStart: '#2D5A45', gradientEnd: '#1B3A2D', sortOrder: 4 },
    { nameEn: 'Vibrant', nameAr: 'نابض', slug: 'vibrant', color: '#E85858', gradientStart: '#E85858', gradientEnd: '#C04040', sortOrder: 5 },
  ];
  const insertedMoods = await db.insert(s.moods).values(moodsData).returning();
  const moodMap = Object.fromEntries(insertedMoods.map(m => [m.slug, m.id]));

  const productsData = [
    { nameEn: 'Royal Crimson Bouquet', nameAr: 'باقة كريمزون الملكية', descriptionEn: 'A stunning arrangement of deep red roses paired with eucalyptus and seasonal greens.', descriptionAr: 'ترتيب مذهل من الورود الحمراء العميقة مع الأوكالبتوس والخضروات الموسمية.', priceLYD: '120', priceUSD: '24', categoryId: flowerscat.id, includesEn: ['12 Premium Red Roses', 'Eucalyptus Greens', 'Luxury Wrapping'], includesAr: ['١٢ وردة حمراء فاخرة', 'أوراق أوكالبتوس', 'تغليف فاخر'], expressEligible: true, isFeatured: true, isPopular: true, stockCount: 50, exactMatchVerified: true, images: ['https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=600', 'https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=600'], occasions: ['love', 'anniversary', 'birthday'], moods: ['romantic', 'luxury', 'elegant'] },
    { nameEn: 'Blush Peony Collection', nameAr: 'مجموعة الفاوانيا الوردية', descriptionEn: 'Soft blush peonies arranged with baby breath and white lilies.', descriptionAr: 'فاوانيا وردية ناعمة مع نفس الطفل وزنابق بيضاء.', priceLYD: '150', priceUSD: '30', categoryId: flowerscat.id, includesEn: ['8 Blush Peonies', 'Baby Breath', 'White Lilies', 'Silk Ribbon'], includesAr: ['٨ فاوانيا وردية', 'نفس الطفل', 'زنابق بيضاء', 'شريط حريري'], expressEligible: true, isFeatured: true, isPopular: true, stockCount: 30, exactMatchVerified: true, images: ['https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600', 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=600'], occasions: ['birthday', 'congratulations', 'thankyou'], moods: ['elegant', 'minimal', 'romantic'] },
    { nameEn: 'Golden Sunset Arrangement', nameAr: 'تنسيق الغروب الذهبي', descriptionEn: 'Warm sunflowers and golden chrysanthemums create a vibrant, joyful arrangement.', descriptionAr: 'عباد الشمس الدافئة والأقحوانات الذهبية تخلق تنسيقًا نابضًا بالحياة.', priceLYD: '95', priceUSD: '19', categoryId: flowerscat.id, includesEn: ['6 Sunflowers', 'Golden Chrysanthemums', 'Seasonal Greens'], includesAr: ['٦ عباد شمس', 'أقحوانات ذهبية', 'خضروات موسمية'], expressEligible: true, isFeatured: false, isPopular: true, stockCount: 40, exactMatchVerified: true, images: ['https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=600', 'https://images.unsplash.com/photo-1596438459194-f275f413d6ff?w=600'], occasions: ['congratulations', 'getwell', 'thankyou'], moods: ['warm', 'vibrant'] },
    { nameEn: 'White Elegance', nameAr: 'الأناقة البيضاء', descriptionEn: 'Pure white orchids and calla lilies in a minimalist arrangement.', descriptionAr: 'أوركيد أبيض نقي وزنابق كالا في تنسيق بسيط.', priceLYD: '200', priceUSD: '40', categoryId: flowerscat.id, includesEn: ['5 White Orchids', 'Calla Lilies', 'Premium Vase', 'Satin Wrap'], includesAr: ['٥ أوركيد أبيض', 'زنابق كالا', 'مزهرية فاخرة', 'تغليف ساتان'], expressEligible: true, isFeatured: true, isPopular: false, stockCount: 20, exactMatchVerified: true, images: ['https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=600', 'https://images.unsplash.com/photo-1522068332585-6089cd03e3d0?w=600'], occasions: ['anniversary', 'congratulations', 'apology'], moods: ['luxury', 'elegant', 'minimal'] },
    { nameEn: 'Garden Romance', nameAr: 'رومانسية الحديقة', descriptionEn: 'A lush garden-style bouquet with mixed seasonal blooms, lavender and fragrant herbs.', descriptionAr: 'باقة بأسلوب حديقة خصبة مع أزهار موسمية متنوعة والخزامى والأعشاب العطرية.', priceLYD: '110', priceUSD: '22', categoryId: flowerscat.id, includesEn: ['Mixed Seasonal Blooms', 'Lavender Stems', 'Fragrant Herbs', 'Kraft Wrap'], includesAr: ['أزهار موسمية متنوعة', 'سيقان خزامى', 'أعشاب عطرية', 'تغليف كرافت'], expressEligible: false, isFeatured: false, isPopular: true, stockCount: 35, exactMatchVerified: true, images: ['https://images.unsplash.com/photo-1468327768560-75b778cbb551?w=600', 'https://images.unsplash.com/photo-1494972308805-463bc619d34e?w=600'], occasions: ['birthday', 'thankyou', 'love'], moods: ['romantic', 'warm'] },
    { nameEn: 'Pink Cloud', nameAr: 'سحابة وردية', descriptionEn: 'Dreamy arrangement of pink roses, carnations and gypsophila.', descriptionAr: 'تنسيق حالم من الورود الوردية والقرنفل وجيبسوفيلا.', priceLYD: '85', priceUSD: '17', categoryId: flowerscat.id, includesEn: ['10 Pink Roses', 'Carnations', 'Gypsophila', 'Pink Ribbon'], includesAr: ['١٠ ورود وردية', 'قرنفل', 'جيبسوفيلا', 'شريط وردي'], expressEligible: true, isFeatured: true, isPopular: true, stockCount: 45, exactMatchVerified: true, images: ['https://images.unsplash.com/photo-1502977249166-824b3a8a4d6d?w=600', 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600'], occasions: ['birthday', 'newbaby', 'congratulations'], moods: ['romantic', 'warm', 'vibrant'] },
    { nameEn: 'Luxury Gift Hamper', nameAr: 'سلة هدايا فاخرة', descriptionEn: 'Premium gift basket with artisan chocolates, scented candles and a silk scarf.', descriptionAr: 'سلة هدايا فاخرة مع شوكولاتة حرفية وشموع معطرة ووشاح حريري.', priceLYD: '250', priceUSD: '50', categoryId: giftscat.id, includesEn: ['Artisan Chocolates', 'Scented Candle', 'Silk Scarf', 'Gift Box'], includesAr: ['شوكولاتة حرفية', 'شمعة معطرة', 'وشاح حريري', 'صندوق هدايا'], expressEligible: false, isFeatured: true, isPopular: true, stockCount: 15, exactMatchVerified: true, images: ['https://images.unsplash.com/photo-1549465220-1a8b9238f7e7?w=600', 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600'], occasions: ['birthday', 'anniversary', 'congratulations'], moods: ['luxury', 'elegant'] },
    { nameEn: 'Sweet Indulgence Box', nameAr: 'صندوق اللذة الحلوة', descriptionEn: 'Curated selection of premium chocolates, macarons and dried fruits.', descriptionAr: 'مجموعة مختارة من الشوكولاتة الفاخرة والماكارون والفواكه المجففة.', priceLYD: '180', priceUSD: '36', categoryId: giftscat.id, includesEn: ['Belgian Chocolates', 'French Macarons', 'Dried Fruits', 'Luxury Box'], includesAr: ['شوكولاتة بلجيكية', 'ماكارون فرنسي', 'فواكه مجففة', 'صندوق فاخر'], expressEligible: true, isFeatured: false, isPopular: true, stockCount: 25, exactMatchVerified: true, images: ['https://images.unsplash.com/photo-1548907040-4baa42d10919?w=600', 'https://images.unsplash.com/photo-1511381939415-e44015466834?w=600'], occasions: ['birthday', 'thankyou', 'congratulations'], moods: ['luxury', 'warm', 'elegant'] },
    { nameEn: 'Midnight Orchid', nameAr: 'أوركيد منتصف الليل', descriptionEn: 'Dramatic deep purple orchids with dark foliage.', descriptionAr: 'أوركيد أرجواني عميق مع أوراق داكنة.', priceLYD: '175', priceUSD: '35', categoryId: flowerscat.id, includesEn: ['3 Purple Orchid Stems', 'Dark Foliage', 'Ceramic Pot', 'Gift Card'], includesAr: ['٣ سيقان أوركيد أرجواني', 'أوراق داكنة', 'وعاء سيراميك', 'بطاقة هدية'], expressEligible: true, isFeatured: false, isPopular: false, stockCount: 18, exactMatchVerified: true, images: ['https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=600', 'https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=600'], occasions: ['anniversary', 'apology', 'love'], moods: ['luxury', 'elegant'] },
    { nameEn: 'Zen Garden Set', nameAr: 'مجموعة حديقة زن', descriptionEn: 'A curated wellness gift set with succulents, aromatic oils and meditation stones.', descriptionAr: 'مجموعة هدايا عافية منسقة مع نباتات عصارية وزيوت عطرية وأحجار تأمل.', priceLYD: '145', priceUSD: '29', categoryId: giftscat.id, includesEn: ['Mini Succulent Trio', 'Essential Oil Set', 'Meditation Stones', 'Bamboo Tray'], includesAr: ['ثلاث نباتات عصارية صغيرة', 'مجموعة زيوت عطرية', 'أحجار تأمل', 'صينية بامبو'], expressEligible: false, isFeatured: true, isPopular: false, stockCount: 22, exactMatchVerified: true, images: ['https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600', 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600'], occasions: ['getwell', 'thankyou', 'apology'], moods: ['minimal', 'warm', 'elegant'] },
  ];

  for (const p of productsData) {
    const { images, occasions: occSlugs, moods: moodSlugs, ...productData } = p;
    const [product] = await db.insert(s.products).values(productData).returning();
    if (images.length) {
      await db.insert(s.productImages).values(images.map((url, i) => ({ productId: product.id, url, isPrimary: i === 0, sortOrder: i })));
    }
    const occIds = occSlugs.map(slug => occMap[slug]).filter(Boolean);
    if (occIds.length) {
      await db.insert(s.productOccasions).values(occIds.map(oid => ({ productId: product.id, occasionId: oid })));
    }
    const mIds = moodSlugs.map(slug => moodMap[slug]).filter(Boolean);
    if (mIds.length) {
      await db.insert(s.productMoods).values(mIds.map(mid => ({ productId: product.id, moodId: mid })));
    }
  }

  const addOnsData = [
    { nameEn: 'Gift Card', nameAr: 'بطاقة هدية', priceLYD: '5', priceUSD: '1', icon: 'mail', category: 'card', sortOrder: 0 },
    { nameEn: 'Balloons', nameAr: 'بالونات', priceLYD: '15', priceUSD: '3', icon: 'wind', category: 'decoration', sortOrder: 1 },
    { nameEn: 'Chocolates', nameAr: 'شوكولاتة', priceLYD: '25', priceUSD: '5', icon: 'package', category: 'treats', sortOrder: 2 },
    { nameEn: 'Teddy Bear', nameAr: 'دبدوب', priceLYD: '35', priceUSD: '7', icon: 'heart', category: 'plush', sortOrder: 3 },
    { nameEn: 'Standard Wrap', nameAr: 'تغليف عادي', priceLYD: '10', priceUSD: '2', icon: 'box', category: 'wrapping', sortOrder: 4 },
    { nameEn: 'Premium Wrap', nameAr: 'تغليف فاخر', priceLYD: '25', priceUSD: '5', icon: 'gift', category: 'wrapping', sortOrder: 5 },
    { nameEn: 'Silk Ribbon', nameAr: 'شريط حريري', priceLYD: '8', priceUSD: '2', icon: 'bookmark', category: 'decoration', sortOrder: 6 },
  ];
  await db.insert(s.addOns).values(addOnsData);

  const waTemplates = [
    { nameEn: 'Gift Notification', nameAr: 'إشعار هدية', bodyEn: 'Hello {recipient_name}! Someone special has sent you a gift through Nyluver. Please confirm your availability to receive it. Reply YES to confirm.', bodyAr: 'مرحباً {recipient_name}! أرسل لك شخص مميز هدية عبر نيلوفر. يرجى تأكيد توفرك لاستلامها. أرسل نعم للتأكيد.', placeholders: ['recipient_name'] },
    { nameEn: 'Address Request', nameAr: 'طلب عنوان', bodyEn: 'Hello {recipient_name}! To deliver your gift, we need your delivery address. Please share your location or address details.', bodyAr: 'مرحباً {recipient_name}! لتوصيل هديتك، نحتاج عنوان التوصيل. يرجى مشاركة موقعك أو تفاصيل العنوان.', placeholders: ['recipient_name'] },
    { nameEn: 'Delivery Reminder', nameAr: 'تذكير بالتوصيل', bodyEn: 'Hello {recipient_name}! Your gift delivery is scheduled for {slot_time} today. Please be available to receive it.', bodyAr: 'مرحباً {recipient_name}! موعد توصيل هديتك هو {slot_time} اليوم. يرجى التواجد لاستلامها.', placeholders: ['recipient_name', 'slot_time'] },
  ];
  await db.insert(s.whatsappTemplates).values(waTemplates);

  await db.insert(s.banners).values([
    { titleEn: 'Spring Collection', titleAr: 'مجموعة الربيع', subtitleEn: 'Fresh blooms for every occasion', subtitleAr: 'أزهار طازجة لكل مناسبة', imageUrl: 'https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=800', sortOrder: 0, cityId: tripoli.id },
    { titleEn: 'Luxury Bouquets', titleAr: 'باقات فاخرة', subtitleEn: 'Premium arrangements', subtitleAr: 'تنسيقات فاخرة', imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=800', sortOrder: 1, cityId: tripoli.id },
    { titleEn: 'Premium Gifts', titleAr: 'هدايا مميزة', subtitleEn: 'Curated gift sets', subtitleAr: 'مجموعات هدايا منسقة', imageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238f7e7?w=800', sortOrder: 2, cityId: tripoli.id },
  ]);

  await db.insert(s.loyaltyConfig).values({
    earnType: 'percentage', earnValue: '10', redemptionEnabled: false, pointsPerUnit: '100',
  });

  await db.insert(s.drivers).values([
    { name: 'Ahmed Ali', phone: '+218911111111', cityId: tripoli.id },
    { name: 'Mohamed Hassan', phone: '+218922222222', cityId: tripoli.id },
    { name: 'Omar Khalil', phone: '+218933333333', cityId: tripoli.id },
  ]);

  console.log("Database seeded successfully!");
}
