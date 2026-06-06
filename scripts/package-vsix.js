const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const outputDir = path.join(root, 'packages');
const vsceBin = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'vsce.cmd' : 'vsce');

function getPackageLabel() {
  if (process.env.VSIX_LABEL) {
    return process.env.VSIX_LABEL;
  }

  const tag = spawnSync('git', ['describe', '--exact-match', '--tags', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  const label = tag.status === 0 ? tag.stdout.trim() : '';
  return label || pkg.version;
}

const packageLabel = getPackageLabel().replace(/[\\/:*?"<>|]/g, '-');
const outputFile = path.join(outputDir, `${pkg.name}-${packageLabel}.vsix`);

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
