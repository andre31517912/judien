"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.zh = exports.en = exports.getDict = exports.t = exports.locales = void 0;
const en_1 = __importDefault(require("./en"));
exports.en = en_1.default;
const zh_1 = __importDefault(require("./zh"));
exports.zh = zh_1.default;
exports.locales = { en: en_1.default, zh: zh_1.default };
/**
 * Simple template interpolation: replaces {{key}} with values[key].
 * Works for both EN and ZH strings.
 */
const t = (template, values) => {
    if (!values)
        return template;
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] !== undefined ? String(values[key]) : `{{${key}}}`);
};
exports.t = t;
const getDict = (lang) => exports.locales[lang] ?? en_1.default;
exports.getDict = getDict;
//# sourceMappingURL=index.js.map