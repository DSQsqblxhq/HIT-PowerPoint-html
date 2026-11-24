// Content and release-metadata integrity for the deck, without a browser.
// Catches the class of slip where a page is added/moved but CONFIG, NOTES or the docs
// still describe the old deck.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'HIT-HTML.html'), 'utf8');

function evaluate(source) {
  return new Function(`return (${source});`)();
}

// --- slides ---------------------------------------------------------------------------
const slides = [...html.matchAll(/<section\b([^>]*\bclass="[^"]*\bslide\b[^"]*"[^>]*)>/g)]
  .map(([, attributes]) => attributes);
assert.ok(slides.length > 0, 'no slides found');
for (const [index, attributes] of slides.entries()) {
  const label = /aria-label="([^"]*)"/.exec(attributes);
  assert.ok(label && label[1].trim(), `slide ${index + 1} needs a non-empty aria-label`);
  const section = /data-section="(-?\d+)"/.exec(attributes);
  assert.ok(section, `slide ${index + 1} needs data-section`);
}

// --- CONFIG / NOTES -------------------------------------------------------------------
const config = evaluate(/const CONFIG=(\{[\s\S]*?\});/.exec(html)[1]);
const notes = evaluate(/const NOTES=(\[[\s\S]*?\r?\n\];)/.exec(html)[1].replace(/;$/, ''));
assert.ok(Number.isInteger(config.width) && Number.isInteger(config.height), 'CONFIG needs a canvas size');
assert.equal(notes.length, slides.length, 'NOTES must have one entry per slide');

const chapters = config.sections;
assert.ok(Array.isArray(chapters) && chapters.length > 0, 'CONFIG.sections must not be empty');
let previousPage = 0;
for (const [index, chapter] of chapters.entries()) {
  assert.ok(chapter.title && chapter.title.trim(), `chapter ${index + 1} needs a title`);
  assert.ok(Number.isInteger(chapter.page), `chapter ${index + 1} needs an integer page`);
  assert.ok(chapter.page >= 1 && chapter.page <= slides.length,
    `chapter ${index + 1} points at page ${chapter.page}, outside 1..${slides.length}`);
  assert.ok(chapter.page > previousPage, 'chapter start pages must increase');
  previousPage = chapter.page;
  const target = /data-section="(-?\d+)"/.exec(slides[chapter.page - 1]);
  assert.equal(Number(target[1]), index,
    `chapter ${index + 1} starts on page ${chapter.page}, which belongs to data-section ${target[1]}`);
}

// --- document hygiene -----------------------------------------------------------------
const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(([, id]) => id);
assert.deepEqual(ids.filter((id, index) => ids.indexOf(id) !== index), [], 'ids must be unique');
for (const [, image] of html.matchAll(/<img\b([^>]*)>/g)) {
  assert.ok(/\balt="/.test(image), `every <img> needs alt text: ${image.trim().slice(0, 80)}`);
}

// --- release metadata -----------------------------------------------------------------
const version = /<meta name="version" content="([^"]+)">/.exec(html);
assert.ok(version, 'HIT-HTML.html must declare <meta name="version">');
const releaseNotes = path.join(root, 'docs', `RELEASE_v${version[1]}.md`);
assert.ok(fs.existsSync(releaseNotes),
  `docs/RELEASE_v${version[1]}.md must exist for the deck version ${version[1]}`);

const docs = ['README.md', 'docs/USAGE.md'].map((name) => [name, fs.readFileSync(path.join(root, name), 'utf8')]);
for (const [name, text] of docs) {
  const pinned = [...text.matchAll(/releases\/download\/v[\d.]+/g)].map(([match]) => match);
  assert.deepEqual(pinned, [],
    `${name} must link to releases/latest/download so a release needs no doc edit`);
}

console.log(`deck structure OK: ${slides.length} slides, ${chapters.length} chapters, `
  + `version ${version[1]} with docs/RELEASE_v${version[1]}.md`);
