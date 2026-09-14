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

// Digits used by the verification-code screens. Length is configurable so the
// 4-box design and the existing 6-digit codes can both be supported.
export function otpLength(): number {
  const raw = Number(process.env.OTP_LENGTH);
  return Number.isInteger(raw) && raw >= 4 && raw <= 8 ? raw : 6;
}

export function generateNumericCode(length = otpLength()): string {
  let out = "";
  while (out.length < length) {
    out += crypto.randomInt(0, 10).toString();
  }
  return out;
}
