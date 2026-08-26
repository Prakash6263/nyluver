import { sql } from "drizzle-orm";
import {
  pgTable, text, varchar, integer, boolean, timestamp, decimal,
  jsonb, index, uniqueIndex, pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum('user_role', ['customer', 'admin']);
export const orderStatusEnum = pgEnum('order_status', [
  'pending_payment', 'paid', 'awaiting_recipient', 'accepted',
  'in_prep', 'ready', 'out_for_delivery', 'delivered',
  'failed_delivery', 'declined', 'cancelled', 'rescheduled'
]);
export const inventoryModeEnum = pgEnum('inventory_mode', ['stock', 'quota']);
export const paymentMethodEnum = pgEnum('payment_method', ['card', 'paypal']);
export const subscriptionFreqEnum = pgEnum('subscription_freq', ['weekly', 'monthly']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'paused', 'cancelled']);

// ───── CITIES ─────
export const cities = pgTable("cities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  country: text("country").notNull().default('Libya'),
  currency: text("currency").notNull().default('LYD'),
  vatEnabled: boolean("vat_enabled").notNull().default(false),
  vatPercent: decimal("vat_percent", { precision: 5, scale: 2 }).notNull().default('0'),
  vatInclusive: boolean("vat_inclusive").notNull().default(true),
  fxRateToUSD: decimal("fx_rate_to_usd", { precision: 10, scale: 4 }).notNull().default('0.2'),
  inventoryMode: inventoryModeEnum("inventory_mode").notNull().default('stock'),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ───── WAREHOUSES ─────
export const warehouses = pgTable("warehouses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cityId: varchar("city_id").notNull().references(() => cities.id),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  address: text("address"),
  isActive: boolean("is_active").notNull().default(true),
});

// ───── USERS ─────
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull().unique(),
  email: text("email"),
  nameEn: text("name_en"),
  nameAr: text("name_ar"),
  role: userRoleEnum("role").notNull().default('customer'),
  cityId: varchar("city_id").references(() => cities.id),
  language: text("language").notNull().default('en'),
  isBlacklisted: boolean("is_blacklisted").notNull().default(false),
  deviceFingerprint: text("device_fingerprint"),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
});

// ───── OTP VERIFICATION ─────
export const otpCodes = pgTable("otp_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ───── SAVED RECIPIENTS ─────
export const savedRecipients = pgTable("saved_recipients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
});

// ───── CATEGORIES ─────
export const categories = pgTable("categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

// ───── OCCASIONS ─────
export const occasions = pgTable("occasions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon"),
  color: text("color"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

// ───── MOODS ─────
export const moods = pgTable("moods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  slug: text("slug").notNull().unique(),
  color: text("color"),
  gradientStart: text("gradient_start"),
  gradientEnd: text("gradient_end"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
});

// ───── PRODUCTS ─────
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  descriptionEn: text("description_en"),
  descriptionAr: text("description_ar"),
  priceLYD: decimal("price_lyd", { precision: 10, scale: 2 }).notNull(),
  priceUSD: decimal("price_usd", { precision: 10, scale: 2 }).notNull(),
  categoryId: varchar("category_id").references(() => categories.id),
  includesEn: jsonb("includes_en").$type<string[]>().default([]),
  includesAr: jsonb("includes_ar").$type<string[]>().default([]),
  expressEligible: boolean("express_eligible").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  isPopular: boolean("is_popular").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  stockCount: integer("stock_count").notNull().default(0),
  dailyQuota: integer("daily_quota"),
  exactMatchVerified: boolean("exact_match_verified").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ───── PRODUCT IMAGES ─────
export const productImages = pgTable("product_images", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  url: text("url").notNull(),
  isPrimary: boolean("is_primary").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ───── PRODUCT ↔ OCCASION ─────
export const productOccasions = pgTable("product_occasions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  occasionId: varchar("occasion_id").notNull().references(() => occasions.id, { onDelete: 'cascade' }),
});

// ───── PRODUCT ↔ MOOD ─────
export const productMoods = pgTable("product_moods", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  productId: varchar("product_id").notNull().references(() => products.id, { onDelete: 'cascade' }),
  moodId: varchar("mood_id").notNull().references(() => moods.id, { onDelete: 'cascade' }),
});

// ───── ADD-ONS ─────
export const addOns = pgTable("add_ons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  priceLYD: decimal("price_lyd", { precision: 10, scale: 2 }).notNull(),
  priceUSD: decimal("price_usd", { precision: 10, scale: 2 }).notNull(),
  icon: text("icon"),
  category: text("category"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});

// ───── DELIVERY SLOTS ─────
export const deliverySlots = pgTable("delivery_slots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cityId: varchar("city_id").notNull().references(() => cities.id),
  date: text("date").notNull(),
  slotIndex: integer("slot_index").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  capacity: integer("capacity").notNull().default(50),
  used: integer("used").notNull().default(0),
  isBlocked: boolean("is_blocked").notNull().default(false),
});

// ───── BLACKOUT DATES ─────
export const blackoutDates = pgTable("blackout_dates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  cityId: varchar("city_id").notNull().references(() => cities.id),
  date: text("date").notNull(),
  reason: text("reason"),
});

// ───── ORDERS ─────
export const orders = pgTable("orders", {
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
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull().default('0'),
  expressFee: decimal("express_fee", { precision: 10, scale: 2 }).notNull().default('0'),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull().default('0'),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).notNull().default('0'),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  totalUSD: decimal("total_usd", { precision: 10, scale: 2 }),
  status: orderStatusEnum("status").notNull().default('pending_payment'),
  isExpress: boolean("is_express").notNull().default(false),
  promoCodeId: varchar("promo_code_id"),
  driverId: varchar("driver_id"),
  adminNotes: text("admin_notes"),
  isFlagged: boolean("is_flagged").notNull().default(false),
  flagReason: text("flag_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ───── ORDER ITEMS ─────
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id, { onDelete: 'cascade' }),
  productId: varchar("product_id").notNull().references(() => products.id),
  productNameEn: text("product_name_en").notNull(),
  productNameAr: text("product_name_ar").notNull(),
  productImage: text("product_image"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
});

