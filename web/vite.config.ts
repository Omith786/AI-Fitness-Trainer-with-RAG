import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The dev server proxies API calls to the Fastify backend so the frontend
// can run with hot-reload while still talking to the real RAG pipeline.
export default defineConfig({
  plugins: [react()],
  build: {
    // Fastify serves this directory as the production frontend.
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
});
