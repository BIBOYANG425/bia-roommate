# BIA Course Helper (Chrome extension)

Chrome MV3 extension for USC WebReg / Classes: RMP badges, seat counts, conflict highlights, schedule optimizer, and interest-based course discovery. Uses the BIA API at `bia-roommate.vercel.app`.

## Build

```bash
cd extension
npm install
npm run build
```

Load **unpacked** from `extension/dist/` in `chrome://extensions` (Developer mode).

## Store package

Zip the **contents** of `dist/` (select files inside `dist`, not the folder itself), upload to Chrome Web Store. Version lives in `manifest.json`, `package.json`, `vite.config.ts` (generated manifest), and `EXTENSION_VERSION` in `src/shared/constants.ts`.

## Permissions

- `storage`: settings and caches.
- `host_permissions`: `webreg.usc.edu`, `classes.usc.edu`, BIA API only. Do not add `activeTab` unless you use `chrome.tabs` / `chrome.scripting` with a user gesture.

## Layout

| Path | Role |
|------|------|
| `src/content/` | Content scripts (RMP, seats, conflicts, schedule reader) |
| `src/background/` | Service worker, API fetch, LRU caches |
| `src/popup/` | React popup UI |
