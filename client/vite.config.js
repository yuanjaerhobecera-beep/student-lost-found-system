import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The "proxy" sends /api, /uploads and /socket.io requests from the React dev server (5173)
// to the Express backend (5000). The browser thinks everything comes from one address,
// so secure cookies work without extra setup.
export default defineConfig({
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1500 },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:5000",
      "/uploads": "http://localhost:5000",
      "/socket.io": { target: "http://localhost:5000", ws: true },
    },
  },
});
