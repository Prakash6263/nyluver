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
import { renderReceiptHtml } from "./receipt";
import { hashPassword, verifyPassword, validatePasswordStrength, generateNumericCode, otpLength, defaultOtp, type OtpChannel } from "./password";
import { deliverVerificationCode } from "./mailer";
import { pointsEarned, planRedemption, redemptionReady, round2 } from "./loyalty";

const PgSession = connectPgSimple(session);
const sessionPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// Verification codes are channel-aware: the mobile app's 4-box screen gets
// 4-digit codes while the admin panel keeps 6-digit codes. See otpLength()
// and defaultOtp() in password.ts for the per-channel overrides.
const OTP_TTL_SECONDS = 5 * 60;          // code lifetime
const OTP_RESEND_AFTER_SECONDS = 60;     // cooldown before "resend" is allowed

function generateOtp(channel: OtpChannel): string {
  // A fixed code can be pinned per channel for staging (DEFAULT_OTP_APP /
  // DEFAULT_OTP_ADMIN, or the legacy DEFAULT_OTP).
  return defaultOtp(channel) ?? generateNumericCode(otpLength(channel));
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

function normalizePhone(phone: string): string {
  let clean = String(phone).trim().replace(/[\s\-()]/g, '');
  if (!clean.startsWith('+')) {
    if (clean.startsWith('218')) clean = '+' + clean;
    else if (clean.startsWith('0')) clean = '+218' + clean.slice(1);
    else clean = '+218' + clean;
  }
  return clean;
}

function normalizeEmail(email: string): string {
  return String(email).trim().toLowerCase();
}

// Never return passwordHash to a client.
function publicUser(user: any) {
  return {
    id: user.id,
    name: user.nameEn,
    email: user.email,
    phone: user.phone,
    hasPassword: !!user.passwordHash,
  };
}

// Password change must invalidate previously issued app tokens.
function revokeUserTokens(userId: string) {
  for (const [token, id] of tokenStore.entries()) {
    if (id === userId) tokenStore.delete(token);
  }
}

function issueToken(userId: string): string {
  const token = generateToken();
  tokenStore.set(token, userId);
  return token;
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

// ───── PROMO REDEMPTION ─────
// Clients may identify the applied promo in more than one way; accept any of
// them so a promo is always counted against its maxUses.
// The admin panel can leave "Max Uses" empty. Blank used to mean unlimited, which let a
// promo be reused forever by mistake. Anything that is not a positive number now defaults
// to a single use.
function withDefaultMaxUses(body: any) {
  const data = { ...(body || {}) };
  const raw = data.maxUses;
  const num = (raw === null || raw === undefined || raw === '') ? NaN : Number(raw);
  data.maxUses = Number.isFinite(num) && num > 0 ? Math.trunc(num) : 1;
  return data;
}

function promoRefsFromBody(body: any): string[] {
  const b = body || {};
  const nested = b.promo && typeof b.promo === 'object' ? b.promo : null;
  const raw = [
    b.promoCodeId, b.promoId,
    nested && nested.id,
    b.promoCode, b.code, b.promoCodeValue,
    typeof b.promo === 'string' ? b.promo : null,
    nested && nested.code,
  ];
  return raw.filter((v: any) => typeof v === 'string' && v.trim()).map((v: string) => v.trim());
}

// Validates a promo and consumes one use atomically. Returns null when no promo
// was referenced, { error } when it must be rejected, or { promo, discount }.
async function redeemPromoForOrder(opts: { body: any; orderAmount: number; userId: string; categoryIds?: any }) {
  const refs = promoRefsFromBody(opts.body);
  if (!refs.length) return null;

  let promo: any = null;
  for (const ref of refs) {
    promo = await storage.getPromoById(ref);
    if (!promo) promo = await storage.getPromoByCode(ref);
    if (promo) break;
  }
  if (!promo || !promo.isActive) return { error: 'Invalid code', status: 404 };
  if (promo.maxUses && promo.usedCount >= promo.maxUses) return { error: 'Code exhausted', status: 400 };
  if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return { error: 'Code expired', status: 400 };
  if (promo.minOrderAmount && opts.orderAmount < parseFloat(promo.minOrderAmount)) {
    return { error: `Minimum order ${promo.minOrderAmount}`, status: 400 };
  }
  if (promo.isFirstOrderOnly && opts.userId) {
    const orderCount = await storage.getUserOrderCount(opts.userId);
    if (orderCount > 0) return { error: 'Valid on first order only', status: 400 };
  }
  if (promo.categoryId && Array.isArray(opts.categoryIds) && !opts.categoryIds.includes(promo.categoryId)) {
    return { error: 'Promo not applicable to items in cart', status: 400 };
  }

  let discount = promo.type === 'percentage'
    ? opts.orderAmount * parseFloat(promo.value) / 100
    : parseFloat(promo.value);
  if (!Number.isFinite(discount) || discount < 0) discount = 0;
  if (discount > opts.orderAmount) discount = opts.orderAmount;

  const redeemed = await storage.redeemPromoCode(promo.id, opts.userId);
  if (redeemed.error === 'already_used') return { error: 'Promo code already used by this user', status: 400 };
  if (redeemed.error === 'exhausted') return { error: 'Code exhausted', status: 400 };

  return { promo: redeemed.promo, redemptionId: redeemed.redemptionId, discount: Math.round(discount * 100) / 100 };
}

// Applies the server-side discount to the client totals, keeping fees/VAT intact.
function reconcileDiscount(body: any, serverDiscount: number) {
  const num = (v: any) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  const clientDiscount = num(body?.discount);
  const clientTotal = num(body?.total);
  const subtotal = num(body?.subtotal);
  const fees = num(body?.deliveryFee) + num(body?.expressFee) + num(body?.vatAmount);
  const appliedDiscount = serverDiscount;

  let finalTotal = clientTotal + clientDiscount - serverDiscount;
  let source = 'client';
  // If the client's own numbers do not add up to the order components, the client
  // has already subtracted the discount without reporting it. Rebuild the total
  // from the components instead of trusting the client figure.
  if (subtotal > 0 && Math.abs((clientTotal + clientDiscount) - (subtotal + fees)) > 0.01) {
    finalTotal = subtotal + fees - serverDiscount;
    source = 'components';
  }
  if (finalTotal < 0) finalTotal = 0;
  return { clientDiscount, appliedDiscount, finalTotal: Math.round(finalTotal * 100) / 100, source };
}

// ─────────────────────────────────────────────────────────────────────────────
// LOYALTY
//
// The web checkout and the app checkout share these helpers, so points are
// earned and spent the same way everywhere. How much a point is worth comes
// from the admin panel (pointsPerUnit + pointValue), never from the client.
// ─────────────────────────────────────────────────────────────────────────────

// Spends the points the client asked for and reports what was actually charged,
// so the caller can take that amount off the order total. Points are handed
// back by refundLoyaltyRedemption() when the order itself cannot be stored.
async function chargeLoyaltyRedemption(userId: string, requestedPoints: unknown, discountRoom: number) {
  const nothing = { points: 0, discount: 0, entryId: null as string | null };

  const config = await storage.getLoyaltyConfig();
  if (!redemptionReady(config)) return nothing;

  const user = await storage.getUser(userId);
  const plan = planRedemption(config, user?.loyaltyPoints || 0, requestedPoints, discountRoom);
  if (plan.points <= 0) return nothing;

  const entry = await storage.redeemLoyaltyPoints({
    userId,
    points: plan.points,
    description: `Redeemed ${plan.points} points for ${plan.discount} off`,
  });
  // The balance moved between planning and charging (another order). Place this
  // order without the redemption instead of giving away an unpaid discount.
  if (!entry) return nothing;

  return { points: plan.points, discount: plan.discount, entryId: entry.id as string };
}

// Puts spent points back when the order could not be created.
async function refundLoyaltyRedemption(userId: string, redemption: { points: number }) {
  if (redemption.points <= 0) return;
  await storage.addLoyaltyEntry({
    userId,
    points: redemption.points,
    type: 'refund',
    description: 'Redemption reversed (order was not stored)',
  }).catch((e: any) => console.error('[loyalty] Failed to refund redemption:', e.message));
}

// Credits the points an order earned. Based on what the customer actually pays,
// so a discounted order earns on the amount it was charged.
async function creditLoyaltyEarn(userId: string, orderId: string, orderNumber: string, paidTotal: number) {
  try {
    const config = await storage.getLoyaltyConfig();
    const points = pointsEarned(config, paidTotal);
    if (points <= 0) return 0;
    await storage.addLoyaltyEntry({
      userId,
      orderId,
      points,
      type: 'earn',
      description: `Earned from order ${orderNumber}`,
    });
    return points;
  } catch (e: any) {
    // The order is already placed and paid for, so a bookkeeping failure is
    // logged instead of being turned into an error response the app would read
    // as "order failed" (and retry into a duplicate).
    console.error('[loyalty] Failed to credit points for order ' + orderNumber + ':', e.message);
    return 0;
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
  // APP AUTH (email + password, codes delivered by email)
  // ═══════════════════════════════════════
  app.post('/api/auth/register/send-otp', async (req, res) => {
    try {
      const { name, email, phone, password } = req.body || {};
      if (!name?.trim() || !email?.trim() || !phone?.trim()) {
        return res.status(400).json({ error: 'Name, email, and phone are required' });
      }
      if (password !== undefined && password !== null && password !== '') {
        const strengthError = validatePasswordStrength(password);
        if (strengthError) return res.status(400).json({ error: 'weak_password', message: strengthError });
      }

      const cleanEmail = normalizeEmail(email);
      const cleanPhone = normalizePhone(phone);

      if (await storage.getUserByEmail(cleanEmail)) {
        return res.status(409).json({ error: 'email_taken', message: 'An account with this email already exists' });
      }
      if (await storage.getUserByPhone(cleanPhone)) {
        return res.status(409).json({ error: 'phone_taken', message: 'An account with this phone number already exists' });
      }

      const existing = await storage.getRecentValidOtpForEmail(cleanEmail, 'register');
      let emailSent = true;
      if (!existing) {
        const code = generateOtp('app');
        await storage.createOtpFor({ email: cleanEmail, phone: cleanPhone, code, purpose: 'register' });
        const result = await deliverVerificationCode({ email: cleanEmail, code, purpose: 'register' });
        emailSent = result.email;
      }

      res.json({
        success: true,
        email: cleanEmail,
        purpose: 'register',
        emailSent,
        expiresInSeconds: OTP_TTL_SECONDS,
        resendAfterSeconds: OTP_RESEND_AFTER_SECONDS,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/auth/register/verify', async (req, res) => {
    try {
      const { name, email, phone, code, password } = req.body || {};
      if (!name?.trim() || !email?.trim() || !phone?.trim() || !code?.trim()) {
        return res.status(400).json({ error: 'All fields including verification code are required' });
      }
      const strengthError = validatePasswordStrength(password);
      if (strengthError) return res.status(400).json({ error: 'weak_password', message: strengthError });

      const cleanEmail = normalizeEmail(email);
      const cleanPhone = normalizePhone(phone);

      const otp = await storage.verifyOtpForEmail(cleanEmail, String(code).trim(), 'register');
      if (!otp) {
        return res.status(400).json({ error: 'invalid_code', message: 'Invalid or expired verification code' });
      }
      if (await storage.getUserByEmail(cleanEmail)) {
        return res.status(409).json({ error: 'email_taken', message: 'An account with this email already exists' });
      }
      if (await storage.getUserByPhone(cleanPhone)) {
        return res.status(409).json({ error: 'phone_taken', message: 'An account with this phone number already exists' });
      }

      const user = await storage.createUser({
        nameEn: name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        passwordHash: hashPassword(password),
        role: 'customer',
        language: 'en',
      });
      res.json({ user: publicUser(user), token: issueToken(user.id) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Single-step sign-up without a verification code.
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { name, email, phone, password } = req.body || {};
      if (!name?.trim() || !email?.trim() || !phone?.trim()) {
        return res.status(400).json({ error: 'Name, email, and phone are required' });
      }
      const strengthError = validatePasswordStrength(password);
      if (strengthError) return res.status(400).json({ error: 'weak_password', message: strengthError });

      const cleanEmail = normalizeEmail(email);
      const cleanPhone = normalizePhone(phone);

      if (await storage.getUserByEmail(cleanEmail)) {
        return res.status(409).json({ error: 'email_taken', message: 'An account with this email already exists' });
      }
      if (await storage.getUserByPhone(cleanPhone)) {
        return res.status(409).json({ error: 'phone_taken', message: 'An account with this phone number already exists' });
      }

      const user = await storage.createUser({
        nameEn: name.trim(),
        email: cleanEmail,
        phone: cleanPhone,
        passwordHash: hashPassword(password),
        role: 'customer',
        language: 'en',
      });
      res.json({ user: publicUser(user), token: issueToken(user.id) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Sign in with email + password. The legacy email + phone pair still works so
  // the app build currently in the store keeps authenticating.
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, phone, password } = req.body || {};
      const cleanEmail = email?.trim() ? normalizeEmail(email) : '';
      const cleanPhone = phone?.trim() ? normalizePhone(phone) : '';

      let user;
      if (password) {
        if (!cleanEmail && !cleanPhone) {
          return res.status(400).json({ error: 'Email or phone is required' });
        }
        user = cleanEmail
          ? await storage.getUserByEmail(cleanEmail)
          : await storage.getUserByPhone(cleanPhone);
        if (!user || !verifyPassword(password, user.passwordHash)) {
          return res.status(401).json({ error: 'invalid_credentials', message: 'Incorrect email or password' });
        }
      } else {
        if (!cleanEmail || !cleanPhone) {
          return res.status(400).json({ error: 'Email and phone are required' });
        }
        user = await storage.getUserByEmailAndPhone(cleanEmail, cleanPhone);
        if (!user) {
          return res.status(401).json({ error: 'no_match', message: 'No account found with that email and phone combination' });
        }
      }

      if (user.isBlacklisted) {
        return res.status(403).json({ error: 'blocked', message: 'This account has been suspended' });
      }

      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
      res.json({ user: publicUser(user), token: issueToken(user.id) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Step 1 of "Password Reset": email a code to the account address.
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });
      const cleanEmail = normalizeEmail(email);

      const user = await storage.getUserByEmail(cleanEmail);
      if (!user) {
        console.warn(`[AUTH] Password reset requested for unknown email: ${cleanEmail}`);
        return res.status(400).json({ error: 'invalid_email', message: 'No account found with this email' });
      }

      let emailSent = true;
      const existing = await storage.getRecentValidOtpForEmail(cleanEmail, 'password_reset');
      if (!existing) {
        const code = generateOtp('app');
        await storage.createOtpFor({ email: cleanEmail, phone: user.phone, code, purpose: 'password_reset' });
        const result = await deliverVerificationCode({ email: cleanEmail, code, purpose: 'password_reset' });
        emailSent = result.email;
      }

      res.json({
        success: true,
        email: cleanEmail,
        purpose: 'password_reset',
        emailSent,
        expiresInSeconds: OTP_TTL_SECONDS,
        resendAfterSeconds: OTP_RESEND_AFTER_SECONDS,
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Re-send a sign-up or password-reset code (the "Didn't receive the code?" link).
  app.post('/api/auth/resend-otp', async (req, res) => {
    try {
      const { email, purpose } = req.body || {};
      if (!email?.trim()) return res.status(400).json({ error: 'Email is required' });
      const cleanEmail = normalizeEmail(email);
      const codePurpose = purpose === 'password_reset' ? 'password_reset' : 'register';

      const user = await storage.getUserByEmail(cleanEmail);

      if (codePurpose === 'register' && user) {
        return res.status(409).json({ error: 'email_taken', message: 'An account with this email already exists' });
      }
      if (codePurpose === 'password_reset' && !user) {
        return res.status(400).json({ error: 'invalid_email', message: 'No account found with this email' });
      }

      const code = generateOtp('app');
      await storage.createOtpFor({ email: cleanEmail, phone: user?.phone ?? null, code, purpose: codePurpose });
      const result = await deliverVerificationCode({ email: cleanEmail, code, purpose: codePurpose });

      res.json({ success: true, email: cleanEmail, purpose: codePurpose, emailSent: result.email });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Step 2 of "Password Reset": exchange the emailed code for a new password.
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { email, code, newPassword, password } = req.body || {};
      const nextPassword = newPassword ?? password;
      if (!email?.trim() || !code?.trim()) {
        return res.status(400).json({ error: 'Email and verification code are required' });
      }
      const strengthError = validatePasswordStrength(nextPassword);
      if (strengthError) return res.status(400).json({ error: 'weak_password', message: strengthError });

      const cleanEmail = normalizeEmail(email);
      const user = await storage.getUserByEmail(cleanEmail);
      const otp = user
        ? await storage.verifyOtpForEmail(cleanEmail, String(code).trim(), 'password_reset')
        : null;
      if (!otp) {
        return res.status(400).json({ error: 'invalid_code', message: 'Invalid or expired verification code' });
      }

      await storage.setUserPassword(user!.id, hashPassword(nextPassword));
      revokeUserTokens(user!.id);

      res.json({ success: true, message: 'Password updated. Please sign in.' });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // Change the password of the signed-in account.
  app.post('/api/auth/change-password', appAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      const user = (req as any).appUser;
      if (!verifyPassword(currentPassword, user.passwordHash)) {
        return res.status(401).json({ error: 'invalid_credentials', message: 'Current password is incorrect' });
      }
      const strengthError = validatePasswordStrength(newPassword);
      if (strengthError) return res.status(400).json({ error: 'weak_password', message: strengthError });

      await storage.setUserPassword(user.id, hashPassword(newPassword));
      revokeUserTokens(user.id);
      res.json({ success: true, token: issueToken(user.id) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const userId = tokenStore.get(token);
        if (!userId) {
          return res.status(401).json({ error: 'Invalid token' });
        }
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(401).json({ error: 'User not found' });
        }
        return res.json({ id: user.id, name: user.nameEn, email: user.email, phone: user.phone, points: user.loyaltyPoints });
      }

      // Fallback to session auth (Web Admin Panel)
      const sess = req.session as any;
      if (!sess?.userId) return res.json({ user: null });
      const user = await storage.getUser(sess.userId);
      res.json({ user });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
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
      const code = generateOtp('admin');
      await storage.createOtp(phone, code);
      console.log(`[ADMIN] OTP code for ${phone}: ${code}`);
      if (!defaultOtp('admin')) {
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

  // ───── CONTENT PAGES (Support / About Us / Privacy Policy / Terms & Conditions) ─────
  // Public, used by the mobile app. Slugs: support, about, privacy, terms.
  app.get('/api/content', async (_req, res) => {
    try { res.json(await storage.getContentPages(true)); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/content/:slug', async (req, res) => {
    try {
      const page = await storage.getContentPage((req.params.slug as string));
      if (!page) return res.status(404).json({ error: 'Page not found' });
      res.json(page);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
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
      const { code, orderAmount, userId, categoryIds } = req.body;
      const promo = await storage.getPromoByCode(code);
      if (!promo) return res.status(404).json({ error: 'Invalid code' });
      if (promo.maxUses && promo.usedCount >= promo.maxUses) return res.status(400).json({ error: 'Code exhausted' });
      if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) return res.status(400).json({ error: 'Code expired' });
      if (promo.minOrderAmount && orderAmount < parseFloat(promo.minOrderAmount)) {
        return res.status(400).json({ error: `Minimum order ${promo.minOrderAmount}` });
      }
      if (promo.isFirstOrderOnly && userId) {
        const orderCount = await storage.getUserOrderCount(userId);
        if (orderCount > 0) return res.status(400).json({ error: 'Valid on first order only' });
      }
      if (userId && await storage.hasUserRedeemedPromo(promo.id, userId)) {
        return res.status(400).json({ error: 'Promo code already used by this user' });
      }
      if (promo.categoryId && Array.isArray(categoryIds) && !categoryIds.includes(promo.categoryId)) {
        return res.status(400).json({ error: 'Promo not applicable to items in cart' });
      }

      let discount = promo.type === 'percentage'
        ? orderAmount * parseFloat(promo.value) / 100
        : parseFloat(promo.value);
      if (discount > orderAmount) discount = orderAmount;

      res.json({ valid: true, promo, discount });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  // ═══════════════════════════════════════
  // CUSTOMER ORDERS
  // ═══════════════════════════════════════
  app.post('/api/orders', customerAuth, async (req, res) => {
    try {
      const sess = req.session as any;
      const { items, recipientName, recipientPhone, address, cityId, slotId, slotDate, slotTime, cardMessage, paymentMethod, subtotal, deliveryFee, expressFee, discount, vatAmount, total, totalUSD, isExpress, redeemPoints } = req.body;

      const orderAmount = parseFloat(subtotal ?? total ?? 0) || 0;
      const promoResult: any = await redeemPromoForOrder({ body: req.body, orderAmount, userId: sess.userId, categoryIds: req.body.categoryIds });
      if (promoResult?.error) return res.status(promoResult.status || 400).json({ error: promoResult.error });

      const promoDiscount = promoResult ? promoResult.discount : (parseFloat(discount ?? 0) || 0);
      // Points are charged before the order is written, so a checkout can never
      // walk away with a loyalty discount that was not paid for. Whatever the
      // promo already took off is no longer available to the redemption.
      const redemption = await chargeLoyaltyRedemption(sess.userId, redeemPoints, orderAmount - promoDiscount);
      const serverDiscount = round2(promoDiscount + redemption.discount);
      const { clientDiscount, appliedDiscount, finalTotal, source } = reconcileDiscount(req.body, serverDiscount);
      if (!promoResult && clientDiscount > 0) {
        console.warn('[promo] /api/orders got a discount without any promo reference. body keys: ' + Object.keys(req.body || {}).join(','));
      }
      if (source === 'components') {
        console.warn('[promo] /api/orders total rebuilt from order components (client total/discount were inconsistent).');
      }

      let order: any;
      try {
        order = await storage.createOrder({
          userId: sess.userId,
          recipientName, recipientPhone, address, cityId,
          slotId, slotDate, slotTime, cardMessage,
          paymentMethod, subtotal: (subtotal ?? total ?? 0).toString(), deliveryFee: deliveryFee.toString(),
          expressFee: expressFee.toString(), discount: appliedDiscount.toString(),
          vatAmount: vatAmount.toString(), total: finalTotal.toString(),
          totalUSD: totalUSD?.toString(), isExpress, promoCodeId: promoResult ? promoResult.promo.id : null,
          status: 'paid',
        }, items);
      } catch (err) {
        // Never burn a promo use or a customer's points when the order could not
        // be stored.
        if (promoResult) await storage.releasePromoUse(promoResult.promo.id, sess.userId).catch(() => {});
        await refundLoyaltyRedemption(sess.userId, redemption);
        throw err;
      }
      if (promoResult) await storage.attachPromoRedemption(promoResult.redemptionId, order.id);
      if (redemption.entryId) await storage.attachLoyaltyOrder(redemption.entryId, order.id);

      if (slotId) await storage.incrementSlotUsed(slotId);

      await creditLoyaltyEarn(sess.userId, order.id, order.orderNumber, finalTotal);

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
      const { items, recipientName, recipientPhone, address, cityId, slotDate, slotTime, cardMessage, paymentMethod, subtotal, deliveryFee, expressFee, discount, total, totalUSD, isExpress, redeemPoints } = req.body;

      const defaultCity = await storage.getCities().then(cities => cities[0]);
      const resolvedCityId = cityId || defaultCity?.id;

      const orderAmount = parseFloat(subtotal ?? total ?? 0) || 0;
      const promoResult: any = await redeemPromoForOrder({ body: req.body, orderAmount, userId: user.id, categoryIds: req.body.categoryIds });
      if (promoResult?.error) return res.status(promoResult.status || 400).json({ error: promoResult.error });

      const promoDiscount = promoResult ? promoResult.discount : (parseFloat(discount ?? 0) || 0);
      // Points are charged before the order is written, so a checkout can never
      // walk away with a loyalty discount that was not paid for. Whatever the
      // promo already took off is no longer available to the redemption.
      const redemption = await chargeLoyaltyRedemption(user.id, redeemPoints, orderAmount - promoDiscount);
      const serverDiscount = round2(promoDiscount + redemption.discount);
      const { clientDiscount, appliedDiscount, finalTotal, source } = reconcileDiscount(req.body, serverDiscount);
      if (!promoResult && clientDiscount > 0) {
        console.warn('[promo] /api/orders/app got a discount without any promo reference. body keys: ' + Object.keys(req.body || {}).join(','));
      }
      if (source === 'components') {
        console.warn('[promo] /api/orders/app total rebuilt from order components (client total/discount were inconsistent).');
      }

      let order: any;
      try {
        order = await storage.createOrder({
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
          discount: appliedDiscount.toString(),
          vatAmount: '0',
          total: finalTotal.toString(),
          totalUSD: totalUSD?.toString(),
          isExpress: isExpress || false,
          promoCodeId: promoResult ? promoResult.promo.id : null,
          status: 'paid',
        }, items);
      } catch (err) {
        // Never burn a promo use or a customer's points when the order could not
        // be stored.
        if (promoResult) await storage.releasePromoUse(promoResult.promo.id, user.id).catch(() => {});
        await refundLoyaltyRedemption(user.id, redemption);
        throw err;
      }
      if (promoResult) await storage.attachPromoRedemption(promoResult.redemptionId, order.id);
      if (redemption.entryId) await storage.attachLoyaltyOrder(redemption.entryId, order.id);

      await creditLoyaltyEarn(user.id, order.id, order.orderNumber, finalTotal);

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

  // Loyalty for the app: the balance plus the ratio the admin panel currently
  // has configured, so the checkout screen can show what the points are worth
  // without hardcoding a number. Redemption itself goes through `redeemPoints`
  // on POST /api/orders/app.
  app.get('/api/loyalty/app', appAuth, async (req, res) => {
    try {
      const user = (req as any).appUser;
      const [config, ledger] = await Promise.all([
        storage.getLoyaltyConfig(),
        storage.getLoyaltyLedger(user.id),
      ]);
      res.json({
        points: user?.loyaltyPoints || 0,
        redemptionEnabled: redemptionReady(config),
        pointsPerUnit: config?.pointsPerUnit ?? null,
        pointValue: config?.pointValue ?? null,
        earnType: config?.earnType ?? null,
        earnValue: config?.earnValue ?? null,
        ledger,
      });
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

  app.get('/api/admin/orders/:id/receipt', adminAuth, async (req, res) => {
    try {
      const order = await storage.getOrder((req.params.id as string));
      if (!order) return res.status(404).json({ error: 'Not found' });
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(renderReceiptHtml(order));
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

  app.delete('/api/admin/drivers/:id', adminAuth, async (req, res) => {
    try { res.json(await storage.deleteDriver((req.params.id as string))); }
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
    try { res.json(await storage.createPromoCode(withDefaultMaxUses(req.body))); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/admin/promos/:id', adminAuth, async (req, res) => {
    try { res.json(await storage.updatePromoCode((req.params.id as string), withDefaultMaxUses(req.body))); }
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
        if (result.notConfigured || result.code === 133010) {
          if (orderId) {
            const sess = req.session as any;
            await storage.addWhatsappLog({
              orderId,
              templateUsed: 'Direct Message',
              outcome: 'pending',
              notes: message,
              createdBy: sess.userId,
            });
          }
          return res.json({ success: true, pending: true, message: 'WhatsApp not ready yet — message saved as pending' });
        }
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

  app.post('/api/admin/whatsapp/send-template', adminAuth, async (req, res) => {
    try {
      const { orderId, templateId, target } = req.body;
      const order = await storage.getOrder(orderId);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      const template = await storage.getWhatsappTemplateById(templateId);
      if (!template) return res.status(404).json({ error: 'Template not found' });

      const phone = target === 'sender' ? order.sender?.phone : order.recipientPhone;
      if (!phone) return res.status(400).json({ error: 'No phone available for this target' });

      const vars: Record<string, string> = {
        orderNumber: order.orderNumber,
        order_number: order.orderNumber,
        recipientName: order.recipientName || '',
        recipient_name: order.recipientName || '',
        recipientPhone: order.recipientPhone || '',
        recipient_phone: order.recipientPhone || '',
        senderName: order.sender?.nameEn || '',
        sender_name: order.sender?.nameEn || '',
        senderPhone: order.sender?.phone || '',
        sender_phone: order.sender?.phone || '',
        total: order.total,
      };
      const body = (template.bodyEn || '').replace(/\{(\w+)\}/g, (m: string, k: string) => vars[k] ?? m);

      const result = await sendWhatsAppMessage(phone, body);
      const sess = req.session as any;
      if (!result.success) {
        if (result.notConfigured || result.code === 133010) {
          await storage.addWhatsappLog({
            orderId,
            templateUsed: template.nameEn,
            outcome: 'pending',
            notes: body,
            language: 'en',
            createdBy: sess.userId,
          });
          return res.json({ success: true, pending: true, message: 'WhatsApp not ready yet — message saved as pending' });
        }
        return res.status(500).json({ error: 'Failed to send WhatsApp message' });
      }

      await storage.addWhatsappLog({
        orderId,
        templateUsed: template.nameEn,
        outcome: 'sent',
        notes: body,
        language: 'en',
        createdBy: sess.userId,
      });
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

  // ───── ADMIN: CONTENT PAGES ─────
  app.get('/api/admin/content', adminAuth, async (_req, res) => {
    try { res.json(await storage.getContentPages()); }
    catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/admin/content', adminAuth, async (req, res) => {
    try {
      const { slug, titleEn, titleAr, bodyEn, bodyAr, contactPhone, contactEmail, contactWhatsapp, sortOrder, isActive } = req.body;
      if (!slug?.trim()) return res.status(400).json({ error: 'Slug is required' });
      if (!titleEn?.trim() || !titleAr?.trim()) return res.status(400).json({ error: 'English and Arabic titles are required' });
      const already = await storage.getContentPage(slug, false);
      if (already) return res.status(409).json({ error: 'A page with this slug already exists' });
      const page = await storage.createContentPage({
        slug: slug.trim().toLowerCase(), titleEn, titleAr,
        bodyEn: bodyEn || '', bodyAr: bodyAr || '',
        contactPhone: contactPhone || null, contactEmail: contactEmail || null, contactWhatsapp: contactWhatsapp || null,
        sortOrder: sortOrder ?? 0, isActive: isActive !== false,
      });
      res.json(page);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.put('/api/admin/content/:slug', adminAuth, async (req, res) => {
    try {
      const patch: any = {};
      ['titleEn', 'titleAr', 'bodyEn', 'bodyAr', 'contactPhone', 'contactEmail', 'contactWhatsapp', 'sortOrder', 'isActive']
        .forEach(k => { if (req.body[k] !== undefined) patch[k] = req.body[k]; });
      const page = await storage.updateContentPage((req.params.slug as string), patch);
      if (!page) return res.status(404).json({ error: 'Page not found' });
      res.json(page);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });
}
