import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

// Idempotent schema safety net.
//
// The deploy workflow runs `drizzle-kit push || true`. When push stops on an
// interactive prompt (it currently does, over an unrelated pre-existing
// content_pages constraint-name difference) the `|| true` hides the failure and
// the new columns would never be created, breaking sign-up at runtime.
// These statements are additive and safe to repeat on every boot.
const REQUIRED_SCHEMA_STATEMENTS = [
  `ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS password_hash text`,
  `ALTER TABLE IF EXISTS otp_codes ADD COLUMN IF NOT EXISTS email text`,
  `ALTER TABLE IF EXISTS otp_codes ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'login'`,
  `ALTER TABLE IF EXISTS otp_codes ALTER COLUMN phone DROP NOT NULL`,
  `ALTER TABLE IF EXISTS loyalty_config ADD COLUMN IF NOT EXISTS point_value numeric(10,2) NOT NULL DEFAULT '10'`,
  // drizzle-kit push stops before it reaches this table, so every order that
  // carried a promo code failed with `relation "promo_redemptions" does not
  // exist`. The unique index is not optional: the claim relies on ON CONFLICT.
  `CREATE TABLE IF NOT EXISTS promo_redemptions (
     id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
     promo_code_id varchar NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
     user_id varchar NOT NULL REFERENCES users(id),
     order_id varchar REFERENCES orders(id) ON DELETE SET NULL,
     created_at timestamp NOT NULL DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS promo_redemptions_promo_user_unique ON promo_redemptions (promo_code_id, user_id)`,
  `CREATE INDEX IF NOT EXISTS promo_redemptions_promo_idx ON promo_redemptions (promo_code_id)`,
];

export async function ensureSchema(): Promise<void> {
  for (const statement of REQUIRED_SCHEMA_STATEMENTS) {
    try {
      await pool.query(statement);
    } catch (error: any) {
      console.error(`[SCHEMA] Failed: ${statement} -> ${error.message}`);
    }
  }
}
