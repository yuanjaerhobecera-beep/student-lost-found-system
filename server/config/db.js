import dns from "node:dns";
import mongoose from "mongoose";
import { env } from "./env.js";

// Optional: use specific DNS servers to find the Atlas cluster.
// Fixes "querySrv ECONNREFUSED" errors on some Windows setups / networks.
if (env.dnsServers.length > 0) {
  dns.setServers(env.dnsServers);
}

// Connects the backend to MongoDB Atlas
const connectDB = async () => {
  if (!env.mongoUri) {
    console.error("❌ MONGO_URI is missing. Add your connection string to server/.env");
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(env.mongoUri, { dbName: env.dbName });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    console.log(`📁 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);

    if (error.message.includes("querySrv")) {
      console.error(
        "💡 DNS problem: your network could not look up the Atlas cluster.\n" +
          "   Try the 'standard connection string' fix in README.md (Troubleshooting)."
      );
    } else if (/auth/i.test(error.message)) {
      console.error("💡 Check the database username/password in MONGO_URI (no < > brackets).");
    } else if (/whitelist|not authorized|ServerSelection/i.test(error.message)) {
      console.error("💡 Check Atlas > Network Access. Your current IP address may need to be added.");
    }
    process.exit(1);
  }
};

let closingOnPurpose = false;

mongoose.connection.on("disconnected", () => {
  if (!closingOnPurpose) console.warn("⚠️  MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  console.log("🔄 MongoDB reconnected");
});

// Used by scripts (seed, db:test) to close the connection quietly
export const disconnectDB = async () => {
  closingOnPurpose = true;
  await mongoose.disconnect();
};

export default connectDB;
