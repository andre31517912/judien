import { getRequestConfig } from 'next-intl/server';
import { locales } from '@judien/shared';

export default getRequestConfig(async ({ locale }) => ({
  messages: locale === 'zh' ? locales.zh : locales.en,
}));
