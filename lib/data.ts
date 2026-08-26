export interface Product {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  price: number;
  priceUSD: number;
  images: string[];
  category: string;
  categoryId: string;
  occasions: string[];
  moods: string[];
  includesEn: string[];
  includesAr: string[];
  expressEligible: boolean;
  featured: boolean;
  popular: boolean;
}

export interface AddOn {
  id: string;
  nameEn: string;
  nameAr: string;
  price: number;
  priceUSD: number;
  icon: string;
  category: string;
}

export interface Occasion {
  id: string;
  nameEn: string;
  nameAr: string;
  icon: string;
  color: string;
}

export interface Mood {
  id: string;
  nameEn: string;
  nameAr: string;
  color: string;
  gradient: string[];
}

export interface Category {
  id: string;
  nameEn: string;
  nameAr: string;
  slug: string;
  icon: string;
}

export interface Banner {
  id: string;
  titleEn: string;
  titleAr: string;
  subtitleEn: string;
  subtitleAr: string;
  imageUrl: string;
}

export interface DeliverySlot {
  id: string;
  label: string;
  timeEn: string;
  timeAr: string;
  capacity: number;
  used: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  addOns: AddOn[];
  cardMessage: string;
}

export interface Order {
  id: string;
  orderNumber?: string;
  items: CartItem[];
  recipientName: string;
  recipientPhone: string;
  address: string;
  slotDate: string;
  slotId: string;
  cardMessage?: string;
  paymentMethod: 'card' | 'paypal';
  status: string;
  total: number;
  createdAt: string;
  isExpress: boolean;
}

export function mapApiProduct(p: any): Product {
  return {
    id: p.id,
    nameEn: p.nameEn,
    nameAr: p.nameAr,
    descriptionEn: p.descriptionEn || '',
    descriptionAr: p.descriptionAr || '',
    price: parseFloat(p.priceLYD),
    priceUSD: parseFloat(p.priceUSD),
    images: p.images?.map((img: any) => typeof img === 'string' ? img : img.url) || [],
    category: p.categoryId || '',
    categoryId: p.categoryId || '',
    occasions: p.occasionIds || [],
    moods: p.moodIds || [],
    includesEn: p.includesEn || [],
    includesAr: p.includesAr || [],
    expressEligible: p.expressEligible || false,
    featured: p.isFeatured || false,
    popular: p.isPopular || false,
  };
}

export function mapApiAddOn(a: any): AddOn {
  return {
    id: a.id,
    nameEn: a.nameEn,
    nameAr: a.nameAr,
    price: parseFloat(a.priceLYD),
    priceUSD: parseFloat(a.priceUSD),
    icon: a.icon || 'gift',
    category: a.category || '',
  };
}

export function mapApiOccasion(o: any): Occasion {
  return {
    id: o.id,
    nameEn: o.nameEn,
    nameAr: o.nameAr,
    icon: o.icon || 'star',
    color: o.color || '#E8D4E8',
  };
}

export function mapApiMood(m: any): Mood {
  return {
    id: m.id,
    nameEn: m.nameEn,
    nameAr: m.nameAr,
    color: m.color || '#C9A96E',
    gradient: [m.gradientStart || m.color || '#C9A96E', m.gradientEnd || m.color || '#A88B4A'],
  };
}

export function mapApiCategory(c: any): Category {
  return {
    id: c.id,
    nameEn: c.nameEn,
    nameAr: c.nameAr,
    slug: c.slug,
    icon: c.icon || 'grid',
  };
}

export function mapApiSlot(s: any): DeliverySlot {
  const labels = ['Morning', 'Afternoon', 'Evening'];
  return {
    id: s.id,
    label: labels[s.slotIndex] || `Slot ${s.slotIndex}`,
    timeEn: `${s.startTime} - ${s.endTime}`,
    timeAr: `${s.startTime} - ${s.endTime}`,
    capacity: s.capacity,
    used: s.used,
  };
}
