/**
 * 插件系统集成模块
 * 将所有插件系统功能组合起来，提供统一的接口
 */
import { installPlugin, uninstallPlugin } from './plugin-system';
import { getPluginSandboxManager, SandboxEventType } from './plugin-sandbox';
import { getPluginMarketService, PluginSearchParams } from './plugin-market';
import { getPluginCommunicationManager, createPluginCommunicationClient } from './plugin-communication';
import { getPluginPerformanceMonitor } from './plugin-monitor';
import { getPluginUpdateManager } from './plugin-updater';
import { 
  getPluginI18nManager, 
  createPluginTranslationHelper
} from './plugin-i18n';
import { 
  getPluginConfigManager, 
  createPluginConfigHelper,
  ConfigSchema,
  ConfigFieldDefinition,
  ConfigFieldType as ConfigPluginFieldType
} from './plugin-config';
import { 
  Plugin as TypesPlugin, 
  PluginSearchResult as TypesPluginSearchResult, 
  PluginLanguageResources,
  PluginRoute as TypesPluginRoute
} from './plugin-types';
import { Plugin as SystemPlugin, PluginRoute as SystemPluginRoute } from './plugin-system';
import { getPluginStorageManager, createPluginStorageHelper } from './plugin-storage';
import { getPluginUIManager, createPluginUIHelper } from './plugin-ui';
import { getPluginPermissionManager, createPluginPermissionHelper } from './plugin-permissions';
import { getPluginDependencyManager, createPluginDependencyHelper } from './plugin-dependencies';
import {
  ConfigFieldType,
  StorageStats,
  ResourceUsageStats,
  PermissionRequest as TypesPermissionRequest,
  DependencyGraph,
  UpdateCheckResult as TypesUpdateCheckResult
} from './plugin-types';
import { pluginLogger, createPluginLogger } from '../utils/logger';
import {
  adaptPluginLanguageResources,
  adaptConfigSchema,
  adaptUpdateCheckResult,
  adaptPluginSearchResult,
  adaptPermissionRequest,
  adaptStorageStats
} from './plugin-type-adapters';
import React from 'react';

// 扩展PluginPackage接口，添加可选属性
interface PluginPackageExtended {
  id: string;
  name: string;
  version: string;
  description?: string;
  author: string;
  dependencies?: Record<string, string> | Array<{id: string, version: string, optional?: boolean}>;
  license?: string;
  homepage?: string;
  main?: string;
  icon?: string;
  i18n?: {
    namespace: string;
    resources: Record<string, Record<string, string>>;
  };
}

/**
 * 插件上下文
 * 提供给插件使用的API和工具
 */
export interface PluginContext {
  /** 插件ID */
  pluginId: string;
  /** 插件版本 */
  version: string;
  /** 通信客户端 */
  communication: ReturnType<typeof createPluginCommunicationClient>;
  /** 国际化助手 */
  i18n: ReturnType<typeof createPluginTranslationHelper>;
  /** 配置助手 */
  config: ReturnType<typeof createPluginConfigHelper>;
  /** 存储助手 */
  storage: ReturnType<typeof createPluginStorageHelper>;
  /** UI助手 */
  ui: ReturnType<typeof createPluginUIHelper>;
  /** 权限助手 */
  permissions: ReturnType<typeof createPluginPermissionHelper>;
  /** 依赖助手 */
  dependencies: ReturnType<typeof createPluginDependencyHelper>;
  /** 日志函数 */
  logger: ReturnType<typeof createPluginLogger>;
}

/**
 * 插件系统集成管理器
 * 将所有插件系统功能组合起来，提供统一的接口
 */
export class PluginSystemIntegration {
  private plugins: Map<string, TypesPlugin> = new Map();
  private pluginContexts: Map<string, PluginContext> = new Map();
  
  /**
   * 构造函数
   */
  constructor() {
    // 初始化
    this.initialize();
  }
  
  /**
   * 初始化
   */
  private initialize(): void {
    // 监听沙箱事件
    const sandboxManager = getPluginSandboxManager();
    // 监听插件销毁事件
    sandboxManager.addEventListener(SandboxEventType.DESTROYED, (event: { pluginId: string }) => {
      this.cleanupPlugin(event.pluginId);
    });
  }
  
