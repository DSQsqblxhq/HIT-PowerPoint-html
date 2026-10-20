const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../HIT-HTML.html'), 'utf8');
const runtime = html.match(/<script>[\s\S]*?<\/script>/g).at(-1).slice(8, -9);
const declarations = [...runtime.matchAll(/(?:async )?function [\w$]+\(/g)];
const functions = ['Me', 'Ae', 'Xe', 'Ze', '_e', 'Qe', 'et', 'ut', 'Ve', 'ft', 'webScreenBox', 'webPlacement', 'webSwap', 'webSwapAudience', 'webSwapComplete'];
const source = functions.map(name => {
  const index = declarations.findIndex(match => new RegExp(`function ${name}\\(`).test(match[0]));
  assert.ok(index >= 0, `Missing runtime function: ${name}`);
  return runtime.slice(declarations[index].index, declarations[index + 1]?.index).trim();
}).join('\n');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const until = async (check, message) => {
  const deadline = Date.now() + 4500;
  while (Date.now() < deadline) { if (check()) return; await pause(20); }
  throw new Error(message);
};

async function verify(side) {
  const screens = [
    {availLeft: 0, availTop: 0, availWidth: 1920, availHeight: 1040, label: 'Main'},
    {availLeft: side === 'left' ? -2560 : 1920, availTop: -200, availWidth: 2560, availHeight: 1400, label: 'Secondary'},
  ];
  const errors = [], requests = [], exits = [];
  let id = 0, audience, presenter;
  function create(role, screenIndex) {
    let geometry = {x: screens[screenIndex].availLeft + 50, y: screens[screenIndex].availTop + 50, width: 1000, height: 700};
    let ignoredMoves = 2, movePending = false;
    const document = {fullscreenElement: role === 'audience' ? {} : null};
    const own = {
      get screenX() { return geometry.x; }, get screenY() { return geometry.y; },
      get outerWidth() { return geometry.width; }, get outerHeight() { return geometry.height; },
      resizeTo(width, height) { geometry.width = width; geometry.height = height; },
      moveTo(x, y) {
        if (ignoredMoves-- > 0 || movePending) return;
        movePending = true;
        setTimeout(() => { geometry.x = x; geometry.y = y; movePending = false; }, 100);
      },
      focus() {},
    };
    document.exitFullscreen = async () => {
      exits.push(role);
      document.fullscreenElement = null;
      // Native fullscreen teardown can restore old bounds after the next request.
      setTimeout(() => { geometry.x = 100; geometry.y = 100; }, 160);
    };
    document.documentElement = {requestFullscreen: async options => {
      const screen = options?.screen;
      assert.ok(screen, 'Every cross-screen transition must retain an explicit target');
      requests.push(screen.availLeft);
      document.fullscreenElement = {};
      // Resolve before native position events have reached the renderer.
      setTimeout(() => {
        geometry = {x: screen.availLeft, y: screen.availTop, width: screen.availWidth, height: screen.availHeight};
      }, 100);
    }};
    const context = vm.createContext({
      window: own, document, Date, Math, Number, Array, Promise, setTimeout, clearTimeout,
      A: {screens, currentScreen: screens[screenIndex]}, // deliberately stale after moving
      u: role, J: null, z: null, H: null, W: null, q: 'auto', R: false, U: true,
      f: role, v: 'https://hit.test', x: null, o: 'test', s: 'deck', p: 'session', _: 0,
      i: () => `swap-${++id}`,
      xt(swapId, phase, initiator) { return context.J = {id: swapId, phase, initiator}; },
      bt() { context.J = null; },
      tt() {}, Je: async () => context.A, fe() {}, je() {}, ct() {}, Ce() {}, Oe() {}, at() {},
      Ke(message) { context.notice = message; },
      Le(type, data) {
        const destination = role === 'audience' ? presenter : audience;
        const message = context.Me(type, data);
        if (message.sender === destination.f) return;
        if (message.type === 'web-swap-begin') { if (!destination.J) destination.xt(message.swapId, 'web', role); }
        else if (message.type === 'web-swap-result') destination.webSwapComplete(message).catch(error => errors.push(error));
        else if (message.type === 'web-swap-done') {
          assert.equal(destination.J?.id, message.swapId);
          destination.bt();
        }
      },
    });
    vm.runInContext(source, context);
    context.z = context._e(screens[screenIndex]);
    return context;
  }
  audience = create('audience', 1);
  presenter = create('presenter', 0);
  presenter.H = audience.Ae();
  presenter.x = {...audience.window, postMessage(data) { audience.webSwapAudience(data).catch(error => errors.push(error)); }};
  // Keep the peer getters live, as WindowProxy does.
  Object.defineProperties(presenter.x, Object.fromEntries(['screenX', 'screenY', 'outerWidth', 'outerHeight'].map(key => [key, {get: () => audience.window[key]}])));
  audience.x = presenter.window;

  for (let count = 0; count < 6; count++) {
    const endpoint = [presenter, presenter, audience, audience, presenter, audience][count];
    endpoint.webSwap();
    assert.ok(audience.J || presenter.J, 'Swap must stay locked while native windows are moving');
    await pause(140);
    assert.ok(audience.J, 'Audience must wait for workbench placement acknowledgment');
    assert.ok(presenter.J, 'The peer swap control must also stay locked during fullscreen movement');
    await until(() => !audience.J && !presenter.J, `Swap ${count + 1} did not finish`);
    const audienceScreen = screens[count % 2 ? 1 : 0], presenterScreen = screens[count % 2 ? 0 : 1];
    assert.ok(audience.Qe(audience._e(audienceScreen), audience.Ae()), `${side}: audience swap ${count + 1}`);
    assert.ok(presenter.Qe(presenter._e(presenterScreen), presenter.Ae()), `${side}: presenter swap ${count + 1}`);
    assert.ok(audience.document.fullscreenElement);
    presenter.H = audience.Ae();
  }
  assert.equal(exits.length, 0, 'Retarget fullscreen without racing restored browser bounds');
  assert.equal(requests.length, 6);
  assert.deepEqual(errors, []);
  console.log(`PASS ${side}: six swaps, stale screen metadata, delayed fullscreen bounds and ignored initial window moves`);
}

(async () => { await verify('left'); await verify('right'); })().catch(error => {console.error(error); process.exitCode = 1;});
