import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    server: { entry: "server" },
  },
  // Build a self-contained Node HTTP server (.output/server/index.mjs) for the VPS.
  nitro: { preset: "node-server" },
});