  /**
   * 清理插件
   * @param pluginId 插件ID
   */
  private cleanupPlugin(pluginId: string): void {
    this.plugins.delete(pluginId);
    this.pluginContexts.delete(pluginId);
  }
  
  /**
   * 注册插件
   * @param plugin 插件对象
   */
  registerPlugin(plugin: TypesPlugin): void {
    this.plugins.set(plugin.id, plugin);
    
    // 注册到各个子系统
    const communicationManager = getPluginCommunicationManager();
    
    // 1. 为通信管理器、性能监控器和更新管理器创建兼容对象
    // 这些管理器期望的是Plugin类型（来自plugin-types.ts）
    const typesCompatiblePlugin: TypesPlugin = {
      ...plugin,
      description: plugin.description || '' // 确保描述字段不为undefined
    };
    
    // 注册到通信管理器
    communicationManager.registerPlugin(typesCompatiblePlugin);
    
    // 注册到性能监控器
    const performanceMonitor = getPluginPerformanceMonitor();
    performanceMonitor.registerPlugin(typesCompatiblePlugin);
    
    // 注册到更新管理器
    const updateManager = getPluginUpdateManager();
    updateManager.registerPlugin(typesCompatiblePlugin);
    
    // 2. 为系统管理器创建兼容对象
    // 这些管理器期望的是SystemPlugin类型（来自plugin-system.ts）
    const systemCompatiblePlugin: SystemPlugin = {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description || '',
      // 将routes转换为SystemPlugin中的PluginRoute
      routes: plugin.routes ? plugin.routes.map((route: TypesPluginRoute) => {
        // 创建符合SystemPlugin中的PluginRoute的对象
        return {
          path: route.path,
          element: route.element || (() => null)
        } as SystemPluginRoute;
      }) : undefined,
      // 其他属性
      i18n: plugin.i18n,
      // 处理dependencies属性
      dependencies: plugin.dependencies ? 
        // 如果是对象形式，转换为数组
        (typeof plugin.dependencies === 'object' && !Array.isArray(plugin.dependencies)) ?
          Object.entries(plugin.dependencies).map(([id, version]) => ({
            id,
            version,
            optional: false
          })) : 
        // 如果是数组形式，确保每个元素都有id和version属性
        Array.isArray(plugin.dependencies) ? 
          plugin.dependencies.map(dep => {
            if (typeof dep === 'object' && 'id' in dep && 'version' in dep) {
              return {
                id: dep.id,
                version: dep.version,
                optional: dep.optional || false
              };
            }
            return { id: 'unknown', version: '0.0.0', optional: false };
          }) : undefined,
      // 生命周期钩子
      onActivate: plugin.activate ? 
        () => plugin.activate && plugin.activate() : undefined,
      onDeactivate: plugin.deactivate ? 
        () => plugin.deactivate && plugin.deactivate() : undefined
    };

    // 注册国际化资源
    if (plugin.i18n) {
      const i18nManager = getPluginI18nManager();
      try {
        // 使用类型适配器转换国际化资源
        const adaptedI18n = adaptPluginLanguageResources(plugin.i18n);
        i18nManager.registerResources(plugin.id, adaptedI18n);
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        pluginLogger.error(`注册插件国际化资源失败 ${plugin.id}: ${err}`, { pluginId: plugin.id, error: err });
      }
    }
    
    // 注册配置
    const configManager = getPluginConfigManager();
    configManager.registerPlugin(typesCompatiblePlugin);
    
    if (plugin.config) {
      try {
        // 使用类型适配器转换配置模式
        const adaptedSchema = adaptConfigSchema(plugin.config, plugin.id, plugin.name);
        configManager.registerSchema(plugin.id, adaptedSchema);
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        pluginLogger.error(`注册插件配置模式失败 ${plugin.id}: ${err}`, { pluginId: plugin.id, error: err });
      }
    }
    
    // 注册到存储管理器
    const storageManager = getPluginStorageManager();
    storageManager.registerPlugin(systemCompatiblePlugin);
    
    // 注册到UI管理器
    const uiManager = getPluginUIManager();
    uiManager.registerPlugin(systemCompatiblePlugin);
    
    // 注册到权限管理器
    const permissionManager = getPluginPermissionManager();
    permissionManager.registerPlugin(systemCompatiblePlugin);
    
    // 注册到依赖管理器
    const dependencyManager = getPluginDependencyManager();
    dependencyManager.registerPlugin(systemCompatiblePlugin);
    
    // 创建插件上下文
    this.createPluginContext(plugin);
  }
  
