import { RouteObject } from 'react-router-dom';
import type { ReactNode } from 'react';
import i18n from 'i18next';

/**
 * Route metadata
 */
export interface RouteMeta {
  title: string;
  requiresAuth?: boolean;
}

/**
 * Extended route object with additional metadata
 */
export interface PluginRoute extends Omit<RouteObject, 'children' | 'element'> {
  path: string;
  element: ReactNode | (() => ReactNode);
  meta?: RouteMeta;
  children?: PluginRoute[];
}

/**
 * 菜单分组类型
 */
export enum MenuGroup {
  PLUGINS = 'plugins',    // 插件菜单组
  GENERAL = 'general',    // 通用菜单组
  PAGES = 'pages',        // 页面菜单组
  SETTINGS = 'settings',  // 设置菜单组
}

/**
 * Menu item definition for plugin navigation
 */
export interface MenuItem {
  id: string;
  label: string;
  icon?: string; // Icon name as string (e.g., 'ListTodo')
  path: string;
  permission?: string;
  children?: MenuItem[];
  showInMenu?: boolean; // 是否在主菜单中显示，默认为true
  menuGroup?: MenuGroup; // 菜单分组，默认为 MenuGroup.PLUGINS
}

/**
 * Internationalization resources structure
 */
export interface I18nResources<T = Record<string, unknown>> {
  namespace: string;
  resources: Record<string, T>; // language code -> translations
}

export interface PluginContext {
  i18n: typeof i18n;
}
/**
 * 插件依赖定义
 */
export interface PluginDependency {
  /** 依赖插件的ID */
  id: string;
  /** 依赖的版本范围（semver格式） */
  version: string;
  /** 是否为可选依赖 */
  optional?: boolean;
}

/**
 * 插件配置项定义
 */
export interface PluginConfigOption {
  /** 配置项键名 */
  key: string;
  /** 配置项类型 */
  type: 'string' | 'number' | 'boolean' | 'select';
  /** 配置项标签 */
  label: string;
  /** 配置项描述 */
  description?: string;
  /** 默认值 */
  defaultValue?: string | number | boolean | Record<string, unknown>;
  /** 可选值（仅当type为select时有效） */
  options?: Array<{value: string; label: string}>;
  /** 是否必填 */
  required?: boolean;
  /** 验证规则 */
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    message?: string;
  };
}

/**
 * 插件安全信息
 */
export interface PluginSecurity {
  /** 作者信息 */
  author: string;
  /** 作者网站 */
  website?: string;
  /** 许可证 */
  license: string;
  /** 数字签名（用于验证插件完整性） */
  signature?: string;
  /** 所需权限 */
  permissions?: string[];
}

/**
 * Plugin definition interface
 */
export interface Plugin {
  /** Unique plugin identifier */
  id: string;
  /** Human-readable plugin name */
  name: string;
  /** Plugin version (semver) */
  version: string;
  /** Plugin description */
  description: string;
  /** Plugin routes */
  routes?: PluginRoute[];
  /** Navigation menu items */
  menuItems?: MenuItem[];
  /** Internationalization resources */
  i18n?: I18nResources;
  /** 插件依赖 */
  dependencies?: PluginDependency[];
  /** 插件配置选项 */
  configOptions?: PluginConfigOption[];
  /** 插件安全信息 */
  security?: PluginSecurity;
  /** 插件更新URL */
  updateUrl?: string;
  /** 插件主页URL */
  homepageUrl?: string;
  /** 插件文档URL */
  documentationUrl?: string;
  /** 插件问题报告URL */
  issuesUrl?: string;
  /** 插件生命周期钩子 */
  onRegister?: (context: PluginContext) => Promise<void> | void;
  onActivate?: (context: PluginContext) => Promise<void> | void;
  onDeactivate?: (context: PluginContext) => Promise<void> | void;
  onUpdate?: (context: PluginContext, previousVersion: string) => Promise<void> | void;
  onConfigChange?: (context: PluginContext, newConfig: Record<string, unknown>) => Promise<void> | void;
}

// Plugin registry
const plugins = new Map<string, Plugin>();

// 插件激活状态
const activePlugins = new Set<string>();

// 日志函数
const logPrefix = '[Plugin]';
function logInfo(message: string): void {
  // 使用自定义日志函数，可以根据环境配置是否输出
  if (process.env.NODE_ENV !== 'production') {
    console.info(`${logPrefix} ${message}`);
  }
}

