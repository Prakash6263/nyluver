var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  addOns: () => addOns,
  banners: () => banners,
  blackoutDates: () => blackoutDates,
  categories: () => categories,
  cities: () => cities,
  deliveryAssignments: () => deliveryAssignments,
  deliverySlots: () => deliverySlots,
  drivers: () => drivers,
  fraudFlags: () => fraudFlags,
  insertAddOnSchema: () => insertAddOnSchema,
  insertBannerSchema: () => insertBannerSchema,
  insertCategorySchema: () => insertCategorySchema,
  insertCitySchema: () => insertCitySchema,
  insertDriverSchema: () => insertDriverSchema,
  insertMoodSchema: () => insertMoodSchema,
  insertOccasionSchema: () => insertOccasionSchema,
  insertOrderSchema: () => insertOrderSchema,
  insertProductSchema: () => insertProductSchema,
  insertPromoCodeSchema: () => insertPromoCodeSchema,
  insertSubscriptionPlanSchema: () => insertSubscriptionPlanSchema,
  insertUserSchema: () => insertUserSchema,
  insertWhatsappTemplateSchema: () => insertWhatsappTemplateSchema,
  inventoryModeEnum: () => inventoryModeEnum,
  loyaltyConfig: () => loyaltyConfig,
  loyaltyLedger: () => loyaltyLedger,
  moods: () => moods,
  occasions: () => occasions,
  orderItemAddOns: () => orderItemAddOns,
  orderItems: () => orderItems,
  orderStatusEnum: () => orderStatusEnum,
  orders: () => orders,
  otpCodes: () => otpCodes,
  paymentMethodEnum: () => paymentMethodEnum,
  paymentTransactions: () => paymentTransactions,
  productImages: () => productImages,
  productMoods: () => productMoods,
  productOccasions: () => productOccasions,
  products: () => products,
  promoCodes: () => promoCodes,
  savedRecipients: () => savedRecipients,
  settings: () => settings,
  subscriptionFreqEnum: () => subscriptionFreqEnum,
  subscriptionPlans: () => subscriptionPlans,
  subscriptionStatusEnum: () => subscriptionStatusEnum,
  subscriptions: () => subscriptions,
  userRoleEnum: () => userRoleEnum,
  users: () => users,
  warehouses: () => warehouses,
  whatsappLogs: () => whatsappLogs,
  whatsappTemplates: () => whatsappTemplates
});
import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  decimal,
  jsonb,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var userRoleEnum, orderStatusEnum, inventoryModeEnum, paymentMethodEnum, subscriptionFreqEnum, subscriptionStatusEnum, cities, warehouses, users, otpCodes, savedRecipients, categories, occasions, moods, products, productImages, productOccasions, productMoods, addOns, deliverySlots, blackoutDates, orders, orderItems, orderItemAddOns, paymentTransactions, drivers, deliveryAssignments, whatsappLogs, whatsappTemplates, loyaltyLedger, loyaltyConfig, promoCodes, subscriptionPlans, subscriptions, banners, fraudFlags, settings, insertCitySchema, insertUserSchema, insertProductSchema, insertCategorySchema, insertOccasionSchema, insertMoodSchema, insertAddOnSchema, insertOrderSchema, insertBannerSchema, insertPromoCodeSchema, insertDriverSchema, insertSubscriptionPlanSchema, insertWhatsappTemplateSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    userRoleEnum = pgEnum("user_role", ["customer", "admin"]);
    orderStatusEnum = pgEnum("order_status", [
      "pending_payment",
      "paid",
      "awaiting_recipient",
      "accepted",
      "in_prep",
      "ready",
      "out_for_delivery",
      "delivered",
      "failed_delivery",
      "declined",
      "cancelled",
      "rescheduled"
    ]);
    inventoryModeEnum = pgEnum("inventory_mode", ["stock", "quota"]);
    paymentMethodEnum = pgEnum("payment_method", ["card", "paypal"]);
    subscriptionFreqEnum = pgEnum("subscription_freq", ["weekly", "monthly"]);
    subscriptionStatusEnum = pgEnum("subscription_status", ["active", "paused", "cancelled"]);
    cities = pgTable("cities", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      nameEn: text("name_en").notNull(),
      nameAr: text("name_ar").notNull(),
      country: text("country").notNull().default("Libya"),
      currency: text("currency").notNull().default("LYD"),
      vatEnabled: boolean("vat_enabled").notNull().default(false),
      vatPercent: decimal("vat_percent", { precision: 5, scale: 2 }).notNull().default("0"),
      vatInclusive: boolean("vat_inclusive").notNull().default(true),
      fxRateToUSD: decimal("fx_rate_to_usd", { precision: 10, scale: 4 }).notNull().default("0.2"),
      inventoryMode: inventoryModeEnum("inventory_mode").notNull().default("stock"),
      isActive: boolean("is_active").notNull().default(true),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    warehouses = pgTable("warehouses", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      cityId: varchar("city_id").notNull().references(() => cities.id),
      nameEn: text("name_en").notNull(),
      nameAr: text("name_ar").notNull(),
      address: text("address"),
      isActive: boolean("is_active").notNull().default(true)
    });
    users = pgTable("users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      phone: text("phone").notNull().unique(),
      email: text("email"),
      nameEn: text("name_en"),
      nameAr: text("name_ar"),
      role: userRoleEnum("role").notNull().default("customer"),
      cityId: varchar("city_id").references(() => cities.id),
      language: text("language").notNull().default("en"),
      isBlacklisted: boolean("is_blacklisted").notNull().default(false),
      deviceFingerprint: text("device_fingerprint"),
      loyaltyPoints: integer("loyalty_points").notNull().default(0),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      lastLoginAt: timestamp("last_login_at")
    });
    otpCodes = pgTable("otp_codes", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      phone: text("phone").notNull(),
      code: text("code").notNull(),
      expiresAt: timestamp("expires_at").notNull(),
      used: boolean("used").notNull().default(false),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    savedRecipients = pgTable("saved_recipients", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      name: text("name").notNull(),
      phone: text("phone").notNull(),
      address: text("address")
    });
    categories = pgTable("categories", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      nameEn: text("name_en").notNull(),
      nameAr: text("name_ar").notNull(),
      slug: text("slug").notNull().unique(),
      icon: text("icon"),
      sortOrder: integer("sort_order").notNull().default(0),
      isActive: boolean("is_active").notNull().default(true)
    });
    occasions = pgTable("occasions", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      nameEn: text("name_en").notNull(),
      nameAr: text("name_ar").notNull(),
      slug: text("slug").notNull().unique(),
      icon: text("icon"),
      color: text("color"),
      sortOrder: integer("sort_order").notNull().default(0),
      isActive: boolean("is_active").notNull().default(true)
    });
    moods = pgTable("moods", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      nameEn: text("name_en").notNull(),
      nameAr: text("name_ar").notNull(),
      slug: text("slug").notNull().unique(),
      color: text("color"),
      gradientStart: text("gradient_start"),
      gradientEnd: text("gradient_end"),
      sortOrder: integer("sort_order").notNull().default(0),
      isActive: boolean("is_active").notNull().default(true)
    });
    products = pgTable("products", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      nameEn: text("name_en").notNull(),
      nameAr: text("name_ar").notNull(),
      descriptionEn: text("description_en"),
      descriptionAr: text("description_ar"),
      priceLYD: decimal("price_lyd", { precision: 10, scale: 2 }).notNull(),
      priceUSD: decimal("price_usd", { precision: 10, scale: 2 }).notNull(),
      categoryId: varchar("category_id").references(() => categories.id),
      includesEn: jsonb("includes_en").$type().default([]),
      includesAr: jsonb("includes_ar").$type().default([]),
      expressEligible: boolean("express_eligible").notNull().default(false),
      isFeatured: boolean("is_featured").notNull().default(false),
      isPopular: boolean("is_popular").notNull().default(false),
      isActive: boolean("is_active").notNull().default(true),
      stockCount: integer("stock_count").notNull().default(0),
      dailyQuota: integer("daily_quota"),
      exactMatchVerified: boolean("exact_match_verified").notNull().default(false),
      sortOrder: integer("sort_order").notNull().default(0),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    productImages = pgTable("product_images", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
      url: text("url").notNull(),
      isPrimary: boolean("is_primary").notNull().default(false),
      sortOrder: integer("sort_order").notNull().default(0)
    });
    productOccasions = pgTable("product_occasions", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
      occasionId: varchar("occasion_id").notNull().references(() => occasions.id, { onDelete: "cascade" })
    });
    productMoods = pgTable("product_moods", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      productId: varchar("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
      moodId: varchar("mood_id").notNull().references(() => moods.id, { onDelete: "cascade" })
    });
    addOns = pgTable("add_ons", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      nameEn: text("name_en").notNull(),
      nameAr: text("name_ar").notNull(),
      priceLYD: decimal("price_lyd", { precision: 10, scale: 2 }).notNull(),
      priceUSD: decimal("price_usd", { precision: 10, scale: 2 }).notNull(),
      icon: text("icon"),
      category: text("category"),
      isActive: boolean("is_active").notNull().default(true),
      sortOrder: integer("sort_order").notNull().default(0)
    });
    deliverySlots = pgTable("delivery_slots", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      cityId: varchar("city_id").notNull().references(() => cities.id),
      date: text("date").notNull(),
      slotIndex: integer("slot_index").notNull(),
      startTime: text("start_time").notNull(),
      endTime: text("end_time").notNull(),
      capacity: integer("capacity").notNull().default(50),
      used: integer("used").notNull().default(0),
      isBlocked: boolean("is_blocked").notNull().default(false)
    });
    blackoutDates = pgTable("blackout_dates", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      cityId: varchar("city_id").notNull().references(() => cities.id),
      date: text("date").notNull(),
      reason: text("reason")
    });
    orders = pgTable("orders", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      orderNumber: text("order_number").notNull().unique(),
      userId: varchar("user_id").notNull().references(() => users.id),
      cityId: varchar("city_id").notNull().references(() => cities.id),
      recipientName: text("recipient_name").notNull(),
      recipientPhone: text("recipient_phone").notNull(),
      address: text("address"),
      slotId: varchar("slot_id").references(() => deliverySlots.id),
      slotDate: text("slot_date"),
      slotTime: text("slot_time"),
      cardMessage: text("card_message"),
      paymentMethod: paymentMethodEnum("payment_method").notNull(),
      subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
      deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull().default("0"),
      expressFee: decimal("express_fee", { precision: 10, scale: 2 }).notNull().default("0"),
      discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default("0"),
      vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).notNull().default("0"),
      total: decimal("total", { precision: 10, scale: 2 }).notNull(),
      totalUSD: decimal("total_usd", { precision: 10, scale: 2 }),
      status: orderStatusEnum("status").notNull().default("pending_payment"),
      isExpress: boolean("is_express").notNull().default(false),
      promoCodeId: varchar("promo_code_id"),
      driverId: varchar("driver_id"),
      adminNotes: text("admin_notes"),
      isFlagged: boolean("is_flagged").notNull().default(false),
      flagReason: text("flag_reason"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    orderItems = pgTable("order_items", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
      productId: varchar("product_id").notNull().references(() => products.id),
      productNameEn: text("product_name_en").notNull(),
      productNameAr: text("product_name_ar").notNull(),
      productImage: text("product_image"),
      quantity: integer("quantity").notNull().default(1),
      unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull()
    });
    orderItemAddOns = pgTable("order_item_add_ons", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      orderItemId: varchar("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
      addOnId: varchar("add_on_id").notNull().references(() => addOns.id),
      nameEn: text("name_en").notNull(),
      nameAr: text("name_ar").notNull(),
      price: decimal("price", { precision: 10, scale: 2 }).notNull()
    });
    paymentTransactions = pgTable("payment_transactions", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      orderId: varchar("order_id").notNull().references(() => orders.id),
      method: paymentMethodEnum("method").notNull(),
      amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
      currency: text("currency").notNull(),
      externalId: text("external_id"),
      status: text("status").notNull().default("pending"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    drivers = pgTable("drivers", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      phone: text("phone").notNull(),
      cityId: varchar("city_id").references(() => cities.id),
      isActive: boolean("is_active").notNull().default(true),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    deliveryAssignments = pgTable("delivery_assignments", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      orderId: varchar("order_id").notNull().references(() => orders.id),
      driverId: varchar("driver_id").notNull().references(() => drivers.id),
      assignedAt: timestamp("assigned_at").defaultNow().notNull(),
      pickedUpAt: timestamp("picked_up_at"),
      deliveredAt: timestamp("delivered_at"),
      failedAt: timestamp("failed_at"),
      notes: text("notes")
    });
    whatsappLogs = pgTable("whatsapp_logs", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      orderId: varchar("order_id").notNull().references(() => orders.id),
      templateUsed: text("template_used"),
      language: text("language"),
      notes: text("notes"),
      outcome: text("outcome"),
      contactedAt: timestamp("contacted_at").defaultNow().notNull(),
      createdBy: varchar("created_by").references(() => users.id)
    });
    whatsappTemplates = pgTable("whatsapp_templates", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      nameEn: text("name_en").notNull(),
      nameAr: text("name_ar").notNull(),
      bodyEn: text("body_en").notNull(),
      bodyAr: text("body_ar").notNull(),
      placeholders: jsonb("placeholders").$type().default([]),
      isActive: boolean("is_active").notNull().default(true)
    });
    loyaltyLedger = pgTable("loyalty_ledger", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      orderId: varchar("order_id").references(() => orders.id),
      points: integer("points").notNull(),
      type: text("type").notNull(),
      description: text("description"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    loyaltyConfig = pgTable("loyalty_config", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      earnType: text("earn_type").notNull().default("percentage"),
      earnValue: decimal("earn_value", { precision: 5, scale: 2 }).notNull().default("10"),
      redemptionEnabled: boolean("redemption_enabled").notNull().default(false),
      pointsPerUnit: decimal("points_per_unit", { precision: 10, scale: 2 }).notNull().default("100"),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    promoCodes = pgTable("promo_codes", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      code: text("code").notNull().unique(),
      type: text("type").notNull(),
      value: decimal("value", { precision: 10, scale: 2 }).notNull(),
      minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }),
      maxUses: integer("max_uses"),
      usedCount: integer("used_count").notNull().default(0),
      categoryId: varchar("category_id"),
      isFirstOrderOnly: boolean("is_first_order_only").notNull().default(false),
      isActive: boolean("is_active").notNull().default(true),
      expiresAt: timestamp("expires_at"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    subscriptionPlans = pgTable("subscription_plans", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      nameEn: text("name_en").notNull(),
      nameAr: text("name_ar").notNull(),
      descriptionEn: text("description_en"),
      descriptionAr: text("description_ar"),
      frequency: subscriptionFreqEnum("frequency").notNull(),
      priceLYD: decimal("price_lyd", { precision: 10, scale: 2 }).notNull(),
      priceUSD: decimal("price_usd", { precision: 10, scale: 2 }).notNull(),
      isActive: boolean("is_active").notNull().default(true),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    subscriptions = pgTable("subscriptions", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").notNull().references(() => users.id),
      planId: varchar("plan_id").notNull().references(() => subscriptionPlans.id),
      status: subscriptionStatusEnum("status").notNull().default("active"),
      preferredSlot: text("preferred_slot"),
      autoRenew: boolean("auto_renew").notNull().default(true),
      nextDeliveryDate: text("next_delivery_date"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      pausedAt: timestamp("paused_at"),
      cancelledAt: timestamp("cancelled_at")
    });
    banners = pgTable("banners", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      titleEn: text("title_en"),
      titleAr: text("title_ar"),
      subtitleEn: text("subtitle_en"),
      subtitleAr: text("subtitle_ar"),
      imageUrl: text("image_url").notNull(),
      linkType: text("link_type"),
      linkValue: text("link_value"),
      sortOrder: integer("sort_order").notNull().default(0),
      isActive: boolean("is_active").notNull().default(true),
      cityId: varchar("city_id").references(() => cities.id)
    });
    fraudFlags = pgTable("fraud_flags", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      userId: varchar("user_id").references(() => users.id),
      orderId: varchar("order_id").references(() => orders.id),
      reason: text("reason").notNull(),
      resolved: boolean("resolved").notNull().default(false),
      resolvedBy: varchar("resolved_by"),
      resolvedAt: timestamp("resolved_at"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    settings = pgTable("settings", {
      key: text("key").primaryKey(),
      value: text("value").notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    insertCitySchema = createInsertSchema(cities).omit({ id: true, createdAt: true });
    insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, lastLoginAt: true });
    insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
    insertCategorySchema = createInsertSchema(categories).omit({ id: true });
    insertOccasionSchema = createInsertSchema(occasions).omit({ id: true });
    insertMoodSchema = createInsertSchema(moods).omit({ id: true });
    insertAddOnSchema = createInsertSchema(addOns).omit({ id: true });
    insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
    insertBannerSchema = createInsertSchema(banners).omit({ id: true });
    insertPromoCodeSchema = createInsertSchema(promoCodes).omit({ id: true, createdAt: true, usedCount: true });
    insertDriverSchema = createInsertSchema(drivers).omit({ id: true, createdAt: true });
    insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true });
    insertWhatsappTemplateSchema = createInsertSchema(whatsappTemplates).omit({ id: true });
  }
});

