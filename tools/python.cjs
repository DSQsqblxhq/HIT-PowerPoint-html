// Resolve the platform's Python 3 so `npm run build:html` works on Windows and Linux alike.
const { spawnSync } = require('node:child_process');

const candidates = process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'];
const args = process.argv.slice(2);
for (const candidate of candidates) {
  if (spawnSync(candidate, ['--version'], { stdio: 'ignore' }).status === 0) {
    const result = spawnSync(candidate, args, { stdio: 'inherit' });
    process.exit(result.status === null ? 1 : result.status);
  }
}
console.error('Python 3 was not found. Install it, or run the tools/*.py scripts directly.');
process.exit(1);
