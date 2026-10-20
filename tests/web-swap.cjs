const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '../HIT-HTML.html'), 'utf8');
const runtime = html.match(/<script>[\s\S]*?<\/script>/g).at(-1).slice(8, -9);
const declarations = [...runtime.matchAll(/(?:async )?function [\w$]+\(/g)];
const functions = ['Me', 'Ae', 'Xe', 'Ze', '_e', 'Qe', 'et', 'ut', 'Ve', 'webScreenBox', 'webScreenMatches', 'webPlacement', 'webSwap', 'webSwapAudience', 'webSwapComplete'];
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

async function verify(side, ignoreSecondTarget = false) {
  const screens = [
    {availLeft: 0, availTop: 0, availWidth: 1920, availHeight: 1040, label: 'Main'},
    {availLeft: side === 'left' ? -2560 : 1920, availTop: -200, availWidth: 2560, availHeight: 1400, label: 'Secondary'},
  ];
  const errors = [], requests = [], exits = [], focusedOverlaps = [];
  let id = 0, audience, presenter;
  function create(role, screenIndex) {
    // A fullscreen tab can keep reporting its underlying normal-window bounds.
    let geometry = {x: role === 'audience' ? 100 : screens[screenIndex].availLeft + 50, y: 50, width: 1000, height: 700};
    let currentScreen = screens[screenIndex];
    let ignoredMoves = 2, movePending = false;
    const document = {fullscreenElement: role === 'audience' ? {} : null};
    const own = {
      get screenX() { return geometry.x; }, get screenY() { return geometry.y; },
      get outerWidth() { return geometry.width; }, get outerHeight() { return geometry.height; },
      resizeTo(width, height) { geometry.width = width; geometry.height = height; },
      moveTo(x, y) {
        if (ignoredMoves-- > 0 || movePending) return;
        movePending = true;
        setTimeout(() => {
          geometry.x = x; geometry.y = y; movePending = false;
          currentScreen = screens.find(screen => x + geometry.width / 2 >= screen.availLeft && x + geometry.width / 2 < screen.availLeft + screen.availWidth) || currentScreen;
        }, 100);
      },
      focus() { if (role === 'presenter' && currentScreen === audience.A.currentScreen) focusedOverlaps.push(currentScreen.availLeft); },
      getScreenDetails: async () => context.A,
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
      assert.notEqual(presenter.A.currentScreen, screen, 'Move the workbench away before requesting fullscreen on its previous display');
      requests.push({left: screen.availLeft, wasFullscreen: !!document.fullscreenElement});
      document.fullscreenElement = document.documentElement;
      // Resolving requestFullscreen does not prove that the native screen changed.
      // A rejected placement may even leave the old fullscreen display in use.
      if (!(ignoreSecondTarget && requests.length === 2)) setTimeout(() => { currentScreen = screen; }, 650);
    }};
    document.fullscreenElement = role === 'audience' ? document.documentElement : null;
    const context = vm.createContext({
      window: own, document, Date, Math, Number, Array, Promise, setTimeout, clearTimeout,
      A: {screens, get currentScreen() { return currentScreen; }},
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

  let successfulSwaps = 0;
  for (let count = 0; count < 6; count++) {
    const endpoint = [presenter, presenter, audience, audience, presenter, audience][count];
    endpoint.webSwap();
    assert.ok(audience.J || presenter.J, 'Swap must stay locked while native windows are moving');
    await pause(250);
    assert.ok(audience.J, 'Audience must wait for workbench placement acknowledgment');
    assert.ok(presenter.J, 'The peer swap control must also stay locked during fullscreen movement');
    await until(() => !audience.J && !presenter.J, `Swap ${count + 1} did not finish`);
    if (!(ignoreSecondTarget && count === 1)) successfulSwaps++;
    const audienceScreen = screens[successfulSwaps % 2 ? 0 : 1], presenterScreen = screens[successfulSwaps % 2 ? 1 : 0];
    assert.equal(audience.A.currentScreen, audienceScreen, `${side}: actual audience screen after swap ${count + 1}`);
    assert.equal(presenter.A.currentScreen, presenterScreen, `${side}: actual presenter screen after swap ${count + 1}: ${JSON.stringify({geometry: presenter.Ae(), notice: presenter.notice, errors: errors.map(String)})}`);
    assert.ok(presenter.Qe(presenter._e(presenterScreen), presenter.Ae()), `${side}: presenter swap ${count + 1}`);
    if (ignoreSecondTarget && count === 1) assert.match(presenter.notice, /换屏全屏未完成/);
    assert.ok(audience.document.fullscreenElement);
    presenter.H = audience.Ae();
  }
  assert.equal(exits.length, 0, 'Retarget fullscreen without triggering native restore-bounds transitions');
  assert.deepEqual(focusedOverlaps, [], 'Focus the workbench only after the windows are on separate screens');
  assert.equal(requests.length, 6);
  assert.ok(requests.every(request => request.wasFullscreen), 'Each swap retargets the existing fullscreen element');
  assert.deepEqual(errors, []);
  console.log(`PASS ${side}${ignoreSecondTarget ? '/ignored-target' : ''}: six swaps, retained normal bounds, delayed actual screens, ignored moves and separate displays`);
}

(async () => { await verify('left'); await verify('right'); await verify('left', true); })().catch(error => {console.error(error); process.exitCode = 1;});
