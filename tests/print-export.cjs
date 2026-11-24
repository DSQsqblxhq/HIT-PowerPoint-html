// Print/PDF export is a documented feature ("one slide per landscape page"), so verify the
// real Chromium print path instead of only checking that the button exists.
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

(async () => {
  // CI uses Playwright's bundled Chromium; HIT_CHROME_CHANNEL=chrome reuses an installed
  // browser for local runs where the browser download is unavailable.
  const channel = process.env.HIT_CHROME_CHANNEL;
  const browser = await chromium.launch(channel ? { channel } : {});
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(__dirname, '..', 'HIT-HTML.html')).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const slides = await page.locator('#stage > .slide').count();
    await page.emulateMedia({ media: 'print' });

    const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
    const text = pdf.toString('latin1');
    const pages = [...text.matchAll(/\/Type\s*\/Page[^s]/g)].length;
    const box = /\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(text);
    assert.ok(box, 'the exported PDF must carry a MediaBox');
    const [width, height] = [Number(box[1]), Number(box[2])];

    assert.equal(pages, slides, `expected one page per slide (${slides}), got ${pages}`);
    // 16:9 at 96 dpi: 1920x1080 px == 1440x810 pt. Print must not fall back to Letter/A4.
    assert.ok(Math.abs(width - 1440) < 1, `expected a 1440pt page width, got ${width}`);
    assert.ok(Math.abs(height - 810) < 1, `expected an 810pt page height, got ${height}`);
    assert.deepEqual(errors, [], 'exporting must not raise page errors');
    console.log(`print export OK: ${pages} pages at ${width}x${height}pt (one per slide, 16:9)`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
