import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginId = "vite-todo";

export default defineConfig({
  plugins: [react()],
  base: `/api/plugins/${pluginId}/assets/admin/app/`,
  build: {
    outDir: path.resolve(__dirname, "../admin/app"),
    emptyOutDir: true,
    rollupOptions: {
      // Keep pages.json when cleaning admin/
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
      },
    },
  },
});
