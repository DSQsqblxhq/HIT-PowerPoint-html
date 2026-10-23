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
  const servedURL = process.env.HIT_PRESENTATION_URL || `http://127.0.0.1:${server.address().port}/HIT-HTML.html`;
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
      // Grant only the tested origin; a global grant hides file/HTTP permission differences.
      await cdp.send('Browser.setPermission', {permission: {name: 'window-management'}, setting: 'granted', origin: mode === 'file' ? 'file:///' : new URL(servedURL).origin, browserContextId: target.browserContextId});
      const screens = (await cdp.send('Emulation.getScreenInfos')).screenInfos;
      await cdp.send('Emulation.updateScreen', {screenId: screens.find(s => s.isPrimary).id, left: 0, top: 0, width: 1920, height: 1080, label: 'Main'});
      const layout = {left: side === 'left' ? -2560 : 1920, top: side === 'left' ? -200 : 0, width: 2560, height: 1440, label: 'Secondary'};
      const secondary = screens.find(s => s.label === 'Secondary');
      await cdp.send(secondary ? 'Emulation.updateScreen' : 'Emulation.addScreen', {...(secondary ? {screenId: secondary.id} : {}), ...layout});
      const windowId = (await cdp.send('Browser.getWindowForTarget')).windowId;
      await cdp.send('Browser.setWindowBounds', {windowId, bounds: {left: 100, top: 100, width: 1280, height: 900}});
      await main.goto(mode === 'file' ? pathToFileURL(artifact).href : servedURL);
      const popup = main.waitForEvent('popup');
      await main.keyboard.press('s');
      let audience = await popup;
      await audience.waitForLoadState();
      let aud = await context.newCDPSession(audience);
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
      await until(async () => await read('document.getElementById("counter").textContent') === '2 / 9');
      // Swap existing windows from either entry point, preserving the presentation state.
      await main.locator('#presenter-timer-reset').click();
      await main.locator('#presenter-timer-toggle').click();
      await main.waitForFunction(() => document.getElementById('presenter-elapsed').textContent !== '00:00:00');
      await main.locator('#presenter-timer-toggle').click();
      await main.locator('#presenter-font-up').click();
      const paused = await main.locator('#presenter-elapsed').textContent();
      const font = await main.locator('#presenter-script').evaluate(e => getComputedStyle(e).getPropertyValue('--p-note-size'));
      const script = await main.locator('#presenter-script').textContent();
      const originalWindow = (await cdp.send('Browser.getWindowForTarget')).windowId;
      const readMain = async expression => (await cdp.send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true, userGesture: false})).result.value;
      const roleIs = (page, role) => page.waitForFunction(role => document.documentElement.dataset.role === role, role);
      const reconnected = mode === 'file' ? main.waitForEvent('popup', {timeout: 3000}).catch(() => null) : Promise.resolve(null);
      await main.locator('#presenter-fullscreen').click();
      const replacement = await reconnected;
      if (replacement) {
        audience = replacement;
        await audience.waitForLoadState();
        aud = await context.newCDPSession(audience);
        await main.waitForFunction(() => document.getElementById('presenter-status').classList.contains('connected'));
        await main.locator('#presenter-fullscreen').click();
      }
      await until(async () => await read('!!document.fullscreenElement'));
      await main.locator('#presenter-swap').click();
      await Promise.all([roleIs(main, 'audience'), roleIs(audience, 'presenter')]);
      await audience.waitForFunction(() => document.getElementById('presenter-status').classList.contains('connected') && !document.getElementById('presenter-swap').disabled);
      assert.equal(context.pages().length, 2);
      assert.equal(await audience.locator('#presenter-counter').textContent(), '2 / 9');
      assert.equal(await audience.locator('#presenter-elapsed').textContent(), paused);
      assert.equal(await audience.locator('#presenter-script').textContent(), script);
      assert.equal(await audience.locator('#presenter-script').evaluate(e => getComputedStyle(e).getPropertyValue('--p-note-size')), font);
      await until(async () => await readMain('!!document.fullscreenElement'));
      assert.equal(await read('!!document.fullscreenElement'), false);
      assert.ok(onSecondary(await bounds()), 'New presenter must stay on the former audience display');
      assert.ok(!onSecondary((await cdp.send('Browser.getWindowBounds', {windowId: originalWindow})).bounds));
      assert.equal(await main.locator('#presenter-start').isVisible(), false);
      assert.equal(await main.locator('#print').isVisible(), false);
      // The former popup must be able to fullscreen the original window from the new workbench.
      await readMain('document.exitFullscreen()');
      await audience.waitForFunction(() => !document.getElementById('presenter-status').textContent.includes('全屏放映'));
      await audience.locator('#presenter-fullscreen').click();
      await until(async () => await readMain('!!document.fullscreenElement'));
      await audience.locator('#presenter-font-up').click();
      const nextFont = await audience.locator('#presenter-script').evaluate(e => getComputedStyle(e).getPropertyValue('--p-note-size'));
      await audience.locator('#presenter-next').click();
      await main.waitForFunction(() => document.getElementById('counter').textContent === '3 / 9');
      const edge = await main.evaluate(() => ({x: innerWidth / 2, y: innerHeight - 5}));
      await main.mouse.move(edge.x, edge.y);
      await main.locator('#audience-swap').click();
      await Promise.all([roleIs(main, 'presenter'), roleIs(audience, 'audience')]);
      await main.waitForFunction(() => document.getElementById('presenter-status').classList.contains('connected') && !document.getElementById('presenter-swap').disabled);
      assert.equal(context.pages().length, 2);
      assert.equal(await main.locator('#presenter-counter').textContent(), '3 / 9');
      assert.equal(await main.locator('#presenter-elapsed').textContent(), paused);
      assert.equal(await main.locator('#presenter-script').evaluate(e => getComputedStyle(e).getPropertyValue('--p-note-size')), nextFont);
      await until(async () => await read('!!document.fullscreenElement') && onSecondary(await bounds()));
      assert.equal(await readMain('!!document.fullscreenElement'), false);
      assert.equal(new URL(main.url()).searchParams.has('hit-session'), false);
      assert.equal(new URL(audience.url()).searchParams.has('hit-session'), false);
      console.log(`PASS ${mode}/${side}: workbench/audience swap, paused timer, notes/font, existing windows, pinned displays and fullscreen in both directions`);
      await main.locator('#presenter-timer-toggle').click();
      const runningTime = await main.locator('#presenter-elapsed').textContent();
      const audienceEdge = await audience.evaluate(() => ({x: innerWidth / 2, y: innerHeight - 5}));
      await audience.mouse.move(audienceEdge.x, audienceEdge.y);
      await audience.locator('#audience-swap').click();
      await Promise.all([roleIs(main, 'audience'), roleIs(audience, 'presenter')]);
      await audience.waitForFunction(() => document.getElementById('presenter-timer-toggle').textContent === '暂停');
      await audience.waitForFunction(before => document.getElementById('presenter-elapsed').textContent !== before, runningTime);
      await until(async () => await readMain('!!document.fullscreenElement'));
      await audience.locator('#presenter-timer-toggle').click();
      const preservedTime = await audience.locator('#presenter-elapsed').textContent();
      await audience.reload();
      await roleIs(audience, 'presenter');
      await audience.waitForFunction(() => document.getElementById('presenter-status').classList.contains('connected'));
      assert.equal(await audience.locator('#presenter-elapsed').textContent(), preservedTime);
      assert.equal(await audience.locator('#presenter-counter').textContent(), '3 / 9');
      if (mode === 'file') {
        await readMain('document.exitFullscreen()');
        await audience.waitForFunction(() => !document.getElementById('presenter-status').textContent.includes('全屏放映'));
        await audience.locator('#presenter-fullscreen').click();
        await audience.waitForFunction(() => document.getElementById('presenter-notice').textContent.includes('浏览器限制了跨窗全屏授权'));
        assert.equal(context.pages().length, 2, 'File-origin isolation must not create a third window');
        const edge = await main.evaluate(() => ({x: innerWidth / 2, y: innerHeight - 5}));
        await main.mouse.move(edge.x, edge.y);
        await main.locator('#fullscreen').click();
        await audience.waitForFunction(() => document.getElementById('presenter-status').textContent.includes('全屏放映'));
        assert.equal(await readMain('!!document.fullscreenElement'), true);
        await audience.reload();
        await audience.waitForFunction(() => document.getElementById('presenter-status').classList.contains('connected'));
        const closed = audience.waitForEvent('close');
        await audience.locator('#presenter-exit').click();
        await closed;
        await roleIs(main, 'deck');
      } else {
        const closed = audience.waitForEvent('close');
        await audience.locator('#presenter-exit').click();
        await closed;
        await roleIs(main, 'deck');
      }
      assert.equal(context.pages().length, 1);
      console.log(`PASS ${mode}/${side}: audience-initiated fullscreen handoff, running timer, swapped presenter refresh and popup exit ownership`);
      await context.close();
      console.log(`PASS ${mode}/${side}: native secondary-window placement, delegated fullscreen, selection, reload and sync`);
    }
    // A fresh file origin has no web-origin grant. Never claim automatic secondary placement.
    const fresh = await browser.newContext({viewport: null});
    const local = await fresh.newPage();
    const localCDP = await fresh.newCDPSession(local);
    const localTarget = (await localCDP.send('Target.getTargetInfo')).targetInfo;
    await localCDP.send('Browser.setPermission', {permission: {name: 'window-management'}, setting: 'granted', origin: new URL(servedURL).origin, browserContextId: localTarget.browserContextId});
    await local.goto(pathToFileURL(artifact).href);
    assert.notEqual(await local.evaluate(async () => (await navigator.permissions.query({name: 'window-management'})).state), 'granted');
    const localPopup = local.waitForEvent('popup');
    await local.keyboard.press('s');
    const localAudience = await localPopup;
    await localAudience.waitForLoadState();
    await local.waitForFunction(() => document.getElementById('presenter-notice').textContent.includes('HIT-HTML-local.cmd'));
    assert.equal(await localAudience.evaluate(() => !!document.fullscreenElement), false);
    await fresh.close();
    console.log('PASS fresh local file: web grant is separate; failed screen access shows the local-launcher guidance without auto-fullscreen');
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => {console.error(error); process.exit(1);});
