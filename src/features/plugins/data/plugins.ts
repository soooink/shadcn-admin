import { getPlugins, isPluginActive, installPlugin, uninstallPlugin } from '@/core/plugin-system';
import type { Plugin, PluginSecurity } from '@/core/plugin-system';
import { 
  IconBox, 
  IconCode, 
  IconSettings, 
  IconPlug, 
  IconTool,
  IconBrandReact,
  IconDatabase,
  IconBrandJavascript,
  IconApi,
  IconDeviceDesktop,
  IconPalette,
  IconChartBar,
  IconFileAnalytics,
  IconCloudComputing
} from '@tabler/icons-react';
import React from 'react';

// 插件权限类型
export interface PluginPermission {
  id: string;
  name: string;
  description: string;
  critical: boolean;
}

// 插件依赖类型
export interface PluginDependency {
  id: string;
  version: string;
  optional: boolean;
}

// 插件标签类型
export type PluginTag = 
  | 'ui' 
  | 'data' 
  | 'utility' 
  | 'integration' 
  | 'theme' 
  | 'analytics' 
  | 'development' 
  | 'system'
  | 'experimental';

// 扩展插件类型，添加UI需要的额外属性
export interface ExtendedPlugin extends Plugin {
  type?: string;
  tags?: string[];
  features?: string[];
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  bugs?: { url: string };
  lastUpdated?: string;
  permissions?: PluginPermission[];
}

// Helper function to get plugin icon based on plugin ID or name
export const getPluginIcon = (plugin: Plugin): React.ReactNode => {
  // 基于插件ID的图标映射
  const idIconMap: Record<string, React.ReactNode> = {
    'example': React.createElement(IconCode),
    'settings': React.createElement(IconSettings),
    'tools': React.createElement(IconTool),
    'system': React.createElement(IconBox),
    'ui-components': React.createElement(IconBrandReact),
    'data-manager': React.createElement(IconDatabase),
    'script-runner': React.createElement(IconBrandJavascript),
    'api-client': React.createElement(IconApi),
    'theme-manager': React.createElement(IconPalette),
    'analytics': React.createElement(IconChartBar),
    'report-generator': React.createElement(IconFileAnalytics),
    'cloud-sync': React.createElement(IconCloudComputing),
  };

  // 基于插件类型的图标映射
  const typeIconMap: Record<string, React.ReactNode> = {
    'ui': React.createElement(IconDeviceDesktop),
    'data': React.createElement(IconDatabase),
    'utility': React.createElement(IconTool),
    'system': React.createElement(IconBox),
  };

  // 首先尝试通过ID匹配
  if (idIconMap[plugin.id]) {
    return idIconMap[plugin.id];
  }
  
  // 然后尝试通过类型匹配
  const extPlugin = plugin as ExtendedPlugin;
  const pluginType = extPlugin.type || extPlugin.tags?.[0];
  if (pluginType && typeIconMap[pluginType]) {
    return typeIconMap[pluginType];
  }
  
  // 默认图标
  return React.createElement(IconPlug);
};

// 获取插件标签
export const getPluginTags = (plugin: Plugin): PluginTag[] => {
  const tags: PluginTag[] = [];
  const extPlugin = plugin as ExtendedPlugin;
  
  // 从插件类型推断标签
  if (extPlugin.type) {
    tags.push(extPlugin.type as PluginTag);
  }
  
  // 从插件特性推断标签
  if (extPlugin.features?.includes('ui')) {
    tags.push('ui');
  }
  
  if (extPlugin.features?.includes('data')) {
    tags.push('data');
  }
  
  // 从插件版本推断是否为实验性
  if (plugin.version.includes('beta') || plugin.version.includes('alpha')) {
    tags.push('experimental');
  }
  
  // 添加插件自定义标签
  if (extPlugin.tags) {
    tags.push(...extPlugin.tags.filter((tag: string) => 
      ['ui', 'data', 'utility', 'integration', 'theme', 'analytics', 'development', 'system', 'experimental'].includes(tag)
    ) as PluginTag[]);
  }
  
  // 去重
  return Array.from(new Set(tags));
};

// 检查插件是否有更新
export const checkPluginUpdate = async (pluginId: string): Promise<boolean> => {
  try {
    // 模拟检查更新功能，实际项目中应调用真实的API
    // 这里简单返回false表示没有更新
    return false;
  } catch (error) {
    // 使用自定义日志函数替代console.error
    // eslint-disable-next-line no-console
    console.error(`检查插件更新失败 ${pluginId}:`, error);
    return false;
  }
};

