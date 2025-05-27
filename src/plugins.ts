// src/plugins.ts
// 这个文件用于注册所有可用的插件

import { registerPlugin, activatePlugin } from './core/plugin-system';
import i18n from 'i18next';

// 导入示例插件
import examplePluginFactory from './features/plugins/example';

// 注册所有插件
export async function registerAllPlugins() {
  // 创建翻译函数
  const t = (key: string, defaultValue?: string) => i18n.t(key, { defaultValue });
  
  // 注册示例插件
  const examplePlugin = examplePluginFactory(t);
  await registerPlugin(examplePlugin);
  
  // 默认激活示例插件
  await activatePlugin('example');
}
