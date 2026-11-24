// CI installs with `npm ci`, which downloads every tarball from the URLs pinned in
// package-lock.json. A corporate mirror there makes the workflow fail on GitHub runners,
// so keep the lockfile on the public registry.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const registry = 'https://registry.npmjs.org/';
const lock = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package-lock.json'), 'utf8'));
const offending = Object.entries(lock.packages || {})
  .filter(([name, entry]) => name && typeof entry.resolved === 'string' && !entry.resolved.startsWith(registry))
  .map(([name, entry]) => `  ${name} -> ${entry.resolved}`);

assert.deepEqual(offending, [], [
  `package-lock.json must resolve from ${registry}.`,
  'Regenerate it with:',
  `  npm install --package-lock-only --registry=${registry}`,
  'and revert any mirror URL left in the resolved fields.',
].join('\n'));

console.log(`lockfile OK: ${Object.keys(lock.packages).length} entries resolve from ${registry}`);
