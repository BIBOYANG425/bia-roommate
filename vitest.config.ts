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
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      react: path.resolve(__dirname, "node_modules/.ignored/react"),
      "react-dom": path.resolve(__dirname, "node_modules/.ignored/react-dom"),
      "react/jsx-dev-runtime": path.resolve(__dirname, "node_modules/.ignored/react/jsx-dev-runtime"),
      "react/jsx-runtime": path.resolve(__dirname, "node_modules/.ignored/react/jsx-runtime"),
      next: path.resolve(__dirname, "node_modules/.ignored/next"),
    },
  },
});
