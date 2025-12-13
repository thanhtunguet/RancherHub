import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { ViteReactSSG } from "vite-react-ssg/plugin";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    ViteReactSSG({
      script: "async",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/auth": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
  ssgOptions: {
    formatting: "minify",
    crittersOptions: {
      reduceInlineStyles: false,
    },
  },
});
