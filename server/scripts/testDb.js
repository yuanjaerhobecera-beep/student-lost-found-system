// Tests the database connection with Create, Read, Update, Delete.
// Run:  npm run db:test   (inside the server folder)
import "dotenv/config";
import mongoose from "mongoose";
import connectDB, { disconnectDB } from "../config/db.js";

// A temporary collection used only for this test
const TestItem = mongoose.model(
  "ConnectionTest",
  new mongoose.Schema({ name: String, status: String }, { timestamps: true }),
  "connectionTests"
);

const run = async () => {
  await connectDB();

  const created = await TestItem.create({ name: "Sample umbrella", status: "open" });
  console.log("1️⃣  INSERT  ✅", created.name, created._id.toString());

  const found = await TestItem.findById(created._id);
  console.log("2️⃣  READ    ✅", found.name);

  found.status = "resolved";
  await found.save();
  const updated = await TestItem.findById(created._id);
  console.log("3️⃣  UPDATE  ✅ status is now", updated.status);

  await TestItem.deleteOne({ _id: created._id });
  const gone = await TestItem.findById(created._id);
  console.log("4️⃣  DELETE  ✅", gone === null ? "document removed" : "still exists?!");

  await mongoose.connection.db.dropCollection("connectionTests").catch(() => {});
  await disconnectDB();
  console.log("\n🎉 Database test passed! Your backend can talk to MongoDB.");
};

run().catch(async (err) => {
  console.error("❌ Test failed:", err.message);
  await disconnectDB();
  process.exit(1);
});
