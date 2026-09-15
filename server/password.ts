import crypto from "crypto";

// Password hashing for customer accounts (mobile app sign-up / sign-in).
// Uses Node's built-in scrypt so no native dependency is required.
// Stored format: scrypt$<saltHex>$<derivedKeyHex>

const KEY_LENGTH = 64;
const PREFIX = "scrypt";

export const MIN_PASSWORD_LENGTH = 6;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH);
  return `${PREFIX}$${salt.toString("hex")}$${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== PREFIX) return false;

  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  if (!salt.length || !expected.length) return false;

  const derived = crypto.scryptSync(password, salt, expected.length);
  if (derived.length !== expected.length) return false;
  return crypto.timingSafeEqual(derived, expected);
}

// Returns an error message, or null when the password is acceptable.
export function validatePasswordStrength(password: unknown): string | null {
  if (typeof password !== "string" || !password) return "Password is required";
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  return null;
}

// Verification-code length depends on where the code is typed:
//   app   - the mobile screen uses a 4-box design, so codes are 4 digits
//   admin - the admin panel keeps its 6-digit codes
// OTP_LENGTH_APP / OTP_LENGTH_ADMIN override the defaults; the legacy OTP_LENGTH
// still applies to the admin panel so older deployments keep working.
export type OtpChannel = "app" | "admin";

const DEFAULT_OTP_LENGTH: Record<OtpChannel, number> = { app: 4, admin: 6 };

function validOtpLength(value: unknown): number | null {
  const raw = Number(value);
  return Number.isInteger(raw) && raw >= 4 && raw <= 8 ? raw : null;
}

export function otpLength(channel: OtpChannel = "app"): number {
  const scoped = validOtpLength(
    channel === "admin" ? process.env.OTP_LENGTH_ADMIN : process.env.OTP_LENGTH_APP,
  );
  if (scoped) return scoped;
  if (channel === "admin") {
    const legacy = validOtpLength(process.env.OTP_LENGTH);
    if (legacy) return legacy;
  }
  return DEFAULT_OTP_LENGTH[channel];
}

// Staging convenience: a fixed code can be configured per channel. The legacy
// DEFAULT_OTP still applies so existing test logins keep working.
export function defaultOtp(channel: OtpChannel): string | undefined {
  const scoped = channel === "admin" ? process.env.DEFAULT_OTP_ADMIN : process.env.DEFAULT_OTP_APP;
  return scoped || process.env.DEFAULT_OTP || undefined;
}

export function generateNumericCode(length = otpLength()): string {
  let out = "";
  while (out.length < length) {
    out += crypto.randomInt(0, 10).toString();
  }
  return out;
}