  /**
   * 注销插件
   * @param pluginId 插件ID
   */
  unregisterPlugin(pluginId: string): void {
    // 注销各个子系统
    const communicationManager = getPluginCommunicationManager();
    communicationManager.unregisterPlugin(pluginId);
    
    const performanceMonitor = getPluginPerformanceMonitor();
    performanceMonitor.unregisterPlugin(pluginId);
    
    const updateManager = getPluginUpdateManager();
    updateManager.unregisterPlugin(pluginId);
    
    const i18nManager = getPluginI18nManager();
    i18nManager.unregisterPlugin(pluginId);
    
    const configManager = getPluginConfigManager();
    configManager.unregisterPlugin(pluginId);
    
    const storageManager = getPluginStorageManager();
    storageManager.unregisterPlugin(pluginId);
    
    const uiManager = getPluginUIManager();
    uiManager.unregisterPlugin(pluginId);
    
    const permissionManager = getPluginPermissionManager();
    permissionManager.unregisterPlugin(pluginId);
    
    const dependencyManager = getPluginDependencyManager();
    dependencyManager.unregisterPlugin(pluginId);
    
    // 清理插件
    this.cleanupPlugin(pluginId);
  }
  
  /**
   * 映射配置字段类型
   * @param type 类型枚举值
   * @returns 映射后的类型枚举值
   */
  private mapConfigFieldType(type: ConfigFieldType): ConfigPluginFieldType {
    switch (type) {
      case ConfigFieldType.STRING:
        return ConfigPluginFieldType.STRING;
      case ConfigFieldType.NUMBER:
        return ConfigPluginFieldType.NUMBER;
      case ConfigFieldType.BOOLEAN:
        return ConfigPluginFieldType.BOOLEAN;
      case ConfigFieldType.SELECT:
        return ConfigPluginFieldType.SELECT;
      case ConfigFieldType.MULTI_SELECT:
        return ConfigPluginFieldType.MULTI_SELECT;
      case ConfigFieldType.COLOR:
        return ConfigPluginFieldType.COLOR;
      case ConfigFieldType.DATE:
        return ConfigPluginFieldType.DATE;
      case ConfigFieldType.TIME:
        return ConfigPluginFieldType.TIME;
      case ConfigFieldType.DATETIME:
        return ConfigPluginFieldType.DATETIME;
      case ConfigFieldType.FILE:
        return ConfigPluginFieldType.FILE;
      case ConfigFieldType.OBJECT:
        return ConfigPluginFieldType.OBJECT;
      case ConfigFieldType.ARRAY:
        return ConfigPluginFieldType.ARRAY;
      default:
        return ConfigPluginFieldType.STRING;
    }
  }
  
  /**
   * 创建插件上下文
   * @param plugin 插件对象
   * @returns 插件上下文
   */
  private createPluginContext(plugin: TypesPlugin): PluginContext {
    // 如果已经存在上下文，直接返回
    if (this.pluginContexts.has(plugin.id)) {
      return this.pluginContexts.get(plugin.id)!;
    }
    
    // 创建各种助手对象
    const communication = createPluginCommunicationClient(plugin.id);
    const i18n = createPluginTranslationHelper(plugin.id);
    const config = createPluginConfigHelper(plugin.id);
    const storage = createPluginStorageHelper(plugin.id);
    const ui = createPluginUIHelper(plugin.id);
    const permissions = createPluginPermissionHelper(plugin.id);
    const dependencies = createPluginDependencyHelper(plugin.id);
    const logger = createPluginLogger(plugin.id);
    
    // 创建上下文对象
    const context: PluginContext = {
      pluginId: plugin.id,
      version: plugin.version,
      communication,
      i18n,
      config,
      storage,
      ui,
      permissions,
      dependencies,
      logger
    };
    
    // 缓存上下文
    this.pluginContexts.set(plugin.id, context);
    
    return context;
  }
  
  /**
   * 获取插件上下文
   * @param pluginId 插件ID
   * @returns 插件上下文
   */
  getPluginContext(pluginId: string): PluginContext | undefined {
    return this.pluginContexts.get(pluginId);
  }
  
