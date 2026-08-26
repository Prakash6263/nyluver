import { db } from "../server/db";
import * as s from "../shared/schema";

async function run() {
  try {
    await db.insert(s.users).values({
      phone: '+21823435445',
      email: 'prakash@gmail.com',
      role: 'customer',
      nameEn: 'Prakash',
      nameAr: 'براكاش',
      language: 'en',
      loyaltyPoints: 500,
    });
    console.log("Test user inserted successfully!");
  } catch (error: any) {
    console.error("Failed to insert test user:", error.message);
  }
  process.exit(0);
}

run();
