const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const {spawn} = require('node:child_process');

const root = path.resolve(__dirname, '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const get = (url, options = {}) => new Promise((resolve, reject) => {
  const request = http.request(url, options, response => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => resolve({status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks)}));
  });
  request.setTimeout(6000, () => request.destroy(new Error('HTTP timeout')));
  request.on('error', reject);
  request.end();
});

(async () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'HIT local 中文 '));
  const html = path.join(folder, 'HIT-HTML.html');
  const ready = path.join(folder, 'server-ready.json');
  const content = fs.readFileSync(path.join(root, 'HIT-HTML.html'));
  for (const name of ['Start-Presentation.ps1', 'Start-Presentation.cmd']) {
    fs.copyFileSync(path.join(root, 'tools/local', name), path.join(folder, name));
  }
  fs.writeFileSync(html, content);
  const powershell = process.env.HIT_POWERSHELL_EXECUTABLE || (process.platform === 'win32' ? 'powershell.exe' : 'pwsh');
  const server = spawn(powershell, ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(folder, 'Start-Presentation.ps1'), '-Port', '0', '-NoBrowser', '-ReadyFile', ready], {windowsHide: true});
  let logs = '', startupError;
  server.stdout.on('data', data => {logs += data;});
  server.stderr.on('data', data => {logs += data;});
  server.on('error', error => {startupError = error;});
  try {
    const deadline = Date.now() + 20000;
    while (!fs.existsSync(ready) && Date.now() < deadline && server.exitCode === null && !startupError) await pause(50);
    if (startupError) throw startupError;
    assert.ok(fs.existsSync(ready), 'Launcher did not become ready: ' + logs);
    const info = JSON.parse(fs.readFileSync(ready, 'utf8').replace(/^\uFEFF/, ''));
    assert.equal(info.address, '127.0.0.1');
    const url = new URL(info.url);
    assert.equal(url.hostname, '127.0.0.1');
    const result = await get(url);
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, content);
    assert.equal(Number(result.headers['content-length']), content.length);
    assert.equal(result.headers['permissions-policy'], 'window-management=(self)');
    assert.equal(result.headers['cache-control'], 'no-store');
    const head = await get(url, {method: 'HEAD'});
    assert.equal(head.status, 200);
    assert.equal(head.body.length, 0);
    assert.equal(Number(head.headers['content-length']), content.length);
    for (const target of ['/missing', '/Start-Presentation.ps1', '/%2e%2e/LICENSE']) {
      assert.equal((await get(new URL(target, url))).status, 404);
    }
    assert.equal((await get(url, {method: 'POST'})).status, 405);
    assert.equal((await get(url, {headers: {Host: 'example.com'}})).status, 400);
    assert.equal((await get(new URL('/favicon.ico', url))).status, 204);
    const updated = Buffer.concat([content, Buffer.from('\n<!-- local edit -->\n')]);
    fs.writeFileSync(html, updated);
    assert.deepEqual((await get(url)).body, updated);
    fs.writeFileSync(html, content);
    if (process.env.HIT_VERIFY_LAUNCHER_SCREENS === '1') {
      const test = spawn(process.execPath, [path.join(__dirname, 'presenter-multiscreen.cjs')], {stdio: 'inherit', env: {...process.env, HIT_PRESENTATION_URL: info.url}});
      const code = await new Promise((resolve, reject) => {test.on('exit', resolve); test.on('error', reject);});
      assert.equal(code, 0, 'Native multiscreen tests through the launcher failed');
    }
    console.log('PASS local launcher: PowerShell runtime, Unicode paths, exact HTML bytes, HEAD, edit/reload and restricted loopback routes');
  } finally {
    if (server.exitCode === null) {
      const closed = new Promise(resolve => server.once('exit', resolve));
      server.kill();
      await closed;
    }
    fs.rmSync(folder, {recursive: true, force: true});
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
