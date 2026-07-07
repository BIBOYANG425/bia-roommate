import { defineConfig, build, type Plugin } from "vite";
import { resolve } from "path";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  existsSync,
} from "fs";

// Build content script and service worker separately as IIFE (no ES module imports)
function buildNonModuleEntries(): Plugin {
  return {
    name: "build-non-module-entries",
    async closeBundle() {
      const distDir = resolve(__dirname, "dist");

      // Build content script as IIFE (content scripts can't use ES modules)
      await build({
        configFile: false,
        build: {
          outDir: resolve(distDir, "content"),
          emptyOutDir: false,
          lib: {
            entry: resolve(__dirname, "src/content/index.ts"),
            formats: ["iife"],
            name: "BIAContent",
            fileName: () => "index.js",
          },
          rollupOptions: {
            output: { extend: true },
          },
          target: "esnext",
          minify: false,
        },
        resolve: {
          alias: { "@shared": resolve(__dirname, "src/shared") },
        },
      });

      // Build service worker as IIFE (safer for MV3 ephemeral lifecycle)
      await build({
        configFile: false,
        build: {
          outDir: resolve(distDir, "background"),
          emptyOutDir: false,
          lib: {
            entry: resolve(__dirname, "src/background/service-worker.ts"),
            formats: ["iife"],
            name: "BIAWorker",
            fileName: () => "service-worker.js",
          },
          rollupOptions: {
            output: { extend: true },
          },
          target: "esnext",
          minify: false,
        },
        resolve: {
          alias: { "@shared": resolve(__dirname, "src/shared") },
        },
      });

      // Copy icons to dist
      const iconsDir = resolve(__dirname, "icons");
      const distIconsDir = resolve(distDir, "icons");
      mkdirSync(distIconsDir, { recursive: true });
      for (const size of ["16", "48", "128"]) {
        const iconSrc = resolve(iconsDir, `icon-${size}.png`);
        if (existsSync(iconSrc)) {
          copyFileSync(iconSrc, resolve(distIconsDir, `icon-${size}.png`));
        }
      }

      // Generate the production manifest from the single sources of truth:
      //   • structure  → extension/manifest.json (source manifest)
      //   • version    → extension/package.json (npm-canonical)
      // Source-relative paths (src/*.ts) are rewritten to their built dist
      // equivalents, so there is no hand-maintained manifest literal to drift.
      const pkg = JSON.parse(
        readFileSync(resolve(__dirname, "package.json"), "utf-8"),
      ) as { version: string };
      const source = JSON.parse(
        readFileSync(resolve(__dirname, "manifest.json"), "utf-8"),
      ) as Record<string, unknown>;

      // src/foo/bar.ts → foo/bar.js ; src/foo/x.css → foo/x.css ; icons/* unchanged
      const toDistPath = (p: string): string =>
        p.replace(/^src\//, "").replace(/\.ts$/, ".js");

      const manifest: Record<string, unknown> = { ...source };
      manifest.version = pkg.version;

      const background = manifest.background as
        | { service_worker: string; type?: string }
        | undefined;
      if (background) {
        // Built as an IIFE (not an ES module) for the MV3 ephemeral lifecycle.
        const { type: _dropModuleType, ...rest } = background;
        manifest.background = {
          ...rest,
          service_worker: toDistPath(background.service_worker),
        };
      }

      if (Array.isArray(manifest.content_scripts)) {
        manifest.content_scripts = (
          manifest.content_scripts as Array<{
            js?: string[];
            css?: string[];
          }>
        ).map((cs) => ({
          ...cs,
          ...(Array.isArray(cs.js) ? { js: cs.js.map(toDistPath) } : {}),
          ...(Array.isArray(cs.css) ? { css: cs.css.map(toDistPath) } : {}),
        }));
      }

      writeFileSync(
        resolve(distDir, "manifest.json"),
        JSON.stringify(manifest, null, 2),
      );

      // Copy content script CSS
      const contentCss = resolve(__dirname, "src/content/styles.css");
      mkdirSync(resolve(distDir, "content"), { recursive: true });
      if (existsSync(contentCss)) {
        copyFileSync(contentCss, resolve(distDir, "content/styles.css"));
      }

      console.log("  ✓ content/index.js built as IIFE");
      console.log("  ✓ background/service-worker.js built as IIFE");
      console.log("  ✓ manifest.json written to dist/");
      console.log("  ✓ content/styles.css copied to dist/");
    },
  };
}

export default defineConfig({
  plugins: [buildNonModuleEntries()],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
      },
      output: {
        // Popup can use ES modules (loaded in extension page)
        entryFileNames: "popup/[name].js",
        chunkFileNames: "popup/[name]-[hash].js",
        assetFileNames: "popup/[name][extname]",
      },
    },
    target: "esnext",
    minify: false,
  },
  resolve: {
    alias: {
      "@shared": resolve(__dirname, "src/shared"),
    },
  },
});
