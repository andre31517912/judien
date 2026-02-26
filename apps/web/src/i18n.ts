import { getRequestConfig } from 'next-intl/server';
import en from '../../packages/shared/src/i18n/en';
import zh from '../../packages/shared/src/i18n/zh';

export default getRequestConfig(async ({ locale }) => ({
  messages: locale === 'zh' ? zh : en,
}));
