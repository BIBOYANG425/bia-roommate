import { defineConfig } from "vitest/config";
import path from "path";
import { existsSync } from "node:fs";

// Local-only shim: this checkout has deps relocated under node_modules/.ignored/.
// On CI (clean install) the path doesn't exist, so the alias is omitted and
// @supabase/supabase-js resolves normally from node_modules.
const ignoredSupabase = path.resolve(
  __dirname,
  "node_modules/.ignored/@supabase/supabase-js/dist/index.mjs",
);
const localAlias = existsSync(ignoredSupabase)
  ? { "@supabase/supabase-js": ignoredSupabase }
  : {};

export default defineConfig({
  test: {
    include: ["**/__tests__/**/*.test.ts", "app/**/*.test.ts", "lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      ...localAlias,
    },
  },
});