// 获取插件权限
export const getPluginPermissions = (plugin: Plugin): PluginPermission[] => {
  const permissions: PluginPermission[] = [];
  const extPlugin = plugin as ExtendedPlugin;
  
  // 基本权限
  if (extPlugin.permissions) {
    return extPlugin.permissions;
  }
  
  // 从安全信息中获取权限
  if (plugin.security?.permissions) {
    return plugin.security.permissions.map(perm => ({
      id: perm,
      name: getPermissionName(perm),
      description: getPermissionDescription(perm),
      critical: isCriticalPermission(perm)
    }));
  }
  
  // 如果没有明确定义权限，根据插件功能推断
  if (extPlugin.features?.includes('filesystem')) {
    permissions.push({
      id: 'filesystem',
      name: '文件系统访问',
      description: '允许插件读取和写入文件系统',
      critical: true
    });
  }
  
  if (extPlugin.features?.includes('network')) {
    permissions.push({
      id: 'network',
      name: '网络访问',
      description: '允许插件发送和接收网络请求',
      critical: false
    });
  }
  
  if (extPlugin.features?.includes('system')) {
    permissions.push({
      id: 'system',
      name: '系统访问',
      description: '允许插件访问系统API和资源',
      critical: true
    });
  }
  
  return permissions;
};

// 获取权限名称
const getPermissionName = (permissionId: string): string => {
  const permissionNames: Record<string, string> = {
    'filesystem': '文件系统访问',
    'network': '网络访问',
    'system': '系统访问',
    'user-data': '用户数据访问',
    'notifications': '发送通知',
    'background': '后台运行'
  };
  
  return permissionNames[permissionId] || permissionId;
};

// 获取权限描述
const getPermissionDescription = (permissionId: string): string => {
  const permissionDescriptions: Record<string, string> = {
    'filesystem': '允许插件读取和写入文件系统',
    'network': '允许插件发送和接收网络请求',
    'system': '允许插件访问系统API和资源',
    'user-data': '允许插件访问用户数据',
    'notifications': '允许插件发送系统通知',
    'background': '允许插件在后台运行'
  };
  
  return permissionDescriptions[permissionId] || '未知权限';
};

// 判断是否为关键权限
const isCriticalPermission = (permissionId: string): boolean => {
  const criticalPermissions = ['filesystem', 'system', 'user-data'];
  return criticalPermissions.includes(permissionId);
};

// 获取插件依赖
export const getPluginDependencies = (plugin: Plugin): PluginDependency[] => {
  if (!plugin.dependencies) {
    return [];
  }
  
  return plugin.dependencies.map(dep => ({
    id: dep.id,
    version: dep.version,
    optional: !!dep.optional
  }));
};

// Get plugins from the plugin system and format them for the UI
export const getPluginList = async () => {
  const plugins = getPlugins();
  const pluginItems = await Promise.all(plugins.map(async plugin => {
    const extPlugin = plugin as ExtendedPlugin;
    const hasUpdate = await checkPluginUpdate(plugin.id);
    
    return {
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      version: plugin.version,
      author: extPlugin.author || plugin.security?.author || '未知作者',
      license: extPlugin.license || plugin.security?.license || 'MIT',
      homepage: extPlugin.homepage || plugin.homepageUrl || '',
      repository: extPlugin.repository || '',
      issuesUrl: extPlugin.bugs?.url || plugin.issuesUrl || '',
      lastUpdated: extPlugin.lastUpdated || '',
      active: isPluginActive(plugin.id),
      icon: getPluginIcon(plugin),
      tags: getPluginTags(plugin),
      permissions: getPluginPermissions(plugin),
      dependencies: getPluginDependencies(plugin),
      hasUpdate,
      routes: plugin.routes || [],
      menuItems: plugin.menuItems || [],
    };
  }));
  
  return pluginItems;
};

// 获取单个插件详情
export const getPluginDetail = async (pluginId: string) => {
  const plugins = await getPluginList();
  return plugins.find(plugin => plugin.id === pluginId) || null;
};

// 排序插件列表
export const sortPluginList = (plugins: PluginItem[], sortBy: string, sortOrder: 'asc' | 'desc' = 'asc') => {
  return [...plugins].sort((a, b) => {
    let comparison = 0;
    
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'author':
        comparison = a.author.localeCompare(b.author);
        break;
      case 'version':
        comparison = a.version.localeCompare(b.version, undefined, { numeric: true });
        break;
      case 'status':
        comparison = Number(a.active) - Number(b.active);
        break;
      default:
        comparison = 0;
    }
    
    return sortOrder === 'asc' ? comparison : -comparison;
  });
};

// 过滤插件列表
export const filterPluginList = (plugins: PluginItem[], filters: { 
  status?: 'active' | 'inactive' | 'all', 
  tag?: PluginTag | 'all',
  search?: string
}) => {
  return plugins.filter(plugin => {
    // 按状态过滤
    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'active' && !plugin.active) return false;
      if (filters.status === 'inactive' && plugin.active) return false;
    }
    
    // 按标签过滤
    if (filters.tag && filters.tag !== 'all') {
      if (!plugin.tags.includes(filters.tag)) return false;
    }
    
    // 按搜索词过滤
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        plugin.name.toLowerCase().includes(searchLower) ||
        plugin.description.toLowerCase().includes(searchLower) ||
        plugin.author.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });
};

export type PluginItem = Awaited<ReturnType<typeof getPluginList>>[number];
