import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  build: {
    chunkSizeWarningLimit: 3500
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      "/api/tj": {
        target: "https://tijeapi.transjakarta.co.id/v1",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tj/, ""),
        secure: false,
        headers: {
          "x-app-version": "2.11.0",
          "x-lang": "id",
          "x-app-os": "android",
          "x-app-os-version": "12",
          "x-app-platform": "32",
          "x-device-model": "Samsung|SM-F741N",
          "User-Agent": "okhttp/4.12.0"
        }
      }
    }
  }
});
