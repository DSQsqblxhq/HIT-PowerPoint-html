const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');
const {chromium} = require('playwright');

const root = path.resolve(__dirname, '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const until = async (condition, message, timeout = 20000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {if (await condition()) return; await pause(50);}
  throw new Error(message);
};

(async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'HIT quit 中文 & ! '));
  const single = path.join(folder, 'HIT-HTML-local.cmd');
  const profiles = path.join(folder, 'browser profiles');
  fs.copyFileSync(path.join(root, 'dist/HIT-HTML-local.cmd'), single);
  const executable = process.env.HIT_CHROME_EXECUTABLE || [
    path.join(process.env.ProgramFiles || '', 'Google/Chrome/Application/chrome.exe'),
    path.join(process.env['ProgramFiles(x86)'] || '', 'Microsoft/Edge/Application/msedge.exe'),
    chromium.executablePath(),
  ].find(file => fs.existsSync(file));
  assert.ok(executable && fs.existsSync(executable), 'Set HIT_CHROME_EXECUTABLE to an installed Chromium browser');
  const powershell = process.env.HIT_POWERSHELL_EXECUTABLE || (process.platform === 'win32' ? 'powershell.exe' : 'pwsh');
  const bootstrap = fs.readFileSync(single, 'utf8').split(/\r?\n/).find(line => line.includes(' -Command ')).match(/ -Command "(.*)"$/)[1];
  const sessions = [];
  let explorerWindow = 0;
  const explorer = async (operation, window = 0) => {
    const child = spawn(powershell, ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'explorer-source.ps1'), '-Operation', operation, '-Path', single, '-Window', String(window)], {env: {...process.env, POWERSHELL_TELEMETRY_OPTOUT: '1', POWERSHELL_UPDATECHECK: 'Off'}});
    let output = '', errors = '';
    child.stdout.on('data', data => {output += data;});
    child.stderr.on('data', data => {errors += data;});
    const code = await new Promise((resolve, reject) => {child.on('exit', resolve); child.on('error', reject);});
    assert.equal(code, 0, errors);
    return operation === 'Open' ? JSON.parse(output.trim()) : null;
  };
  // Headless Chrome has no native window-close signal; flush DOM storage promptly before forced teardown.
  const start = async (id, port = '0') => {
    const ready = path.join(folder, `ready-${id}.json`);
    const env = {...process.env, POWERSHELL_TELEMETRY_OPTOUT: '1', POWERSHELL_UPDATECHECK: 'Off', HIT_PRESENTATION_SELF: single, HIT_PRESENTATION_POWERSHELL: powershell, HIT_PRESENTATION_NO_BROWSER: '0', HIT_PRESENTATION_PORT: String(port), HIT_PRESENTATION_READY_FILE: ready, HIT_PRESENTATION_PROFILE_ROOT: profiles, HIT_PRESENTATION_BROWSER: executable, HIT_PRESENTATION_BROWSER_ARGUMENTS: JSON.stringify([...(process.platform === 'win32' ? [] : ['--headless=new', '--enable-aggressive-domstorage-flushing']), '--no-sandbox', '--disable-gpu', '--disable-background-networking', '--remote-debugging-port=0'])};
    const processHandle = process.platform === 'win32'
      ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `""${single}""`], {windowsHide: true, windowsVerbatimArguments: true, env})
      : spawn(powershell, ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', bootstrap], {env});
    const session = {process: processHandle, ready, logs: '', closed: false};
    sessions.push(session);
    processHandle.stdout.on('data', data => {session.logs += data;});
    processHandle.stderr.on('data', data => {session.logs += data;});
    processHandle.on('close', () => {session.closed = true;});
    processHandle.on('error', error => {session.logs += error.stack;});
    await until(() => fs.existsSync(ready) || session.closed, 'Launcher did not become ready');
    assert.ok(fs.existsSync(ready), session.logs);
    session.info = JSON.parse(fs.readFileSync(ready, 'utf8').replace(/^\uFEFF/, ''));
    assert.ok(session.info.browserPid > 0, session.logs);
    const endpoint = path.join(session.info.profile, 'DevToolsActivePort');
    await until(() => fs.existsSync(endpoint) || session.closed, 'Managed browser did not start: ' + session.logs);
    assert.ok(fs.existsSync(endpoint), session.logs + (fs.existsSync(path.join(session.info.profile, 'hit-launcher.err.log')) ? fs.readFileSync(path.join(session.info.profile, 'hit-launcher.err.log'), 'utf8') : ''));
    // A reused profile can briefly contain the previous process's debugging port.
    await until(async () => {
      try {
        const debugPort = Number(fs.readFileSync(endpoint, 'utf8').split(/\r?\n/)[0]);
        session.browser = await chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`, {timeout: 1000});
        return true;
      } catch { return false; }
    }, 'Could not connect to the new managed browser process');
    const settings = JSON.parse(fs.readFileSync(path.join(session.info.profile, 'Default/Preferences'), 'utf8')).profile.content_settings.exceptions;
    for (const name of ['automatic_fullscreen', 'popups']) {
      assert.equal(settings[name][new URL(session.info.url).origin + ',*'].setting, 1, 'Owned profile must allow only the presentation origin: ' + name);
    }
    session.context = session.browser.contexts()[0];
    const matches = page => page.url().split(/[?#]/)[0] === session.info.url;
    // The shell fixture has no browser frontend; real Chrome/Edge CI must open the page itself.
    if (process.env.HIT_TEST_HEADLESS_SHELL === '1' && !session.context.pages().some(matches)) {
      await (session.context.pages()[0] || await session.context.newPage()).goto(session.info.url);
    }
    await until(() => session.context.pages().some(matches), 'Browser page did not open');
    session.page = session.context.pages().find(matches);
    await session.page.waitForLoadState();
    const cdp = await session.context.newCDPSession(session.page);
    if (process.platform === 'win32') {
      await until(() => {
        try { return JSON.parse(fs.readFileSync(ready, 'utf8').replace(/^\uFEFF/, '')).windowPlaced; }
        catch { return false; }
      }, 'Native placement did not settle on the launch display');
      const report = JSON.parse(fs.readFileSync(ready, 'utf8').replace(/^\uFEFF/, ''));
      if (explorerWindow) assert.equal(report.launchSource, explorerWindow, 'Use the selected CMD Explorer window even after browser focus changes');
      assert.deepEqual(report.windowRect, report.launchBounds);
      const bounds = (await cdp.send('Browser.getWindowForTarget')).bounds;
      assert.notEqual(bounds.windowState, 'fullscreen', 'Initial presentation must stay windowed, including after a fullscreen shutdown');
      assert.ok(await session.page.evaluate(() => outerHeight - innerHeight >= 60), 'Initial browser must show its tab and address bars');
      // CDP may exclude invisible Windows resize borders from native window bounds.
      const center = [bounds.left + bounds.width / 2, bounds.top + bounds.height / 2];
      assert.ok(center[0] >= report.launchBounds[0] && center[0] < report.launchBounds[0] + report.launchBounds[2]);
      assert.ok(center[1] >= report.launchBounds[1] && center[1] < report.launchBounds[1] + report.launchBounds[3]);
    }
    assert.equal(await session.page.evaluate(() => !!document.fullscreenElement), false, 'Homepage must not enter DOM fullscreen');
    return session;
  };
  const quit = async (session, key) => {
    session.process.stdin.write(key);
    await until(() => session.closed, 'Quit key did not close the launcher: ' + session.logs, 10000);
    assert.equal(session.process.exitCode, 0, session.logs);
    assert.equal(session.browser.isConnected(), false, 'Every window of the owned browser must close');
    assert.equal(fs.existsSync(session.ready), false);
    assert.doesNotMatch(session.logs, /Terminate batch job|终止批处理|\(Y\/N\)/i);
  };
  try {
    if (process.platform === 'win32') {
      const source = await explorer('Open');
      explorerWindow = source.hwnd;
      if (!explorerWindow) console.log('Explorer fixture unavailable: testing native cursor-display fallback, placement and windowed startup');
    }
    const openPresenter = async session => {
      await session.page.bringToFront();
      const pending = session.page.waitForEvent('popup');
      await session.page.locator('#presenter-start').click();
      try { return await pending; }
      catch (error) {
        console.error('Presenter popup diagnostics:', await session.page.evaluate(async () => ({
          role: document.documentElement.dataset.role,
          status: document.getElementById('presenter-status').textContent,
          hint: document.getElementById('presenter-hint')?.textContent,
          permission: await navigator.permissions.query({name: 'window-management'}).then(p => p.state).catch(String),
          focused: document.hasFocus(),
          active: document.activeElement?.outerHTML.slice(0, 250),
          activation: navigator.userActivation.isActive,
        })));
        throw error;
      }
    };
    const first = await start('first');
    const cdp = await first.context.newCDPSession(first.page);
    if (process.platform !== 'win32') {
      await cdp.send('Emulation.addScreen', {left: 1920, top: 0, width: 2560, height: 1440, label: 'Audience display'});
    }
    await cdp.send('Browser.setPermission', {permission: {name: 'window-management'}, setting: 'granted', origin: new URL(first.info.url).origin});
    // Expire the popup's click activation, as happens after permission prompts or slow loads.
    await first.context.addInitScript(() => {
      const request = Element.prototype.requestFullscreen;
      window.__fullscreenAttempts = [];
      Element.prototype.requestFullscreen = async function(options) {
        await new Promise(resolve => setTimeout(resolve, 6500));
        const attempt = {active: navigator.userActivation.isActive};
        window.__fullscreenAttempts.push(attempt);
        try { const result = await request.call(this, options); attempt.ok = true; return result; }
        catch (error) { attempt.error = String(error); throw error; }
      };
    });
    const viewer = await openPresenter(first);
    await viewer.waitForLoadState();
    await first.page.waitForFunction(() => document.getElementById('presenter-status').classList.contains('connected'));
    try { await viewer.waitForFunction(() => !!document.fullscreenElement); }
    catch (error) { console.error('Delayed fullscreen attempts:', await viewer.evaluate(() => window.__fullscreenAttempts)); throw error; }
    assert.ok(await viewer.evaluate(() => window.__fullscreenAttempts.some(a => a.ok && !a.active)), 'Audience must fullscreen after click activation expires');
    if (process.platform !== 'win32') await viewer.waitForFunction(() => screenX >= 1920);
    assert.equal(await first.page.evaluate(() => !!document.fullscreenElement), false, 'Workbench must stay windowed while the audience is fullscreen');
    if (process.platform === 'win32') assert.notEqual((await cdp.send('Browser.getWindowForTarget')).bounds.windowState, 'fullscreen');
    await first.page.locator('#presenter-font-up').click();
    const font = await first.page.locator('#presenter-script').evaluate(e => getComputedStyle(e).getPropertyValue('--p-note-size'));
    assert.equal(first.context.pages().length, 2);
    const second = await start('second');
    assert.notEqual(second.info.profile, first.info.profile, 'Simultaneous launchers need distinct owned browsers');
    assert.notEqual(second.info.browserPid, first.info.browserPid);
    // Save an intentionally small normal window; relaunch must override remembered bounds.
    const savedWindow = (await cdp.send('Browser.getWindowForTarget')).windowId;
    await cdp.send('Browser.setWindowBounds', {windowId: savedWindow, bounds: {windowState: 'normal'}});
    await cdp.send('Browser.setWindowBounds', {windowId: savedWindow, bounds: {left: 50, top: 50, width: 900, height: 650}});
    // Let Chromium commit asynchronous DOM storage before the headless process fallback.
    await pause(6000);
    await quit(first, 'q');
    assert.equal(second.browser.isConnected(), true, 'Quitting one presentation must preserve another browser');
    assert.equal(second.closed, false);
    assert.equal(await second.page.title(), '哈工大 · 学术汇报 HTML 模板');
    await quit(second, '\x1b');
    assert.equal(fs.existsSync(second.info.profile), false, 'Transient profile should be cleaned up');
    const third = await start('third', first.info.port);
    assert.equal(third.info.profile, first.info.profile, 'Normal relaunch should reuse presentation preferences');
    const thirdCDP = await third.context.newCDPSession(third.page);
    await thirdCDP.send('Browser.setPermission', {permission: {name: 'window-management'}, setting: 'granted', origin: new URL(third.info.url).origin});
    const thirdViewer = await openPresenter(third);
    await thirdViewer.waitForFunction(() => !!document.fullscreenElement);
    assert.equal(await third.page.locator('#presenter-script').evaluate(e => getComputedStyle(e).getPropertyValue('--p-note-size')), font);
    if (process.platform === 'win32') {
      await thirdViewer.close();
      const windowId = (await thirdCDP.send('Browser.getWindowForTarget')).windowId;
      await thirdCDP.send('Browser.setWindowBounds', {windowId, bounds: {windowState: 'fullscreen'}});
      await until(async () => (await thirdCDP.send('Browser.getWindowForTarget')).bounds.windowState === 'fullscreen', 'Seed remembered fullscreen before restarting');
      await pause(1000);
    }
    await quit(third, '\x03');
    const fourth = await start('fourth', first.info.port);
    await quit(fourth, 'q');
    console.log('PASS managed browser: launch display, windowed homepage/workbench, automatic audience fullscreen after activation expiry, restored-bounds/fullscreen override, Q/Esc/Ctrl+C, isolated concurrent browsers and persistent preferences');
  } finally {
    for (const session of sessions) {
      if (!session.closed) {
        session.process.stdin.write('q');
        await until(() => session.closed, 'Cleanup timed out', 7000).catch(() => {});
      }
      if (!session.closed) {
        if (process.platform === 'win32') {
          const kill = spawn('taskkill.exe', ['/pid', String(session.process.pid), '/T', '/F'], {stdio: 'ignore', windowsHide: true});
          await new Promise(resolve => kill.once('close', resolve));
        } else session.process.kill();
      }
      if (session.browser?.isConnected()) await session.browser.close().catch(() => {});
    }
    if (explorerWindow) await explorer('Close', explorerWindow);
    fs.rmSync(folder, {recursive: true, force: true});
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
