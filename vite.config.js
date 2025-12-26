import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Universal Vite config (Web + Electron)
 * - Web (Render): base "/"
 * - Electron (file://): base "./" via VITE_ELECTRON_BUILD=1
 * - Fixes APP_VERSION crash in production
 */
export default defineConfig(() => {
  const isElectronBuild = process.env.VITE_ELECTRON_BUILD === "1";
  const apiUrl = process.env.VITE_API_URL;

  return {
    plugins: [react()],

    // 🔴 ВАЖНО: фикс путей для Electron
    base: isElectronBuild ? "./" : "/",

    // 🔥 ФИКС СИНЕГО ЭКРАНА
    // теперь APP_VERSION всегда существует
    define: {
      APP_VERSION: JSON.stringify(process.env.npm_package_version),
    },

    server: {
      port: 5173,
      strictPort: true,
      proxy:
        apiUrl
          ? undefined
          : {
              "/api": {
                target: "http://127.0.0.1:3001",
                changeOrigin: true,
              },
            },
    },

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