// server/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required");
    }
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema: schema_exports });
  }
});

// server/seed.ts
var seed_exports = {};
__export(seed_exports, {
  seedDatabase: () => seedDatabase
});
async function seedDatabase() {
  const existingCities = await db.select().from(cities);
  if (existingCities.length > 0) return;
  console.log("Seeding database...");
  const [tripoli] = await db.insert(cities).values({
    nameEn: "Tripoli",
    nameAr: "\u0637\u0631\u0627\u0628\u0644\u0633",
    country: "Libya",
    currency: "LYD",
    vatEnabled: false,
    vatPercent: "0",
    vatInclusive: true,
    fxRateToUSD: "0.2",
    inventoryMode: "stock",
    isActive: true
  }).returning();
  await db.insert(warehouses).values({
    cityId: tripoli.id,
    nameEn: "Tripoli Central",
    nameAr: "\u0645\u0633\u062A\u0648\u062F\u0639 \u0637\u0631\u0627\u0628\u0644\u0633 \u0627\u0644\u0645\u0631\u0643\u0632\u064A",
    address: "Tripoli, Libya"
  });
  const [admin] = await db.insert(users).values({
    phone: "+218910000000",
    role: "admin",
    nameEn: "Admin",
    nameAr: "\u0645\u062F\u064A\u0631",
    cityId: tripoli.id,
    language: "en"
  }).returning();
  const [flowerscat] = await db.insert(categories).values({ nameEn: "Flowers", nameAr: "\u0632\u0647\u0648\u0631", slug: "flowers", icon: "sun", sortOrder: 0 }).returning();
  const [giftscat] = await db.insert(categories).values({ nameEn: "Gifts", nameAr: "\u0647\u062F\u0627\u064A\u0627", slug: "gifts", icon: "gift", sortOrder: 1 }).returning();
  const occasionsData = [
    { nameEn: "Birthday", nameAr: "\u0639\u064A\u062F \u0645\u064A\u0644\u0627\u062F", slug: "birthday", icon: "gift", color: "#E8D4E8", sortOrder: 0 },
    { nameEn: "Anniversary", nameAr: "\u0630\u0643\u0631\u0649 \u0633\u0646\u0648\u064A\u0629", slug: "anniversary", icon: "heart", color: "#F5D4D4", sortOrder: 1 },
    { nameEn: "Congratulations", nameAr: "\u062A\u0647\u0646\u0626\u0629", slug: "congratulations", icon: "star", color: "#D4E8D4", sortOrder: 2 },
    { nameEn: "Apology", nameAr: "\u0627\u0639\u062A\u0630\u0627\u0631", slug: "apology", icon: "cloud", color: "#D4D4E8", sortOrder: 3 },
    { nameEn: "Love", nameAr: "\u062D\u0628", slug: "love", icon: "heart", color: "#F5D4D4", sortOrder: 4 },
    { nameEn: "Get Well", nameAr: "\u0634\u0641\u0627\u0621 \u0639\u0627\u062C\u0644", slug: "getwell", icon: "sun", color: "#FFF4D4", sortOrder: 5 },
    { nameEn: "Thank You", nameAr: "\u0634\u0643\u0631\u0627\u064B \u0644\u0643", slug: "thankyou", icon: "thumbs-up", color: "#D4F0E8", sortOrder: 6 },
    { nameEn: "New Baby", nameAr: "\u0645\u0648\u0644\u0648\u062F \u062C\u062F\u064A\u062F", slug: "newbaby", icon: "smile", color: "#E8F0FF", sortOrder: 7 }
  ];
  const insertedOccasions = await db.insert(occasions).values(occasionsData).returning();
  const occMap = Object.fromEntries(insertedOccasions.map((o) => [o.slug, o.id]));
  const moodsData = [
    { nameEn: "Luxury", nameAr: "\u0641\u0627\u062E\u0631", slug: "luxury", color: "#C9A96E", gradientStart: "#C9A96E", gradientEnd: "#A88B4A", sortOrder: 0 },
    { nameEn: "Romantic", nameAr: "\u0631\u0648\u0645\u0627\u0646\u0633\u064A", slug: "romantic", color: "#D4A0A0", gradientStart: "#D4A0A0", gradientEnd: "#C08080", sortOrder: 1 },
    { nameEn: "Minimal", nameAr: "\u0628\u0633\u064A\u0637", slug: "minimal", color: "#E8E4DE", gradientStart: "#F0ECE6", gradientEnd: "#E0DCD6", sortOrder: 2 },
    { nameEn: "Warm", nameAr: "\u062F\u0627\u0641\u0626", slug: "warm", color: "#E8B878", gradientStart: "#E8B878", gradientEnd: "#D4A060", sortOrder: 3 },
    { nameEn: "Elegant", nameAr: "\u0623\u0646\u064A\u0642", slug: "elegant", color: "#1B3A2D", gradientStart: "#2D5A45", gradientEnd: "#1B3A2D", sortOrder: 4 },
    { nameEn: "Vibrant", nameAr: "\u0646\u0627\u0628\u0636", slug: "vibrant", color: "#E85858", gradientStart: "#E85858", gradientEnd: "#C04040", sortOrder: 5 }
  ];
  const insertedMoods = await db.insert(moods).values(moodsData).returning();
  const moodMap = Object.fromEntries(insertedMoods.map((m) => [m.slug, m.id]));
  const productsData = [
    { nameEn: "Royal Crimson Bouquet", nameAr: "\u0628\u0627\u0642\u0629 \u0643\u0631\u064A\u0645\u0632\u0648\u0646 \u0627\u0644\u0645\u0644\u0643\u064A\u0629", descriptionEn: "A stunning arrangement of deep red roses paired with eucalyptus and seasonal greens.", descriptionAr: "\u062A\u0631\u062A\u064A\u0628 \u0645\u0630\u0647\u0644 \u0645\u0646 \u0627\u0644\u0648\u0631\u0648\u062F \u0627\u0644\u062D\u0645\u0631\u0627\u0621 \u0627\u0644\u0639\u0645\u064A\u0642\u0629 \u0645\u0639 \u0627\u0644\u0623\u0648\u0643\u0627\u0644\u0628\u062A\u0648\u0633 \u0648\u0627\u0644\u062E\u0636\u0631\u0648\u0627\u062A \u0627\u0644\u0645\u0648\u0633\u0645\u064A\u0629.", priceLYD: "120", priceUSD: "24", categoryId: flowerscat.id, includesEn: ["12 Premium Red Roses", "Eucalyptus Greens", "Luxury Wrapping"], includesAr: ["\u0661\u0662 \u0648\u0631\u062F\u0629 \u062D\u0645\u0631\u0627\u0621 \u0641\u0627\u062E\u0631\u0629", "\u0623\u0648\u0631\u0627\u0642 \u0623\u0648\u0643\u0627\u0644\u0628\u062A\u0648\u0633", "\u062A\u063A\u0644\u064A\u0641 \u0641\u0627\u062E\u0631"], expressEligible: true, isFeatured: true, isPopular: true, stockCount: 50, exactMatchVerified: true, images: ["https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=600", "https://images.unsplash.com/photo-1455659817273-f96807779a8a?w=600"], occasions: ["love", "anniversary", "birthday"], moods: ["romantic", "luxury", "elegant"] },
    { nameEn: "Blush Peony Collection", nameAr: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0641\u0627\u0648\u0627\u0646\u064A\u0627 \u0627\u0644\u0648\u0631\u062F\u064A\u0629", descriptionEn: "Soft blush peonies arranged with baby breath and white lilies.", descriptionAr: "\u0641\u0627\u0648\u0627\u0646\u064A\u0627 \u0648\u0631\u062F\u064A\u0629 \u0646\u0627\u0639\u0645\u0629 \u0645\u0639 \u0646\u0641\u0633 \u0627\u0644\u0637\u0641\u0644 \u0648\u0632\u0646\u0627\u0628\u0642 \u0628\u064A\u0636\u0627\u0621.", priceLYD: "150", priceUSD: "30", categoryId: flowerscat.id, includesEn: ["8 Blush Peonies", "Baby Breath", "White Lilies", "Silk Ribbon"], includesAr: ["\u0668 \u0641\u0627\u0648\u0627\u0646\u064A\u0627 \u0648\u0631\u062F\u064A\u0629", "\u0646\u0641\u0633 \u0627\u0644\u0637\u0641\u0644", "\u0632\u0646\u0627\u0628\u0642 \u0628\u064A\u0636\u0627\u0621", "\u0634\u0631\u064A\u0637 \u062D\u0631\u064A\u0631\u064A"], expressEligible: true, isFeatured: true, isPopular: true, stockCount: 30, exactMatchVerified: true, images: ["https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600", "https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=600"], occasions: ["birthday", "congratulations", "thankyou"], moods: ["elegant", "minimal", "romantic"] },
    { nameEn: "Golden Sunset Arrangement", nameAr: "\u062A\u0646\u0633\u064A\u0642 \u0627\u0644\u063A\u0631\u0648\u0628 \u0627\u0644\u0630\u0647\u0628\u064A", descriptionEn: "Warm sunflowers and golden chrysanthemums create a vibrant, joyful arrangement.", descriptionAr: "\u0639\u0628\u0627\u062F \u0627\u0644\u0634\u0645\u0633 \u0627\u0644\u062F\u0627\u0641\u0626\u0629 \u0648\u0627\u0644\u0623\u0642\u062D\u0648\u0627\u0646\u0627\u062A \u0627\u0644\u0630\u0647\u0628\u064A\u0629 \u062A\u062E\u0644\u0642 \u062A\u0646\u0633\u064A\u0642\u064B\u0627 \u0646\u0627\u0628\u0636\u064B\u0627 \u0628\u0627\u0644\u062D\u064A\u0627\u0629.", priceLYD: "95", priceUSD: "19", categoryId: flowerscat.id, includesEn: ["6 Sunflowers", "Golden Chrysanthemums", "Seasonal Greens"], includesAr: ["\u0666 \u0639\u0628\u0627\u062F \u0634\u0645\u0633", "\u0623\u0642\u062D\u0648\u0627\u0646\u0627\u062A \u0630\u0647\u0628\u064A\u0629", "\u062E\u0636\u0631\u0648\u0627\u062A \u0645\u0648\u0633\u0645\u064A\u0629"], expressEligible: true, isFeatured: false, isPopular: true, stockCount: 40, exactMatchVerified: true, images: ["https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=600", "https://images.unsplash.com/photo-1596438459194-f275f413d6ff?w=600"], occasions: ["congratulations", "getwell", "thankyou"], moods: ["warm", "vibrant"] },
    { nameEn: "White Elegance", nameAr: "\u0627\u0644\u0623\u0646\u0627\u0642\u0629 \u0627\u0644\u0628\u064A\u0636\u0627\u0621", descriptionEn: "Pure white orchids and calla lilies in a minimalist arrangement.", descriptionAr: "\u0623\u0648\u0631\u0643\u064A\u062F \u0623\u0628\u064A\u0636 \u0646\u0642\u064A \u0648\u0632\u0646\u0627\u0628\u0642 \u0643\u0627\u0644\u0627 \u0641\u064A \u062A\u0646\u0633\u064A\u0642 \u0628\u0633\u064A\u0637.", priceLYD: "200", priceUSD: "40", categoryId: flowerscat.id, includesEn: ["5 White Orchids", "Calla Lilies", "Premium Vase", "Satin Wrap"], includesAr: ["\u0665 \u0623\u0648\u0631\u0643\u064A\u062F \u0623\u0628\u064A\u0636", "\u0632\u0646\u0627\u0628\u0642 \u0643\u0627\u0644\u0627", "\u0645\u0632\u0647\u0631\u064A\u0629 \u0641\u0627\u062E\u0631\u0629", "\u062A\u063A\u0644\u064A\u0641 \u0633\u0627\u062A\u0627\u0646"], expressEligible: true, isFeatured: true, isPopular: false, stockCount: 20, exactMatchVerified: true, images: ["https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=600", "https://images.unsplash.com/photo-1522068332585-6089cd03e3d0?w=600"], occasions: ["anniversary", "congratulations", "apology"], moods: ["luxury", "elegant", "minimal"] },
    { nameEn: "Garden Romance", nameAr: "\u0631\u0648\u0645\u0627\u0646\u0633\u064A\u0629 \u0627\u0644\u062D\u062F\u064A\u0642\u0629", descriptionEn: "A lush garden-style bouquet with mixed seasonal blooms, lavender and fragrant herbs.", descriptionAr: "\u0628\u0627\u0642\u0629 \u0628\u0623\u0633\u0644\u0648\u0628 \u062D\u062F\u064A\u0642\u0629 \u062E\u0635\u0628\u0629 \u0645\u0639 \u0623\u0632\u0647\u0627\u0631 \u0645\u0648\u0633\u0645\u064A\u0629 \u0645\u062A\u0646\u0648\u0639\u0629 \u0648\u0627\u0644\u062E\u0632\u0627\u0645\u0649 \u0648\u0627\u0644\u0623\u0639\u0634\u0627\u0628 \u0627\u0644\u0639\u0637\u0631\u064A\u0629.", priceLYD: "110", priceUSD: "22", categoryId: flowerscat.id, includesEn: ["Mixed Seasonal Blooms", "Lavender Stems", "Fragrant Herbs", "Kraft Wrap"], includesAr: ["\u0623\u0632\u0647\u0627\u0631 \u0645\u0648\u0633\u0645\u064A\u0629 \u0645\u062A\u0646\u0648\u0639\u0629", "\u0633\u064A\u0642\u0627\u0646 \u062E\u0632\u0627\u0645\u0649", "\u0623\u0639\u0634\u0627\u0628 \u0639\u0637\u0631\u064A\u0629", "\u062A\u063A\u0644\u064A\u0641 \u0643\u0631\u0627\u0641\u062A"], expressEligible: false, isFeatured: false, isPopular: true, stockCount: 35, exactMatchVerified: true, images: ["https://images.unsplash.com/photo-1468327768560-75b778cbb551?w=600", "https://images.unsplash.com/photo-1494972308805-463bc619d34e?w=600"], occasions: ["birthday", "thankyou", "love"], moods: ["romantic", "warm"] },
    { nameEn: "Pink Cloud", nameAr: "\u0633\u062D\u0627\u0628\u0629 \u0648\u0631\u062F\u064A\u0629", descriptionEn: "Dreamy arrangement of pink roses, carnations and gypsophila.", descriptionAr: "\u062A\u0646\u0633\u064A\u0642 \u062D\u0627\u0644\u0645 \u0645\u0646 \u0627\u0644\u0648\u0631\u0648\u062F \u0627\u0644\u0648\u0631\u062F\u064A\u0629 \u0648\u0627\u0644\u0642\u0631\u0646\u0641\u0644 \u0648\u062C\u064A\u0628\u0633\u0648\u0641\u064A\u0644\u0627.", priceLYD: "85", priceUSD: "17", categoryId: flowerscat.id, includesEn: ["10 Pink Roses", "Carnations", "Gypsophila", "Pink Ribbon"], includesAr: ["\u0661\u0660 \u0648\u0631\u0648\u062F \u0648\u0631\u062F\u064A\u0629", "\u0642\u0631\u0646\u0641\u0644", "\u062C\u064A\u0628\u0633\u0648\u0641\u064A\u0644\u0627", "\u0634\u0631\u064A\u0637 \u0648\u0631\u062F\u064A"], expressEligible: true, isFeatured: true, isPopular: true, stockCount: 45, exactMatchVerified: true, images: ["https://images.unsplash.com/photo-1502977249166-824b3a8a4d6d?w=600", "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=600"], occasions: ["birthday", "newbaby", "congratulations"], moods: ["romantic", "warm", "vibrant"] },
    { nameEn: "Luxury Gift Hamper", nameAr: "\u0633\u0644\u0629 \u0647\u062F\u0627\u064A\u0627 \u0641\u0627\u062E\u0631\u0629", descriptionEn: "Premium gift basket with artisan chocolates, scented candles and a silk scarf.", descriptionAr: "\u0633\u0644\u0629 \u0647\u062F\u0627\u064A\u0627 \u0641\u0627\u062E\u0631\u0629 \u0645\u0639 \u0634\u0648\u0643\u0648\u0644\u0627\u062A\u0629 \u062D\u0631\u0641\u064A\u0629 \u0648\u0634\u0645\u0648\u0639 \u0645\u0639\u0637\u0631\u0629 \u0648\u0648\u0634\u0627\u062D \u062D\u0631\u064A\u0631\u064A.", priceLYD: "250", priceUSD: "50", categoryId: giftscat.id, includesEn: ["Artisan Chocolates", "Scented Candle", "Silk Scarf", "Gift Box"], includesAr: ["\u0634\u0648\u0643\u0648\u0644\u0627\u062A\u0629 \u062D\u0631\u0641\u064A\u0629", "\u0634\u0645\u0639\u0629 \u0645\u0639\u0637\u0631\u0629", "\u0648\u0634\u0627\u062D \u062D\u0631\u064A\u0631\u064A", "\u0635\u0646\u062F\u0648\u0642 \u0647\u062F\u0627\u064A\u0627"], expressEligible: false, isFeatured: true, isPopular: true, stockCount: 15, exactMatchVerified: true, images: ["https://images.unsplash.com/photo-1549465220-1a8b9238f7e7?w=600", "https://images.unsplash.com/photo-1513885535751-8b9238bd345a?w=600"], occasions: ["birthday", "anniversary", "congratulations"], moods: ["luxury", "elegant"] },
    { nameEn: "Sweet Indulgence Box", nameAr: "\u0635\u0646\u062F\u0648\u0642 \u0627\u0644\u0644\u0630\u0629 \u0627\u0644\u062D\u0644\u0648\u0629", descriptionEn: "Curated selection of premium chocolates, macarons and dried fruits.", descriptionAr: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0645\u062E\u062A\u0627\u0631\u0629 \u0645\u0646 \u0627\u0644\u0634\u0648\u0643\u0648\u0644\u0627\u062A\u0629 \u0627\u0644\u0641\u0627\u062E\u0631\u0629 \u0648\u0627\u0644\u0645\u0627\u0643\u0627\u0631\u0648\u0646 \u0648\u0627\u0644\u0641\u0648\u0627\u0643\u0647 \u0627\u0644\u0645\u062C\u0641\u0641\u0629.", priceLYD: "180", priceUSD: "36", categoryId: giftscat.id, includesEn: ["Belgian Chocolates", "French Macarons", "Dried Fruits", "Luxury Box"], includesAr: ["\u0634\u0648\u0643\u0648\u0644\u0627\u062A\u0629 \u0628\u0644\u062C\u064A\u0643\u064A\u0629", "\u0645\u0627\u0643\u0627\u0631\u0648\u0646 \u0641\u0631\u0646\u0633\u064A", "\u0641\u0648\u0627\u0643\u0647 \u0645\u062C\u0641\u0641\u0629", "\u0635\u0646\u062F\u0648\u0642 \u0641\u0627\u062E\u0631"], expressEligible: true, isFeatured: false, isPopular: true, stockCount: 25, exactMatchVerified: true, images: ["https://images.unsplash.com/photo-1548907040-4baa42d10919?w=600", "https://images.unsplash.com/photo-1511381939415-e44015466834?w=600"], occasions: ["birthday", "thankyou", "congratulations"], moods: ["luxury", "warm", "elegant"] },
    { nameEn: "Midnight Orchid", nameAr: "\u0623\u0648\u0631\u0643\u064A\u062F \u0645\u0646\u062A\u0635\u0641 \u0627\u0644\u0644\u064A\u0644", descriptionEn: "Dramatic deep purple orchids with dark foliage.", descriptionAr: "\u0623\u0648\u0631\u0643\u064A\u062F \u0623\u0631\u062C\u0648\u0627\u0646\u064A \u0639\u0645\u064A\u0642 \u0645\u0639 \u0623\u0648\u0631\u0627\u0642 \u062F\u0627\u0643\u0646\u0629.", priceLYD: "175", priceUSD: "35", categoryId: flowerscat.id, includesEn: ["3 Purple Orchid Stems", "Dark Foliage", "Ceramic Pot", "Gift Card"], includesAr: ["\u0663 \u0633\u064A\u0642\u0627\u0646 \u0623\u0648\u0631\u0643\u064A\u062F \u0623\u0631\u062C\u0648\u0627\u0646\u064A", "\u0623\u0648\u0631\u0627\u0642 \u062F\u0627\u0643\u0646\u0629", "\u0648\u0639\u0627\u0621 \u0633\u064A\u0631\u0627\u0645\u064A\u0643", "\u0628\u0637\u0627\u0642\u0629 \u0647\u062F\u064A\u0629"], expressEligible: true, isFeatured: false, isPopular: false, stockCount: 18, exactMatchVerified: true, images: ["https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=600", "https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=600"], occasions: ["anniversary", "apology", "love"], moods: ["luxury", "elegant"] },
    { nameEn: "Zen Garden Set", nameAr: "\u0645\u062C\u0645\u0648\u0639\u0629 \u062D\u062F\u064A\u0642\u0629 \u0632\u0646", descriptionEn: "A curated wellness gift set with succulents, aromatic oils and meditation stones.", descriptionAr: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0647\u062F\u0627\u064A\u0627 \u0639\u0627\u0641\u064A\u0629 \u0645\u0646\u0633\u0642\u0629 \u0645\u0639 \u0646\u0628\u0627\u062A\u0627\u062A \u0639\u0635\u0627\u0631\u064A\u0629 \u0648\u0632\u064A\u0648\u062A \u0639\u0637\u0631\u064A\u0629 \u0648\u0623\u062D\u062C\u0627\u0631 \u062A\u0623\u0645\u0644.", priceLYD: "145", priceUSD: "29", categoryId: giftscat.id, includesEn: ["Mini Succulent Trio", "Essential Oil Set", "Meditation Stones", "Bamboo Tray"], includesAr: ["\u062B\u0644\u0627\u062B \u0646\u0628\u0627\u062A\u0627\u062A \u0639\u0635\u0627\u0631\u064A\u0629 \u0635\u063A\u064A\u0631\u0629", "\u0645\u062C\u0645\u0648\u0639\u0629 \u0632\u064A\u0648\u062A \u0639\u0637\u0631\u064A\u0629", "\u0623\u062D\u062C\u0627\u0631 \u062A\u0623\u0645\u0644", "\u0635\u064A\u0646\u064A\u0629 \u0628\u0627\u0645\u0628\u0648"], expressEligible: false, isFeatured: true, isPopular: false, stockCount: 22, exactMatchVerified: true, images: ["https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600", "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=600"], occasions: ["getwell", "thankyou", "apology"], moods: ["minimal", "warm", "elegant"] }
  ];
  for (const p of productsData) {
    const { images, occasions: occSlugs, moods: moodSlugs, ...productData } = p;
    const [product] = await db.insert(products).values(productData).returning();
    if (images.length) {
      await db.insert(productImages).values(images.map((url, i) => ({ productId: product.id, url, isPrimary: i === 0, sortOrder: i })));
    }
    const occIds = occSlugs.map((slug) => occMap[slug]).filter(Boolean);
    if (occIds.length) {
      await db.insert(productOccasions).values(occIds.map((oid) => ({ productId: product.id, occasionId: oid })));
    }
    const mIds = moodSlugs.map((slug) => moodMap[slug]).filter(Boolean);
    if (mIds.length) {
      await db.insert(productMoods).values(mIds.map((mid) => ({ productId: product.id, moodId: mid })));
    }
  }
  const addOnsData = [
    { nameEn: "Gift Card", nameAr: "\u0628\u0637\u0627\u0642\u0629 \u0647\u062F\u064A\u0629", priceLYD: "5", priceUSD: "1", icon: "mail", category: "card", sortOrder: 0 },
    { nameEn: "Balloons", nameAr: "\u0628\u0627\u0644\u0648\u0646\u0627\u062A", priceLYD: "15", priceUSD: "3", icon: "wind", category: "decoration", sortOrder: 1 },
    { nameEn: "Chocolates", nameAr: "\u0634\u0648\u0643\u0648\u0644\u0627\u062A\u0629", priceLYD: "25", priceUSD: "5", icon: "package", category: "treats", sortOrder: 2 },
    { nameEn: "Teddy Bear", nameAr: "\u062F\u0628\u062F\u0648\u0628", priceLYD: "35", priceUSD: "7", icon: "heart", category: "plush", sortOrder: 3 },
    { nameEn: "Standard Wrap", nameAr: "\u062A\u063A\u0644\u064A\u0641 \u0639\u0627\u062F\u064A", priceLYD: "10", priceUSD: "2", icon: "box", category: "wrapping", sortOrder: 4 },
    { nameEn: "Premium Wrap", nameAr: "\u062A\u063A\u0644\u064A\u0641 \u0641\u0627\u062E\u0631", priceLYD: "25", priceUSD: "5", icon: "gift", category: "wrapping", sortOrder: 5 },
    { nameEn: "Silk Ribbon", nameAr: "\u0634\u0631\u064A\u0637 \u062D\u0631\u064A\u0631\u064A", priceLYD: "8", priceUSD: "2", icon: "bookmark", category: "decoration", sortOrder: 6 }
  ];
  await db.insert(addOns).values(addOnsData);
  const waTemplates = [
    { nameEn: "Gift Notification", nameAr: "\u0625\u0634\u0639\u0627\u0631 \u0647\u062F\u064A\u0629", bodyEn: "Hello {recipient_name}! Someone special has sent you a gift through Nyluver. Please confirm your availability to receive it. Reply YES to confirm.", bodyAr: "\u0645\u0631\u062D\u0628\u0627\u064B {recipient_name}! \u0623\u0631\u0633\u0644 \u0644\u0643 \u0634\u062E\u0635 \u0645\u0645\u064A\u0632 \u0647\u062F\u064A\u0629 \u0639\u0628\u0631 \u0646\u064A\u0644\u0648\u0641\u0631. \u064A\u0631\u062C\u0649 \u062A\u0623\u0643\u064A\u062F \u062A\u0648\u0641\u0631\u0643 \u0644\u0627\u0633\u062A\u0644\u0627\u0645\u0647\u0627. \u0623\u0631\u0633\u0644 \u0646\u0639\u0645 \u0644\u0644\u062A\u0623\u0643\u064A\u062F.", placeholders: ["recipient_name"] },
    { nameEn: "Address Request", nameAr: "\u0637\u0644\u0628 \u0639\u0646\u0648\u0627\u0646", bodyEn: "Hello {recipient_name}! To deliver your gift, we need your delivery address. Please share your location or address details.", bodyAr: "\u0645\u0631\u062D\u0628\u0627\u064B {recipient_name}! \u0644\u062A\u0648\u0635\u064A\u0644 \u0647\u062F\u064A\u062A\u0643\u060C \u0646\u062D\u062A\u0627\u062C \u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u062A\u0648\u0635\u064A\u0644. \u064A\u0631\u062C\u0649 \u0645\u0634\u0627\u0631\u0643\u0629 \u0645\u0648\u0642\u0639\u0643 \u0623\u0648 \u062A\u0641\u0627\u0635\u064A\u0644 \u0627\u0644\u0639\u0646\u0648\u0627\u0646.", placeholders: ["recipient_name"] },
    { nameEn: "Delivery Reminder", nameAr: "\u062A\u0630\u0643\u064A\u0631 \u0628\u0627\u0644\u062A\u0648\u0635\u064A\u0644", bodyEn: "Hello {recipient_name}! Your gift delivery is scheduled for {slot_time} today. Please be available to receive it.", bodyAr: "\u0645\u0631\u062D\u0628\u0627\u064B {recipient_name}! \u0645\u0648\u0639\u062F \u062A\u0648\u0635\u064A\u0644 \u0647\u062F\u064A\u062A\u0643 \u0647\u0648 {slot_time} \u0627\u0644\u064A\u0648\u0645. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0648\u0627\u062C\u062F \u0644\u0627\u0633\u062A\u0644\u0627\u0645\u0647\u0627.", placeholders: ["recipient_name", "slot_time"] }
  ];
  await db.insert(whatsappTemplates).values(waTemplates);
  await db.insert(banners).values([
    { titleEn: "Spring Collection", titleAr: "\u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0631\u0628\u064A\u0639", subtitleEn: "Fresh blooms for every occasion", subtitleAr: "\u0623\u0632\u0647\u0627\u0631 \u0637\u0627\u0632\u062C\u0629 \u0644\u0643\u0644 \u0645\u0646\u0627\u0633\u0628\u0629", imageUrl: "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=800", sortOrder: 0, cityId: tripoli.id },
    { titleEn: "Luxury Bouquets", titleAr: "\u0628\u0627\u0642\u0627\u062A \u0641\u0627\u062E\u0631\u0629", subtitleEn: "Premium arrangements", subtitleAr: "\u062A\u0646\u0633\u064A\u0642\u0627\u062A \u0641\u0627\u062E\u0631\u0629", imageUrl: "https://images.unsplash.com/photo-1490750967868-88aa4f44baee?w=800", sortOrder: 1, cityId: tripoli.id },
    { titleEn: "Premium Gifts", titleAr: "\u0647\u062F\u0627\u064A\u0627 \u0645\u0645\u064A\u0632\u0629", subtitleEn: "Curated gift sets", subtitleAr: "\u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0647\u062F\u0627\u064A\u0627 \u0645\u0646\u0633\u0642\u0629", imageUrl: "https://images.unsplash.com/photo-1549465220-1a8b9238f7e7?w=800", sortOrder: 2, cityId: tripoli.id }
  ]);
  await db.insert(loyaltyConfig).values({
    earnType: "percentage",
    earnValue: "10",
    redemptionEnabled: false,
    pointsPerUnit: "100"
  });
  await db.insert(drivers).values([
    { name: "Ahmed Ali", phone: "+218911111111", cityId: tripoli.id },
    { name: "Mohamed Hassan", phone: "+218922222222", cityId: tripoli.id },
    { name: "Omar Khalil", phone: "+218933333333", cityId: tripoli.id }
  ]);
  console.log("Database seeded successfully!");
}
var init_seed = __esm({
  "server/seed.ts"() {
    "use strict";
    init_db();
    init_schema();
  }
});

// server/index.ts
import express from "express";

// server/storage.ts
init_db();
init_schema();
import { eq, desc, asc, and, sql as sql2, ilike, gte, or, inArray } from "drizzle-orm";
var storage = {
  // ───── CITIES ─────
  async getCities() {
    return db.select().from(cities).orderBy(asc(cities.nameEn));
  },
  async getCity(id) {
    const [city] = await db.select().from(cities).where(eq(cities.id, id));
    return city;
  },
  async createCity(data) {
    const [city] = await db.insert(cities).values(data).returning();
    return city;
  },
  async updateCity(id, data) {
    const [city] = await db.update(cities).set(data).where(eq(cities.id, id)).returning();
    return city;
  },
  // ───── USERS ─────
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  },
  async getUserByPhone(phone) {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user;
  },
  async getUserByEmail(email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  },
  async getUserByEmailAndPhone(email, phone) {
    const [user] = await db.select().from(users).where(and(eq(users.email, email), eq(users.phone, phone)));
    return user;
  },
  async getUsers(limit = 50, offset = 0) {
    return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
  },
  async createUser(data) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  },
  async updateUser(id, data) {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  },
  async getUserCount() {
    const [result] = await db.select({ count: sql2`count(*)::int` }).from(users);
    return result.count;
  },
  // ───── OTP ─────
  async getRecentValidOtp(phone) {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1e3);
    const [otp] = await db.select().from(otpCodes).where(and(
      eq(otpCodes.phone, phone),
      eq(otpCodes.used, false),
      gte(otpCodes.expiresAt, /* @__PURE__ */ new Date()),
      gte(otpCodes.createdAt, twoMinutesAgo)
    )).orderBy(desc(otpCodes.createdAt)).limit(1);
    return otp;
  },
  async createOtp(phone, code) {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1e3);
    const [otp] = await db.insert(otpCodes).values({ phone, code, expiresAt }).returning();
    return otp;
  },
  async verifyOtp(phone, code) {
    const [otp] = await db.select().from(otpCodes).where(and(eq(otpCodes.phone, phone), eq(otpCodes.code, code), eq(otpCodes.used, false), gte(otpCodes.expiresAt, /* @__PURE__ */ new Date())));
    if (otp) {
      await db.update(otpCodes).set({ used: true }).where(eq(otpCodes.id, otp.id));
    }
    return otp;
  },
  // ───── CATEGORIES ─────
  async getCategories() {
    return db.select().from(categories).orderBy(asc(categories.sortOrder));
  },
  async createCategory(data) {
    const [cat] = await db.insert(categories).values(data).returning();
    return cat;
  },
  async updateCategory(id, data) {
    const [cat] = await db.update(categories).set(data).where(eq(categories.id, id)).returning();
    return cat;
  },
  async deleteCategory(id) {
    await db.delete(categories).where(eq(categories.id, id));
  },
  // ───── OCCASIONS ─────
  async getOccasions() {
    return db.select().from(occasions).where(eq(occasions.isActive, true)).orderBy(asc(occasions.sortOrder));
  },
  async createOccasion(data) {
    const [occ] = await db.insert(occasions).values(data).returning();
    return occ;
  },
  async updateOccasion(id, data) {
    const [occ] = await db.update(occasions).set(data).where(eq(occasions.id, id)).returning();
    return occ;
  },
  async deleteOccasion(id) {
    await db.delete(occasions).where(eq(occasions.id, id));
  },
  // ───── MOODS ─────
  async getMoods() {
    return db.select().from(moods).where(eq(moods.isActive, true)).orderBy(asc(moods.sortOrder));
  },
  async createMood(data) {
    const [m] = await db.insert(moods).values(data).returning();
    return m;
  },
  async updateMood(id, data) {
    const [m] = await db.update(moods).set(data).where(eq(moods.id, id)).returning();
    return m;
  },
  async deleteMood(id) {
    await db.delete(moods).where(eq(moods.id, id));
  },
  // ───── PRODUCTS ─────
  async getProducts(filters) {
    let query = db.select().from(products);
    const conditions = [];
    if (filters?.active !== false) conditions.push(eq(products.isActive, true));
    if (filters?.categoryId) conditions.push(eq(products.categoryId, filters.categoryId));
    if (filters?.featured) conditions.push(eq(products.isFeatured, true));
    if (filters?.popular) conditions.push(eq(products.isPopular, true));
    if (filters?.search) conditions.push(or(ilike(products.nameEn, `%${filters.search}%`), ilike(products.nameAr, `%${filters.search}%`)));
    let result = conditions.length > 0 ? await query.where(and(...conditions)).orderBy(asc(products.sortOrder)) : await query.orderBy(asc(products.sortOrder));
    if (filters?.occasionId) {
      const productIds2 = await db.select({ productId: productOccasions.productId }).from(productOccasions).where(eq(productOccasions.occasionId, filters.occasionId));
      const ids = productIds2.map((p) => p.productId);
      if (ids.length > 0) {
        result = result.filter((p) => ids.includes(p.id));
      } else {
        result = [];
      }
    }
    if (filters?.moodId) {
      const productIds2 = await db.select({ productId: productMoods.productId }).from(productMoods).where(eq(productMoods.moodId, filters.moodId));
      const ids = productIds2.map((p) => p.productId);
      if (ids.length > 0) {
        result = result.filter((p) => ids.includes(p.id));
      } else {
        result = [];
      }
    }
    const productIds = result.map((p) => p.id);
    if (productIds.length > 0) {
      const allImages = await db.select().from(productImages).where(inArray(productImages.productId, productIds)).orderBy(asc(productImages.sortOrder));
      const imageMap = /* @__PURE__ */ new Map();
      for (const img of allImages) {
        if (!imageMap.has(img.productId)) imageMap.set(img.productId, []);
        imageMap.get(img.productId).push(img.url);
      }
      return result.map((p) => ({ ...p, images: imageMap.get(p.id) || [] }));
    }
    return result.map((p) => ({ ...p, images: [] }));
  },
  async getProduct(id) {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    if (!product) return null;
    const images = await db.select().from(productImages).where(eq(productImages.productId, id)).orderBy(asc(productImages.sortOrder));
    const pOcc = await db.select({ occasionId: productOccasions.occasionId }).from(productOccasions).where(eq(productOccasions.productId, id));
    const pMood = await db.select({ moodId: productMoods.moodId }).from(productMoods).where(eq(productMoods.productId, id));
    return { ...product, images, occasionIds: pOcc.map((o) => o.occasionId), moodIds: pMood.map((m) => m.moodId) };
  },
  async createProduct(data, images, occasionIds, moodIds) {
    const [product] = await db.insert(products).values(data).returning();
    if (images.length) {
      await db.insert(productImages).values(images.map((url, i) => ({ productId: product.id, url, isPrimary: i === 0, sortOrder: i })));
    }
    if (occasionIds.length) {
      await db.insert(productOccasions).values(occasionIds.map((oid) => ({ productId: product.id, occasionId: oid })));
    }
    if (moodIds.length) {
      await db.insert(productMoods).values(moodIds.map((mid) => ({ productId: product.id, moodId: mid })));
    }
    return product;
  },
  async updateProduct(id, data, images, occasionIds, moodIds) {
    const [product] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    if (images) {
      await db.delete(productImages).where(eq(productImages.productId, id));
      if (images.length) {
        await db.insert(productImages).values(images.map((url, i) => ({ productId: id, url, isPrimary: i === 0, sortOrder: i })));
      }
    }
    if (occasionIds) {
      await db.delete(productOccasions).where(eq(productOccasions.productId, id));
      if (occasionIds.length) {
        await db.insert(productOccasions).values(occasionIds.map((oid) => ({ productId: id, occasionId: oid })));
      }
    }
    if (moodIds) {
      await db.delete(productMoods).where(eq(productMoods.productId, id));
      if (moodIds.length) {
        await db.insert(productMoods).values(moodIds.map((mid) => ({ productId: id, moodId: mid })));
      }
    }
    return product;
  },
  async deleteProduct(id) {
    await db.update(products).set({ isActive: false }).where(eq(products.id, id));
  },
  async getProductCount() {
    const [result] = await db.select({ count: sql2`count(*)::int` }).from(products).where(eq(products.isActive, true));
    return result.count;
  },
  // ───── ADD-ONS ─────
  async getAddOns() {
    return db.select().from(addOns).where(eq(addOns.isActive, true)).orderBy(asc(addOns.sortOrder));
  },
  async createAddOn(data) {
    const [addon] = await db.insert(addOns).values(data).returning();
    return addon;
  },
  async updateAddOn(id, data) {
    const [addon] = await db.update(addOns).set(data).where(eq(addOns.id, id)).returning();
    return addon;
  },
  async deleteAddOn(id) {
    await db.update(addOns).set({ isActive: false }).where(eq(addOns.id, id));
  },
  // ───── DELIVERY SLOTS ─────
  async getSlots(cityId, date) {
    return db.select().from(deliverySlots).where(and(eq(deliverySlots.cityId, cityId), eq(deliverySlots.date, date))).orderBy(asc(deliverySlots.slotIndex));
  },
  async ensureSlots(cityId, date) {
    const existing = await this.getSlots(cityId, date);
    if (existing.length > 0) return existing;
    const defaults = [
      { cityId, date, slotIndex: 0, startTime: "10:00", endTime: "13:00", capacity: 50, used: 0 },
      { cityId, date, slotIndex: 1, startTime: "13:00", endTime: "18:00", capacity: 50, used: 0 },
      { cityId, date, slotIndex: 2, startTime: "18:00", endTime: "21:00", capacity: 50, used: 0 }
    ];
    return db.insert(deliverySlots).values(defaults).returning();
  },
  async incrementSlotUsed(slotId) {
    await db.update(deliverySlots).set({ used: sql2`${deliverySlots.used} + 1` }).where(eq(deliverySlots.id, slotId));
  },
  async updateSlotCapacity(id, capacity) {
    const [slot] = await db.update(deliverySlots).set({ capacity }).where(eq(deliverySlots.id, id)).returning();
    return slot;
  },
  // ───── BLACKOUT DATES ─────
  async getBlackoutDates(cityId) {
    return db.select().from(blackoutDates).where(eq(blackoutDates.cityId, cityId));
  },
  async createBlackoutDate(data) {
    const [bd] = await db.insert(blackoutDates).values(data).returning();
    return bd;
  },
  async deleteBlackoutDate(id) {
    await db.delete(blackoutDates).where(eq(blackoutDates.id, id));
  },
  // ───── ORDERS ─────
  async getOrders(filters) {
    const conditions = [];
    if (filters?.status) conditions.push(eq(orders.status, filters.status));
    if (filters?.userId) conditions.push(eq(orders.userId, filters.userId));
    if (filters?.cityId) conditions.push(eq(orders.cityId, filters.cityId));
    if (filters?.flagged) conditions.push(eq(orders.isFlagged, true));
    const limit = filters?.limit || 50;
    const offset = filters?.offset || 0;
    const result = conditions.length > 0 ? await db.select().from(orders).where(and(...conditions)).orderBy(desc(orders.createdAt)).limit(limit).offset(offset) : await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit).offset(offset);
    return result;
  },
  async getOrder(id) {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return null;
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    const itemsWithAddOns = await Promise.all(items.map(async (item) => {
      const addOnsData = await db.select().from(orderItemAddOns).where(eq(orderItemAddOns.orderItemId, item.id));
      return { ...item, addOns: addOnsData };
    }));
    const waLogs = await db.select().from(whatsappLogs).where(eq(whatsappLogs.orderId, id)).orderBy(desc(whatsappLogs.contactedAt));
    const assignment = await db.select().from(deliveryAssignments).where(eq(deliveryAssignments.orderId, id));
    const [sender] = await db.select({ nameEn: users.nameEn, nameAr: users.nameAr, phone: users.phone, email: users.email }).from(users).where(eq(users.id, order.userId));
    return { ...order, items: itemsWithAddOns, whatsappLogs: waLogs, deliveryAssignment: assignment[0] || null, sender: sender || null };
  },
  async createOrder(data, items) {
    const orderNum = "NYL-" + Date.now().toString(36).toUpperCase();
    const [order] = await db.insert(orders).values({ ...data, orderNumber: orderNum }).returning();
    for (const item of items) {
      const [oi] = await db.insert(orderItems).values({
        orderId: order.id,
        productId: item.productId,
        productNameEn: item.productNameEn,
        productNameAr: item.productNameAr,
        productImage: item.productImage,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }).returning();
      if (item.addOns?.length) {
        await db.insert(orderItemAddOns).values(item.addOns.map((a) => ({
          orderItemId: oi.id,
          addOnId: a.addOnId,
          nameEn: a.nameEn,
          nameAr: a.nameAr,
          price: a.price
        })));
      }
    }
    return order;
  },
  async updateOrderStatus(id, status, notes) {
    const updateData = { status, updatedAt: /* @__PURE__ */ new Date() };
    if (notes) updateData.adminNotes = notes;
    const [order] = await db.update(orders).set(updateData).where(eq(orders.id, id)).returning();
    return order;
  },
  async flagOrder(id, reason) {
    await db.update(orders).set({ isFlagged: true, flagReason: reason }).where(eq(orders.id, id));
    await db.insert(fraudFlags).values({ orderId: id, reason });
  },
  async getOrderCount(status) {
    const conditions = status ? [eq(orders.status, status)] : [];
    const [result] = conditions.length ? await db.select({ count: sql2`count(*)::int` }).from(orders).where(and(...conditions)) : await db.select({ count: sql2`count(*)::int` }).from(orders);
    return result.count;
  },
  async getOrdersByStatus() {
    const result = await db.select({
      status: orders.status,
      count: sql2`count(*)::int`
    }).from(orders).groupBy(orders.status);
    return result;
  },
  async getTodayRevenue() {
    const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const [result] = await db.select({
      total: sql2`COALESCE(SUM(${orders.total}::numeric), 0)::float`
    }).from(orders).where(and(
      gte(orders.createdAt, new Date(today)),
      eq(orders.status, "paid")
    ));
    return result?.total || 0;
  },
  // ───── DRIVERS ─────
  async getDrivers() {
    return db.select().from(drivers).where(eq(drivers.isActive, true));
  },
  async createDriver(data) {
    const [driver] = await db.insert(drivers).values(data).returning();
    return driver;
  },
  async updateDriver(id, data) {
    const [driver] = await db.update(drivers).set(data).where(eq(drivers.id, id)).returning();
    return driver;
  },
  async assignDriver(orderId, driverId) {
    await db.update(orders).set({ driverId, status: "out_for_delivery", updatedAt: /* @__PURE__ */ new Date() }).where(eq(orders.id, orderId));
    const [assignment] = await db.insert(deliveryAssignments).values({ orderId, driverId }).returning();
    return assignment;
  },
  async updateDeliveryAssignment(id, data) {
    const [a] = await db.update(deliveryAssignments).set(data).where(eq(deliveryAssignments.id, id)).returning();
    return a;
  },
  // ───── WHATSAPP ─────
  async getWhatsappTemplates() {
    return db.select().from(whatsappTemplates).where(eq(whatsappTemplates.isActive, true));
  },
  async createWhatsappTemplate(data) {
    const [t] = await db.insert(whatsappTemplates).values(data).returning();
    return t;
  },
  async updateWhatsappTemplate(id, data) {
    const [t] = await db.update(whatsappTemplates).set(data).where(eq(whatsappTemplates.id, id)).returning();
    return t;
  },
  async addWhatsappLog(data) {
    const [log2] = await db.insert(whatsappLogs).values(data).returning();
    return log2;
  },
  // ───── LOYALTY ─────
  async getLoyaltyConfig() {
    const [config] = await db.select().from(loyaltyConfig);
    return config;
  },
  async updateLoyaltyConfig(data) {
    const existing = await this.getLoyaltyConfig();
    if (existing) {
      const [config2] = await db.update(loyaltyConfig).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(loyaltyConfig.id, existing.id)).returning();
      return config2;
    }
    const [config] = await db.insert(loyaltyConfig).values(data).returning();
    return config;
  },
  async addLoyaltyEntry(data) {
    const [entry] = await db.insert(loyaltyLedger).values(data).returning();
    await db.update(users).set({ loyaltyPoints: sql2`${users.loyaltyPoints} + ${data.points}` }).where(eq(users.id, data.userId));
    return entry;
  },
  async getLoyaltyLedger(userId) {
    return db.select().from(loyaltyLedger).where(eq(loyaltyLedger.userId, userId)).orderBy(desc(loyaltyLedger.createdAt));
  },
  // ───── PROMO CODES ─────
  async getPromoCodes() {
    return db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
  },
  async getPromoByCode(code) {
    const [promo] = await db.select().from(promoCodes).where(and(eq(promoCodes.code, code.toUpperCase()), eq(promoCodes.isActive, true)));
    return promo;
  },
  async createPromoCode(data) {
    const [promo] = await db.insert(promoCodes).values({ ...data, code: data.code.toUpperCase() }).returning();
    return promo;
  },
  async updatePromoCode(id, data) {
    const [promo] = await db.update(promoCodes).set(data).where(eq(promoCodes.id, id)).returning();
    return promo;
  },
  async incrementPromoUsed(id) {
    await db.update(promoCodes).set({ usedCount: sql2`${promoCodes.usedCount} + 1` }).where(eq(promoCodes.id, id));
  },
  // ───── SUBSCRIPTIONS ─────
  async getSubscriptionPlans() {
    return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
  },
  async createSubscriptionPlan(data) {
    const [plan] = await db.insert(subscriptionPlans).values(data).returning();
    return plan;
  },
  async updateSubscriptionPlan(id, data) {
    const [plan] = await db.update(subscriptionPlans).set(data).where(eq(subscriptionPlans.id, id)).returning();
    return plan;
  },
  async getUserSubscriptions(userId) {
    return db.select().from(subscriptions).where(eq(subscriptions.userId, userId));
  },
  async createSubscription(data) {
    const [sub] = await db.insert(subscriptions).values(data).returning();
    return sub;
  },
  async updateSubscription(id, data) {
    const [sub] = await db.update(subscriptions).set(data).where(eq(subscriptions.id, id)).returning();
    return sub;
  },
  // ───── BANNERS ─────
  async getBanners(cityId) {
    const conditions = [eq(banners.isActive, true)];
    if (cityId) conditions.push(eq(banners.cityId, cityId));
    return db.select().from(banners).where(and(...conditions)).orderBy(asc(banners.sortOrder));
  },
  async createBanner(data) {
    const [banner] = await db.insert(banners).values(data).returning();
    return banner;
  },
  async updateBanner(id, data) {
    const [banner] = await db.update(banners).set(data).where(eq(banners.id, id)).returning();
    return banner;
  },
  async deleteBanner(id) {
    await db.delete(banners).where(eq(banners.id, id));
  },
  // ───── FRAUD ─────
  async getFraudFlags(resolved) {
    const conditions = resolved !== void 0 ? [eq(fraudFlags.resolved, resolved)] : [];
    return conditions.length ? db.select().from(fraudFlags).where(and(...conditions)).orderBy(desc(fraudFlags.createdAt)) : db.select().from(fraudFlags).orderBy(desc(fraudFlags.createdAt));
  },
  async resolveFraudFlag(id, resolvedBy) {
    const [flag] = await db.update(fraudFlags).set({ resolved: true, resolvedBy, resolvedAt: /* @__PURE__ */ new Date() }).where(eq(fraudFlags.id, id)).returning();
    return flag;
  },
  async blacklistUser(userId) {
    await db.update(users).set({ isBlacklisted: true }).where(eq(users.id, userId));
  },
  // ───── SETTINGS ─────
  async getSetting(key) {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting?.value;
  },
  async setSetting(key, value) {
    await db.insert(settings).values({ key, value }).onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: /* @__PURE__ */ new Date() } });
  },
  // ───── SAVED RECIPIENTS ─────
  async getSavedRecipients(userId) {
    return db.select().from(savedRecipients).where(eq(savedRecipients.userId, userId));
  },
  async createSavedRecipient(data) {
    const [r] = await db.insert(savedRecipients).values(data).returning();
    return r;
  },
  async deleteSavedRecipient(id) {
    await db.delete(savedRecipients).where(eq(savedRecipients.id, id));
  }
};

