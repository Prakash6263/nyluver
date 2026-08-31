import { Express, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import crypto from "crypto";
import { sendOtp, sendOrderConfirmation, sendGiftNotification, sendStatusUpdate, sendWhatsAppMessage } from "./whatsapp";

const PgSession = connectPgSimple(session);
const sessionPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function generateOtp(): string {
  // When DEFAULT_OTP is set in .env, use it (for testing/staging).
  // Remove DEFAULT_OTP from .env when client provides real WhatsApp credentials.
  if (process.env.DEFAULT_OTP) return process.env.DEFAULT_OTP;
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

const tokenStore = new Map<string, string>();

function adminAuth(req: Request, res: Response, next: NextFunction) {
  const sess = req.session as any;
  if (!sess?.userId || sess?.role !== 'admin') {
    return res.status(401).json({ error: 'Admin access required' });
  }
  next();
}

function customerAuth(req: Request, res: Response, next: NextFunction) {
  const sess = req.session as any;
  if (!sess?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

async function appAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }
    const token = authHeader.split(' ')[1];
    const userId = tokenStore.get(token);
    if (!userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    (req as any).appUser = user;
    next();
  } catch (e: any) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

export function registerRoutes(app: Express) {

  app.use(session({
    secret: process.env.SESSION_SECRET || 'nyluver-secret-key',
    resave: false,
    saveUninitialized: false,
    store: new PgSession({
      pool: sessionPool,
      tableName: 'session',
      createTableIfMissing: true,  // auto-creates session table in PostgreSQL
    }),
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: false, // set true if HTTPS is enforced end-to-end
      sameSite: 'lax',
    },
  }));

  // ═══════════════════════════════════════
  // APP AUTH (Simple email + phone)
  // ═══════════════════════════════════════
  app.post('/api/auth/register/send-otp', async (req, res) => {
    try {
      const { name, email, phone } = req.body;
      if (!name?.trim() || !email?.trim() || !phone?.trim()) {
        return res.status(400).json({ error: 'Name, email, and phone are required' });
      }
      let cleanPhone = phone.trim().replace(/[\s\-()]/g, '');
      if (!cleanPhone.startsWith('+')) {
        if (cleanPhone.startsWith('218')) cleanPhone = '+' + cleanPhone;
        else if (cleanPhone.startsWith('0')) cleanPhone = '+218' + cleanPhone.slice(1);
        else cleanPhone = '+218' + cleanPhone;
      }
      const existingEmail = await storage.getUserByEmail(email.trim().toLowerCase());
      if (existingEmail) {
        return res.status(409).json({ error: 'email_taken', message: 'An account with this email already exists' });
      }
      const existingPhone = await storage.getUserByPhone(cleanPhone);
      if (existingPhone) {
        return res.status(409).json({ error: 'phone_taken', message: 'An account with this phone number already exists' });
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
        // Only attempt WhatsApp when real credentials are configured
        const result = await sendOtp(cleanPhone, code);
        if (!result.success) {
          console.warn(`[REGISTRATION] WhatsApp delivery failed for ${cleanPhone}. Code is in server logs.`);
        }
      }
      res.json({ success: true, phone: cleanPhone });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/auth/register/verify', async (req, res) => {
    try {
      const { name, email, phone, code } = req.body;
      if (!name?.trim() || !email?.trim() || !phone?.trim() || !code?.trim()) {
        return res.status(400).json({ error: 'All fields including verification code are required' });
      }
      let cleanPhone = phone.trim().replace(/[\s\-()]/g, '');
      if (!cleanPhone.startsWith('+')) {
        if (cleanPhone.startsWith('218')) cleanPhone = '+' + cleanPhone;
        else if (cleanPhone.startsWith('0')) cleanPhone = '+218' + cleanPhone.slice(1);
        else cleanPhone = '+218' + cleanPhone;
      }
      const otp = await storage.verifyOtp(cleanPhone, code.trim());
      if (!otp) {
        return res.status(400).json({ error: 'invalid_otp', message: 'Invalid or expired verification code' });
      }
      const existingEmail = await storage.getUserByEmail(email.trim().toLowerCase());
      if (existingEmail) {
        return res.status(409).json({ error: 'email_taken', message: 'An account with this email already exists' });
      }
      const existingPhone = await storage.getUserByPhone(cleanPhone);
      if (existingPhone) {
        return res.status(409).json({ error: 'phone_taken', message: 'An account with this phone number already exists' });
      }
      const user = await storage.createUser({
        nameEn: name.trim(),
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
        role: 'customer',
        language: 'en',
      });
      const token = generateToken();
      tokenStore.set(token, user.id);
      res.json({
        user: { id: user.id, name: user.nameEn, email: user.email, phone: user.phone },
        token,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, phone } = req.body;
      if (!name?.trim() || !email?.trim() || !phone?.trim()) {
        return res.status(400).json({ error: 'Name, email, and phone are required' });
      }
      let cleanPhone = phone.trim().replace(/[\s\-()]/g, '');
      if (!cleanPhone.startsWith('+')) {
        if (cleanPhone.startsWith('218')) cleanPhone = '+' + cleanPhone;
        else if (cleanPhone.startsWith('0')) cleanPhone = '+218' + cleanPhone.slice(1);
        else cleanPhone = '+218' + cleanPhone;
      }
      const existingEmail = await storage.getUserByEmail(email.trim().toLowerCase());
      if (existingEmail) {
        return res.status(409).json({ error: 'email_taken', message: 'An account with this email already exists' });
      }
      const existingPhone = await storage.getUserByPhone(cleanPhone);
      if (existingPhone) {
        return res.status(409).json({ error: 'phone_taken', message: 'An account with this phone number already exists' });
      }
      const user = await storage.createUser({
        nameEn: name.trim(),
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
        role: 'customer',
        language: 'en',
      });
      const token = generateToken();
      tokenStore.set(token, user.id);
      res.json({
        user: { id: user.id, name: user.nameEn, email: user.email, phone: user.phone },
        token,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, phone } = req.body;
      if (!email?.trim() || !phone?.trim()) {
        return res.status(400).json({ error: 'Email and phone are required' });
      }
      let cleanPhone = phone.trim().replace(/[\s\-()]/g, '');
      if (!cleanPhone.startsWith('+')) {
        if (cleanPhone.startsWith('218')) cleanPhone = '+' + cleanPhone;
        else if (cleanPhone.startsWith('0')) cleanPhone = '+218' + cleanPhone.slice(1);
        else cleanPhone = '+218' + cleanPhone;
      }
      const user = await storage.getUserByEmailAndPhone(email.trim().toLowerCase(), cleanPhone);
      if (!user) {
        return res.status(401).json({ error: 'no_match', message: 'No account found with that email and phone combination' });
      }
      if (user.isBlacklisted) {
        return res.status(403).json({ error: 'blocked', message: 'This account has been suspended' });
      }
      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
      const token = generateToken();
      tokenStore.set(token, user.id);
      res.json({
        user: { id: user.id, name: user.nameEn, email: user.email, phone: user.phone },
        token,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/auth/me', appAuth, async (req, res) => {
    const user = (req as any).appUser;
    res.json({ id: user.id, name: user.nameEn, email: user.email, phone: user.phone, points: user.loyaltyPoints });
  });

  // ═══════════════════════════════════════
  // ADMIN AUTH (OTP-based)
  // ═══════════════════════════════════════
  app.post('/api/auth/send-otp', async (req, res) => {
    try {
      let { phone } = req.body;
      if (!phone) return res.status(400).json({ error: 'Phone required' });
      phone = phone.trim().replace(/[\s\-()]/g, '');
      if (!phone.startsWith('+')) {
        if (phone.startsWith('218')) phone = '+' + phone;
        else if (phone.startsWith('0')) phone = '+218' + phone.slice(1);
        else phone = '+218' + phone;
      }
      const existingOtp = await storage.getRecentValidOtp(phone);
      if (existingOtp) {
        console.log(`[ADMIN] Reusing recent code for ${phone}`);
        return res.json({ success: true, message: 'OTP sent' });
      }
      const code = generateOtp();
      await storage.createOtp(phone, code);
      console.log(`[ADMIN] OTP code for ${phone}: ${code}`);
      if (!process.env.DEFAULT_OTP) {
        // Only attempt WhatsApp when real credentials are configured
        const result = await sendOtp(phone, code);
        if (!result.success) {
          console.warn(`[ADMIN] WhatsApp delivery failed for ${phone}. Code is in server logs.`);
        }
      }
      res.json({ success: true, message: 'OTP sent' });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const { phone, code } = req.body;
      const otp = await storage.verifyOtp(phone, code);
      if (!otp) return res.status(400).json({ error: 'Invalid or expired OTP' });

      let user = await storage.getUserByPhone(phone);
      if (!user) {
        user = await storage.createUser({ phone, language: 'en' });
      }
      await storage.updateUser(user.id, { lastLoginAt: new Date() } as any);

      const sess = req.session as any;
      sess.userId = user.id;
      sess.role = user.role;

      res.json({ success: true, user });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/auth/admin-login', async (req, res) => {
    try {
      const { phone, code } = req.body;
      const otp = await storage.verifyOtp(phone, code);
      if (!otp) return res.status(400).json({ error: 'Invalid or expired OTP' });

      const user = await storage.getUserByPhone(phone);
      if (!user || user.role !== 'admin') {
        return res.status(403).json({ error: 'Not an admin account' });
      }

      const sess = req.session as any;
      sess.userId = user.id;
      sess.role = 'admin';

      res.json({ success: true, user });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      const sess = req.session as any;
      if (!sess?.userId) return res.json({ user: null });
      const user = await storage.getUser(sess.userId);
      res.json({ user });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  // ═══════════════════════════════════════
  // PUBLIC CATALOG
  // ═══════════════════════════════════════
  app.get('/api/cities', async (_req, res) => {
    try { res.json(await storage.getCities()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/categories', async (_req, res) => {
    try { res.json(await storage.getCategories()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/occasions', async (_req, res) => {
    try { res.json(await storage.getOccasions()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/moods', async (_req, res) => {
    try { res.json(await storage.getMoods()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/products', async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.categoryId) filters.categoryId = req.query.categoryId;
      if (req.query.occasionId) filters.occasionId = req.query.occasionId;
      if (req.query.moodId) filters.moodId = req.query.moodId;
      if (req.query.featured) filters.featured = req.query.featured === 'true';
      if (req.query.popular) filters.popular = req.query.popular === 'true';
      if (req.query.search) filters.search = req.query.search;
      const products = await storage.getProducts(filters);
      res.json(products);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/products/:id', async (req, res) => {
    try {
      const product = await storage.getProduct((req.params.id as string));
      if (!product) return res.status(404).json({ error: 'Not found' });
      res.json(product);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/add-ons', async (_req, res) => {
    try { res.json(await storage.getAddOns()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/banners', async (req, res) => {
    try { res.json(await storage.getBanners(req.query.cityId as string)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/subscription-plans', async (_req, res) => {
    try { res.json(await storage.getSubscriptionPlans()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // DELIVERY SLOTS
  // ═══════════════════════════════════════
  app.get('/api/slots/:cityId/:date', async (req, res) => {
    try {
      const slots = await storage.ensureSlots((req.params.cityId as string), (req.params.date as string));
      const blackouts = await storage.getBlackoutDates((req.params.cityId as string));
      const isBlackedOut = blackouts.some(b => b.date === (req.params.date as string));
      const today = new Date().toISOString().split('T')[0];
      const isToday = (req.params.date as string) === today;
      const currentHour = new Date().getHours();
      const enrichedSlots = slots.map(slot => {
        const startHour = parseInt(slot.startTime.split(':')[0], 10);
        const expired = isToday && currentHour >= startHour + 1;
        return { ...slot, expired };
      });
      res.json({ slots: enrichedSlots, isBlackedOut });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // PROMO CODES (public validate)
  // ═══════════════════════════════════════
  app.post('/api/promo/validate', async (req, res) => {
    try {
      const { code, orderAmount } = req.body;
      const promo = await storage.getPromoByCode(code);
      if (!promo) return res.status(404).json({ error: 'Invalid code' });
      if (promo.maxUses && promo.usedCount >= promo.maxUses) return res.status(400).json({ error: 'Code exhausted' });
      if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return res.status(400).json({ error: 'Code expired' });
      if (promo.minOrderAmount && orderAmount < parseFloat(promo.minOrderAmount)) {
        return res.status(400).json({ error: `Minimum order ${promo.minOrderAmount}` });
      }

      let discount = 0;
      if (promo.type === 'percentage') {
        discount = orderAmount * parseFloat(promo.value) / 100;
      } else {
        discount = parseFloat(promo.value);
      }

      res.json({ valid: true, promo, discount });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // CUSTOMER ORDERS
  // ═══════════════════════════════════════
  app.post('/api/orders', customerAuth, async (req, res) => {
    try {
      const sess = req.session as any;
      const { items, recipientName, recipientPhone, address, cityId, slotId, slotDate, slotTime, cardMessage, paymentMethod, subtotal, deliveryFee, expressFee, discount, vatAmount, total, totalUSD, isExpress, promoCodeId } = req.body;

      const order = await storage.createOrder({
        userId: sess.userId,
        recipientName, recipientPhone, address, cityId,
        slotId, slotDate, slotTime, cardMessage,
        paymentMethod, subtotal: subtotal.toString(), deliveryFee: deliveryFee.toString(),
        expressFee: expressFee.toString(), discount: discount.toString(),
        vatAmount: vatAmount.toString(), total: total.toString(),
        totalUSD: totalUSD?.toString(), isExpress, promoCodeId,
        status: 'paid',
      }, items);

      if (slotId) await storage.incrementSlotUsed(slotId);
      if (promoCodeId) await storage.incrementPromoUsed(promoCodeId);

      const loyaltyConfig = await storage.getLoyaltyConfig();
      if (loyaltyConfig) {
        const points = Math.floor(total * parseFloat(loyaltyConfig.earnValue) / 100);
        if (points > 0) {
          await storage.addLoyaltyEntry({
            userId: sess.userId, orderId: order.id, points, type: 'earn',
            description: `Earned from order ${order.orderNumber}`,
          });
        }
      }

      const sender = await storage.getUser(sess.userId);
      if (sender?.phone) {
        sendOrderConfirmation(sender.phone, order.orderNumber).catch(e => console.error('[WhatsApp] Order confirmation failed:', e.message));
      }
      if (recipientPhone) {
        sendGiftNotification(recipientPhone, order.orderNumber).catch(e => console.error('[WhatsApp] Gift notification failed:', e.message));
      }

      res.json(order);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/orders/app', appAuth, async (req, res) => {
    try {
      const user = (req as any).appUser;
      const { items, recipientName, recipientPhone, address, cityId, slotDate, slotTime, cardMessage, paymentMethod, subtotal, deliveryFee, expressFee, discount, total, totalUSD, isExpress } = req.body;

      const defaultCity = await storage.getCities().then(cities => cities[0]);
      const resolvedCityId = cityId || defaultCity?.id;

      const order = await storage.createOrder({
        userId: user.id,
        recipientName, recipientPhone, address,
        cityId: resolvedCityId,
        slotDate: slotDate || new Date().toISOString().split('T')[0],
        slotTime: slotTime || '10:00-13:00',
        cardMessage: cardMessage || '',
        paymentMethod: paymentMethod || 'card',
        subtotal: (subtotal || total || 0).toString(),
        deliveryFee: (deliveryFee || 0).toString(),
        expressFee: (expressFee || 0).toString(),
        discount: (discount || 0).toString(),
        vatAmount: '0',
        total: (total || 0).toString(),
        totalUSD: totalUSD?.toString(),
        isExpress: isExpress || false,
        status: 'paid',
      }, items);

      if (user.phone) {
        sendOrderConfirmation(user.phone, order.orderNumber).catch(e => console.error('[WhatsApp] Order confirmation failed:', e.message));
      }
      if (recipientPhone) {
        sendGiftNotification(recipientPhone, order.orderNumber).catch(e => console.error('[WhatsApp] Gift notification failed:', e.message));
      }

      res.json(order);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/orders/my-orders', appAuth, async (req, res) => {
    try {
      const user = (req as any).appUser;
      const orders = await storage.getOrders({ userId: user.id, limit: 50 });
      const ordersWithItems = await Promise.all(orders.map(async (order) => {
        const fullOrder = await storage.getOrder(order.id);
        return fullOrder;
      }));
      res.json(ordersWithItems.filter(Boolean));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/orders/my', customerAuth, async (req, res) => {
    try {
      const sess = req.session as any;
      res.json(await storage.getOrders({ userId: sess.userId }));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/orders/:id', customerAuth, async (req, res) => {
    try {
      const order = await storage.getOrder((req.params.id as string));
      if (!order) return res.status(404).json({ error: 'Not found' });
      res.json(order);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // CUSTOMER PROFILE
  // ═══════════════════════════════════════
  app.put('/api/profile', customerAuth, async (req, res) => {
    try {
      const sess = req.session as any;
      const { nameEn, nameAr, email, language, cityId } = req.body;
      const user = await storage.updateUser(sess.userId, { nameEn, nameAr, email, language, cityId });
      res.json(user);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/loyalty/ledger', customerAuth, async (req, res) => {
    try {
      const sess = req.session as any;
      const ledger = await storage.getLoyaltyLedger(sess.userId);
      const user = await storage.getUser(sess.userId);
      res.json({ points: user?.loyaltyPoints || 0, ledger });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/recipients', customerAuth, async (req, res) => {
    try {
      const sess = req.session as any;
      res.json(await storage.getSavedRecipients(sess.userId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/recipients', customerAuth, async (req, res) => {
    try {
      const sess = req.session as any;
      res.json(await storage.createSavedRecipient({ ...req.body, userId: sess.userId }));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // ADMIN: DASHBOARD
  // ═══════════════════════════════════════
  app.get('/api/admin/dashboard', adminAuth, async (_req, res) => {
    try {
      const [totalOrders, totalProducts, totalUsers, statusBreakdown, todayRevenue] = await Promise.all([
        storage.getOrderCount(),
        storage.getProductCount(),
        storage.getUserCount(),
        storage.getOrdersByStatus(),
        storage.getTodayRevenue(),
      ]);
      res.json({ totalOrders, totalProducts, totalUsers, statusBreakdown, todayRevenue });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // ADMIN: PRODUCTS
  // ═══════════════════════════════════════
  app.get('/api/admin/products', adminAuth, async (req, res) => {
    try { res.json(await storage.getProducts({ active: undefined })); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/admin/products', adminAuth, async (req, res) => {
    try {
      const { images, occasionIds, moodIds, ...data } = req.body;
      const product = await storage.createProduct(data, images || [], occasionIds || [], moodIds || []);
      res.json(product);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/admin/products/:id', adminAuth, async (req, res) => {
    try {
      const { images, occasionIds, moodIds, ...data } = req.body;
      const product = await storage.updateProduct((req.params.id as string), data, images, occasionIds, moodIds);
      res.json(product);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/admin/products/:id', adminAuth, async (req, res) => {
    try { await storage.deleteProduct((req.params.id as string)); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // ADMIN: CATEGORIES
  // ═══════════════════════════════════════
  app.get('/api/admin/categories', adminAuth, async (_req, res) => {
    try { res.json(await storage.getCategories()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/admin/categories', adminAuth, async (req, res) => {
    try { res.json(await storage.createCategory(req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/admin/categories/:id', adminAuth, async (req, res) => {
    try { res.json(await storage.updateCategory((req.params.id as string), req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/admin/categories/:id', adminAuth, async (req, res) => {
    try { await storage.deleteCategory((req.params.id as string)); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // ADMIN: OCCASIONS
  // ═══════════════════════════════════════
  app.post('/api/admin/occasions', adminAuth, async (req, res) => {
    try { res.json(await storage.createOccasion(req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/admin/occasions/:id', adminAuth, async (req, res) => {
    try { res.json(await storage.updateOccasion((req.params.id as string), req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // ADMIN: MOODS
  // ═══════════════════════════════════════
  app.post('/api/admin/moods', adminAuth, async (req, res) => {
    try { res.json(await storage.createMood(req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/admin/moods/:id', adminAuth, async (req, res) => {
    try { res.json(await storage.updateMood((req.params.id as string), req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // ADMIN: ADD-ONS
  // ═══════════════════════════════════════
  app.get('/api/admin/add-ons', adminAuth, async (_req, res) => {
    try { res.json(await storage.getAddOns()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/admin/add-ons', adminAuth, async (req, res) => {
    try { res.json(await storage.createAddOn(req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/admin/add-ons/:id', adminAuth, async (req, res) => {
    try { res.json(await storage.updateAddOn((req.params.id as string), req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // ADMIN: ORDERS
  // ═══════════════════════════════════════
  app.get('/api/admin/orders', adminAuth, async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.cityId) filters.cityId = req.query.cityId;
      if (req.query.flagged === 'true') filters.flagged = true;
      res.json(await storage.getOrders(filters));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/admin/orders/:id', adminAuth, async (req, res) => {
    try {
      const order = await storage.getOrder((req.params.id as string));
      if (!order) return res.status(404).json({ error: 'Not found' });
      res.json(order);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/admin/orders/:id/status', adminAuth, async (req, res) => {
    try {
      const { status, notes } = req.body;
      const order = await storage.updateOrderStatus((req.params.id as string), status, notes);

      if (order && order.recipientPhone) {
        sendStatusUpdate(order.recipientPhone, order.orderNumber, status).catch(e => console.error('[WhatsApp] Status update failed:', e.message));
      }

      res.json(order);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/admin/orders/:id/flag', adminAuth, async (req, res) => {
    try {
      await storage.flagOrder((req.params.id as string), req.body.reason);
      res.json({ success: true });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/admin/orders/:id/assign-driver', adminAuth, async (req, res) => {
    try {
      const result = await storage.assignDriver((req.params.id as string), req.body.driverId);
      res.json(result);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // ADMIN: DRIVERS
  // ═══════════════════════════════════════
  app.get('/api/admin/drivers', adminAuth, async (_req, res) => {
    try { res.json(await storage.getDrivers()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/admin/drivers', adminAuth, async (req, res) => {
    try { res.json(await storage.createDriver(req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/admin/drivers/:id', adminAuth, async (req, res) => {
    try { res.json(await storage.updateDriver((req.params.id as string), req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // ADMIN: SLOTS
  // ═══════════════════════════════════════
  app.get('/api/admin/slots/:cityId/:date', adminAuth, async (req, res) => {
    try {
      const slots = await storage.ensureSlots((req.params.cityId as string), (req.params.date as string));
      res.json(slots);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/admin/slots/:id', adminAuth, async (req, res) => {
    try { res.json(await storage.updateSlotCapacity((req.params.id as string), req.body.capacity)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/admin/blackout-dates/:cityId', adminAuth, async (req, res) => {
    try { res.json(await storage.getBlackoutDates((req.params.cityId as string))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/admin/blackout-dates', adminAuth, async (req, res) => {
    try { res.json(await storage.createBlackoutDate(req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/admin/blackout-dates/:id', adminAuth, async (req, res) => {
    try { await storage.deleteBlackoutDate((req.params.id as string)); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // ADMIN: PROMO CODES
  // ═══════════════════════════════════════
  app.get('/api/admin/promos', adminAuth, async (_req, res) => {
    try { res.json(await storage.getPromoCodes()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/admin/promos', adminAuth, async (req, res) => {
    try { res.json(await storage.createPromoCode(req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/admin/promos/:id', adminAuth, async (req, res) => {
    try { res.json(await storage.updatePromoCode((req.params.id as string), req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // ADMIN: LOYALTY
  // ═══════════════════════════════════════
  app.get('/api/admin/loyalty/config', adminAuth, async (_req, res) => {
    try { res.json(await storage.getLoyaltyConfig()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/admin/loyalty/config', adminAuth, async (req, res) => {
    try { res.json(await storage.updateLoyaltyConfig(req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // ADMIN: WHATSAPP TEMPLATES
  // ═══════════════════════════════════════
  app.get('/api/admin/whatsapp-templates', adminAuth, async (_req, res) => {
    try { res.json(await storage.getWhatsappTemplates()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/admin/whatsapp-templates', adminAuth, async (req, res) => {
    try { res.json(await storage.createWhatsappTemplate(req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/admin/whatsapp-templates/:id', adminAuth, async (req, res) => {
    try { res.json(await storage.updateWhatsappTemplate((req.params.id as string), req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/admin/whatsapp-log', adminAuth, async (req, res) => {
    try {
      const sess = req.session as any;
      res.json(await storage.addWhatsappLog({ ...req.body, createdBy: sess.userId }));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/admin/whatsapp/send', adminAuth, async (req, res) => {
    try {
      const { phone, message, orderId } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ error: 'Phone and message are required' });
      }
      const result = await sendWhatsAppMessage(phone, message);
      if (!result.success) {
        return res.status(500).json({ error: 'Failed to send WhatsApp message' });
      }
      if (orderId) {
        const sess = req.session as any;
        await storage.addWhatsappLog({
          orderId,
          templateUsed: 'Direct Message',
          outcome: 'sent',
          notes: message,
          createdBy: sess.userId,
        });
      }
      res.json({ success: true, messageId: result.messageId });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // ADMIN: SUBSCRIPTIONS
  // ═══════════════════════════════════════
  app.get('/api/admin/subscription-plans', adminAuth, async (_req, res) => {
    try { res.json(await storage.getSubscriptionPlans()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/admin/subscription-plans', adminAuth, async (req, res) => {
    try { res.json(await storage.createSubscriptionPlan(req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/admin/subscription-plans/:id', adminAuth, async (req, res) => {
    try { res.json(await storage.updateSubscriptionPlan((req.params.id as string), req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // ADMIN: BANNERS
  // ═══════════════════════════════════════
  app.get('/api/admin/banners', adminAuth, async (_req, res) => {
    try { res.json(await storage.getBanners()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/admin/banners', adminAuth, async (req, res) => {
    try { res.json(await storage.createBanner(req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/admin/banners/:id', adminAuth, async (req, res) => {
    try { res.json(await storage.updateBanner((req.params.id as string), req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.delete('/api/admin/banners/:id', adminAuth, async (req, res) => {
    try { await storage.deleteBanner((req.params.id as string)); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // ADMIN: FRAUD
  // ═══════════════════════════════════════
  app.get('/api/admin/fraud', adminAuth, async (req, res) => {
    try {
      const resolved = req.query.resolved !== undefined ? req.query.resolved === 'true' : undefined;
      res.json(await storage.getFraudFlags(resolved));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/admin/fraud/:id/resolve', adminAuth, async (req, res) => {
    try {
      const sess = req.session as any;
      res.json(await storage.resolveFraudFlag((req.params.id as string), sess.userId));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/admin/users/:id/blacklist', adminAuth, async (req, res) => {
    try { await storage.blacklistUser((req.params.id as string)); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // ADMIN: USERS
  // ═══════════════════════════════════════
  app.get('/api/admin/users', adminAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      res.json(await storage.getUsers(limit, offset));
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // ADMIN: CITIES
  // ═══════════════════════════════════════
  app.get('/api/admin/cities', adminAuth, async (_req, res) => {
    try { res.json(await storage.getCities()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/admin/cities', adminAuth, async (req, res) => {
    try { res.json(await storage.createCity(req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/admin/cities/:id', adminAuth, async (req, res) => {
    try { res.json(await storage.updateCity((req.params.id as string), req.body)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // ADMIN: SETTINGS
  // ═══════════════════════════════════════
  app.get('/api/admin/settings/:key', adminAuth, async (req, res) => {
    try { res.json({ value: await storage.getSetting((req.params.key as string)) }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/admin/settings/:key', adminAuth, async (req, res) => {
    try { await storage.setSetting((req.params.key as string), req.body.value); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
