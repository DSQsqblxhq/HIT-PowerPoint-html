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
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'HIT single 中文 & ! (test) '));
  const single = path.join(folder, 'HIT-HTML-local.cmd');
  const ready = path.join(folder, 'server-ready.json');
  const content = fs.readFileSync(path.join(root, 'HIT-HTML.html'));
  const payload = fs.readFileSync(path.join(root, 'dist/HIT-HTML-local.cmd'));
  fs.writeFileSync(single, payload);
  assert.deepEqual(fs.readdirSync(folder), ['HIT-HTML-local.cmd']);
  assert.deepEqual(Buffer.from(payload.toString('utf8').match(/\r?\n<!-- === HIT HTML START === -->\r?\n([\s\S]*)$/)[1]), content);
  const powershell = process.env.HIT_POWERSHELL_EXECUTABLE || (process.platform === 'win32' ? 'powershell.exe' : 'pwsh');
  const env = {...process.env, HIT_PRESENTATION_SELF: single, HIT_PRESENTATION_POWERSHELL: powershell, HIT_PRESENTATION_PORT: '0', HIT_PRESENTATION_NO_BROWSER: '1', HIT_PRESENTATION_READY_FILE: ready};
  const bootstrap = payload.toString('utf8').split(/\r?\n/).find(line => line.includes(' -Command '));
  const command = bootstrap.match(/ -Command "(.*)"$/)[1];
  // Windows runs the actual CMD entry point; Linux exercises its exact PowerShell command.
  const server = process.platform === 'win32'
    ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `""${single}""`], {windowsHide: true, windowsVerbatimArguments: true, env})
    : spawn(powershell, ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {env});
  let closed = false;
  const stopped = new Promise(resolve => server.once('close', () => {closed = true; resolve();}));
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
    for (const target of ['/missing', '/HIT-HTML-local.cmd', '/Start-Presentation.ps1', '/%2e%2e/LICENSE']) {
      assert.equal((await get(new URL(target, url))).status, 404);
    }
    assert.equal((await get(url, {method: 'POST'})).status, 405);
    assert.equal((await get(url, {headers: {Host: 'example.com'}})).status, 400);
    assert.equal((await get(new URL('/favicon.ico', url))).status, 204);
    const updated = Buffer.concat([content, Buffer.from('\n<!-- local edit -->\n')]);
    fs.writeFileSync(single, Buffer.concat([payload, Buffer.from('\n<!-- local edit -->\n')]));
    assert.deepEqual((await get(url)).body, updated);
    fs.writeFileSync(single, payload);
    assert.deepEqual(fs.readdirSync(folder).sort(), ['HIT-HTML-local.cmd', 'server-ready.json']);
    if (process.env.HIT_VERIFY_LAUNCHER_SCREENS === '1') {
      const test = spawn(process.execPath, [path.join(__dirname, 'presenter-multiscreen.cjs')], {stdio: 'inherit', env: {...process.env, HIT_PRESENTATION_URL: info.url}});
      const code = await new Promise((resolve, reject) => {test.on('exit', resolve); test.on('error', reject);});
      assert.equal(code, 0, 'Native multiscreen tests through the launcher failed');
    }
    console.log('PASS single CMD: native entry point, Unicode/special-character paths, no companion files, exact HTML, edit/reload and restricted loopback routes');
  } finally {
    if (!closed) {
      if (process.platform === 'win32') {
        const kill = spawn('taskkill.exe', ['/pid', String(server.pid), '/T', '/F'], {windowsHide: true, stdio: 'ignore'});
        await new Promise(resolve => kill.once('close', resolve));
      } else server.kill();
      await stopped;
    }
    fs.rmSync(folder, {recursive: true, force: true});
  }
})().catch(error => {console.error(error); process.exitCode = 1;});