function logWarn(message: string): void {
  console.warn(`${logPrefix} ${message}`);
}

function logError(message: string): void {
  console.error(`${logPrefix} ${message}`);
}

/**
 * Register a new plugin
 * @param plugin - Plugin definition
 */
export async function registerPlugin(plugin: Plugin): Promise<boolean> {
  if (plugins.has(plugin.id)) {
    // 插件已注册
    return false;
  }
  
  plugins.set(plugin.id, plugin);
  
  // Register plugin resources
  registerPluginResources(plugin);
  
  // Call onRegister lifecycle hook if available
  if (plugin.onRegister) {
    try {
      await plugin.onRegister({ i18n });
    } catch (error) {
      // 记录错误日志
      const err = error instanceof Error ? error.message : String(error);
      // 使用自定义日志函数替代console
      logError(`Error in onRegister for ${plugin.id}: ${err}`);
      return false;
    }
  }
  
  // 使用自定义日志函数替代console
  logInfo(`Registered plugin: ${plugin.name}@${plugin.version}`);
  return true;
}

export function registerPluginResources(plugin: Plugin): void {
  // Register i18n resources if available
  if (plugin.i18n) {
    const { namespace, resources } = plugin.i18n;
    
    // Add resources to i18next
    Object.entries(resources).forEach(([lang, res]) => {
      i18n.addResourceBundle(lang, namespace, res, true, true);
    });
    
    // 使用自定义日志函数替代console
    logInfo(`Registered i18n resources for ${plugin.id}`);
  }
}

/**
 * Get a plugin by ID
 * @param id - Plugin ID
 * @returns Plugin instance or undefined if not found
 */
export function getPlugin(id: string): Plugin | undefined {
  return plugins.get(id);
}

/**
 * Get all registered plugins
 * @returns Array of all registered plugins
 */
export function getPlugins(): Plugin[] {
  return Array.from(plugins.values());
}

/**
 * Activate a plugin
 * @param id - Plugin ID
 * @returns Promise that resolves to true if activation was successful
 */
export async function activatePlugin(id: string): Promise<boolean> {
  if (activePlugins.has(id)) {
    logWarn(`Plugin ${id} is already active`);
    return true;
  }
  
  const plugin = plugins.get(id);
  if (!plugin) {
    logError(`Plugin ${id} not found`);
    return false;
  }
  
  // Call onActivate lifecycle hook if available
  if (plugin.onActivate) {
    try {
      await plugin.onActivate({ i18n });
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      logError(`Error in onActivate for ${id}: ${err}`);
      return false;
    }
  }
  
  activePlugins.add(id);
  logInfo(`Activated plugin: ${plugin.name}@${plugin.version}`);
  return true;
}

/**
 * Deactivate a plugin
 * @param id - Plugin ID
 * @returns Promise that resolves to true if deactivation was successful
 */
export async function deactivatePlugin(id: string): Promise<boolean> {
  const plugin = plugins.get(id);
  if (!plugin) {
    logError(`Plugin ${id} not found`);
    return false;
  }

  if (!activePlugins.has(id)) {
    logWarn(`Plugin ${id} is not active`);
    return true;
  }

  try {
    // 调用停用钩子
    if (plugin.onDeactivate) {
      await plugin.onDeactivate({ i18n });
    }

    activePlugins.delete(id);
    logInfo(`Deactivated plugin: ${plugin.name}@${plugin.version}`);
    return true;
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    logError(`Error in onDeactivate for ${id}: ${err}`);
    return false;
  }
}

/**
 * Get routes for a specific plugin
 * @param pluginId - Plugin ID
 * @returns Array of routes defined by the plugin
 */
/**
 * 获取插件路由
 * @param pluginId - 插件ID
 * @returns 插件定义的路由数组
 */
export function getPluginRoutes(pluginId: string): PluginRoute[] {
  const plugin = plugins.get(pluginId);
  if (!plugin) {
    logError(`Plugin ${pluginId} not found`);
    return [];
  }
  return plugin.routes || [];
}

/**
 * Get menu items for a specific plugin
 * @param pluginId - Plugin ID
 * @returns Array of menu items defined by the plugin
 */
/**
 * 获取插件菜单项
 * @param pluginId - 插件ID
 * @returns 插件定义的菜单项数组
 */
