import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    include: [
      "**/__tests__/**/*.test.ts",
      "**/__tests__/**/*.test.tsx",
      "app/**/*.test.ts",
      "lib/**/*.test.ts",
    ],
    // Default node env keeps the existing backend tests unchanged; component
    // tests opt into jsdom per-file via `// @vitest-environment jsdom`.
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
