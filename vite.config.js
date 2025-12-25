import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8")
);

export default defineConfig({
  base: "./", // 🔥 КРИТИЧНО для Electron

  plugins: [react()],

  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },

  // ✅ FIX: всегда один порт для wait-on/electron
  server: {
    port: 5173,
    strictPort: true,

    // ✅ ПРОКСИ ДЛЯ AI/Backend API
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001", // <-- порт твоего backend (поменяй если другой)
        changeOrigin: true,
        secure: false
      }
    }
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
