import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { env } from "../config/env.js";

let io = null;

const parseCookies = (header = "") =>
  Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim().split("="))
      .filter(([key, val]) => key && val)
      .map(([key, ...rest]) => [key, decodeURIComponent(rest.join("="))])
  );

// Real-time notifications.
// Each logged-in browser joins a private "room" named after the user, so we can
// send a notification to exactly one person.
export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: env.clientUrl, credentials: true },
  });

  // Only logged-in users can connect (same cookie as the API)
  io.use(async (socket, next) => {
    try {
      const token = parseCookies(socket.handshake.headers.cookie).accessToken;
      if (!token) return next(new Error("NOT_AUTHENTICATED"));
      const payload = jwt.verify(token, env.jwtAccessSecret, { algorithms: ["HS256"] });
      const user = await User.findById(payload.sub).select("role isActive isEmailVerified");
      if (!user || !user.isActive || !user.isEmailVerified) return next(new Error("NOT_AUTHENTICATED"));
      socket.data.userId = String(user._id);
      socket.data.role = user.role;
      next();
    } catch {
      next(new Error("NOT_AUTHENTICATED"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(`user:${socket.data.userId}`);
    socket.join(`role:${socket.data.role}`);
  });

  return io;
};

export const emitToUser = (userId, event, data) => {
  if (io) io.to(`user:${String(userId)}`).emit(event, data);
};
