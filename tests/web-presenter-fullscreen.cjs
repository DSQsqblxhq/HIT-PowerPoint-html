const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {chromium} = require('playwright');

const html = fs.readFileSync(path.resolve(__dirname, '../HIT-HTML.html'), 'utf8');
const url = 'https://hit-presentation.test/HIT-HTML.html';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const nativeDisplays = process.env.HIT_NATIVE_DISPLAYS === '1';

(async () => {
  // Full Chrome implements fullscreen companion windows; headless-shell does not.
  const browser = await chromium.launch({
    executablePath: process.env.HIT_CHROME_EXECUTABLE || chromium.executablePath(),
    headless: !nativeDisplays,
    ignoreDefaultArgs: ['--disable-popup-blocking'],
    args: ['--window-size=1280,900', ...(nativeDisplays ? ['--ozone-platform=x11'] : [])],
  });
  const errors = [];
  try {
    for (const scenario of ['left', 'right', 'expired-activation', 'blocked-popup']) {
      const primary = {left: nativeDisplays && scenario === 'left' ? 2560 : 0, top: nativeDisplays && scenario === 'left' ? 200 : 0, width: 1920, height: 1080};
      const layout = {left: scenario === 'left' ? (nativeDisplays ? 0 : -2560) : 1920, top: scenario === 'left' && !nativeDisplays ? -200 : 0, width: 2560, height: 1440, label: 'Secondary'};
      if (nativeDisplays) execFileSync('xrandr', ['--output', 'DUMMY0', '--mode', 'HIT-1920x1080', '--primary', '--pos', `${primary.left}x${primary.top}`, '--output', 'DUMMY1', '--mode', 'HIT-2560x1440', '--pos', `${layout.left}x${layout.top}`]);
      const context = await browser.newContext({viewport: null});
      context.setDefaultTimeout(10000);
      context.on('page', page => page.on('pageerror', error => errors.push(error.stack)));
      await context.route('https://hit-presentation.test/**', route => route.fulfill({contentType: 'text/html; charset=utf-8', body: html}));
      await context.addInitScript(({scenario}) => {
        const request = Element.prototype.requestFullscreen;
        window.__fullscreenRequests = [];
        Element.prototype.requestFullscreen = function(options) {
          window.__fullscreenRequests.push({left: options?.screen?.left, top: options?.screen?.top, active: navigator.userActivation.isActive, wasFullscreen: !!document.fullscreenElement});
          return request.call(this, options);
        };
        let ignoredMoves = 0;
        const move = window.moveTo;
        window.__ignoreNextMoves = count => { ignoredMoves = count; };
        window.moveTo = function(...args) {
          if (ignoredMoves > 0) { ignoredMoves--; return; }
          return move.apply(this, args);
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
      if (!nativeDisplays) {
        const screens = (await cdp.send('Emulation.getScreenInfos')).screenInfos;
        await cdp.send('Emulation.updateScreen', {screenId: screens.find(s => s.isPrimary).id, ...primary, label: 'Main'});
        const secondary = screens.find(s => s.label === 'Secondary');
        await cdp.send(secondary ? 'Emulation.updateScreen' : 'Emulation.addScreen', {...(secondary ? {screenId: secondary.id} : {}), ...layout});
      }
      const windowId = (await cdp.send('Browser.getWindowForTarget')).windowId;
      await cdp.send('Browser.setWindowBounds', {windowId, bounds: {left: primary.left + 100, top: primary.top + 100, width: 1280, height: 900}});
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
      if (nativeDisplays) assert.equal(await main.evaluate(async () => (await getScreenDetails()).screens.length), 2, 'Native desktop must expose two actual displays');
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
      assert.ok(home.left + home.width / 2 >= primary.left && home.left + home.width / 2 < primary.left + primary.width, JSON.stringify(home));
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
      if (scenario === 'left' || scenario === 'right') {
        const onScreen = (bounds, screen) => {
          const x = bounds.left + bounds.width / 2, y = bounds.top + bounds.height / 2;
          return x >= screen.left && x < screen.left + screen.width && y >= screen.top && y < screen.top + screen.height;
        };
        // Fullscreen can retain the underlying normal window's screenX/bounds.
        // Check ScreenDetails.currentScreen for the actual fullscreen display,
        // as well as the native bounds of the windowed workbench.
        // Exercise repeated clicks from the same endpoint and alternating endpoints.
        const initiators = ['presenter', 'presenter', 'audience', 'audience', 'presenter', 'audience'];
        for (const [index, initiator] of initiators.entries()) {
          await workbench.evaluate(() => window.__ignoreNextMoves(2));
          if (initiator === 'presenter') await workbench.locator('#presenter-swap').click();
          else {
            const edge = await read('({x:innerWidth/2,y:innerHeight-5})');
            await main.mouse.move(edge.x, edge.y);
            await main.locator('#audience-swap').click();
          }
          const audienceScreen = index % 2 ? layout : primary;
          const presenterScreen = index % 2 ? primary : layout;
          await until(async () => {
            const presenterBounds = (await workCDP.send('Browser.getWindowForTarget')).bounds;
            return onScreen(presenterBounds, presenterScreen) && await read(`!!document.fullscreenElement && A.currentScreen.left === ${audienceScreen.left} && A.currentScreen.top === ${audienceScreen.top} && window.__fullscreenRequests.at(-1).left === ${audienceScreen.left} && window.__fullscreenRequests.at(-1).top === ${audienceScreen.top}`);
          }).catch(async error => {
            const expression = '({geometry:Ae(),current:A&&{left:A.currentScreen.left,top:A.currentScreen.top},target:z,peer:H,pinned:W,swap:J&&{id:J.id,phase:J.phase},notice:document.getElementById("presenter-notice").textContent,requests:window.__fullscreenRequests})';
            console.error('Swap diagnostics:', JSON.stringify({scenario, swap: index + 1, initiator,
              audienceBounds: (await cdp.send('Browser.getWindowForTarget')).bounds,
              presenterBounds: (await workCDP.send('Browser.getWindowForTarget')).bounds,
              audience: await read(expression),
              presenter: (await workCDP.send('Runtime.evaluate', {expression, returnByValue: true, userGesture: false})).result.value,
            }));
            throw error;
          });
          await workbench.waitForFunction(() => !document.getElementById('presenter-swap').disabled);
          // Allow restore-bounds/fullscreen events to settle before verifying that
          // neither window was subsequently returned to its previous monitor.
          await pause(400);
          assert.ok(onScreen((await workCDP.send('Browser.getWindowForTarget')).bounds, presenterScreen), `${scenario}: workbench after swap ${index + 1}`);
          assert.equal(await read('document.documentElement.dataset.role'), 'audience');
          assert.equal(await read('!!document.fullscreenElement'), true);
          assert.equal(await read('A.currentScreen.left'), audienceScreen.left);
          assert.equal(await read('A.currentScreen.top'), audienceScreen.top);
          assert.equal(await read('window.__fullscreenRequests.at(-1).left'), audienceScreen.left);
          assert.equal(await read('window.__fullscreenRequests.at(-1).wasFullscreen'), true);
          assert.equal(await workbench.locator('#presenter-counter').textContent(), '2 / 8');
          assert.equal(await workbench.locator('#presenter-timer-toggle').textContent(), '继续');
          assert.equal(context.pages().length, 2);
        }
      }
      const closed = workbench.waitForEvent('close');
      await workbench.locator('#presenter-exit').click();
      await closed;
      await until(() => read('document.documentElement.dataset.role==="deck" && !document.fullscreenElement'));
      assert.equal(context.pages().length, 1);
      console.log(`PASS HTTPS/${scenario}: one gesture requests native fullscreen on the secondary screen, windowed workbench on the source screen, sync/timer and clean exit`);
      await context.close();
    }
    assert.deepEqual(errors, []);
  } finally {await browser.close();}
})().catch(error => {console.error(error); process.exit(1);});