export function getPluginMenuItems(pluginId: string): MenuItem[] {
  const plugin = plugins.get(pluginId);
  if (!plugin) {
    logError(`Plugin ${pluginId} not found`);
    return [];
  }
  return plugin.menuItems || [];
}

/**
 * Get i18n resources for a specific plugin
 * @param pluginId - Plugin ID
 * @returns i18n resources or undefined if not found
 */
/**
 * 获取插件国际化资源
 * @param pluginId - 插件ID
 * @returns 插件的国际化资源，如果未找到则返回undefined
 */
export function getPluginI18nResources(pluginId: string): I18nResources | undefined {
  const plugin = plugins.get(pluginId);
  if (!plugin) {
    logError(`Plugin ${pluginId} not found`);
    return undefined;
  }
  return plugin.i18n;
}

/**
 * 激活所有已注册的插件
 */
/**
 * 激活所有已注册的插件
 */
export async function activateAllPlugins(): Promise<void> {
  logInfo('Activating all plugins...');
  for (const plugin of plugins.values()) {
    try {
      await activatePlugin(plugin.id);
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      logError(`Error activating plugin ${plugin.id}: ${err}`);
    }
  }
}
/**
 * 从URL加载插件
 * @param url - 插件URL
 * @returns 是否成功加载并注册插件
 */
export async function loadPluginFromUrl(url: string): Promise<boolean> {
  try {
    const module = await import(/* webpackIgnore: true */ url);
    const plugin = module.default as Plugin;
    return registerPlugin(plugin);
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    logError(`Failed to load plugin from ${url}: ${err}`);
    return false;
  }
}

/**
 * 安装插件
 * @param pluginPackage 插件包信息
 * @returns 安装是否成功
 */
/**
 * 安装插件
 * @param pluginPackage - 插件包信息
 * @returns 安装是否成功
 */
export async function installPlugin(pluginPackage: {
  id: string;
  name: string;
  version: string;
  url: string;
}): Promise<boolean> {
  try {
    // 检查插件是否已安装
    if (plugins.has(pluginPackage.id)) {
      logWarn(`Plugin ${pluginPackage.id} is already installed`);
      return false;
    }

    // 从URL加载插件
    const success = await loadPluginFromUrl(pluginPackage.url);
    if (success) {
      // 保存插件安装信息到本地存储
      const installedPlugins = JSON.parse(localStorage.getItem('installedPlugins') || '[]');
      installedPlugins.push({
        id: pluginPackage.id,
        name: pluginPackage.name,
        version: pluginPackage.version,
        url: pluginPackage.url,
        installedAt: new Date().toISOString()
      });
      localStorage.setItem('installedPlugins', JSON.stringify(installedPlugins));
      
      logInfo(`Successfully installed plugin: ${pluginPackage.name}@${pluginPackage.version}`);
      return true;
    }
    return false;
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    logError(`Failed to install plugin ${pluginPackage.id}: ${err}`);
    return false;
  }
}

/**
 * 卸载插件
 * @param pluginId 插件ID
 * @returns 卸载是否成功
 */
/**
 * 卸载插件
 * @param pluginId - 插件ID
 * @returns 卸载是否成功
 */
export async function uninstallPlugin(pluginId: string): Promise<boolean> {
  try {
    // 检查插件是否存在
    if (!plugins.has(pluginId)) {
      logWarn(`Plugin ${pluginId} is not installed`);
      return false;
    }

    // 如果插件已激活，先停用它
    if (activePlugins.has(pluginId)) {
      await deactivatePlugin(pluginId);
    }

    // 从注册表中移除插件
    plugins.delete(pluginId);

    // 从本地存储中移除插件信息
    const installedPlugins = JSON.parse(localStorage.getItem('installedPlugins') || '[]');
    const updatedPlugins = installedPlugins.filter((p: {id: string}) => p.id !== pluginId);
    localStorage.setItem('installedPlugins', JSON.stringify(updatedPlugins));

    logInfo(`Successfully uninstalled plugin: ${pluginId}`);
    return true;
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    logError(`Failed to uninstall plugin ${pluginId}: ${err}`);
    return false;
  }
}
/**
 * 检查插件是否已激活
 * @param id 插件ID
 */
export function isPluginActive(id: string): boolean {
  return activePlugins.has(id);
}