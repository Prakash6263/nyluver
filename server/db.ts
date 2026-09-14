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
