import type { Plugin } from '@/core/plugin-system';
import { MenuGroup } from '@/core/plugin-system';
import { lazy, Suspense, ReactNode } from 'react';
import React from 'react';

// 使用懒加载加载页面组件
const ExamplePage = lazy(() => import('./pages/example-page'));

// 创建包装组件以支持懒加载
const LazyExamplePage = (): ReactNode => {
  return React.createElement(
    Suspense,
    { fallback: React.createElement('div', null, 'Loading...') },
    React.createElement(ExamplePage, null)
  );
};

// 定义插件配置
const plugin: Plugin = {
  // 插件元数据
  id: 'example',
  name: 'Example Plugin',
  version: '1.0.0',
  description: 'An example plugin demonstrating plugin system features',
  
  // 路由配置
  routes: [
    {
      path: '/example',
      element: React.createElement(LazyExamplePage),
      meta: {
        title: 'Example Plugin',
        requiresAuth: true,
      },
    },
  ],
  
  // 菜单项
  menuItems: [
    // 主插件页面 - 显示在插件菜单组中
    {
      id: 'example',
      label: 'Example Plugin',
      icon: 'list-todo',
      path: '/plugins/example',
      permission: 'view_example',
      // 默认就是 MenuGroup.PLUGINS
    },
    // 展示在通用菜单组中的功能
    {
      id: 'example_general',
      label: 'Example General',
      icon: 'layout-dashboard',
      path: '/plugins/example/general',
      menuGroup: MenuGroup.GENERAL,
      permission: 'view_example',
    },
    // 展示在设置菜单组中的功能
    {
      id: 'example_settings',
      label: 'Example Settings',
      icon: 'settings',
      path: '/plugins/example/settings',
      menuGroup: MenuGroup.SETTINGS,
      permission: 'view_example',
    },
    // 不显示在任何菜单中的功能
    {
      id: 'example_hidden',
      label: 'Example Hidden',
      icon: 'eye-off',
      path: '/plugins/example/hidden',
      showInMenu: false,
      permission: 'view_example',
    },
  ],
  
  // 多语言配置
  i18n: {
    'en-US': {
      example: {
        title: 'Example Plugin',
        description: 'This is an example plugin',
      },
    },
    'zh-CN': {
      example: {
        title: '示例插件',
        description: '这是一个示例插件',
      },
    },
  },
  
  // 生命周期钩子
  async onActivate() {
    // 插件激活时的逻辑
  },
  
  async onDeactivate() {
    // 插件停用时的逻辑
  },
};

export default plugin;
