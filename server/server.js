// Load environment variables from server/.env (must be the first import)
import "dotenv/config";

import http from "node:http";
import { env, validateEnv } from "./config/env.js";
import connectDB from "./config/db.js";
import app from "./app.js";
import { initSocket } from "./services/socket.service.js";
import { isEmailConfigured } from "./services/email.service.js";
import { isCloudinaryConfigured } from "./services/upload.service.js";

validateEnv();

const startServer = async () => {
  // Connect to MongoDB FIRST, then start accepting requests
  await connectDB();

  const server = http.createServer(app);
  initSocket(server); // real-time notifications share the same port

  server.listen(env.port, () => {
    console.log(`🚀 Server running on http://localhost:${env.port}`);
    console.log(`📧 Email: ${isEmailConfigured() ? "SMTP configured" : "not configured (emails print in this terminal)"}`);
    console.log(`🖼️  Images: ${isCloudinaryConfigured() ? "Cloudinary" : "local uploads folder"}`);
  });
};

startServer();
