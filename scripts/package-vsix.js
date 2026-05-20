const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const outputDir = path.join(root, 'packages');
const outputFile = path.join(outputDir, `${pkg.name}-${pkg.version}.vsix`);
const vsceBin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'vsce.cmd' : 'vsce');

fs.mkdirSync(outputDir, { recursive: true });

const result = spawnSync(
  vsceBin,
  [
    'package',
    '--no-dependencies',
    '--allow-star-activation',
    '--out',
    outputFile
  ],
  {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32'
  }
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status || 0);
