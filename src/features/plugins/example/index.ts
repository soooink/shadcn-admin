import type { Plugin } from '@/core/plugin-system';
import { MenuGroup } from '@/core/plugin-system';
import { lazy, Suspense, ReactNode } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';

// 导入插件的国际化资源
import i18nResources from './i18n';

// 使用懒加载加载页面组件
const ExamplePage = lazy(() => import('./pages/example-page'));
// 创建包装组件以支持懒加载
const LazyExamplePage = (): ReactNode => {
  const { t } = useTranslation('example');
  return React.createElement(
    Suspense,
    { fallback: React.createElement('div', null, t('loading', 'Loading...')) },
    React.createElement(ExamplePage, null)
  );
};

// 定义插件配置
const createPlugin = (globalT: (key: string, defaultValue?: string) => string): Plugin => {
  // 使用插件系统注册翻译资源
  // 插件的翻译资源已经在i18n属性中定义，并在registerPlugin时注册
  
  // 创建插件特定的翻译函数
  const t = (key: string, defaultValue?: string) => {
    // 使用example命名空间查找翻译键
    return globalT(key, defaultValue);
  };
  
  return ({
  
  // 插件元数据
  id: 'example',
  name: t('title', 'Example Plugin'),
  version: '1.0.0',
  description: t('description', 'An example plugin demonstrating plugin system features'),
  
  // 国际化资源
  i18n: i18nResources,
  
  // 路由配置
  routes: [
    {
      path: '/example',
      element: React.createElement(LazyExamplePage),
      meta: {
        title: t('title', 'Example Plugin'),
        requiresAuth: true,
      },
    },
  ],
  
  // 菜单项
  menuItems: [
    // 主插件页面 - 显示在插件菜单组中
    {
      id: 'example',
      label: t('title', 'Example Plugin'),
      icon: 'list-todo',
      path: '/plugins/example',
      permission: 'view_example',
      // 默认就是 MenuGroup.PLUGINS
    },
    // 展示在通用菜单组中的功能
    {
      id: 'example_general',
      label: t('menu.example', 'Example General'),
      icon: 'layout-dashboard',
      path: '/plugins/example/general',
      menuGroup: MenuGroup.GENERAL,
      permission: 'view_example',
    },
    // 展示在设置菜单组中的功能
    {
      id: 'example_settings',
      label: t('menu.settings', 'Example Settings'),
      icon: 'settings',
      path: '/plugins/example/settings',
      menuGroup: MenuGroup.SETTINGS,
      permission: 'view_example',
    },
    // 不显示在任何菜单中的功能
    {
      id: 'example_hidden',
      label: t('menu.hidden', 'Example Hidden'),
      icon: 'eye-off',
      path: '/plugins/example/hidden',
      showInMenu: false,
      permission: 'view_example',
    },
  ],
  
  // 生命周期钩子
  async onActivate() {
    // 插件激活时的逻辑
  },
  
  async onDeactivate() {
    // 插件停用时的逻辑
  },
});
};

export default createPlugin;
