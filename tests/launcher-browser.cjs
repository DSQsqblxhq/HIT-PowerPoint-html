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
  const start = async (id, port = '0') => {
    const ready = path.join(folder, `ready-${id}.json`);
    const env = {...process.env, POWERSHELL_TELEMETRY_OPTOUT: '1', POWERSHELL_UPDATECHECK: 'Off', HIT_PRESENTATION_SELF: single, HIT_PRESENTATION_POWERSHELL: powershell, HIT_PRESENTATION_NO_BROWSER: '0', HIT_PRESENTATION_PORT: String(port), HIT_PRESENTATION_READY_FILE: ready, HIT_PRESENTATION_PROFILE_ROOT: profiles, HIT_PRESENTATION_BROWSER: executable, HIT_PRESENTATION_BROWSER_ARGUMENTS: JSON.stringify(['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-background-networking', '--remote-debugging-port=0'])};
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
    session.context = session.browser.contexts()[0];
    const matches = page => page.url().split(/[?#]/)[0] === session.info.url;
    // The shell fixture has no app-window frontend; real Chrome/Edge CI must open --app itself.
    if (process.env.HIT_TEST_HEADLESS_SHELL === '1' && !session.context.pages().some(matches)) {
      await (session.context.pages()[0] || await session.context.newPage()).goto(session.info.url);
    }
    await until(() => session.context.pages().some(matches), 'App page did not open');
    session.page = session.context.pages().find(matches);
    await session.page.waitForLoadState();
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
    const first = await start('first');
    const cdp = await first.context.newCDPSession(first.page);
    await cdp.send('Browser.setPermission', {permission: {name: 'window-management'}, setting: 'granted', origin: new URL(first.info.url).origin});
    const popup = first.page.waitForEvent('popup');
    await first.page.keyboard.press('s');
    const viewer = await popup;
    await viewer.waitForLoadState();
    await first.page.waitForFunction(() => document.getElementById('presenter-status').classList.contains('connected'));
    await first.page.locator('#presenter-font-up').click();
    const font = await first.page.locator('#presenter-script').evaluate(e => getComputedStyle(e).getPropertyValue('--p-note-size'));
    assert.equal(first.context.pages().length, 2);
    const second = await start('second');
    assert.notEqual(second.info.profile, first.info.profile, 'Simultaneous launchers need distinct owned browsers');
    assert.notEqual(second.info.browserPid, first.info.browserPid);
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
    const nextPopup = third.page.waitForEvent('popup');
    await third.page.keyboard.press('s');
    await nextPopup;
    assert.equal(await third.page.locator('#presenter-script').evaluate(e => getComputedStyle(e).getPropertyValue('--p-note-size')), font);
    await quit(third, '\x03');
    console.log('PASS managed browser: Q/Esc/Ctrl+C close workbench, audience and server; concurrent browsers survive; preferences persist');
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
    fs.rmSync(folder, {recursive: true, force: true});
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
