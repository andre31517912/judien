import en from './en';
import zh from './zh';
import type { I18nDict } from './en';
import type { PreferredLanguage } from '../types';

export const locales: Record<PreferredLanguage, I18nDict> = { en, zh };

/**
 * Simple template interpolation: replaces {{key}} with values[key].
 * Works for both EN and ZH strings.
 */
export const t = (
  template: string,
  values?: Record<string, string | number>,
): string => {
  if (!values) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    values[key] !== undefined ? String(values[key]) : `{{${key}}}`,
  );
};

export const getDict = (lang: PreferredLanguage): I18nDict => locales[lang] ?? en;

export type { I18nDict };
export { en, zh };
