const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const requiredFiles = [
  "package.json",
  "out/extension.js",
  "out/webview/index.html",
  "out/webview/app.html",
  "out/webview/js/app.xplot.js",
  "resources/images/ssh.png",
  "resources/images/workspace.png",
  "package.nls.json",
  "package.nls.zh-cn.json",
];

for (const file of requiredFiles) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) {
    throw new Error(`Missing required extension asset: ${file}`);
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
if (pkg.main !== "./out/extension.js") {
  throw new Error(`package.json main must remain ./out/extension.js, got ${pkg.main}`);
}

for (const command of ["xplot.add", "xplot.refresh", "xplot.connection.terminal"]) {
  const exists = pkg.contributes.commands.some((item) => item.command === command);
  if (!exists) {
    throw new Error(`Missing contributed command: ${command}`);
  }
}

console.log("Extension package assets verified.");
