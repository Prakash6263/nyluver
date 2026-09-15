// Loyalty maths, shared by every order entry point.
//
// The admin panel owns the numbers:
//   earnType "percentage" -> earnValue% of what the customer actually pays
//   earnType "fixed"      -> earnValue points per order
//   pointsPerUnit + pointValue -> the redemption ratio, e.g. 100 points = 10 LYD
//
// Keeping the arithmetic here means the web checkout, the app checkout and the
// admin panel all follow the same rules instead of drifting apart.

export interface LoyaltyConfigLike {
  earnType?: string | null;
  earnValue?: string | number | null;
  redemptionEnabled?: boolean | null;
  pointsPerUnit?: string | number | null;
  pointValue?: string | number | null;
}

export interface RedemptionPlan {
  points: number;
  discount: number;
}

function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// Whole points earned by an order that was actually paid for.
export function pointsEarned(
  config: LoyaltyConfigLike | null | undefined,
  paidTotal: number,
): number {
  if (!config) return 0;
  const rate = num(config.earnValue);
  if (rate <= 0 || paidTotal <= 0) return 0;
  const earned = config.earnType === "fixed" ? rate : (paidTotal * rate) / 100;
  return Math.max(0, Math.floor(earned));
}

// What `points` are worth in order currency when redeemed.
export function pointsValue(
  config: LoyaltyConfigLike | null | undefined,
  points: number,
): number {
  if (!config || points <= 0) return 0;
  const perUnit = num(config.pointsPerUnit);
  const unitValue = num(config.pointValue);
  if (perUnit <= 0 || unitValue <= 0) return 0;
  return round2((points / perUnit) * unitValue);
}

// Largest whole number of points whose value stays within `value`. Used to trim
// a redemption so the discount can never exceed what is left on the order.
export function maxPointsForValue(
  config: LoyaltyConfigLike | null | undefined,
  value: number,
): number {
  if (!config || value <= 0) return 0;
  const perUnit = num(config.pointsPerUnit);
  const unitValue = num(config.pointValue);
  if (perUnit <= 0 || unitValue <= 0) return 0;
  return Math.max(0, Math.floor((value * perUnit) / unitValue));
}

// True when the admin has switched redemption on with a usable ratio.
export function redemptionReady(config: LoyaltyConfigLike | null | undefined): boolean {
  if (!config?.redemptionEnabled) return false;
  return num(config.pointsPerUnit) > 0 && num(config.pointValue) > 0;
}

// Works out how many of the requested points can actually be spent on an order
// that still has `discountRoom` worth of value left after any promo discount.
// The result never asks for more points than the balance or the room allows.
export function planRedemption(
  config: LoyaltyConfigLike | null | undefined,
  balance: number,
  requestedPoints: unknown,
  discountRoom: number,
): RedemptionPlan {
  const none: RedemptionPlan = { points: 0, discount: 0 };
  if (!redemptionReady(config)) return none;

  const room = round2(num(discountRoom));
  if (room <= 0) return none;

  let points = Math.floor(num(requestedPoints));
  if (points <= 0) return none;

  points = Math.min(points, Math.floor(num(balance)), maxPointsForValue(config, room));
  if (points <= 0) return none;

  let discount = pointsValue(config, points);
  if (discount > room) {
    // Rounding can push the value a hair above the room; give the point back.
    points -= 1;
    discount = pointsValue(config, points);
  }
  if (points <= 0 || discount <= 0) return none;
  if (discount > room) discount = room;
  return { points, discount };
}