// server/routes.ts
init_db();
init_schema();
import { eq as eq2 } from "drizzle-orm";
import session from "express-session";
import MemoryStore from "memorystore";
import crypto from "crypto";

// server/whatsapp.ts
var GRAPH_API_URL = "https://graph.facebook.com/v21.0";
function getConfig() {
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneId || !accessToken) {
    throw new Error("WhatsApp Cloud API credentials not configured");
  }
  return { phoneId, accessToken };
}
function formatPhone(phone) {
  let clean = phone.replace(/[\s\-()]/g, "");
  if (clean.startsWith("+")) clean = clean.slice(1);
  return clean;
}
async function sendWhatsAppMessage(to, body) {
  try {
    const { phoneId, accessToken } = getConfig();
    const formattedPhone = formatPhone(to);
    const response = await fetch(`${GRAPH_API_URL}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: formattedPhone,
        type: "text",
        text: { body }
      })
    });
    const data = await response.json();
    if (!response.ok) {
      console.error(`[WhatsApp ERROR] Failed to send to ${formattedPhone}:`, JSON.stringify(data));
      return { success: false };
    }
    const messageId = data.messages?.[0]?.id;
    console.log(`[WhatsApp] Message sent to ${formattedPhone} | ID: ${messageId}`);
    return { success: true, messageId };
  } catch (error) {
    console.error(`[WhatsApp ERROR] ${error.message}`);
    return { success: false };
  }
}
async function sendOtp(toPhone, code) {
  const message = `Your Nyluver verification code is: ${code}. Valid for 5 minutes.`;
  return sendWhatsAppMessage(toPhone, message);
}
async function sendOrderConfirmation(senderPhone, orderNumber) {
  const message = `\u2705 Your Nyluver order #${orderNumber} has been confirmed! We're preparing something beautiful for you. \u{1F338}`;
  return sendWhatsAppMessage(senderPhone, message);
}
async function sendGiftNotification(recipientPhone, orderNumber) {
  const message = `\u{1F381} You have a special gift coming your way from Nyluver! Order #${orderNumber}. Stay tuned! \u{1F338}`;
  return sendWhatsAppMessage(recipientPhone, message);
}
async function sendStatusUpdate(recipientPhone, orderNumber, status) {
  const statusMessages = {
    "in_prep": `\u{1F337} Great news! Your Nyluver gift order #${orderNumber} is now being prepared with care.`,
    "ready": `\u2728 Your Nyluver gift order #${orderNumber} is ready and waiting for delivery!`,
    "out_for_delivery": `\u{1F697} Your Nyluver gift order #${orderNumber} is out for delivery! It will arrive soon.`,
    "delivered": `\u{1F490} Your Nyluver gift order #${orderNumber} has been delivered! We hope it brings joy. \u{1F338}`
  };
  const message = statusMessages[status] || `\u{1F4E6} Your Nyluver order #${orderNumber} status has been updated to: ${status.replace(/_/g, " ")}.`;
  return sendWhatsAppMessage(recipientPhone, message);
}

// server/routes.ts
var SessionStore = MemoryStore(session);
function generateOtp() {
  if (process.env.DEFAULT_OTP) return process.env.DEFAULT_OTP;
  return Math.floor(1e5 + Math.random() * 9e5).toString();
}
function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}
var tokenStore = /* @__PURE__ */ new Map();
function adminAuth(req, res, next) {
  const sess = req.session;
  if (!sess?.userId || sess?.role !== "admin") {
    return res.status(401).json({ error: "Admin access required" });
  }
  next();
}
function customerAuth(req, res, next) {
  const sess = req.session;
  if (!sess?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}
async function appAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing authorization token" });
    }
    const token = authHeader.split(" ")[1];
    const userId = tokenStore.get(token);
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    req.appUser = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Authentication failed" });
  }
}
function registerRoutes(app2) {
  app2.use(session({
    secret: process.env.SESSION_SECRET || "nyluver-secret-key",
    resave: false,
    saveUninitialized: false,
    store: new SessionStore({ checkPeriod: 864e5 }),
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1e3 }
  }));
  app2.post("/api/auth/register/send-otp", async (req, res) => {
    try {
      const { name, email, phone } = req.body;
      if (!name?.trim() || !email?.trim() || !phone?.trim()) {
        return res.status(400).json({ error: "Name, email, and phone are required" });
      }
      let cleanPhone = phone.trim().replace(/[\s\-()]/g, "");
      if (!cleanPhone.startsWith("+")) {
        if (cleanPhone.startsWith("218")) cleanPhone = "+" + cleanPhone;
        else if (cleanPhone.startsWith("0")) cleanPhone = "+218" + cleanPhone.slice(1);
        else cleanPhone = "+218" + cleanPhone;
      }
      const existingEmail = await storage.getUserByEmail(email.trim().toLowerCase());
      if (existingEmail) {
        return res.status(409).json({ error: "email_taken", message: "An account with this email already exists" });
      }
      const existingPhone = await storage.getUserByPhone(cleanPhone);
      if (existingPhone) {
        return res.status(409).json({ error: "phone_taken", message: "An account with this phone number already exists" });
      }
      const existingOtp = await storage.getRecentValidOtp(cleanPhone);
      if (existingOtp) {
        console.log(`[REGISTRATION] Reusing recent code for ${cleanPhone}`);
        return res.json({ success: true, phone: cleanPhone });
      }
      const code = generateOtp();
      await storage.createOtp(cleanPhone, code);
      console.log(`[REGISTRATION] OTP code for ${cleanPhone}: ${code}`);
      if (!process.env.DEFAULT_OTP) {
        const result = await sendOtp(cleanPhone, code);
        if (!result.success) {
          console.warn(`[REGISTRATION] WhatsApp delivery failed for ${cleanPhone}. Code is in server logs.`);
        }
      }
      res.json({ success: true, phone: cleanPhone });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/auth/register/verify", async (req, res) => {
    try {
      const { name, email, phone, code } = req.body;
      if (!name?.trim() || !email?.trim() || !phone?.trim() || !code?.trim()) {
        return res.status(400).json({ error: "All fields including verification code are required" });
      }
      let cleanPhone = phone.trim().replace(/[\s\-()]/g, "");
      if (!cleanPhone.startsWith("+")) {
        if (cleanPhone.startsWith("218")) cleanPhone = "+" + cleanPhone;
        else if (cleanPhone.startsWith("0")) cleanPhone = "+218" + cleanPhone.slice(1);
        else cleanPhone = "+218" + cleanPhone;
      }
      const otp = await storage.verifyOtp(cleanPhone, code.trim());
      if (!otp) {
        return res.status(400).json({ error: "invalid_otp", message: "Invalid or expired verification code" });
      }
      const existingEmail = await storage.getUserByEmail(email.trim().toLowerCase());
      if (existingEmail) {
        return res.status(409).json({ error: "email_taken", message: "An account with this email already exists" });
      }
      const existingPhone = await storage.getUserByPhone(cleanPhone);
      if (existingPhone) {
        return res.status(409).json({ error: "phone_taken", message: "An account with this phone number already exists" });
      }
      const user = await storage.createUser({
        nameEn: name.trim(),
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
        role: "customer",
        language: "en"
      });
      const token = generateToken();
      tokenStore.set(token, user.id);
      res.json({
        user: { id: user.id, name: user.nameEn, email: user.email, phone: user.phone },
        token
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, phone } = req.body;
      if (!name?.trim() || !email?.trim() || !phone?.trim()) {
        return res.status(400).json({ error: "Name, email, and phone are required" });
      }
      let cleanPhone = phone.trim().replace(/[\s\-()]/g, "");
      if (!cleanPhone.startsWith("+")) {
        if (cleanPhone.startsWith("218")) cleanPhone = "+" + cleanPhone;
        else if (cleanPhone.startsWith("0")) cleanPhone = "+218" + cleanPhone.slice(1);
        else cleanPhone = "+218" + cleanPhone;
      }
      const existingEmail = await storage.getUserByEmail(email.trim().toLowerCase());
      if (existingEmail) {
        return res.status(409).json({ error: "email_taken", message: "An account with this email already exists" });
      }
      const existingPhone = await storage.getUserByPhone(cleanPhone);
      if (existingPhone) {
        return res.status(409).json({ error: "phone_taken", message: "An account with this phone number already exists" });
      }
      const user = await storage.createUser({
        nameEn: name.trim(),
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
        role: "customer",
        language: "en"
      });
      const token = generateToken();
      tokenStore.set(token, user.id);
      res.json({
        user: { id: user.id, name: user.nameEn, email: user.email, phone: user.phone },
        token
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, phone } = req.body;
      if (!email?.trim() || !phone?.trim()) {
        return res.status(400).json({ error: "Email and phone are required" });
      }
      let cleanPhone = phone.trim().replace(/[\s\-()]/g, "");
      if (!cleanPhone.startsWith("+")) {
        if (cleanPhone.startsWith("218")) cleanPhone = "+" + cleanPhone;
        else if (cleanPhone.startsWith("0")) cleanPhone = "+218" + cleanPhone.slice(1);
        else cleanPhone = "+218" + cleanPhone;
      }
      const user = await storage.getUserByEmailAndPhone(email.trim().toLowerCase(), cleanPhone);
      if (!user) {
        return res.status(401).json({ error: "no_match", message: "No account found with that email and phone combination" });
      }
      if (user.isBlacklisted) {
        return res.status(403).json({ error: "blocked", message: "This account has been suspended" });
      }
      await db.update(users).set({ lastLoginAt: /* @__PURE__ */ new Date() }).where(eq2(users.id, user.id));
      const token = generateToken();
      tokenStore.set(token, user.id);
      res.json({
        user: { id: user.id, name: user.nameEn, email: user.email, phone: user.phone },
        token
      });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/auth/me", appAuth, async (req, res) => {
    const user = req.appUser;
    res.json({ id: user.id, name: user.nameEn, email: user.email, phone: user.phone, points: user.loyaltyPoints });
  });
  app2.post("/api/auth/send-otp", async (req, res) => {
    try {
      let { phone } = req.body;
      if (!phone) return res.status(400).json({ error: "Phone required" });
      phone = phone.trim().replace(/[\s\-()]/g, "");
      if (!phone.startsWith("+")) {
        if (phone.startsWith("218")) phone = "+" + phone;
        else if (phone.startsWith("0")) phone = "+218" + phone.slice(1);
        else phone = "+218" + phone;
      }
      const existingOtp = await storage.getRecentValidOtp(phone);
      if (existingOtp) {
        console.log(`[ADMIN] Reusing recent code for ${phone}`);
        return res.json({ success: true, message: "OTP sent" });
      }
      const code = generateOtp();
      await storage.createOtp(phone, code);
      console.log(`[ADMIN] OTP code for ${phone}: ${code}`);
      if (!process.env.DEFAULT_OTP) {
        const result = await sendOtp(phone, code);
        if (!result.success) {
          console.warn(`[ADMIN] WhatsApp delivery failed for ${phone}. Code is in server logs.`);
        }
      }
      res.json({ success: true, message: "OTP sent" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { phone, code } = req.body;
      const otp = await storage.verifyOtp(phone, code);
      if (!otp) return res.status(400).json({ error: "Invalid or expired OTP" });
      let user = await storage.getUserByPhone(phone);
      if (!user) {
        user = await storage.createUser({ phone, language: "en" });
      }
      await storage.updateUser(user.id, { lastLoginAt: /* @__PURE__ */ new Date() });
      const sess = req.session;
      sess.userId = user.id;
      sess.role = user.role;
      res.json({ success: true, user });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/auth/admin-login", async (req, res) => {
    try {
      const { phone, code } = req.body;
      const otp = await storage.verifyOtp(phone, code);
      if (!otp) return res.status(400).json({ error: "Invalid or expired OTP" });
      const user = await storage.getUserByPhone(phone);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ error: "Not an admin account" });
      }
      const sess = req.session;
      sess.userId = user.id;
      sess.role = "admin";
      res.json({ success: true, user });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/auth/me", async (req, res) => {
    try {
      const sess = req.session;
      if (!sess?.userId) return res.json({ user: null });
      const user = await storage.getUser(sess.userId);
      res.json({ user });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });
  app2.get("/api/cities", async (_req, res) => {
    try {
      res.json(await storage.getCities());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/categories", async (_req, res) => {
    try {
      res.json(await storage.getCategories());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/occasions", async (_req, res) => {
    try {
      res.json(await storage.getOccasions());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/moods", async (_req, res) => {
    try {
      res.json(await storage.getMoods());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/products", async (req, res) => {
    try {
      const filters = {};
      if (req.query.categoryId) filters.categoryId = req.query.categoryId;
      if (req.query.occasionId) filters.occasionId = req.query.occasionId;
      if (req.query.moodId) filters.moodId = req.query.moodId;
      if (req.query.featured) filters.featured = req.query.featured === "true";
      if (req.query.popular) filters.popular = req.query.popular === "true";
      if (req.query.search) filters.search = req.query.search;
      const products2 = await storage.getProducts(filters);
      res.json(products2);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) return res.status(404).json({ error: "Not found" });
      res.json(product);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/add-ons", async (_req, res) => {
    try {
      res.json(await storage.getAddOns());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/banners", async (req, res) => {
    try {
      res.json(await storage.getBanners(req.query.cityId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/subscription-plans", async (_req, res) => {
    try {
      res.json(await storage.getSubscriptionPlans());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/slots/:cityId/:date", async (req, res) => {
    try {
      const slots = await storage.ensureSlots(req.params.cityId, req.params.date);
      const blackouts = await storage.getBlackoutDates(req.params.cityId);
      const isBlackedOut = blackouts.some((b) => b.date === req.params.date);
      const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      const isToday = req.params.date === today;
      const currentHour = (/* @__PURE__ */ new Date()).getHours();
      const enrichedSlots = slots.map((slot) => {
        const startHour = parseInt(slot.startTime.split(":")[0], 10);
        const expired = isToday && currentHour >= startHour + 1;
        return { ...slot, expired };
      });
      res.json({ slots: enrichedSlots, isBlackedOut });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/promo/validate", async (req, res) => {
    try {
      const { code, orderAmount } = req.body;
      const promo = await storage.getPromoByCode(code);
      if (!promo) return res.status(404).json({ error: "Invalid code" });
      if (promo.maxUses && promo.usedCount >= promo.maxUses) return res.status(400).json({ error: "Code exhausted" });
      if (promo.expiresAt && new Date(promo.expiresAt) < /* @__PURE__ */ new Date()) return res.status(400).json({ error: "Code expired" });
      if (promo.minOrderAmount && orderAmount < parseFloat(promo.minOrderAmount)) {
        return res.status(400).json({ error: `Minimum order ${promo.minOrderAmount}` });
      }
      let discount = 0;
      if (promo.type === "percentage") {
        discount = orderAmount * parseFloat(promo.value) / 100;
      } else {
        discount = parseFloat(promo.value);
      }
      res.json({ valid: true, promo, discount });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/orders", customerAuth, async (req, res) => {
    try {
      const sess = req.session;
      const { items, recipientName, recipientPhone, address, cityId, slotId, slotDate, slotTime, cardMessage, paymentMethod, subtotal, deliveryFee, expressFee, discount, vatAmount, total, totalUSD, isExpress, promoCodeId } = req.body;
      const order = await storage.createOrder({
        userId: sess.userId,
        recipientName,
        recipientPhone,
        address,
        cityId,
        slotId,
        slotDate,
        slotTime,
        cardMessage,
        paymentMethod,
        subtotal: subtotal.toString(),
        deliveryFee: deliveryFee.toString(),
        expressFee: expressFee.toString(),
        discount: discount.toString(),
        vatAmount: vatAmount.toString(),
        total: total.toString(),
        totalUSD: totalUSD?.toString(),
        isExpress,
        promoCodeId,
        status: "paid"
      }, items);
      if (slotId) await storage.incrementSlotUsed(slotId);
      if (promoCodeId) await storage.incrementPromoUsed(promoCodeId);
      const loyaltyConfig2 = await storage.getLoyaltyConfig();
      if (loyaltyConfig2) {
        const points = Math.floor(total * parseFloat(loyaltyConfig2.earnValue) / 100);
        if (points > 0) {
          await storage.addLoyaltyEntry({
            userId: sess.userId,
            orderId: order.id,
            points,
            type: "earn",
            description: `Earned from order ${order.orderNumber}`
          });
        }
      }
      const sender = await storage.getUser(sess.userId);
      if (sender?.phone) {
        sendOrderConfirmation(sender.phone, order.orderNumber).catch((e) => console.error("[WhatsApp] Order confirmation failed:", e.message));
      }
      if (recipientPhone) {
        sendGiftNotification(recipientPhone, order.orderNumber).catch((e) => console.error("[WhatsApp] Gift notification failed:", e.message));
      }
      res.json(order);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/orders/app", appAuth, async (req, res) => {
    try {
      const user = req.appUser;
      const { items, recipientName, recipientPhone, address, cityId, slotDate, slotTime, cardMessage, paymentMethod, subtotal, deliveryFee, expressFee, discount, total, totalUSD, isExpress } = req.body;
      const defaultCity = await storage.getCities().then((cities2) => cities2[0]);
      const resolvedCityId = cityId || defaultCity?.id;
      const order = await storage.createOrder({
        userId: user.id,
        recipientName,
        recipientPhone,
        address,
        cityId: resolvedCityId,
        slotDate: slotDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        slotTime: slotTime || "10:00-13:00",
        cardMessage: cardMessage || "",
        paymentMethod: paymentMethod || "card",
        subtotal: (subtotal || total || 0).toString(),
        deliveryFee: (deliveryFee || 0).toString(),
        expressFee: (expressFee || 0).toString(),
        discount: (discount || 0).toString(),
        vatAmount: "0",
        total: (total || 0).toString(),
        totalUSD: totalUSD?.toString(),
        isExpress: isExpress || false,
        status: "paid"
      }, items);
      if (user.phone) {
        sendOrderConfirmation(user.phone, order.orderNumber).catch((e) => console.error("[WhatsApp] Order confirmation failed:", e.message));
      }
      if (recipientPhone) {
        sendGiftNotification(recipientPhone, order.orderNumber).catch((e) => console.error("[WhatsApp] Gift notification failed:", e.message));
      }
      res.json(order);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/orders/my-orders", appAuth, async (req, res) => {
    try {
      const user = req.appUser;
      const orders2 = await storage.getOrders({ userId: user.id, limit: 50 });
      const ordersWithItems = await Promise.all(orders2.map(async (order) => {
        const fullOrder = await storage.getOrder(order.id);
        return fullOrder;
      }));
      res.json(ordersWithItems.filter(Boolean));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/orders/my", customerAuth, async (req, res) => {
    try {
      const sess = req.session;
      res.json(await storage.getOrders({ userId: sess.userId }));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/orders/:id", customerAuth, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Not found" });
      res.json(order);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/profile", customerAuth, async (req, res) => {
    try {
      const sess = req.session;
      const { nameEn, nameAr, email, language, cityId } = req.body;
      const user = await storage.updateUser(sess.userId, { nameEn, nameAr, email, language, cityId });
      res.json(user);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/loyalty/ledger", customerAuth, async (req, res) => {
    try {
      const sess = req.session;
      const ledger = await storage.getLoyaltyLedger(sess.userId);
      const user = await storage.getUser(sess.userId);
      res.json({ points: user?.loyaltyPoints || 0, ledger });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/recipients", customerAuth, async (req, res) => {
    try {
      const sess = req.session;
      res.json(await storage.getSavedRecipients(sess.userId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/recipients", customerAuth, async (req, res) => {
    try {
      const sess = req.session;
      res.json(await storage.createSavedRecipient({ ...req.body, userId: sess.userId }));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/admin/dashboard", adminAuth, async (_req, res) => {
    try {
      const [totalOrders, totalProducts, totalUsers, statusBreakdown, todayRevenue] = await Promise.all([
        storage.getOrderCount(),
        storage.getProductCount(),
        storage.getUserCount(),
        storage.getOrdersByStatus(),
        storage.getTodayRevenue()
      ]);
      res.json({ totalOrders, totalProducts, totalUsers, statusBreakdown, todayRevenue });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/admin/products", adminAuth, async (req, res) => {
    try {
      res.json(await storage.getProducts({ active: void 0 }));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/admin/products", adminAuth, async (req, res) => {
    try {
      const { images, occasionIds, moodIds, ...data } = req.body;
      const product = await storage.createProduct(data, images || [], occasionIds || [], moodIds || []);
      res.json(product);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/admin/products/:id", adminAuth, async (req, res) => {
    try {
      const { images, occasionIds, moodIds, ...data } = req.body;
      const product = await storage.updateProduct(req.params.id, data, images, occasionIds, moodIds);
      res.json(product);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/admin/products/:id", adminAuth, async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/admin/categories", adminAuth, async (_req, res) => {
    try {
      res.json(await storage.getCategories());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/admin/categories", adminAuth, async (req, res) => {
    try {
      res.json(await storage.createCategory(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/admin/categories/:id", adminAuth, async (req, res) => {
    try {
      res.json(await storage.updateCategory(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/admin/categories/:id", adminAuth, async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/admin/occasions", adminAuth, async (req, res) => {
    try {
      res.json(await storage.createOccasion(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/admin/occasions/:id", adminAuth, async (req, res) => {
    try {
      res.json(await storage.updateOccasion(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/admin/moods", adminAuth, async (req, res) => {
    try {
      res.json(await storage.createMood(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/admin/moods/:id", adminAuth, async (req, res) => {
    try {
      res.json(await storage.updateMood(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/admin/add-ons", adminAuth, async (_req, res) => {
    try {
      res.json(await storage.getAddOns());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/admin/add-ons", adminAuth, async (req, res) => {
    try {
      res.json(await storage.createAddOn(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/admin/add-ons/:id", adminAuth, async (req, res) => {
    try {
      res.json(await storage.updateAddOn(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/admin/orders", adminAuth, async (req, res) => {
    try {
      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.cityId) filters.cityId = req.query.cityId;
      if (req.query.flagged === "true") filters.flagged = true;
      res.json(await storage.getOrders(filters));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/admin/orders/:id", adminAuth, async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ error: "Not found" });
      res.json(order);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/admin/orders/:id/status", adminAuth, async (req, res) => {
    try {
      const { status, notes } = req.body;
      const order = await storage.updateOrderStatus(req.params.id, status, notes);
      if (order && order.recipientPhone) {
        sendStatusUpdate(order.recipientPhone, order.orderNumber, status).catch((e) => console.error("[WhatsApp] Status update failed:", e.message));
      }
      res.json(order);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/admin/orders/:id/flag", adminAuth, async (req, res) => {
    try {
      await storage.flagOrder(req.params.id, req.body.reason);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/admin/orders/:id/assign-driver", adminAuth, async (req, res) => {
    try {
      const result = await storage.assignDriver(req.params.id, req.body.driverId);
      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/admin/drivers", adminAuth, async (_req, res) => {
    try {
      res.json(await storage.getDrivers());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/admin/drivers", adminAuth, async (req, res) => {
    try {
      res.json(await storage.createDriver(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/admin/drivers/:id", adminAuth, async (req, res) => {
    try {
      res.json(await storage.updateDriver(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/admin/slots/:cityId/:date", adminAuth, async (req, res) => {
    try {
      const slots = await storage.ensureSlots(req.params.cityId, req.params.date);
      res.json(slots);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/admin/slots/:id", adminAuth, async (req, res) => {
    try {
      res.json(await storage.updateSlotCapacity(req.params.id, req.body.capacity));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/admin/blackout-dates/:cityId", adminAuth, async (req, res) => {
    try {
      res.json(await storage.getBlackoutDates(req.params.cityId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/admin/blackout-dates", adminAuth, async (req, res) => {
    try {
      res.json(await storage.createBlackoutDate(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/admin/blackout-dates/:id", adminAuth, async (req, res) => {
    try {
      await storage.deleteBlackoutDate(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/admin/promos", adminAuth, async (_req, res) => {
    try {
      res.json(await storage.getPromoCodes());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/admin/promos", adminAuth, async (req, res) => {
    try {
      res.json(await storage.createPromoCode(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/admin/promos/:id", adminAuth, async (req, res) => {
    try {
      res.json(await storage.updatePromoCode(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/admin/loyalty/config", adminAuth, async (_req, res) => {
    try {
      res.json(await storage.getLoyaltyConfig());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/admin/loyalty/config", adminAuth, async (req, res) => {
    try {
      res.json(await storage.updateLoyaltyConfig(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/admin/whatsapp-templates", adminAuth, async (_req, res) => {
    try {
      res.json(await storage.getWhatsappTemplates());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/admin/whatsapp-templates", adminAuth, async (req, res) => {
    try {
      res.json(await storage.createWhatsappTemplate(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/admin/whatsapp-templates/:id", adminAuth, async (req, res) => {
    try {
      res.json(await storage.updateWhatsappTemplate(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/admin/whatsapp-log", adminAuth, async (req, res) => {
    try {
      const sess = req.session;
      res.json(await storage.addWhatsappLog({ ...req.body, createdBy: sess.userId }));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/admin/whatsapp/send", adminAuth, async (req, res) => {
    try {
      const { phone, message, orderId } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ error: "Phone and message are required" });
      }
      const result = await sendWhatsAppMessage(phone, message);
      if (!result.success) {
        return res.status(500).json({ error: "Failed to send WhatsApp message" });
      }
      if (orderId) {
        const sess = req.session;
        await storage.addWhatsappLog({
          orderId,
          templateUsed: "Direct Message",
          outcome: "sent",
          notes: message,
          createdBy: sess.userId
        });
      }
      res.json({ success: true, messageId: result.messageId });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/admin/subscription-plans", adminAuth, async (_req, res) => {
    try {
      res.json(await storage.getSubscriptionPlans());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/admin/subscription-plans", adminAuth, async (req, res) => {
    try {
      res.json(await storage.createSubscriptionPlan(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/admin/subscription-plans/:id", adminAuth, async (req, res) => {
    try {
      res.json(await storage.updateSubscriptionPlan(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/admin/banners", adminAuth, async (_req, res) => {
    try {
      res.json(await storage.getBanners());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/admin/banners", adminAuth, async (req, res) => {
    try {
      res.json(await storage.createBanner(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/admin/banners/:id", adminAuth, async (req, res) => {
    try {
      res.json(await storage.updateBanner(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.delete("/api/admin/banners/:id", adminAuth, async (req, res) => {
    try {
      await storage.deleteBanner(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/admin/fraud", adminAuth, async (req, res) => {
    try {
      const resolved = req.query.resolved !== void 0 ? req.query.resolved === "true" : void 0;
      res.json(await storage.getFraudFlags(resolved));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/admin/fraud/:id/resolve", adminAuth, async (req, res) => {
    try {
      const sess = req.session;
      res.json(await storage.resolveFraudFlag(req.params.id, sess.userId));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/admin/users/:id/blacklist", adminAuth, async (req, res) => {
    try {
      await storage.blacklistUser(req.params.id);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/admin/users", adminAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 50;
      const offset = parseInt(req.query.offset) || 0;
      res.json(await storage.getUsers(limit, offset));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/admin/cities", adminAuth, async (_req, res) => {
    try {
      res.json(await storage.getCities());
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.post("/api/admin/cities", adminAuth, async (req, res) => {
    try {
      res.json(await storage.createCity(req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/admin/cities/:id", adminAuth, async (req, res) => {
    try {
      res.json(await storage.updateCity(req.params.id, req.body));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.get("/api/admin/settings/:key", adminAuth, async (req, res) => {
    try {
      res.json({ value: await storage.getSetting(req.params.key) });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
  app2.put("/api/admin/settings/:key", adminAuth, async (req, res) => {
    try {
      await storage.setSetting(req.params.key, req.body.value);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

// server/index.ts
import * as fs from "fs";
import * as path from "path";
var app = express();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origin = req.header("origin");
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, X-Requested-With, Accept, Origin"
      );
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express.static(path.resolve(process.cwd(), "assets")));
  app2.use(express.static(path.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  registerRoutes(app);
  const adminDir = path.resolve(process.cwd(), "server", "admin");
  app.use("/admin", express.static(adminDir));
  app.use((req, res, next) => {
    if (req.path.startsWith("/admin")) {
      return res.sendFile(path.resolve(adminDir, "index.html"));
    }
    next();
  });
  const { seedDatabase: seedDatabase2 } = await Promise.resolve().then(() => (init_seed(), seed_exports));
  await seedDatabase2();
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  app.listen(port, "0.0.0.0", () => {
    log(`express server serving on port ${port}`);
  });
})();
