import { db } from "./db";
import { eq, desc, asc, and, sql, ilike, gte, lte, or, inArray } from "drizzle-orm";
import * as s from "@shared/schema";

export const storage = {
  // ───── CITIES ─────
  async getCities() {
    return db.select().from(s.cities).orderBy(asc(s.cities.nameEn));
  },
  async getCity(id: string) {
    const [city] = await db.select().from(s.cities).where(eq(s.cities.id, id));
    return city;
  },
  async createCity(data: s.InsertCity) {
    const [city] = await db.insert(s.cities).values(data).returning();
    return city;
  },
  async updateCity(id: string, data: Partial<s.InsertCity>) {
    const [city] = await db.update(s.cities).set(data).where(eq(s.cities.id, id)).returning();
    return city;
  },

  // ───── USERS ─────
  async getUser(id: string) {
    const [user] = await db.select().from(s.users).where(eq(s.users.id, id));
    return user;
  },
  async getUserByPhone(phone: string) {
    const [user] = await db.select().from(s.users).where(eq(s.users.phone, phone));
    return user;
  },
  async getUserByEmail(email: string) {
    const [user] = await db.select().from(s.users).where(eq(s.users.email, email));
    return user;
  },
  async getUserByEmailAndPhone(email: string, phone: string) {
    const [user] = await db.select().from(s.users).where(and(eq(s.users.email, email), eq(s.users.phone, phone)));
    return user;
  },
  async getUsers(limit = 50, offset = 0) {
    return db.select().from(s.users).orderBy(desc(s.users.createdAt)).limit(limit).offset(offset);
  },
  async createUser(data: s.InsertUser) {
    const [user] = await db.insert(s.users).values(data).returning();
    return user;
  },
  async updateUser(id: string, data: Partial<s.InsertUser>) {
    const [user] = await db.update(s.users).set(data).where(eq(s.users.id, id)).returning();
    return user;
  },
  async getUserCount() {
    const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(s.users);
    return result.count;
  },

  // ───── OTP ─────
  async getRecentValidOtp(phone: string) {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const [otp] = await db.select().from(s.otpCodes)
      .where(and(
        eq(s.otpCodes.phone, phone),
        eq(s.otpCodes.used, false),
        gte(s.otpCodes.expiresAt, new Date()),
        gte(s.otpCodes.createdAt, twoMinutesAgo)
      ))
      .orderBy(desc(s.otpCodes.createdAt))
      .limit(1);
    return otp;
  },
  async createOtp(phone: string, code: string) {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const [otp] = await db.insert(s.otpCodes).values({ phone, code, expiresAt }).returning();
    return otp;
  },
  async verifyOtp(phone: string, code: string) {
    const [otp] = await db.select().from(s.otpCodes)
      .where(and(eq(s.otpCodes.phone, phone), eq(s.otpCodes.code, code), eq(s.otpCodes.used, false), gte(s.otpCodes.expiresAt, new Date())));
    if (otp) {
      await db.update(s.otpCodes).set({ used: true }).where(eq(s.otpCodes.id, otp.id));
    }
    return otp;
  },

  // ───── CATEGORIES ─────
  async getCategories() {
    return db.select().from(s.categories).orderBy(asc(s.categories.sortOrder));
  },
  async createCategory(data: s.InsertCategory) {
    const [cat] = await db.insert(s.categories).values(data).returning();
    return cat;
  },
  async updateCategory(id: string, data: Partial<s.InsertCategory>) {
    const [cat] = await db.update(s.categories).set(data).where(eq(s.categories.id, id)).returning();
    return cat;
  },
  async deleteCategory(id: string) {
    await db.delete(s.categories).where(eq(s.categories.id, id));
  },

  // ───── OCCASIONS ─────
  async getOccasions() {
    return db.select().from(s.occasions).where(eq(s.occasions.isActive, true)).orderBy(asc(s.occasions.sortOrder));
  },
  async createOccasion(data: any) {
    const [occ] = await db.insert(s.occasions).values(data).returning();
    return occ;
  },
  async updateOccasion(id: string, data: any) {
    const [occ] = await db.update(s.occasions).set(data).where(eq(s.occasions.id, id)).returning();
    return occ;
  },
  async deleteOccasion(id: string) {
    await db.delete(s.occasions).where(eq(s.occasions.id, id));
  },

  // ───── MOODS ─────
  async getMoods() {
    return db.select().from(s.moods).where(eq(s.moods.isActive, true)).orderBy(asc(s.moods.sortOrder));
  },
  async createMood(data: any) {
    const [m] = await db.insert(s.moods).values(data).returning();
    return m;
  },
  async updateMood(id: string, data: any) {
    const [m] = await db.update(s.moods).set(data).where(eq(s.moods.id, id)).returning();
    return m;
  },
  async deleteMood(id: string) {
    await db.delete(s.moods).where(eq(s.moods.id, id));
  },

  // ───── PRODUCTS ─────
  async getProducts(filters?: { categoryId?: string; occasionId?: string; moodId?: string; featured?: boolean; popular?: boolean; search?: string; active?: boolean }) {
    let query = db.select().from(s.products);
    const conditions: any[] = [];
    if (filters?.active !== false) conditions.push(eq(s.products.isActive, true));
    if (filters?.categoryId) conditions.push(eq(s.products.categoryId, filters.categoryId));
    if (filters?.featured) conditions.push(eq(s.products.isFeatured, true));
    if (filters?.popular) conditions.push(eq(s.products.isPopular, true));
    if (filters?.search) conditions.push(or(ilike(s.products.nameEn, `%${filters.search}%`), ilike(s.products.nameAr, `%${filters.search}%`)));

    let result = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(asc(s.products.sortOrder))
      : await query.orderBy(asc(s.products.sortOrder));

    if (filters?.occasionId) {
      const productIds = await db.select({ productId: s.productOccasions.productId })
        .from(s.productOccasions).where(eq(s.productOccasions.occasionId, filters.occasionId));
      const ids = productIds.map(p => p.productId);
      if (ids.length > 0) {
        result = result.filter(p => ids.includes(p.id));
      } else {
        result = [];
      }
    }
    if (filters?.moodId) {
      const productIds = await db.select({ productId: s.productMoods.productId })
        .from(s.productMoods).where(eq(s.productMoods.moodId, filters.moodId));
      const ids = productIds.map(p => p.productId);
      if (ids.length > 0) {
        result = result.filter(p => ids.includes(p.id));
      } else {
        result = [];
      }
    }
    const productIds = result.map(p => p.id);
    if (productIds.length > 0) {
      const allImages = await db.select().from(s.productImages)
        .where(inArray(s.productImages.productId, productIds))
        .orderBy(asc(s.productImages.sortOrder));
      const imageMap = new Map<string, string[]>();
      for (const img of allImages) {
        if (!imageMap.has(img.productId)) imageMap.set(img.productId, []);
        imageMap.get(img.productId)!.push(img.url);
      }
      return result.map(p => ({ ...p, images: imageMap.get(p.id) || [] }));
    }
    return result.map(p => ({ ...p, images: [] as string[] }));
  },
  async getProduct(id: string) {
    const [product] = await db.select().from(s.products).where(eq(s.products.id, id));
    if (!product) return null;
    const images = await db.select().from(s.productImages).where(eq(s.productImages.productId, id)).orderBy(asc(s.productImages.sortOrder));
    const pOcc = await db.select({ occasionId: s.productOccasions.occasionId }).from(s.productOccasions).where(eq(s.productOccasions.productId, id));
    const pMood = await db.select({ moodId: s.productMoods.moodId }).from(s.productMoods).where(eq(s.productMoods.productId, id));
    return { ...product, images, occasionIds: pOcc.map(o => o.occasionId), moodIds: pMood.map(m => m.moodId) };
  },
  async createProduct(data: s.InsertProduct, images: string[], occasionIds: string[], moodIds: string[]) {
    const [product] = await db.insert(s.products).values(data).returning();
    if (images.length) {
      await db.insert(s.productImages).values(images.map((url, i) => ({ productId: product.id, url, isPrimary: i === 0, sortOrder: i })));
    }
    if (occasionIds.length) {
      await db.insert(s.productOccasions).values(occasionIds.map(oid => ({ productId: product.id, occasionId: oid })));
    }
    if (moodIds.length) {
      await db.insert(s.productMoods).values(moodIds.map(mid => ({ productId: product.id, moodId: mid })));
    }
    return product;
  },
  async updateProduct(id: string, data: Partial<s.InsertProduct>, images?: string[], occasionIds?: string[], moodIds?: string[]) {
    const [product] = await db.update(s.products).set(data).where(eq(s.products.id, id)).returning();
    if (images) {
      await db.delete(s.productImages).where(eq(s.productImages.productId, id));
      if (images.length) {
        await db.insert(s.productImages).values(images.map((url, i) => ({ productId: id, url, isPrimary: i === 0, sortOrder: i })));
      }
    }
    if (occasionIds) {
      await db.delete(s.productOccasions).where(eq(s.productOccasions.productId, id));
      if (occasionIds.length) {
        await db.insert(s.productOccasions).values(occasionIds.map(oid => ({ productId: id, occasionId: oid })));
      }
    }
    if (moodIds) {
      await db.delete(s.productMoods).where(eq(s.productMoods.productId, id));
      if (moodIds.length) {
        await db.insert(s.productMoods).values(moodIds.map(mid => ({ productId: id, moodId: mid })));
      }
    }
    return product;
  },
  async deleteProduct(id: string) {
    await db.update(s.products).set({ isActive: false }).where(eq(s.products.id, id));
  },
  async getProductCount() {
    const [result] = await db.select({ count: sql<number>`count(*)::int` }).from(s.products).where(eq(s.products.isActive, true));
    return result.count;
  },

  // ───── ADD-ONS ─────
  async getAddOns() {
    return db.select().from(s.addOns).where(eq(s.addOns.isActive, true)).orderBy(asc(s.addOns.sortOrder));
  },
  async createAddOn(data: any) {
    const [addon] = await db.insert(s.addOns).values(data).returning();
    return addon;
  },
  async updateAddOn(id: string, data: any) {
    const [addon] = await db.update(s.addOns).set(data).where(eq(s.addOns.id, id)).returning();
    return addon;
  },
  async deleteAddOn(id: string) {
    await db.update(s.addOns).set({ isActive: false }).where(eq(s.addOns.id, id));
  },

  // ───── DELIVERY SLOTS ─────
  async getSlots(cityId: string, date: string) {
    return db.select().from(s.deliverySlots)
      .where(and(eq(s.deliverySlots.cityId, cityId), eq(s.deliverySlots.date, date)))
      .orderBy(asc(s.deliverySlots.slotIndex));
  },
  async ensureSlots(cityId: string, date: string) {
    const existing = await this.getSlots(cityId, date);
    if (existing.length > 0) return existing;
    const defaults = [
      { cityId, date, slotIndex: 0, startTime: '10:00', endTime: '13:00', capacity: 50, used: 0 },
      { cityId, date, slotIndex: 1, startTime: '13:00', endTime: '18:00', capacity: 50, used: 0 },
      { cityId, date, slotIndex: 2, startTime: '18:00', endTime: '21:00', capacity: 50, used: 0 },
    ];
    return db.insert(s.deliverySlots).values(defaults).returning();
  },
  async incrementSlotUsed(slotId: string) {
    await db.update(s.deliverySlots).set({ used: sql`${s.deliverySlots.used} + 1` }).where(eq(s.deliverySlots.id, slotId));
  },
  async updateSlotCapacity(id: string, capacity: number) {
    const [slot] = await db.update(s.deliverySlots).set({ capacity }).where(eq(s.deliverySlots.id, id)).returning();
    return slot;
  },

  // ───── BLACKOUT DATES ─────
  async getBlackoutDates(cityId: string) {
    return db.select().from(s.blackoutDates).where(eq(s.blackoutDates.cityId, cityId));
  },
  async createBlackoutDate(data: { cityId: string; date: string; reason?: string }) {
    const [bd] = await db.insert(s.blackoutDates).values(data).returning();
    return bd;
  },
  async deleteBlackoutDate(id: string) {
    await db.delete(s.blackoutDates).where(eq(s.blackoutDates.id, id));
  },

  // ───── ORDERS ─────
  async getOrders(filters?: { status?: string; userId?: string; cityId?: string; flagged?: boolean; limit?: number; offset?: number }) {
    const conditions: any[] = [];
    if (filters?.status) conditions.push(eq(s.orders.status, filters.status as any));
    if (filters?.userId) conditions.push(eq(s.orders.userId, filters.userId));
    if (filters?.cityId) conditions.push(eq(s.orders.cityId, filters.cityId));
    if (filters?.flagged) conditions.push(eq(s.orders.isFlagged, true));

    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;

    const result = conditions.length > 0
      ? await db.select().from(s.orders).where(and(...conditions)).orderBy(desc(s.orders.createdAt)).limit(limit).offset(offset)
      : await db.select().from(s.orders).orderBy(desc(s.orders.createdAt)).limit(limit).offset(offset);
    return result;
  },
  async getOrder(id: string) {
    const [order] = await db.select().from(s.orders).where(eq(s.orders.id, id));
    if (!order) return null;
    const items = await db.select().from(s.orderItems).where(eq(s.orderItems.orderId, id));
    const itemsWithAddOns = await Promise.all(items.map(async (item) => {
      const addOnsData = await db.select().from(s.orderItemAddOns).where(eq(s.orderItemAddOns.orderItemId, item.id));
      return { ...item, addOns: addOnsData };
    }));
    const waLogs = await db.select().from(s.whatsappLogs).where(eq(s.whatsappLogs.orderId, id)).orderBy(desc(s.whatsappLogs.contactedAt));
    const assignment = await db.select().from(s.deliveryAssignments).where(eq(s.deliveryAssignments.orderId, id));
    const [sender] = await db.select({ nameEn: s.users.nameEn, nameAr: s.users.nameAr, phone: s.users.phone, email: s.users.email }).from(s.users).where(eq(s.users.id, order.userId));
    return { ...order, items: itemsWithAddOns, whatsappLogs: waLogs, deliveryAssignment: assignment[0] || null, sender: sender || null };
  },
  async createOrder(data: any, items: any[]) {
    const orderNum = 'NYL-' + Date.now().toString(36).toUpperCase();
    const [order] = await db.insert(s.orders).values({ ...data, orderNumber: orderNum }).returning();
    for (const item of items) {
      const [oi] = await db.insert(s.orderItems).values({
        orderId: order.id,
        productId: item.productId,
        productNameEn: item.productNameEn,
        productNameAr: item.productNameAr,
        productImage: item.productImage,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }).returning();
      if (item.addOns?.length) {
        await db.insert(s.orderItemAddOns).values(item.addOns.map((a: any) => ({
          orderItemId: oi.id,
          addOnId: a.addOnId,
          nameEn: a.nameEn,
          nameAr: a.nameAr,
          price: a.price,
        })));
      }
    }
    return order;
  },
  async updateOrderStatus(id: string, status: string, notes?: string) {
    const updateData: any = { status, updatedAt: new Date() };
    if (notes) updateData.adminNotes = notes;
    const [order] = await db.update(s.orders).set(updateData).where(eq(s.orders.id, id)).returning();
    return order;
  },
  async flagOrder(id: string, reason: string) {
    await db.update(s.orders).set({ isFlagged: true, flagReason: reason }).where(eq(s.orders.id, id));
    await db.insert(s.fraudFlags).values({ orderId: id, reason });
  },
  async getOrderCount(status?: string) {
    const conditions = status ? [eq(s.orders.status, status as any)] : [];
    const [result] = conditions.length
      ? await db.select({ count: sql<number>`count(*)::int` }).from(s.orders).where(and(...conditions))
      : await db.select({ count: sql<number>`count(*)::int` }).from(s.orders);
    return result.count;
  },
  async getOrdersByStatus() {
    const result = await db.select({
      status: s.orders.status,
      count: sql<number>`count(*)::int`,
    }).from(s.orders).groupBy(s.orders.status);
    return result;
  },
  async getTodayRevenue() {
    const today = new Date().toISOString().split('T')[0];
    const [result] = await db.select({
      total: sql<number>`COALESCE(SUM(${s.orders.total}::numeric), 0)::float`,
    }).from(s.orders).where(and(
      gte(s.orders.createdAt, new Date(today)),
      eq(s.orders.status, 'paid')
    ));
    return result?.total || 0;
  },

  // ───── DRIVERS ─────
  async getDrivers() {
    return db.select().from(s.drivers).where(eq(s.drivers.isActive, true));
  },
  async createDriver(data: any) {
    const [driver] = await db.insert(s.drivers).values(data).returning();
    return driver;
  },
  async updateDriver(id: string, data: any) {
    const [driver] = await db.update(s.drivers).set(data).where(eq(s.drivers.id, id)).returning();
    return driver;
  },
  async assignDriver(orderId: string, driverId: string) {
    await db.update(s.orders).set({ driverId, status: 'out_for_delivery', updatedAt: new Date() }).where(eq(s.orders.id, orderId));
    const [assignment] = await db.insert(s.deliveryAssignments).values({ orderId, driverId }).returning();
    return assignment;
  },
  async updateDeliveryAssignment(id: string, data: any) {
    const [a] = await db.update(s.deliveryAssignments).set(data).where(eq(s.deliveryAssignments.id, id)).returning();
    return a;
  },

  // ───── WHATSAPP ─────
  async getWhatsappTemplates() {
    return db.select().from(s.whatsappTemplates).where(eq(s.whatsappTemplates.isActive, true));
  },
  async createWhatsappTemplate(data: any) {
    const [t] = await db.insert(s.whatsappTemplates).values(data).returning();
    return t;
  },
  async updateWhatsappTemplate(id: string, data: any) {
    const [t] = await db.update(s.whatsappTemplates).set(data).where(eq(s.whatsappTemplates.id, id)).returning();
    return t;
  },
  async addWhatsappLog(data: any) {
    const [log] = await db.insert(s.whatsappLogs).values(data).returning();
    return log;
  },

  // ───── LOYALTY ─────
  async getLoyaltyConfig() {
    const [config] = await db.select().from(s.loyaltyConfig);
    return config;
  },
  async updateLoyaltyConfig(data: any) {
    const existing = await this.getLoyaltyConfig();
    if (existing) {
      const [config] = await db.update(s.loyaltyConfig).set({ ...data, updatedAt: new Date() }).where(eq(s.loyaltyConfig.id, existing.id)).returning();
      return config;
    }
    const [config] = await db.insert(s.loyaltyConfig).values(data).returning();
    return config;
  },
  async addLoyaltyEntry(data: any) {
    const [entry] = await db.insert(s.loyaltyLedger).values(data).returning();
    await db.update(s.users).set({ loyaltyPoints: sql`${s.users.loyaltyPoints} + ${data.points}` }).where(eq(s.users.id, data.userId));
    return entry;
  },
  async getLoyaltyLedger(userId: string) {
    return db.select().from(s.loyaltyLedger).where(eq(s.loyaltyLedger.userId, userId)).orderBy(desc(s.loyaltyLedger.createdAt));
  },

  // ───── PROMO CODES ─────
  async getPromoCodes() {
    return db.select().from(s.promoCodes).orderBy(desc(s.promoCodes.createdAt));
  },
  async getPromoByCode(code: string) {
    const [promo] = await db.select().from(s.promoCodes).where(and(eq(s.promoCodes.code, code.toUpperCase()), eq(s.promoCodes.isActive, true)));
    return promo;
  },
  async createPromoCode(data: any) {
    const [promo] = await db.insert(s.promoCodes).values({ ...data, code: data.code.toUpperCase() }).returning();
    return promo;
  },
  async updatePromoCode(id: string, data: any) {
    const [promo] = await db.update(s.promoCodes).set(data).where(eq(s.promoCodes.id, id)).returning();
    return promo;
  },
  async incrementPromoUsed(id: string) {
    await db.update(s.promoCodes).set({ usedCount: sql`${s.promoCodes.usedCount} + 1` }).where(eq(s.promoCodes.id, id));
  },

  // ───── SUBSCRIPTIONS ─────
  async getSubscriptionPlans() {
    return db.select().from(s.subscriptionPlans).where(eq(s.subscriptionPlans.isActive, true));
  },
  async createSubscriptionPlan(data: any) {
    const [plan] = await db.insert(s.subscriptionPlans).values(data).returning();
    return plan;
  },
  async updateSubscriptionPlan(id: string, data: any) {
    const [plan] = await db.update(s.subscriptionPlans).set(data).where(eq(s.subscriptionPlans.id, id)).returning();
    return plan;
  },
  async getUserSubscriptions(userId: string) {
    return db.select().from(s.subscriptions).where(eq(s.subscriptions.userId, userId));
  },
  async createSubscription(data: any) {
    const [sub] = await db.insert(s.subscriptions).values(data).returning();
    return sub;
  },
  async updateSubscription(id: string, data: any) {
    const [sub] = await db.update(s.subscriptions).set(data).where(eq(s.subscriptions.id, id)).returning();
    return sub;
  },

  // ───── BANNERS ─────
  async getBanners(cityId?: string) {
    const conditions = [eq(s.banners.isActive, true)];
    if (cityId) conditions.push(eq(s.banners.cityId, cityId));
    return db.select().from(s.banners).where(and(...conditions)).orderBy(asc(s.banners.sortOrder));
  },
  async createBanner(data: any) {
    const [banner] = await db.insert(s.banners).values(data).returning();
    return banner;
  },
  async updateBanner(id: string, data: any) {
    const [banner] = await db.update(s.banners).set(data).where(eq(s.banners.id, id)).returning();
    return banner;
  },
  async deleteBanner(id: string) {
    await db.delete(s.banners).where(eq(s.banners.id, id));
  },

  // ───── FRAUD ─────
  async getFraudFlags(resolved?: boolean) {
    const conditions = resolved !== undefined ? [eq(s.fraudFlags.resolved, resolved)] : [];
    return conditions.length
      ? db.select().from(s.fraudFlags).where(and(...conditions)).orderBy(desc(s.fraudFlags.createdAt))
      : db.select().from(s.fraudFlags).orderBy(desc(s.fraudFlags.createdAt));
  },
  async resolveFraudFlag(id: string, resolvedBy: string) {
    const [flag] = await db.update(s.fraudFlags).set({ resolved: true, resolvedBy, resolvedAt: new Date() }).where(eq(s.fraudFlags.id, id)).returning();
    return flag;
  },
  async blacklistUser(userId: string) {
    await db.update(s.users).set({ isBlacklisted: true }).where(eq(s.users.id, userId));
  },

  // ───── SETTINGS ─────
  async getSetting(key: string) {
    const [setting] = await db.select().from(s.settings).where(eq(s.settings.key, key));
    return setting?.value;
  },
  async setSetting(key: string, value: string) {
    await db.insert(s.settings).values({ key, value }).onConflictDoUpdate({ target: s.settings.key, set: { value, updatedAt: new Date() } });
  },

  // ───── SAVED RECIPIENTS ─────
  async getSavedRecipients(userId: string) {
    return db.select().from(s.savedRecipients).where(eq(s.savedRecipients.userId, userId));
  },
  async createSavedRecipient(data: any) {
    const [r] = await db.insert(s.savedRecipients).values(data).returning();
    return r;
  },
  async deleteSavedRecipient(id: string) {
    await db.delete(s.savedRecipients).where(eq(s.savedRecipients.id, id));
  },
};
