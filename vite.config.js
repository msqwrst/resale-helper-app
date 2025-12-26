import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Render / Web-friendly Vite config
 * - In production (static site) uses base "/"
 * - In Electron file:// builds you can set VITE_ELECTRON_BUILD=1 to keep base "./"
 * - Dev proxy only used when VITE_API_URL is NOT set (so Render prod won't depend on localhost)
 */
export default defineConfig(({ mode }) => {
  const isElectronBuild = process.env.VITE_ELECTRON_BUILD === "1";
  const apiUrl = process.env.VITE_API_URL; // optional at build time

  return {
    plugins: [react()],
    base: isElectronBuild ? "./" : "/",
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
