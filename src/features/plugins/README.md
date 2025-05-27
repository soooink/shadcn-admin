# 插件开发指南

本文档将指导您如何为系统开发支持多语言的插件。

## 插件目录结构

```
plugin-example/
├── locales/                 # 多语言文件
│   ├── en-US/              # 英文翻译
│   │   └── plugin.json     # 插件翻译文件
│   └── zh-CN/              # 中文翻译
│       └── plugin.json     # 插件翻译文件
├── pages/                  # 页面组件
│   └── example-page.tsx    # 示例页面
└── index.ts                # 插件入口文件
```

## 创建插件

### 1. 创建插件入口文件

在 `index.ts` 中定义插件：

```typescript
import type { Plugin } from '@/core/plugin-system';
import { MenuGroup } from '@/core/plugin-system';
import { lazy, Suspense, ReactNode } from 'react';
import React from 'react';
import { useTranslation } from 'react-i18next';

// 导入翻译文件
import enTranslations from './locales/en-US/plugin.json';
import zhTranslations from './locales/zh-CN/plugin.json';

// 使用懒加载加载页面组件
const ExamplePage = lazy(() => import('./pages/example-page'));

// 创建包装组件以支持懒加载
const LazyExamplePage = (): ReactNode => {
  const { t } = useTranslation('plugin-example');
  return React.createElement(
    Suspense,
    { fallback: React.createElement('div', null, t('loading', 'Loading...')) },
    React.createElement(ExamplePage, null)
  );
};

// 定义插件配置
const plugin: Plugin = {
  // 插件元数据
  id: 'example',
  name: 'Example Plugin',  // 默认名称，会被翻译覆盖
  version: '1.0.0',
  description: 'An example plugin demonstrating plugin system features',
  
  // 多语言配置
  i18n: {
    namespace: 'plugin-example',  // 插件的命名空间
    resources: {
      'en-US': enTranslations,
      'zh-CN': zhTranslations
    }
  },
  
  // 路由配置
  routes: [
    {
      path: '/example',
      element: React.createElement(LazyExamplePage),
      meta: {
        title: 'Example Plugin',  // 会被翻译覆盖
        requiresAuth: true,
      },
    },
  ],
  
  // 菜单配置
  menuItems: [
    {
      id: 'example',
      label: 'Example',  // 会被翻译覆盖
      icon: 'puzzle',
      path: '/example',
      permission: 'view_example',
      menuGroup: MenuGroup.PLUGINS,
    },
  ],
  
  // 生命周期钩子
  onRegister: (app) => {
    const { i18n } = app;
    
    // 更新插件名称和描述的翻译
    plugin.name = i18n.t('plugin-example:title', { defaultValue: plugin.name });
    plugin.description = i18n.t('plugin-example:description', { 
      defaultValue: plugin.description 
    });
    
    // 更新菜单项
    if (plugin.menuItems) {
      plugin.menuItems.forEach(item => {
        item.label = i18n.t(`plugin-example:menu.${item.id}`, { 
          defaultValue: item.label 
        });
      });
    }
  },
  
  async onActivate() {
    console.log('Example plugin activated');
  },
  
  async onDeactivate() {
    console.log('Example plugin deactivated');
  },
};

export default plugin;
```

### 2. 创建翻译文件

在 `locales/en-US/plugin.json` 中：

```json
{
  "title": "Example Plugin",
  "description": "An example plugin demonstrating plugin system features",
  "loading": "Loading...",
  "menu": {
    "example": "Example",
    "settings": "Settings",
    "hidden": "Hidden"
  }
}
```

在 `locales/zh-CN/plugin.json` 中：

```json
{
  "title": "示例插件",
  "description": "一个展示插件系统功能的示例插件",
  "loading": "加载中...",
  "menu": {
    "example": "示例",
    "settings": "设置",
    "hidden": "隐藏"
  }
}
```

### 3. 创建页面组件

在 `pages/example-page.tsx` 中：

```tsx
import { useTranslation } from 'react-i18next';

export default function ExamplePage() {
  const { t } = useTranslation('plugin-example');
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">{t('title')}</h1>
      <p className="mb-4">{t('description')}</p>
      
      <div className="space-y-4">
        <div className="p-4 border rounded">
          <h2 className="text-xl font-semibold mb-2">{t('menu.example')}</h2>
          <p>{t('loading')}</p>
        </div>
      </div>
    </div>
  );
}
```

## 插件生命周期

1. **加载 (Loading)**
   - 插件被导入并注册到系统中
   - 插件的 `i18n` 资源被加载

2. **注册 (Register)**
   - 调用插件的 `onRegister` 钩子
   - 更新插件的名称、描述和菜单项的翻译

3. **激活 (Activate)**
   - 当插件被启用时调用 `onActivate` 钩子
   - 执行插件初始化逻辑

4. **停用 (Deactivate)**
   - 当插件被禁用时调用 `onDeactivate` 钩子
   - 执行清理逻辑

## 最佳实践

1. **命名规范**
   - 插件 ID 使用 kebab-case（如 `example-plugin`）
   - 翻译键使用 camelCase
   - 命名空间使用 `plugin-` 前缀（如 `plugin-example`）

2. **性能优化**
   - 使用 React.lazy 和 Suspense 进行代码分割
   - 按需加载翻译资源
   - 避免在插件初始化时执行耗时操作

3. **错误处理**
   - 处理异步操作的错误
   - 提供有意义的错误信息
   - 优雅降级当功能不可用时

4. **可访问性**
   - 使用语义化 HTML
   - 提供适当的 ARIA 属性
   - 支持键盘导航

## 调试技巧

1. 在浏览器开发者工具中查看 i18n 命名空间：
   ```javascript
   // 在控制台中查看所有翻译
   console.log(i18n.getResourceBundle('en-US', 'plugin-example'));
   ```

2. 检查插件是否已加载：
   ```javascript
   // 在控制台中查看已加载的插件
   console.log(Array.from(plugins.keys()));
   ```

3. 检查翻译是否正确加载：
   ```javascript
   // 在控制台中测试翻译
   console.log(i18n.t('plugin-example:title'));
   ```

## 发布插件

1. 确保所有翻译完整
2. 更新版本号（遵循语义化版本）
3. 提供清晰的文档
4. 测试所有功能
5. 打包并发布到插件市场

## 常见问题

### 1. 翻译未生效
- 检查命名空间是否正确
- 确认翻译文件已正确导入
- 检查翻译键是否匹配

### 2. 插件未显示在菜单中
- 检查 `menuItems` 配置
- 确认用户有足够的权限
- 检查 `menuGroup` 设置

### 3. 页面加载缓慢
- 使用代码分割
- 按需加载资源
- 优化图片和静态资源

## 示例插件

参考 `src/plugins/example` 目录下的示例代码。