// ───── ORDER ITEM ADD-ONS ─────
export const orderItemAddOns = pgTable("order_item_add_ons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderItemId: varchar("order_item_id").notNull().references(() => orderItems.id, { onDelete: 'cascade' }),
  addOnId: varchar("add_on_id").notNull().references(() => addOns.id),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
});

// ───── PAYMENT TRANSACTIONS ─────
export const paymentTransactions = pgTable("payment_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  method: paymentMethodEnum("method").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  externalId: text("external_id"),
  status: text("status").notNull().default('pending'),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ───── DRIVERS ─────
export const drivers = pgTable("drivers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  cityId: varchar("city_id").references(() => cities.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ───── DELIVERY ASSIGNMENTS ─────
export const deliveryAssignments = pgTable("delivery_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  driverId: varchar("driver_id").notNull().references(() => drivers.id),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  pickedUpAt: timestamp("picked_up_at"),
  deliveredAt: timestamp("delivered_at"),
  failedAt: timestamp("failed_at"),
  notes: text("notes"),
});

// ───── WHATSAPP CONTACT LOG ─────
export const whatsappLogs = pgTable("whatsapp_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  templateUsed: text("template_used"),
  language: text("language"),
  notes: text("notes"),
  outcome: text("outcome"),
  contactedAt: timestamp("contacted_at").defaultNow().notNull(),
  createdBy: varchar("created_by").references(() => users.id),
});

// ───── WHATSAPP TEMPLATES ─────
export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  bodyEn: text("body_en").notNull(),
  bodyAr: text("body_ar").notNull(),
  placeholders: jsonb("placeholders").$type<string[]>().default([]),
  isActive: boolean("is_active").notNull().default(true),
});

// ───── LOYALTY LEDGER ─────
export const loyaltyLedger = pgTable("loyalty_ledger", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  orderId: varchar("order_id").references(() => orders.id),
  points: integer("points").notNull(),
  type: text("type").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ───── LOYALTY CONFIG ─────
export const loyaltyConfig = pgTable("loyalty_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  earnType: text("earn_type").notNull().default('percentage'),
  earnValue: decimal("earn_value", { precision: 5, scale: 2 }).notNull().default('10'),
  redemptionEnabled: boolean("redemption_enabled").notNull().default(false),
  pointsPerUnit: decimal("points_per_unit", { precision: 10, scale: 2 }).notNull().default('100'),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ───── PROMO CODES ─────
export const promoCodes = pgTable("promo_codes", {
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ───── SUBSCRIPTIONS ─────
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  nameEn: text("name_en").notNull(),
  nameAr: text("name_ar").notNull(),
  descriptionEn: text("description_en"),
  descriptionAr: text("description_ar"),
  frequency: subscriptionFreqEnum("frequency").notNull(),
  priceLYD: decimal("price_lyd", { precision: 10, scale: 2 }).notNull(),
  priceUSD: decimal("price_usd", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  planId: varchar("plan_id").notNull().references(() => subscriptionPlans.id),
  status: subscriptionStatusEnum("status").notNull().default('active'),
  preferredSlot: text("preferred_slot"),
  autoRenew: boolean("auto_renew").notNull().default(true),
  nextDeliveryDate: text("next_delivery_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  pausedAt: timestamp("paused_at"),
  cancelledAt: timestamp("cancelled_at"),
});

// ───── BANNERS / CMS ─────
export const banners = pgTable("banners", {
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
  cityId: varchar("city_id").references(() => cities.id),
});

// ───── FRAUD / SUSPICIOUS ─────
export const fraudFlags = pgTable("fraud_flags", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  orderId: varchar("order_id").references(() => orders.id),
  reason: text("reason").notNull(),
  resolved: boolean("resolved").notNull().default(false),
  resolvedBy: varchar("resolved_by"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ───── SETTINGS ─────
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ───── INSERT SCHEMAS ─────
export const insertCitySchema = createInsertSchema(cities).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, lastLoginAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export const insertOccasionSchema = createInsertSchema(occasions).omit({ id: true });
export const insertMoodSchema = createInsertSchema(moods).omit({ id: true });
export const insertAddOnSchema = createInsertSchema(addOns).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertBannerSchema = createInsertSchema(banners).omit({ id: true });
export const insertPromoCodeSchema = createInsertSchema(promoCodes).omit({ id: true, createdAt: true, usedCount: true });
export const insertDriverSchema = createInsertSchema(drivers).omit({ id: true, createdAt: true });
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({ id: true, createdAt: true });
export const insertWhatsappTemplateSchema = createInsertSchema(whatsappTemplates).omit({ id: true });

// ───── TYPES ─────
export type City = typeof cities.$inferSelect;
export type InsertCity = z.infer<typeof insertCitySchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Category = typeof categories.$inferSelect;
export type Occasion = typeof occasions.$inferSelect;
export type Mood = typeof moods.$inferSelect;
export type AddOn = typeof addOns.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type DeliverySlot = typeof deliverySlots.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type Banner = typeof banners.$inferSelect;
export type PromoCode = typeof promoCodes.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;
export type WhatsappLog = typeof whatsappLogs.$inferSelect;
export type FraudFlag = typeof fraudFlags.$inferSelect;
export type LoyaltyLedgerEntry = typeof loyaltyLedger.$inferSelect;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;
