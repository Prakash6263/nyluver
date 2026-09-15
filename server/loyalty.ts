// Loyalty maths, shared by every order entry point.
//
// Earning is configurable from the admin panel:
//   earnType "percentage" -> earnValue% of what the customer actually pays
//   earnType "fixed"      -> earnValue points per order
//
// The redemption rate is NOT configurable. The client fixed it at
// 1 point = 0.1 LYD (100 points = 10 LYD), so it lives here as a constant
// instead of a database column. The old loyalty_config columns that used to
// hold it (points_per_unit / point_value) are left in place but ignored.
//
// Keeping the arithmetic here means the web checkout, the app checkout and the
// admin panel all follow the same rules instead of drifting apart.

// The client's fixed rate: 100 points are worth 10 LYD.
export const POINTS_PER_UNIT = 100;
export const UNIT_VALUE_LYD = 10;
// Derived: it takes 10 points to buy 1 LYD, so one point is worth 0.1 LYD.
export const POINTS_PER_LYD = POINTS_PER_UNIT / UNIT_VALUE_LYD;
export const POINT_VALUE_LYD = UNIT_VALUE_LYD / POINTS_PER_UNIT;

export interface LoyaltyConfigLike {
  earnType?: string | null;
  earnValue?: string | number | null;
  redemptionEnabled?: boolean | null;
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
export function pointsValue(points: number): number {
  if (points <= 0) return 0;
  return round2(points / POINTS_PER_LYD);
}

// Largest whole number of points whose value stays within `value`. The rounding
// is trimmed first so that float noise (0.3 * 10 = 2.9999...) cannot cost the
// customer a point.
export function maxPointsForValue(value: number): number {
  if (value <= 0) return 0;
  return Math.max(0, Math.floor(Number((value * POINTS_PER_LYD).toFixed(6))));
}

// Redemption only depends on the admin switching it on; the rate is fixed.
export function redemptionReady(config: LoyaltyConfigLike | null | undefined): boolean {
  return config?.redemptionEnabled === true;
}

// Works out how many of the requested points can actually be spent on an order
// that still has `discountRoom` worth of value left after any promo discount.
// The result never asks for more points than the balance or the room allows.
export function planRedemption(
  balance: number,
  requestedPoints: unknown,
  discountRoom: number,
): RedemptionPlan {
  const none: RedemptionPlan = { points: 0, discount: 0 };

  const room = round2(num(discountRoom));
  if (room <= 0) return none;

  let points = Math.floor(num(requestedPoints));
  if (points <= 0) return none;

  points = Math.min(points, Math.floor(num(balance)), maxPointsForValue(room));
  if (points <= 0) return none;

  let discount = pointsValue(points);
  if (discount > room) {
    // Rounding can push the value a hair above the room; give the point back.
    points -= 1;
    discount = pointsValue(points);
  }
  if (points <= 0 || discount <= 0) return none;
  if (discount > room) discount = room;
  return { points, discount };
}