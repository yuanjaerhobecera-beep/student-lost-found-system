// Fix for "querySrv ECONNREFUSED" / "querySrv ENOTFOUND" errors.
//
// A "mongodb+srv://" connection string needs a special DNS lookup (SRV) that some
// networks and Windows setups block. This script does that lookup over HTTPS instead
// (Google / Cloudflare DNS), then rewrites MONGO_URI in your .env as a "standard"
// mongodb:// connection string that doesn't need the SRV lookup.
//
// Run inside the server folder:   npm run fix:dns
// A backup of your old .env is saved as .env.backup
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, "..", ".env");

const RESOLVERS = [
  (name, type) => `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
  (name, type) => `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`,
];

const lookup = async (name, type) => {
  for (const url of RESOLVERS) {
    try {
      const res = await fetch(url(name, type), { headers: { accept: "application/dns-json" } });
      if (!res.ok) continue;
      const json = await res.json();
      if (json.Status === 0 && json.Answer?.length) return json.Answer.map((a) => a.data);
    } catch {
      // try the next resolver
    }
  }
  return [];
};

const run = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI is missing in server/.env");
  if (!uri.startsWith("mongodb+srv://")) {
    console.log("ℹ️  MONGO_URI is already a standard mongodb:// string. Nothing to do.");
    return;
  }

  const url = new URL(uri);
  const host = url.hostname;
  console.log(`🔎 Looking up servers for ${host} over HTTPS...`);

  const srv = await lookup(`_mongodb._tcp.${host}`, "SRV");
  if (!srv.length) {
    throw new Error("Could not look up the cluster. Check your internet connection, or try a mobile hotspot.");
  }
  // Each answer looks like: "0 0 27017 ac-abc123-shard-00-00.xxxxx.mongodb.net."
  const hosts = srv.map((line) => {
    const [, , port, target] = line.trim().split(/\s+/);
    return `${target.replace(/\.$/, "")}:${port}`;
  });

  // The TXT record holds options like "authSource=admin&replicaSet=atlas-xxxx-shard-0"
  const txt = (await lookup(host, "TXT")).map((t) => t.replace(/"/g, "")).join("&");

  const params = new URLSearchParams(txt);
  params.set("tls", "true");
  for (const [key, value] of url.searchParams) params.set(key, value);
  if (!params.has("authSource")) params.set("authSource", "admin");

  const auth = url.username ? `${url.username}:${url.password}@` : "";
  const standardUri = `mongodb://${auth}${hosts.join(",")}/?${params.toString()}`;

  const env = fs.readFileSync(ENV_PATH, "utf8");
  fs.writeFileSync(`${ENV_PATH}.backup`, env);
  const updated = env.replace(/^MONGO_URI=.*$/m, `MONGO_URI=${standardUri}`);
  fs.writeFileSync(ENV_PATH, updated);

  console.log(`✅ Found ${hosts.length} servers:`);
  hosts.forEach((h) => console.log(`   - ${h}`));
  console.log("✅ MONGO_URI in .env was replaced with a standard connection string.");
  console.log("   (Your old .env was saved as .env.backup - it contains your password, don't share it.)");
  console.log("\n👉 Now run:  npm run db:test");
};

run().catch((err) => {
  console.error(`❌ ${err.message}`);
  process.exit(1);
});
