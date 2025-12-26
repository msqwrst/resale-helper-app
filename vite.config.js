import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Universal Vite config
 * - Web (Render): base "/"
 * - Electron (file://): base "./"
 * - Correct env handling
 */

export default defineConfig(({ mode }) => {
  // ⬇️ Гарантированно загружаем .env
  const env = loadEnv(mode, process.cwd(), "");

  const isElectronBuild = env.VITE_ELECTRON_BUILD === "1";

  return {
    plugins: [react()],

    // 🔴 КРИТИЧНО ДЛЯ ELECTRON
    base: isElectronBuild ? "./" : "/",

    // 🔴 ФИКС ENV + APP_VERSION
    define: {
      APP_VERSION: JSON.stringify(process.env.npm_package_version),
      "process.env": env,
    },

    server: {
      port: 5173,
      strictPort: true,

      // proxy нужен ТОЛЬКО если нет API_URL
      proxy: env.VITE_API_URL
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

    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
