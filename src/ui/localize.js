// Alias for localize
// Recovered module id: 3
"use strict";

const fs_extra_1 = require("fs-extra");
const { resolve } = require("path");
const { extensions } = require("vscode");
class Localize {
    constructor() {
        this.bundle = this.resolveLanguagePack();
    }
    localize(key, ...args) {
        const message = this.bundle[key] || key;
        return this.format(message, args);
    }
    init() {
        try {
            this.options = Object.assign({ locale: 'en' }, this.options, JSON.parse(process.env.VSCODE_NLS_CONFIG || '{"locale":"en"}'));
        }
        catch (err) {
            throw err;
        }
    }
    format(message, args = []) {
        return args.length
            ? message.replace(/\{(\d+)\}/g, (match, rest) => args[rest[0]] || match)
            : message;
    }
    resolveLanguagePack() {
        this.init();
        const languageFormat = "package.nls{0}.json";
        const defaultLanguage = languageFormat.replace("{0}", "");
        const extension = extensions.getExtension("charley008.sshtools2");
        const rootPath = extension
            ? extension.extensionPath
            : (0, resolve)(__dirname, "..");
        const resolvedLanguage = this.recurseCandidates(rootPath, languageFormat, this.options.locale);
        const languageFilePath = (0, resolve)(rootPath, resolvedLanguage);
        try {
            const defaultLanguageBundle = JSON.parse(resolvedLanguage !== defaultLanguage
                ? (0, fs_extra_1.readFileSync)((0, resolve)(rootPath, defaultLanguage), "utf-8")
                : "{}");
            const resolvedLanguageBundle = JSON.parse((0, fs_extra_1.readFileSync)(languageFilePath, "utf-8"));
            return Object.assign(Object.assign({}, defaultLanguageBundle), resolvedLanguageBundle);
        }
        catch (err) {
            throw err;
        }
    }
    recurseCandidates(rootPath, format, candidate) {
        const filename = format.replace("{0}", `.${candidate}`);
        const filepath = (0, resolve)(rootPath, filename);
        if ((0, fs_extra_1.existsSync)(filepath)) {
            return filename;
        }
        if (candidate.split("-")[0] !== candidate) {
            return this.recurseCandidates(rootPath, format, candidate.split("-")[0]);
        }
        return format.replace("{0}", "");
    }
}
exports.Localize = Localize;
exports.default = Localize.prototype.localize.bind(new Localize());
