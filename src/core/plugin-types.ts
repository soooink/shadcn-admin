/**
 * 插件系统类型定义文件
 * 统一管理插件系统中的类型定义
 */
import React from 'react';

/**
 * 插件路由类型
 */
export interface PluginRoute {
  path: string;
  component: React.ComponentType;
  exact?: boolean;
}

/**
 * 插件国际化资源
 */
export interface PluginLanguageResources {
  namespace: string;
  resources: {
    [language: string]: {
      [key: string]: string | object;
    };
  };
}

/**
 * 配置字段类型
 */
export enum ConfigFieldType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  COLOR = 'color',
  DATE = 'date',
  TIME = 'time',
  DATETIME = 'datetime',
  FILE = 'file',
  IMAGE = 'image',
  TEXTAREA = 'textarea',
  JSON = 'json',
  CODE = 'code',
  PASSWORD = 'password',
  EMAIL = 'email',
  URL = 'url',
  PHONE = 'phone',
  CUSTOM = 'custom'
}

/**
 * 配置字段定义
 */
export interface ConfigFieldDefinition {
  type: ConfigFieldType;
  label: string;
  description?: string;
  defaultValue?: unknown;
  required?: boolean;
  options?: Array<{ label: string; value: unknown }>;
  min?: number;
  max?: number;
  step?: number;
  pattern?: string;
  placeholder?: string;
  rows?: number;
  cols?: number;
  language?: string;
  format?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  hidden?: boolean;
  group?: string;
  order?: number;
  validator?: (value: unknown) => boolean | string;
  renderer?: (value: unknown, field: ConfigFieldDefinition) => React.ReactNode;
}

/**
 * 配置模式
 */
export interface ConfigSchema {
  [key: string]: ConfigFieldDefinition;
}

/**
 * 存储统计
 */
export interface StorageStats {
  used: number;
  limit: number;
}

/**
 * 资源使用统计
 */
export interface ResourceUsageStats {
  cpu: number;
  memory: number;
  network: {
    upload: number;
    download: number;
  };
}

/**
 * 权限请求
 */
export interface PermissionRequest {
  name: string;
  description: string;
  sensitive: boolean;
}

/**
 * 依赖图
 */
export interface DependencyGraph {
  nodes: Array<{ id: string; label: string; version: string }>;
  edges: Array<{ source: string; target: string }>;
}

/**
 * 更新检查结果
 */
export interface UpdateCheckResult {
  [pluginId: string]: {
    hasUpdate: boolean;
    currentVersion: string;
    latestVersion: string;
    releaseDate?: string;
    releaseNotes?: string;
    downloadUrl?: string;
  };
}

/**
 * 插件搜索结果
 */
export interface PluginSearchResult {
  items: Array<{
    id: string;
    name: string;
    description: string;
    version: string;
    author: string;
    downloads: number;
    rating: number;
    tags: string[];
    updatedAt: string;
    thumbnailUrl?: string;
  }>;
  total: number;
}

/**
 * 沙箱事件类型
 */
export enum SandboxEventType {
  PLUGIN_LOADED = 'plugin-loaded',
  PLUGIN_ACTIVATED = 'plugin-activated',
  PLUGIN_DEACTIVATED = 'plugin-deactivated',
  PLUGIN_DESTROYED = 'plugin-destroyed',
  ERROR = 'error'
}

/**
 * 日志接口
 */
export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

/**
 * 扩展Window类型
 */
export interface WindowWithPluginSystem extends Window {
  // 支持旧版接口
  __PLUGIN_SYSTEM__?: {
    registerPlugin: (plugin: unknown) => void;
  };
  // 新版接口
  pluginSystem?: any; // 使用any类型避免循环引用
}

/**
 * 插件定义
 */
export interface Plugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  main?: string;
  icon?: string;
  i18n?: PluginLanguageResources;
  config?: ConfigSchema;
  dependencies?: Record<string, string>;
  permissions?: string[];
  routes?: PluginRoute[];
  activate?: () => Promise<void> | void;
  deactivate?: () => Promise<void> | void;
}

/**
 * 插件包信息
 */
export interface PluginPackage {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  license?: string;
  homepage?: string;
  repository?: string;
  url: string;
  icon?: string;
  downloads?: number;
  rating?: number;
  tags?: string[];
  updatedAt?: string;
  createdAt?: string;
  size?: number;
}
