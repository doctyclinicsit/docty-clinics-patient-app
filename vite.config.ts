import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/consultation-relay": {
        target: "http://127.0.0.1:4174",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/consultation-relay/, ""),
      },
      "/eka-public": {
        target: "https://www.eka.care",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/eka-public/, ""),
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
