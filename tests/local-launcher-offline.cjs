// Verifies the local launcher keeps serving after a damaged CMD and recovers on refresh,
// without a browser: the launcher's -NoBrowser mode exposes the real HTTP path.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..');
const built = path.join(root, 'dist', 'HIT-HTML-local.cmd');
const launcher = path.join(root, 'tools', 'local', 'Start-Presentation.ps1');
const source = fs.readFileSync(path.join(root, 'HIT-HTML.html'));

if (!fs.existsSync(built)) {
  console.error('dist/HIT-HTML-local.cmd is missing; run `python tools/package_local.py` first');
  process.exit(1);
}

const exe = process.env.HIT_POWERSHELL_EXECUTABLE
  || (process.platform === 'win32' ? 'powershell.exe' : 'pwsh');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'hit-corrupt-'));
const cmd = path.join(work, 'HIT-HTML-local.cmd');
const ready = path.join(work, 'ready.json');
fs.copyFileSync(built, cmd);
const original = fs.readFileSync(cmd);

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (check, message, timeout = 25000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (check()) return;
    await pause(50);
  }
  throw new Error(message);
};

function request(port, requestPath, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: requestPath, method }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

(async () => {
  const child = spawn(exe, [
    '-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', launcher,
    '-SelfPath', cmd, '-NoBrowser', '-Port', '0', '-ReadyFile', ready,
  ], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'] });
  let output = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (text) => { output += text; });
  child.stderr.on('data', (text) => { output += text; });
  let exited = false;
  child.on('exit', () => { exited = true; });

  try {
    await until(() => fs.existsSync(ready), 'launcher did not report readiness');
    const info = JSON.parse(fs.readFileSync(ready, 'utf8').replace(/^\uFEFF/, ''));
    const port = info.port;
    assert.ok(port > 0, 'expected a bound port');

    // 1. The page is served byte for byte.
    const first = await request(port, '/HIT-HTML.html');
    assert.equal(first.status, 200);
    assert.deepEqual(first.body, source, 'served page must match HIT-HTML.html');

    // 2. Unrelated requests still behave.
    assert.equal((await request(port, '/')).status, 200);
    assert.equal((await request(port, '/nope')).status, 404);
    assert.equal((await request(port, '/favicon.ico')).status, 204);
    assert.equal((await request(port, '/HIT-HTML.html', 'POST')).status, 405);

    // 3. Dropped speculative connections must not stop the server.
    for (let i = 0; i < 8; i += 1) {
      await new Promise((resolve) => {
        const socket = net.connect(port, '127.0.0.1', () => socket.destroy());
        socket.on('error', resolve);
        socket.on('close', resolve);
      });
    }
    assert.equal((await request(port, '/HIT-HTML.html')).status, 200);

    // 4. A CMD that lost its region marker answers 500 and keeps running.
    const lostRegionSource = original.toString('utf8')
      .replace('<!-- === HIT HTML START === -->', '<!-- === HIT HTML START ====-->');
    assert.notEqual(lostRegionSource, original.toString('utf8'), 'expected to break the region marker');
    fs.writeFileSync(cmd, lostRegionSource);
    const lostRegion = await request(port, '/HIT-HTML.html');
    assert.equal(lostRegion.status, 500, 'a damaged CMD must answer 500, not drop the connection');
    assert.match(lostRegion.body.toString('utf8'), /页面读取失败/);
    assert.equal(exited, false, 'the launcher must keep running after a read failure');

    // 5. A payload that is no longer gzip is reported instead of ending the presentation.
    const brokenPayload = original.toString('utf8')
      .replace(/(<!--HIT-GZIP:)[A-Za-z0-9+/=]+(-->)/, '$1AAAA$2');
    assert.notEqual(brokenPayload, original.toString('utf8'), 'expected to corrupt one marker');
    fs.writeFileSync(cmd, brokenPayload);
    const badGzip = await request(port, '/HIT-HTML.html');
    assert.equal(badGzip.status, 500, 'an undecodable marker must answer 500');
    assert.equal(exited, false);

    // 5b. A marker broken by a stray character is caught instead of rendering half a deck.
    const strayChar = original.toString('utf8')
      .replace(/(<!--HIT-GZIP:)([A-Za-z0-9+/=]{8})/, '$1$2!');
    assert.notEqual(strayChar, original.toString('utf8'), 'expected to insert a stray character');
    fs.writeFileSync(cmd, strayChar);
    const stray = await request(port, '/HIT-HTML.html');
    assert.equal(stray.status, 500, 'a half-valid marker must not be served as a comment');
    assert.equal(exited, false);

    // 6. Fixing the file restores service without a restart.
    fs.writeFileSync(cmd, original);
    const recovered = await request(port, '/HIT-HTML.html');
    assert.equal(recovered.status, 200);
    assert.deepEqual(recovered.body, source);

    // 7. Q still quits cleanly.
    child.stdin.write('q');
    await until(() => exited, 'launcher did not exit after Q', 15000);
    assert.equal(child.exitCode, 0, `unexpected exit code ${child.exitCode}`);
    console.log('local launcher survives a damaged CMD, reports it, and recovers on refresh');
  } catch (error) {
    console.error(output.slice(-4000));
    throw error;
  } finally {
    if (!exited) child.kill();
    fs.rmSync(work, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
