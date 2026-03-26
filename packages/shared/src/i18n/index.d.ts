import en from './en';
import zh from './zh';
import type { I18nDict } from './en';
import type { PreferredLanguage } from '../types';
export declare const locales: Record<PreferredLanguage, I18nDict>;
/**
 * Simple template interpolation: replaces {{key}} with values[key].
 * Works for both EN and ZH strings.
 */
export declare const t: (template: string, values?: Record<string, string | number>) => string;
export declare const getDict: (lang: PreferredLanguage) => I18nDict;
export type { I18nDict };
export { en, zh };
//# sourceMappingURL=index.d.ts.map