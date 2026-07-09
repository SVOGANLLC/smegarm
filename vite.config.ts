import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv } from "vite";

const env = loadEnv(process.env.NODE_ENV === "production" ? "production" : "development", process.cwd(), "");
const apiTarget = (env.VITE_SUPABASE_URL || "https://smeg.am").replace(/\/$/, "");
const apiProxy = {
  target: apiTarget,
  changeOrigin: true,
  secure: true,
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
  // Build a self-contained Node HTTP server (.output/server/index.mjs) for the VPS.
  nitro: {
    preset: "node-server",
    routeRules: {
      "/assets/**": {
        headers: { "cache-control": "public, max-age=31536000, immutable" },
      },
      "/**": {
        headers: { "cache-control": "no-store, must-revalidate" },
      },
    },
  },
  // Local dev: mirror production nginx — Supabase API on same origin as the app.
  vite: {
    server: {
      proxy: {
        "/rest/v1": apiProxy,
        "/auth/v1": apiProxy,
        "/storage/v1": apiProxy,
      },
    },
  },
});
