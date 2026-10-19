const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');

const html = fs.readFileSync(path.resolve(__dirname, '../HIT-HTML.html'), 'utf8');
const url = 'https://hit-presentation.test/HIT-HTML.html';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  // Full Chrome implements fullscreen companion windows; headless-shell does not.
  const browser = await chromium.launch({
    executablePath: process.env.HIT_CHROME_EXECUTABLE || chromium.executablePath(),
    ignoreDefaultArgs: ['--disable-popup-blocking'],
    args: ['--window-size=1280,900'],
  });
  const errors = [];
  try {
    for (const scenario of ['left', 'right', 'expired-activation', 'blocked-popup']) {
      const context = await browser.newContext({viewport: null});
      context.setDefaultTimeout(10000);
      context.on('page', page => page.on('pageerror', error => errors.push(error.stack)));
      await context.route('https://hit-presentation.test/**', route => route.fulfill({contentType: 'text/html; charset=utf-8', body: html}));
      await context.addInitScript(({scenario}) => {
        const request = Element.prototype.requestFullscreen;
        window.__fullscreenRequests = [];
        Element.prototype.requestFullscreen = function(options) {
          window.__fullscreenRequests.push({left: options?.screen?.left, top: options?.screen?.top, active: navigator.userActivation.isActive});
          return request.call(this, options);
        };
        if (!window.opener && scenario === 'expired-activation') {
          const details = window.getScreenDetails;
          window.getScreenDetails = async function() {
            const result = await details.call(this);
            await new Promise(resolve => setTimeout(resolve, 6500));
            return result;
          };
        }
        if (!window.opener && scenario === 'blocked-popup') {
          window.__open = window.open;
          window.open = () => null;
        }
      }, {scenario});
      const main = await context.newPage(), cdp = await context.newCDPSession(main);
      const target = (await cdp.send('Target.getTargetInfo')).targetInfo;
      await cdp.send('Browser.setPermission', {permission: {name: 'window-management'}, setting: 'granted', origin: new URL(url).origin, browserContextId: target.browserContextId});
      const screens = (await cdp.send('Emulation.getScreenInfos')).screenInfos;
      await cdp.send('Emulation.updateScreen', {screenId: screens.find(s => s.isPrimary).id, left: 0, top: 0, width: 1920, height: 1080, label: 'Main'});
      const layout = {left: scenario === 'left' ? -2560 : 1920, top: scenario === 'left' ? -200 : 0, width: 2560, height: 1440, label: 'Secondary'};
      const secondary = screens.find(s => s.label === 'Secondary');
      await cdp.send(secondary ? 'Emulation.updateScreen' : 'Emulation.addScreen', {...(secondary ? {screenId: secondary.id} : {}), ...layout});
      const windowId = (await cdp.send('Browser.getWindowForTarget')).windowId;
      await cdp.send('Browser.setWindowBounds', {windowId, bounds: {left: 100, top: 100, width: 1280, height: 900}});
      const read = async expression => {
        const result = await cdp.send('Runtime.evaluate', {expression, returnByValue: true, userGesture: false, awaitPromise: true});
        assert.equal(result.exceptionDetails, undefined);
        return result.result.value;
      };
      const until = async check => {
        const deadline = Date.now() + 12000;
        while (Date.now() < deadline) {if (await check()) return; await pause(50);}
        throw new Error(`${scenario}: condition timed out; role/status: ${JSON.stringify(await read('({role:document.documentElement.dataset.role,notice:document.getElementById("presenter-notice").textContent,full:!!document.fullscreenElement})'))}`);
      };
      await main.goto(url);
      if (scenario === 'expired-activation' || scenario === 'blocked-popup') {
        await main.keyboard.press('s');
        await until(async () => (await read('document.getElementById("presenter-notice").textContent')).includes(scenario === 'expired-activation' ? '屏幕权限已就绪' : '浏览器未完成双屏全屏放映'));
        assert.equal(context.pages().length, 1);
        assert.equal(await read('document.documentElement.dataset.role'), 'presenter');
        assert.equal(await read('!!document.fullscreenElement'), false);
        if (scenario === 'blocked-popup') await read('window.open=window.__open;true');
      }
      const pending = main.waitForEvent('popup');
      if (scenario === 'left' || scenario === 'right') await main.keyboard.press('s');
      else await main.locator('#presenter-open').click();
      const workbench = await pending;
      await workbench.waitForLoadState();
      await workbench.waitForFunction(() => document.documentElement.dataset.role === 'presenter' && document.getElementById('presenter-status').textContent.includes('全屏放映'));
      await until(() => read('document.documentElement.dataset.role==="audience" && !!document.fullscreenElement'));
      const requests = await read('window.__fullscreenRequests');
      assert.ok(requests.length > 0);
      assert.ok(requests.every(r => r.active && r.left === layout.left && r.top === layout.top), JSON.stringify(requests));
      assert.equal(await workbench.locator('#presenter-timer-toggle').textContent(), '暂停');
      const workCDP = await context.newCDPSession(workbench);
      const home = (await workCDP.send('Browser.getWindowForTarget')).bounds;
      assert.ok(home.left + home.width / 2 >= 0 && home.left + home.width / 2 < 1920, JSON.stringify(home));
      assert.equal((await workCDP.send('Runtime.evaluate', {expression: '!!document.fullscreenElement', returnByValue: true, userGesture: false})).result.value, false);
      assert.equal(context.pages().length, 2);
      assert.equal(new URL(main.url()).searchParams.has('hit-session'), false);
      assert.equal(new URL(workbench.url()).searchParams.has('hit-session'), false);
      await workbench.locator('#presenter-next').click();
      await until(() => read('document.getElementById("counter").textContent==="2 / 8" && !!document.fullscreenElement'));
      await workbench.locator('#presenter-timer-toggle').click();
      // The audience is the original tab: fullscreen must not depend on moveTo(),
      // which browsers may disallow for a normal tab, especially after a reload.
      await read('document.exitFullscreen()');
      await workbench.waitForFunction(() => !document.getElementById('presenter-status').textContent.includes('全屏放映'));
      await workbench.locator('#presenter-fullscreen').click();
      await until(() => read('!!document.fullscreenElement'));
      await workbench.reload();
      await workbench.waitForFunction(() => document.getElementById('presenter-status').textContent.includes('全屏放映'));
      await read('document.exitFullscreen()');
      await workbench.waitForFunction(() => !document.getElementById('presenter-status').textContent.includes('全屏放映'));
      await workbench.locator('#presenter-fullscreen').click();
      await until(() => read('!!document.fullscreenElement'));
      if (scenario === 'left') {
        await workbench.locator('#presenter-swap').click();
        await main.waitForFunction(() => document.documentElement.dataset.role === 'presenter' && document.getElementById('presenter-status').textContent.includes('全屏放映'));
        await workbench.waitForFunction(() => document.documentElement.dataset.role === 'audience' && !!document.fullscreenElement);
        assert.equal(await main.locator('#presenter-counter').textContent(), '2 / 8');
        assert.equal(await main.locator('#presenter-timer-toggle').textContent(), '继续');
        const closed = workbench.waitForEvent('close');
        await main.locator('#presenter-exit').click();
        await closed;
      } else {
        const closed = workbench.waitForEvent('close');
        await workbench.locator('#presenter-exit').click();
        await closed;
      }
      await until(() => read('document.documentElement.dataset.role==="deck" && !document.fullscreenElement'));
      assert.equal(context.pages().length, 1);
      console.log(`PASS HTTPS/${scenario}: one gesture requests native fullscreen on the secondary screen, windowed workbench on the source screen, sync/timer and clean exit`);
      await context.close();
    }
    assert.deepEqual(errors, []);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exit(1);});
