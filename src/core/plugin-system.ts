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
export interface I18nResources {
  [language: string]: {
    [namespace: string]: Record<string, unknown>;
  };
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
  /** Lifecycle hook: called when plugin is activated */
  onActivate?: () => Promise<void>;
  /** Lifecycle hook: called when plugin is deactivated */
  onDeactivate?: () => Promise<void>;
}

// Plugin registry
const plugins = new Map<string, Plugin>();

// 插件激活状态
const activePlugins = new Set<string>();

/**
 * Register a new plugin
 * @param plugin - Plugin definition
 */
export function registerPlugin(plugin: Plugin): void {
  if (plugins.has(plugin.id)) {
    console.warn(`[Plugin] Plugin ${plugin.id} is already registered`);
    return;
  }
  plugins.set(plugin.id, plugin);
  console.log(`[Plugin] Registered plugin: ${plugin.id}@${plugin.version}`);
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
  const plugin = plugins.get(id);
  if (!plugin) {
    console.error(`[Plugin] Plugin ${id} not found`);
    return false;
  }

  if (activePlugins.has(id)) {
    console.log(`[Plugin] Plugin ${id} is already active`);
    return true;
  }

  try {
    // 加载多语言资源
    if (plugin.i18n) {
      Object.entries(plugin.i18n).forEach(([lng, resources]) => {
        if (resources && typeof resources === 'object') {
          Object.entries(resources).forEach(([ns, data]) => {
            if (data && typeof data === 'object') {
              i18n.addResourceBundle(lng, ns, data, true, true);
            }
          });
        }
      });
    }

    // 调用激活钩子
    if (plugin.onActivate) {
      await plugin.onActivate();
    }

    activePlugins.add(id);
    console.log(`[Plugin] Activated plugin: ${id}`);
    return true;
  } catch (error) {
    console.error(`[Plugin] Failed to activate plugin ${id}:`, error);
    return false;
  }
}

/**
 * Deactivate a plugin
 * @param id - Plugin ID
 * @returns Promise that resolves to true if deactivation was successful
 */
export async function deactivatePlugin(id: string): Promise<boolean> {
  const plugin = plugins.get(id);
  if (!plugin) {
    console.error(`[Plugin] Plugin ${id} not found`);
    return false;
  }

  if (!activePlugins.has(id)) {
    console.log(`[Plugin] Plugin ${id} is not active`);
    return true;
  }

  try {
    // 调用停用钩子
    if (plugin.onDeactivate) {
      await plugin.onDeactivate();
    }

    activePlugins.delete(id);
    console.log(`[Plugin] Deactivated plugin: ${id}`);
    return true;
  } catch (error) {
    console.error(`[Plugin] Failed to deactivate plugin ${id}:`, error);
    return false;
  }
}

/**
 * Get routes for a specific plugin
 * @param pluginId - Plugin ID
 * @returns Array of routes defined by the plugin
 */
export function getPluginRoutes(pluginId: string): PluginRoute[] {
  const plugin = plugins.get(pluginId);
  if (!plugin) {
    console.error(`[Plugin] Plugin ${pluginId} not found`);
    return [];
  }
  return plugin.routes || [];
}

/**
 * Get menu items for a specific plugin
 * @param pluginId - Plugin ID
 * @returns Array of menu items defined by the plugin
 */
export function getPluginMenuItems(pluginId: string): MenuItem[] {
  const plugin = plugins.get(pluginId);
  if (!plugin) {
    console.error(`[Plugin] Plugin ${pluginId} not found`);
    return [];
  }
  return plugin.menuItems || [];
}

/**
 * Get i18n resources for a specific plugin
 * @param pluginId - Plugin ID
 * @returns i18n resources or undefined if not found
 */
export function getPluginI18nResources(pluginId: string): I18nResources | undefined {
  const plugin = plugins.get(pluginId);
  if (!plugin) {
    console.error(`[Plugin] Plugin ${pluginId} not found`);
    return undefined;
  }
  return plugin.i18n;
}

/**
 * 激活所有已注册的插件
 */
export async function activateAllPlugins(): Promise<void> {
  console.log('[Plugin] Activating all plugins...');
  for (const plugin of plugins.values()) {
    try {
      await activatePlugin(plugin.id);
    } catch (error) {
      console.error(`[Plugin] Error activating plugin ${plugin.id}:`, error);
    }
  }
}

/**
 * 检查插件是否已激活
 * @param id 插件ID
 */
export function isPluginActive(id: string): boolean {
  return activePlugins.has(id);
}