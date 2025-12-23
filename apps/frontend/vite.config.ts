import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
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
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate React and related libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // Separate Ant Design into its own chunk
          'antd-vendor': ['antd', '@ant-design/icons'],
          // Monaco Editor - large dependency
          'monaco-vendor': ['@monaco-editor/react', 'monaco-editor'],
          // Other utilities
          'utils-vendor': ['axios', 'dayjs', '@tanstack/react-query', 'zustand'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