  /**
   * 获取所有插件
   * @returns 所有插件
   */
  getAllPlugins(): TypesPlugin[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * 获取插件
   * @param pluginId 插件ID
   * @returns 插件对象
   */
  getPlugin(pluginId: string): TypesPlugin | undefined {
    return this.plugins.get(pluginId);
  }
  
  /**
   * 安装插件
   * @param pluginPackage 插件包
   * @returns 安装结果
   */
  async installPlugin(pluginPackage: PluginPackageExtended): Promise<boolean> {
    try {
      // 检查依赖
      const dependencyManager = getPluginDependencyManager();
      const dependentPlugins = dependencyManager.checkDependencies(pluginPackage.id, pluginPackage.dependencies);
      
      if (dependentPlugins.length > 0) {
        // 处理依赖问题
        // 这里可以添加依赖安装逻辑
        pluginLogger.warn(`插件 ${pluginPackage.id} 有未满足的依赖`, { dependentPlugins });
      }
      
      // 安装插件
      const success = await installPlugin(pluginPackage);
      if (success) {
        return true;
      }
      return false;
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      pluginLogger.error(`安装插件失败: ${err}`, { pluginId: pluginPackage.id, error: err });
      return false;
    }
  }
  
  /**
   * 卸载插件
   * @param pluginId 插件ID
   * @returns 卸载结果
   */
  async uninstallPlugin(pluginId: string): Promise<boolean> {
    try {
      // 检查依赖关系
      const dependencyManager = getPluginDependencyManager();
      const dependentPlugins = dependencyManager.getDependentPlugins(pluginId);
      
      if (dependentPlugins.length > 0) {
        // 有其他插件依赖此插件，不能卸载
        pluginLogger.warn(`无法卸载插件 ${pluginId}，有其他插件依赖它`, { dependentPlugins });
        return false;
      }
      
      // 卸载插件
      this.unregisterPlugin(pluginId);
      return await uninstallPlugin(pluginId);
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      pluginLogger.error(`卸载插件失败: ${err}`, { pluginId, error: err });
      return false;
    }
  }
  
  /**
   * 更新插件
   * @param pluginId 插件ID
   * @returns 更新结果
   */
  async updatePlugin(pluginId: string): Promise<boolean> {
    try {
      const updateManager = getPluginUpdateManager();
      const result = await updateManager.updatePlugin(pluginId);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      pluginLogger.error(`更新插件失败: ${err}`, { pluginId, error: err });
      return false;
    }
  }
  
  /**
   * 检查插件更新
   * @param pluginId 插件ID
   * @param options 选项
   * @returns 更新检查结果
   */
  async checkForUpdates(
    pluginId?: string,
    options: { forceCheck?: boolean } = {}
  ): Promise<Record<string, TypesUpdateCheckResult>> {
    try {
      const updateManager = getPluginUpdateManager();
      
      let results: Record<string, TypesUpdateCheckResult> = {};
      
      if (pluginId) {
        // 检查单个插件
        const plugin = this.getPlugin(pluginId);
        if (plugin) {
          const result = await updateManager.checkForUpdates(pluginId, options.forceCheck);
          if (result) {
            results[pluginId] = adaptUpdateCheckResult(result);
          }
        }
      } else {
        // 检查所有插件
        const plugins = this.getAllPlugins();
        const pluginIds = plugins.map(plugin => plugin.id);
        const checkResults = await updateManager.checkForUpdates(pluginIds, options.forceCheck);
        
        // 使用类型适配器转换结果
        results = Object.entries(checkResults).reduce((acc, [id, result]) => {
          acc[id] = adaptUpdateCheckResult(result);
          return acc;
        }, {} as Record<string, TypesUpdateCheckResult>);
      }
      
      return results;
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      pluginLogger.error(`检查插件更新失败: ${err}`, { pluginId, options, error: err });
      return {};
    }
  }
  
  /**
   * 搜索插件市场
   * @param query 查询字符串
   * @param options 搜索选项
   * @returns 搜索结果
   */
  async searchPluginMarket(
    query: string,
    options: {
      page?: number;
      pageSize?: number;
      category?: string;
      sort?: string;
    } = {}
  ): Promise<TypesPluginSearchResult> {
    try {
      const marketService = getPluginMarketService();
      
      // 创建搜索参数
      const searchParams: PluginSearchParams = {
        query,
        page: options.page || 1,
        pageSize: options.pageSize || 10,
        category: options.category || '',
        sort: options.sort || 'relevance'
      };
      
      // 执行搜索
      const result = await marketService.searchPlugins(searchParams);
      
      // 使用类型适配器转换结果
      return adaptPluginSearchResult(result);
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      pluginLogger.error(`搜索插件市场失败: ${err}`, { query, options, error: err });
      
      // 返回空结果
      return {
        items: [],
        total: 0,
        page: options.page || 1,
        pageSize: options.pageSize || 10,
        totalPages: 0
      };
    }
  }
  
  /**
   * 获取插件性能统计
   * @param pluginId 插件ID
   * @returns 性能统计
   */
  getPluginPerformanceStats(pluginId: string): ResourceUsageStats | null {
    try {
      const performanceMonitor = getPluginPerformanceMonitor();
      return performanceMonitor.getResourceUsage(pluginId);
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      pluginLogger.error(`获取插件性能统计失败 ${pluginId}: ${err}`, { pluginId, error: err });
      return null;
    }
  }
  
  /**
   * 获取插件存储统计
   * @param pluginId 插件ID
   * @returns 存储统计
   */
  getPluginStorageStats(pluginId: string): StorageStats | null {
    try {
      const storageManager = getPluginStorageManager();
      const stats = storageManager.getStorageStats(pluginId);
      
      // 使用类型适配器转换存储统计
      return adaptStorageStats(stats);
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      pluginLogger.error(`获取插件存储统计失败 ${pluginId}: ${err}`, { pluginId, error: err });
      return null;
    }
  }
  
  /**
   * 获取插件权限
   * @param pluginId 插件ID
   * @returns 权限列表
   */
  getPluginPermissions(pluginId: string): TypesPermissionRequest[] {
    try {
      const permissionManager = getPluginPermissionManager();
      const permissions = permissionManager.getPluginPermissions(pluginId);
      
      // 使用类型适配器转换权限请求
      return permissions.map(perm => adaptPermissionRequest(perm));
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      pluginLogger.error(`获取插件权限失败 ${pluginId}: ${err}`, { pluginId, error: err });
      return [];
    }
  }
  
  /**
   * 获取插件依赖图
   * @returns 依赖图
   */
  getPluginDependencyGraph(): DependencyGraph {
    try {
      const dependencyManager = getPluginDependencyManager();
      const graph = dependencyManager.getDependencyGraph();
      
      // 转换为符合DependencyGraph的格式
      return {
        nodes: graph.nodes.map(node => ({
          id: node.pluginId,
          label: `${node.pluginId}@${node.version}`,
          version: node.version || '0.0.0' // 添加缺失的version字段
        })),
        edges: graph.edges.map(edge => ({
          source: edge.source,
          target: edge.target
        }))
      };
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      pluginLogger.error(`获取插件依赖图失败: ${err}`, { error: err });
      return { nodes: [], edges: [] };
    }
  }
}

// 创建插件系统集成实例
let integrationInstance: PluginSystemIntegration | null = null;

/**
 * 获取插件系统集成实例
 * @returns 插件系统集成实例
 */
export function getPluginSystemIntegration(): PluginSystemIntegration {
  if (!integrationInstance) {
    integrationInstance = new PluginSystemIntegration();
  }
  return integrationInstance;
}

/**
 * 初始化插件系统
 * 在应用启动时调用
 */
export async function initializePluginSystem(): Promise<void> {
  try {
    // 获取集成实例
    const integration = getPluginSystemIntegration();
    
    // 设置全局访问点
    // 使用更安全的类型定义方式
    // 首先检查window对象是否已经定义了pluginSystem属性
    if (!('pluginSystem' in window)) {
      // 如果没有，则定义一个属性描述符
      Object.defineProperty(window, 'pluginSystem', {
        value: integration,
        writable: false,
        enumerable: true,
        configurable: false
      });
    } else {
      // 如果已经存在，则记录日志
      pluginLogger.warn('插件系统全局访问点已存在，将被覆盖');
      // 使用类型安全的方式设置window对象的pluginSystem属性
      (window as any).pluginSystem = integration;
    }
    
    // 创建权限请求对话框
    const { createPermissionRequestDialog } = await import('./plugin-permissions');
    createPermissionRequestDialog();
    
    pluginLogger.info('插件系统初始化完成');
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    pluginLogger.error(`插件系统初始化失败: ${err}`, { error: err });
  }
}
