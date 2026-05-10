// SSH Tools VS Code extension entry
const { activate, deactivate } = require('./entry');

exports.activate = activate;
exports.deactivate = deactivate || (() => {});
