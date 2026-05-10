// Minimal XRegExp compatibility layer using native RegExp
// XRegExp.cache() → new RegExp()
// XRegExp.exec() → wraps native exec() to put named groups on result object

function XRegExp() { return RegExp.apply(null, arguments); }

XRegExp.cache = function(pattern) {
    // Strip XRegExp (?<name>...) syntax → native RegExp named groups
    // (actually native JS RegExp already supports (?<name>...) since ES2018)
    return new RegExp(pattern);
};

XRegExp.exec = function(text, regex) {
    var result = regex.exec(text);
    if (!result) return null;
    // Copy named groups to result object directly (mimics XRegExp behavior)
    if (result.groups) {
        Object.keys(result.groups).forEach(function(key) {
            result[key] = result.groups[key];
        });
    }
    return result;
};

module.exports = XRegExp;
