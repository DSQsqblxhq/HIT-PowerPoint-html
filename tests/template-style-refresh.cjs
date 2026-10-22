const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync(path.join(__dirname, '../HIT-HTML.html'), 'utf8');
const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const withFont = (source, size) => source.replace(/(\.contents-item\{[^}]*font-size:)\d+px/, `$1${size}px`);
const stale = withFont(html, 56), latest = withFont(html, 64);
function stylesOf(source) {
  return [...source.matchAll(/<style data-hit-style="([^"]+)"[^>]*>([\s\S]*?)<\/style>/g)]
    .map(([, name, text]) => ({dataset: {hitStyle: name}, textContent: text}));
}
function setup({protocol = 'https:', responseHtml = latest, ok = true, reject = false, deferred = false} = {}) {
  const styles = stylesOf(stale), events = new Map(), calls = [], timers = new Map();
  assert.equal(styles.length, 2);
  let now = 10000, timerId = 0, release, hidden = false, reloads = 0;
  const location = {protocol, href: `${protocol}//example.test/HIT-HTML.html?role=deck#/3`,
    reload() { reloads++; }};
  const originalHref = location.href;
  const listen = (name, fn) => events.set(name, fn);
  const document = {
    documentElement: {dataset: {}}, get hidden() { return hidden; },
    addEventListener: listen, querySelectorAll() { return styles; },
  };
  const context = {
    location, document, window: {addEventListener: listen}, URL, URLSearchParams, AbortController,
    Date: {now: () => now},
    setTimeout(fn) { const id = ++timerId; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); },
    fetch: async (url, options) => {
      calls.push({url, options});
      if (reject) throw new Error('Offline');
      if (deferred) await new Promise(resolve => { release = resolve; });
      return {ok, text: async () => responseHtml};
    },
    DOMParser: class {
      parseFromString(source) {
        const next = stylesOf(source);
        return {querySelector(selector) {
          const name = selector.match(/data-hit-style="([^"]+)"/)[1];
          return next.find(style => style.dataset.hitStyle === name) || null;
        }};
      }
    },
  };
  vm.runInNewContext(bootstrap, context);
  return {styles, calls, events, timers, location, originalHref,
    advance() { now += 2000; }, hide(value) { hidden = value; }, release() { release(); },
    get reloads() { return reloads; }, fire: event => events.get(event)?.()};
}

(async () => {
  for (const event of ['pageshow', 'focus', 'hashchange', 'visibilitychange']) {
    const env = setup();
    await env.fire(event);
    assert.match(env.styles[0].textContent, /\.contents-item\{[^}]*font-size:64px/);
    assert.equal(env.styles[1].textContent, stylesOf(latest)[1].textContent);
    assert.equal(env.reloads, 0, 'Updating cached styles must not reload the presentation');
    assert.equal(env.location.href, env.originalHref, 'The visible URL and slide must stay intact');
    const {url, options} = env.calls[0];
    assert.equal(options.cache, 'no-store');
    assert.equal(new URL(url).hash, '');
    assert.ok(new URL(url).searchParams.has('hit-style-check'));
    assert.equal(env.timers.size, 0);
  }
  for (const options of [{ok: false}, {reject: true}, {responseHtml: '<html>Unavailable</html>'},
    {responseHtml: latest.replace('data-hit-style="presenter"', 'data-unrelated="presenter"')}]) {
    const env = setup(options), before = env.styles.map(style => style.textContent);
    await env.fire('focus');
    assert.deepEqual(env.styles.map(style => style.textContent), before, 'Failed or incomplete responses must preserve every style');
    assert.equal(env.timers.size, 0);
  }
  const local = setup({protocol: 'file:'});
  await local.fire('pageshow');
  assert.equal(local.calls.length, 0, 'Offline HTML must not request a remote copy');
  const background = setup();
  background.hide(true); await background.fire('visibilitychange');
  assert.equal(background.calls.length, 0);
  background.hide(false); await background.fire('visibilitychange');
  assert.equal(background.calls.length, 1);
  const busy = setup({deferred: true});
  const first = busy.fire('focus'); await busy.fire('hashchange');
  assert.equal(busy.calls.length, 1, 'Concurrent triggers must share the active check');
  busy.release(); await first; await busy.fire('pageshow');
  assert.equal(busy.calls.length, 1, 'Immediate repeat events must be throttled');
  busy.advance(); const next = busy.fire('hashchange'); busy.release(); await next;
  assert.equal(busy.calls.length, 2);
  console.log('Template styles refresh on load, focus and navigation without reloading or changing the URL; offline and failed responses preserve the current presentation');
})().catch(error => { console.error(error); process.exit(1); });
