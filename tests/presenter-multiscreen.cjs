const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {chromium} = require('playwright');

const artifact = path.resolve(__dirname, '../HIT-HTML.html');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(fs.readFileSync(artifact));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({
    ...(process.env.HIT_CHROME_EXECUTABLE ? {executablePath: process.env.HIT_CHROME_EXECUTABLE} : {}),
    args: ['--window-size=1280,900'],
  });
  const errors = [];
  try {
    for (const mode of ['http', 'file']) for (const side of ['left', 'right']) {
      const context = await browser.newContext({viewport: null});
      context.setDefaultTimeout(10000);
      context.on('page', page => page.on('pageerror', error => errors.push(error.stack)));
      await context.addInitScript(() => {
        const open = window.open, move = window.moveTo;
        let ignoredMoves = 0;
        window.__requestedFeatures = [];
        // Simulate a window manager ignoring initial placement; keep native screens and windows.
        window.open = function(url, name, features) {
          window.__requestedFeatures.push(features);
          return open.call(this, url, name, String(features).replace(/left=[^,]+/, 'left=100').replace(/top=[^,]+/, 'top=100'));
        };
        window.moveTo = function(x, y) {
          if (window.opener && ignoredMoves++ < 3) return;
          return move.call(this, x, y);
        };
      });
      const main = await context.newPage();
      const cdp = await context.newCDPSession(main);
      const target = (await cdp.send('Target.getTargetInfo')).targetInfo;
      await cdp.send('Browser.setPermission', {permission: {name: 'window-management'}, setting: 'granted', browserContextId: target.browserContextId});
      const screens = (await cdp.send('Emulation.getScreenInfos')).screenInfos;
      await cdp.send('Emulation.updateScreen', {screenId: screens.find(s => s.isPrimary).id, left: 0, top: 0, width: 1920, height: 1080, label: 'Main'});
      const layout = {left: side === 'left' ? -2560 : 1920, top: side === 'left' ? -200 : 0, width: 2560, height: 1440, label: 'Secondary'};
      const secondary = screens.find(s => s.label === 'Secondary');
      await cdp.send(secondary ? 'Emulation.updateScreen' : 'Emulation.addScreen', {...(secondary ? {screenId: secondary.id} : {}), ...layout});
      const windowId = (await cdp.send('Browser.getWindowForTarget')).windowId;
      await cdp.send('Browser.setWindowBounds', {windowId, bounds: {left: 100, top: 100, width: 1280, height: 900}});
      await main.goto(mode === 'file' ? pathToFileURL(artifact).href : `http://127.0.0.1:${server.address().port}/HIT-HTML.html`);
      const popup = main.waitForEvent('popup');
      await main.keyboard.press('s');
      const audience = await popup;
      await audience.waitForLoadState();
      const aud = await context.newCDPSession(audience);
      const read = async expression => {
        const result = await aud.send('Runtime.evaluate', {expression, returnByValue: true, userGesture: false, awaitPromise: true});
        assert.equal(result.exceptionDetails, undefined);
        return result.result.value;
      };
      const bounds = async () => (await aud.send('Browser.getWindowForTarget')).bounds;
      const onSecondary = b => b.left + b.width / 2 >= layout.left && b.left + b.width / 2 < layout.left + layout.width && b.top + b.height / 2 >= layout.top && b.top + b.height / 2 < layout.top + layout.height;
      const until = async check => {
        const deadline = Date.now() + 6000;
        while (Date.now() < deadline) {if (await check()) return; await pause(40);}
        throw new Error(`${mode}/${side}: condition timed out; audience bounds: ${JSON.stringify(await bounds())}`);
      };
      await until(async () => onSecondary(await bounds()));
      const features = await main.evaluate(() => window.__requestedFeatures[0]);
      const requestedLeft = Number(features.match(/left=(-?\d+)/)[1]);
      assert.ok(requestedLeft >= layout.left && requestedLeft < layout.left + layout.width);
      assert.equal(new URL(audience.url()).searchParams.has('hit-session'), false);
      if (await read('!!document.fullscreenElement')) await read('document.exitFullscreen()');
      // A later fullscreen request must also repair a window moved back to the main display.
      const audienceWindow = (await aud.send('Browser.getWindowForTarget')).windowId;
      await aud.send('Browser.setWindowBounds', {windowId: audienceWindow, bounds: {left: 100, top: 100, width: 1000, height: 700}});
      await main.locator('#presenter-fullscreen').click();
      await until(async () => await read('!!document.fullscreenElement') && onSecondary(await bounds()));
      assert.equal(await read('navigator.userActivation.hasBeenActive'), false);
      await read('document.exitFullscreen()');
      await main.locator('#presenter-screen').selectOption('0:0:1920:1080');
      await until(async () => !onSecondary(await bounds()));
      await main.locator('#presenter-screen').selectOption('auto');
      await until(async () => onSecondary(await bounds()));
      await main.reload();
      await main.waitForFunction(() => document.getElementById('presenter-status').classList.contains('connected') && document.getElementById('presenter-screen').options.length > 1);
      await main.locator('#presenter-open').click();
      await until(async () => onSecondary(await bounds()));
      await main.locator('#presenter-next').click();
      await until(async () => await read('document.getElementById("counter").textContent') === '2 / 8');
      await main.locator('#presenter-exit').click();
      await context.close();
      console.log(`PASS ${mode}/${side}: native secondary-window placement, delegated fullscreen, selection, reload and sync`);
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error); process.exit(1);});
