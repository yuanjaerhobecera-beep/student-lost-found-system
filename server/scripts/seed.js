// Creates the first admin account, default categories, and campus locations.
// Run once:  npm run seed   (inside the server folder)
// Safe to run again: it skips anything that already exists.
import "dotenv/config";
import connectDB, { disconnectDB } from "../config/db.js";
import User from "../models/User.js";
import Category from "../models/Category.js";
import CampusLocation from "../models/CampusLocation.js";

const CATEGORIES = [
  ["Electronics", "Phones, laptops, chargers, earphones, calculators"],
  ["IDs and Cards", "School IDs, ATM cards, licenses"],
  ["Bags and Wallets", "Backpacks, pouches, wallets, purses"],
  ["Books and Notes", "Books, notebooks, modules, folders"],
  ["Clothing", "Jackets, uniforms, caps, shoes"],
  ["Accessories", "Watches, eyeglasses, jewelry, umbrellas"],
  ["Keys", "House keys, car keys, locker keys"],
  ["School Supplies", "Pens, rulers, art materials"],
  ["Water Bottles and Containers", "Tumblers, lunch boxes"],
  ["Others", "Anything that doesn't fit the other categories"],
];

const LOCATIONS = [
  ["Library", ""],
  ["Main Building", "Classrooms"],
  ["Science Building", "Laboratories"],
  ["Computer Laboratory", ""],
  ["Canteen", ""],
  ["Gymnasium", ""],
  ["Registrar's Office", ""],
  ["Guidance Office", ""],
  ["Main Gate", ""],
  ["Parking Area", ""],
  ["Covered Court", ""],
  ["Other Campus Area", ""],
];

const run = async () => {
  await connectDB();

  for (const [name, description] of CATEGORIES) {
    await Category.updateOne({ name }, { $setOnInsert: { name, description } }, { upsert: true });
  }
  console.log(`✅ ${CATEGORIES.length} categories ready`);

  for (const [name, description] of LOCATIONS) {
    await CampusLocation.updateOne({ name }, { $setOnInsert: { name, description } }, { upsert: true });
  }
  console.log(`✅ ${LOCATIONS.length} campus locations ready`);

  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log("⚠️  ADMIN_EMAIL / ADMIN_PASSWORD not set in .env - skipped creating the admin account.");
  } else if (await User.exists({ email: ADMIN_EMAIL.toLowerCase() })) {
    console.log(`ℹ️  Admin ${ADMIN_EMAIL} already exists - skipped.`);
  } else {
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(ADMIN_PASSWORD)) {
      console.error("❌ ADMIN_PASSWORD must be 8+ characters with uppercase, lowercase and a number.");
      process.exit(1);
    }
    await User.create({
      firstName: "System",
      lastName: "Administrator",
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role: "admin",
      isEmailVerified: true,
    });
    console.log(`✅ Admin account created: ${ADMIN_EMAIL}`);
    console.log("   👉 Remove ADMIN_PASSWORD from .env now, and change the password after your first login.");
  }

  await disconnectDB();
  console.log("🌱 Seeding finished.");
};

run().catch(async (err) => {
  console.error("❌ Seeding failed:", err.message);
  await disconnectDB();
  process.exit(1);
});
