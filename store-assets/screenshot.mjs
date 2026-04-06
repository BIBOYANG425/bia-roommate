import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Chrome Web Store: 1280x800 or 640x400
  await page.setViewport({ width: 640, height: 400, deviceScaleFactor: 2 });

  const pages = [
    { file: 'mockup-optimizer.html', name: 'screenshot-optimizer.png', w: 640, h: 400 },
    { file: 'mockup-discover.html', name: 'screenshot-discover.png', w: 640, h: 400 },
    { file: 'mockup-settings.html', name: 'screenshot-settings.png', w: 640, h: 400 },
    { file: 'mockup-promo.html', name: 'promo-tile.png', w: 440, h: 280 },
  ];

  for (const p of pages) {
    await page.setViewport({ width: p.w, height: p.h, deviceScaleFactor: 2 });
    const filePath = resolve(__dirname, p.file);
    await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0' });
    await page.screenshot({
      path: resolve(__dirname, p.name),
      type: 'png',
    });
    console.log(`Saved ${p.name}`);
  }

  await browser.close();
  console.log('Done! Screenshots saved to store-assets/');
}

main().catch(console.error);
