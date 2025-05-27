// src/features/plugins/example/i18n/index.ts
import enUS from './en-US';
import zhCN from './zh-CN';
import type { I18nResources } from '@/core/plugin-system';

// 导出插件的国际化资源
const i18nResources: I18nResources = {
  namespace: 'example',
  resources: {
    'en-US': enUS,
    'zh-CN': zhCN
  }
};

export default i18nResources;
