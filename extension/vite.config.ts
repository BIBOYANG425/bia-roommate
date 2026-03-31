import { defineConfig, build, type Plugin } from 'vite'
import { resolve } from 'path'
import { writeFileSync, mkdirSync, copyFileSync, existsSync } from 'fs'

// Build content script and service worker separately as IIFE (no ES module imports)
function buildNonModuleEntries(): Plugin {
  return {
    name: 'build-non-module-entries',
    async closeBundle() {
      const distDir = resolve(__dirname, 'dist')

      // Build content script as IIFE (content scripts can't use ES modules)
      await build({
        configFile: false,
        build: {
          outDir: resolve(distDir, 'content'),
          emptyOutDir: false,
          lib: {
            entry: resolve(__dirname, 'src/content/index.ts'),
            formats: ['iife'],
            name: 'BIAContent',
            fileName: () => 'index.js',
          },
          rollupOptions: {
            output: { extend: true },
          },
          target: 'esnext',
          minify: false,
        },
        resolve: {
          alias: { '@shared': resolve(__dirname, 'src/shared') },
        },
      })

      // Build service worker as IIFE (safer for MV3 ephemeral lifecycle)
      await build({
        configFile: false,
        build: {
          outDir: resolve(distDir, 'background'),
          emptyOutDir: false,
          lib: {
            entry: resolve(__dirname, 'src/background/service-worker.ts'),
            formats: ['iife'],
            name: 'BIAWorker',
            fileName: () => 'service-worker.js',
          },
          rollupOptions: {
            output: { extend: true },
          },
          target: 'esnext',
          minify: false,
        },
        resolve: {
          alias: { '@shared': resolve(__dirname, 'src/shared') },
        },
      })

      // Copy icons to dist
      const iconsDir = resolve(__dirname, 'icons')
      const distIconsDir = resolve(distDir, 'icons')
      mkdirSync(distIconsDir, { recursive: true })
      for (const size of ['16', '48', '128']) {
        const iconSrc = resolve(iconsDir, `icon-${size}.png`)
        if (existsSync(iconSrc)) {
          copyFileSync(iconSrc, resolve(distIconsDir, `icon-${size}.png`))
        }
      }

      // Generate production manifest.json
      const manifest = {
        manifest_version: 3,
        name: 'BIA Course Helper',
        version: '1.0.0',
        description: 'RMP ratings, schedule optimization, and course discovery for USC students — by BIA',
        permissions: ['storage', 'activeTab'],
        host_permissions: [
          'https://webreg.usc.edu/*',
          'https://classes.usc.edu/*',
          'https://bia-roommate.vercel.app/*',
        ],
        background: {
          service_worker: 'background/service-worker.js',
        },
        content_scripts: [
          {
            matches: ['https://webreg.usc.edu/*', 'https://classes.usc.edu/*'],
            js: ['content/index.js'],
            css: ['content/styles.css'],
            run_at: 'document_idle',
          },
        ],
        action: {
          default_popup: 'popup.html',
          default_icon: {
            '16': 'icons/icon-16.png',
            '48': 'icons/icon-48.png',
            '128': 'icons/icon-128.png',
          },
        },
        icons: {
          '16': 'icons/icon-16.png',
          '48': 'icons/icon-48.png',
          '128': 'icons/icon-128.png',
        },
      }

      writeFileSync(resolve(distDir, 'manifest.json'), JSON.stringify(manifest, null, 2))

      // Copy content script CSS
      const contentCss = resolve(__dirname, 'src/content/styles.css')
      mkdirSync(resolve(distDir, 'content'), { recursive: true })
      if (existsSync(contentCss)) {
        copyFileSync(contentCss, resolve(distDir, 'content/styles.css'))
      }

      console.log('  ✓ content/index.js built as IIFE')
      console.log('  ✓ background/service-worker.js built as IIFE')
      console.log('  ✓ manifest.json written to dist/')
      console.log('  ✓ content/styles.css copied to dist/')
    },
  }
}

export default defineConfig({
  plugins: [buildNonModuleEntries()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
      },
      output: {
        // Popup can use ES modules (loaded in extension page)
        entryFileNames: 'popup/[name].js',
        chunkFileNames: 'popup/[name]-[hash].js',
        assetFileNames: 'popup/[name][extname]',
      },
    },
    target: 'esnext',
    minify: false,
  },
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
})
