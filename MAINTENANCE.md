# SSH Tools Vue3 Maintenance

This directory is the maintainable Vue 3 rebuild of the unpacked XPLOT SSH Tools extension.

## Common Commands

```powershell
npm.cmd install
npm.cmd run build
node_modules\.bin\vsce.cmd package --no-dependencies --no-yarn --allow-missing-repository
code.cmd --install-extension .\sshtools-1.0.82.vsix --force
```

## Important Paths

- `src/webview/main.js`: Vue 3 webview application and VS Code message protocol.
- `src/webview/styles.css`: webview styling.
- `out/extension.js`: original extension host bundle from the VSIX.
- `out/webview/js/app.xplot.js`: generated Vue 3 webview bundle.
- `package.json`: VS Code extension manifest and dependency versions.

## Verification

```powershell
npm.cmd run build
npm.cmd audit
code.cmd --list-extensions --show-versions | Select-String -Pattern 'sshtools'
```
