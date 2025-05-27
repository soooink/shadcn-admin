/**
 * 插件自动更新系统
 * 提供插件版本检查和自动更新功能
 */
import { getPluginManager, uninstallPlugin, installPlugin } from './plugin-system';
import { Plugin } from './plugin-types';
import { getPluginMarketService } from './plugin-market';
import * as semver from 'semver';

/**
 * 更新检查结果
 */
export interface UpdateCheckResult {
  /** 插件ID */
  pluginId: string;
  /** 当前版本 */
  currentVersion: string;
  /** 最新版本 */
  latestVersion: string;
  /** 是否有更新 */
  hasUpdate: boolean;
  /** 更新类型 */
  updateType: 'major' | 'minor' | 'patch' | 'none';
  /** 更新日志 */
  changelog?: string;
  /** 发布日期 */
  releaseDate?: string;
  /** 是否是强制更新 */
  isForceUpdate?: boolean;
}

/**
 * 更新状态
 */
export enum UpdateStatus {
  /** 检查中 */
  CHECKING = 'checking',
  /** 下载中 */
  DOWNLOADING = 'downloading',
  /** 安装中 */
  INSTALLING = 'installing',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 失败 */
  FAILED = 'failed',
  /** 已取消 */
  CANCELLED = 'cancelled'
}

/**
 * 更新进度
 */
export interface UpdateProgress {
  /** 插件ID */
  pluginId: string;
  /** 状态 */
  status: UpdateStatus;
  /** 进度（0-100） */
  progress: number;
  /** 消息 */
  message?: string;
  /** 错误 */
  error?: Error;
}

/**
 * 更新事件类型
 */
export enum UpdateEventType {
  /** 更新检查开始 */
  CHECK_START = 'update:check_start',
  /** 更新检查完成 */
  CHECK_COMPLETE = 'update:check_complete',
  /** 更新开始 */
  UPDATE_START = 'update:start',
  /** 更新进度 */
  UPDATE_PROGRESS = 'update:progress',
  /** 更新完成 */
  UPDATE_COMPLETE = 'update:complete',
  /** 更新失败 */
  UPDATE_FAILED = 'update:failed',
  /** 更新取消 */
  UPDATE_CANCELLED = 'update:cancelled'
}

/**
 * 更新事件
 */
export interface UpdateEvent {
  /** 事件类型 */
  type: UpdateEventType;
  /** 插件ID */
  pluginId: string;
  /** 时间戳 */
  timestamp: number;
  /** 详情 */
  details?: Record<string, unknown>;
}

/**
 * 更新事件监听器
 */
export type UpdateEventListener = (event: UpdateEvent) => void;

/**
 * 更新配置
 */
export interface UpdateConfig {
  /** 是否自动检查更新 */
  autoCheck: boolean;
  /** 检查间隔（毫秒） */
  checkInterval: number;
  /** 是否自动更新补丁版本 */
  autoPatchUpdate: boolean;
  /** 是否自动更新次要版本 */
  autoMinorUpdate: boolean;
  /** 是否自动更新主要版本 */
  autoMajorUpdate: boolean;
  /** 是否在应用启动时检查 */
  checkOnStartup: boolean;
  /** 是否在后台下载更新 */
  downloadInBackground: boolean;
}

/**
 * 插件更新管理器
 */
export class PluginUpdateManager {
  private plugins: Map<string, Plugin> = new Map();
  private updateResults: Map<string, UpdateCheckResult> = new Map();
  private updateProgress: Map<string, UpdateProgress> = new Map();
  private eventListeners: Map<UpdateEventType, UpdateEventListener[]> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private updating: Set<string> = new Set();
  
  /**
   * 默认更新配置
   */
  private defaultConfig: UpdateConfig = {
    autoCheck: true,
    checkInterval: 24 * 60 * 60 * 1000, // 24小时
    autoPatchUpdate: true,
    autoMinorUpdate: false,
    autoMajorUpdate: false,
    checkOnStartup: true,
    downloadInBackground: true
  };
  
  /**
   * 当前配置
   */
  private config: UpdateConfig;
  
  /**
   * 构造函数
   * @param config 更新配置
   */
  constructor(config?: Partial<UpdateConfig>) {
    this.config = { ...this.defaultConfig, ...config };
    
    // 从本地存储加载配置
    this.loadConfig();
    
    // 如果配置了自动检查，启动定时检查
    if (this.config.autoCheck) {
      this.startAutoCheck();
    }
    
    // 如果配置了启动时检查，执行检查
    if (this.config.checkOnStartup) {
      // 延迟检查，确保系统已完全初始化
      setTimeout(() => {
        this.checkForUpdates();
      }, 5000);
    }
  }
  
  /**
   * 加载配置
   */
  private loadConfig(): void {
    try {
      const savedConfig = localStorage.getItem('plugin_update_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.error('[Plugin Updater] Failed to load config:', error);
    }
  }
  
  /**
   * 保存配置
   */
  private saveConfig(): void {
    try {
      localStorage.setItem('plugin_update_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('[Plugin Updater] Failed to save config:', error);
    }
  }
  
  /**
   * 获取配置
   * @returns 更新配置
   */
  getConfig(): UpdateConfig {
    return { ...this.config };
  }
  
  /**
   * 更新配置
   * @param config 新配置
   */
  updateConfig(config: Partial<UpdateConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...config };
    
    // 保存配置
    this.saveConfig();
    
    // 如果自动检查设置发生变化，更新定时器
    if (oldConfig.autoCheck !== this.config.autoCheck || 
        oldConfig.checkInterval !== this.config.checkInterval) {
      if (this.config.autoCheck) {
        this.startAutoCheck();
      } else {
        this.stopAutoCheck();
      }
    }
  }
  
  /**
   * 注册插件
   * @param plugin 插件对象
   */
  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
  }
  
  /**
   * 注销插件
   * @param pluginId 插件ID
   */
  unregisterPlugin(pluginId: string): void {
    this.plugins.delete(pluginId);
    this.updateResults.delete(pluginId);
    this.updateProgress.delete(pluginId);
  }
  
  /**
   * 启动自动检查
   */
  private startAutoCheck(): void {
    this.stopAutoCheck();
    
    this.checkInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.config.checkInterval);
  }
  
  /**
   * 停止自动检查
   */
  private stopAutoCheck(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
  
  /**
   * 检查更新
   * @param pluginIds 指定插件ID列表（如果为空则检查所有插件）
   * @returns 更新检查结果
   */
  async checkForUpdates(pluginIds?: string[]): Promise<Map<string, UpdateCheckResult>> {
    const targetPlugins = pluginIds 
      ? pluginIds.filter(id => this.plugins.has(id)).map(id => this.plugins.get(id)!)
      : Array.from(this.plugins.values());
    
    if (targetPlugins.length === 0) {
      return new Map();
    }
    
    // 分发检查开始事件
    this.dispatchEvent({
      type: UpdateEventType.CHECK_START,
      pluginId: 'system',
      timestamp: Date.now(),
      details: {
        pluginIds: targetPlugins.map(p => p.id)
      }
    });
    
    const marketService = getPluginMarketService();
    const results = new Map<string, UpdateCheckResult>();
    
    // 并行检查所有插件
    const checkPromises = targetPlugins.map(async (plugin) => {
      try {
        // 获取插件最新信息
        const pluginInfo = await marketService.getPluginDetails(plugin.id);
        
        if (!pluginInfo) {
          console.warn(`[Plugin Updater] Plugin ${plugin.id} not found in market`);
          return;
        }
        
        const currentVersion = plugin.version;
        const latestVersion = pluginInfo.version;
        
        // 检查是否有更新
        const hasUpdate = semver.gt(latestVersion, currentVersion);
        
        // 确定更新类型
        let updateType: 'major' | 'minor' | 'patch' | 'none' = 'none';
        
        if (hasUpdate) {
          if (semver.major(latestVersion) > semver.major(currentVersion)) {
            updateType = 'major';
          } else if (semver.minor(latestVersion) > semver.minor(currentVersion)) {
            updateType = 'minor';
          } else if (semver.patch(latestVersion) > semver.patch(currentVersion)) {
            updateType = 'patch';
          }
        }
        
        const result: UpdateCheckResult = {
          pluginId: plugin.id,
          currentVersion,
          latestVersion,
          hasUpdate,
          updateType,
          changelog: pluginInfo.changelog,
          releaseDate: pluginInfo.releaseDate,
          isForceUpdate: pluginInfo.isForceUpdate
        };
        
        results.set(plugin.id, result);
        this.updateResults.set(plugin.id, result);
        
        // 如果配置了自动更新且有更新，执行自动更新
        if (hasUpdate) {
          const shouldAutoUpdate = 
            (updateType === 'patch' && this.config.autoPatchUpdate) ||
            (updateType === 'minor' && this.config.autoMinorUpdate) ||
            (updateType === 'major' && this.config.autoMajorUpdate) ||
            pluginInfo.isForceUpdate;
          
          if (shouldAutoUpdate) {
            // 在后台执行更新
            this.updatePlugin(plugin.id, this.config.downloadInBackground);
          }
        }
      } catch (error) {
        console.error(`[Plugin Updater] Failed to check update for ${plugin.id}:`, error);
      }
    });
    
    await Promise.all(checkPromises);
    
    // 分发检查完成事件
    this.dispatchEvent({
      type: UpdateEventType.CHECK_COMPLETE,
      pluginId: 'system',
      timestamp: Date.now(),
      details: {
        results: Array.from(results.entries()).reduce((obj, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {} as Record<string, UpdateCheckResult>)
      }
    });
    
    return results;
  }
  
  /**
   * 获取更新检查结果
   * @param pluginId 插件ID
   * @returns 更新检查结果
   */
  getUpdateCheckResult(pluginId: string): UpdateCheckResult | undefined {
    return this.updateResults.get(pluginId);
  }
  
  /**
   * 获取所有更新检查结果
   * @returns 所有更新检查结果
   */
  getAllUpdateCheckResults(): Map<string, UpdateCheckResult> {
    return new Map(this.updateResults);
  }
  
  /**
   * 获取可用更新
   * @returns 可用更新列表
   */
  getAvailableUpdates(): UpdateCheckResult[] {
    const updates: UpdateCheckResult[] = [];
    
    this.updateResults.forEach(result => {
      if (result.hasUpdate) {
        updates.push(result);
      }
    });
    
    return updates;
  }
  
  /**
   * 更新插件
   * @param pluginId 插件ID
   * @param inBackground 是否在后台执行
   * @returns 是否成功
   */
  async updatePlugin(pluginId: string, inBackground = false): Promise<boolean> {
    // 检查插件是否存在
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }
    
    // 检查是否有更新
    const updateResult = this.updateResults.get(pluginId);
    if (!updateResult || !updateResult.hasUpdate) {
      console.warn(`[Plugin Updater] No update available for plugin ${pluginId}`);
      return false;
    }
    
    // 检查是否已在更新中
    if (this.updating.has(pluginId)) {
      console.warn(`[Plugin Updater] Plugin ${pluginId} is already updating`);
      return false;
    }
    
    this.updating.add(pluginId);
    
    // 更新进度初始化
    const progress: UpdateProgress = {
      pluginId,
      status: UpdateStatus.CHECKING,
      progress: 0,
      message: '准备更新'
    };
    
    this.updateProgress.set(pluginId, progress);
    
    // 分发更新开始事件
    this.dispatchEvent({
      type: UpdateEventType.UPDATE_START,
      pluginId,
      timestamp: Date.now(),
      details: {
        currentVersion: updateResult.currentVersion,
        targetVersion: updateResult.latestVersion,
        inBackground
      }
    });
    
    try {
      const marketService = getPluginMarketService();
      
      // 更新进度：下载中
      this.updateUpdateProgress(pluginId, {
        status: UpdateStatus.DOWNLOADING,
        progress: 20,
        message: '下载插件'
      });
      
      // 获取插件包信息
      const pluginPackage = await marketService.getPluginPackage(pluginId, updateResult.latestVersion);
      
      if (!pluginPackage) {
        throw new Error(`Failed to get plugin package for ${pluginId}`);
      }
      
      // 更新进度：安装中
      this.updateUpdateProgress(pluginId, {
        status: UpdateStatus.INSTALLING,
        progress: 60,
        message: '安装插件'
      });
      
      // 卸载旧版本
      await uninstallPlugin(pluginId);
      
      // 安装新版本
      const success = await installPlugin(pluginPackage);
      
      if (!success) {
        throw new Error(`Failed to install plugin ${pluginId}`);
      }
      
      // 更新进度：完成
      this.updateUpdateProgress(pluginId, {
        status: UpdateStatus.COMPLETED,
        progress: 100,
        message: '更新完成'
      });
      
      // 分发更新完成事件
      this.dispatchEvent({
        type: UpdateEventType.UPDATE_COMPLETE,
        pluginId,
        timestamp: Date.now(),
        details: {
          version: updateResult.latestVersion
        }
      });
      
      // 更新完成后，清除更新结果
      this.updateResults.delete(pluginId);
      
      return true;
    } catch (error) {
      console.error(`[Plugin Updater] Failed to update plugin ${pluginId}:`, error);
      
      // 更新进度：失败
      this.updateUpdateProgress(pluginId, {
        status: UpdateStatus.FAILED,
        progress: 0,
        message: '更新失败',
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      // 分发更新失败事件
      this.dispatchEvent({
        type: UpdateEventType.UPDATE_FAILED,
        pluginId,
        timestamp: Date.now(),
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      return false;
    } finally {
      this.updating.delete(pluginId);
    }
  }
  
  /**
   * 取消更新
   * @param pluginId 插件ID
   * @returns 是否成功
   */
  cancelUpdate(pluginId: string): boolean {
    // 检查是否在更新中
    if (!this.updating.has(pluginId)) {
      return false;
    }
    
    // 更新进度：取消
    this.updateUpdateProgress(pluginId, {
      status: UpdateStatus.CANCELLED,
      progress: 0,
      message: '更新已取消'
    });
    
    // 分发更新取消事件
    this.dispatchEvent({
      type: UpdateEventType.UPDATE_CANCELLED,
      pluginId,
      timestamp: Date.now()
    });
    
    this.updating.delete(pluginId);
    
    return true;
  }
  
  /**
   * 更新所有插件
   * @param inBackground 是否在后台执行
   * @returns 更新结果
   */
  async updateAllPlugins(inBackground = false): Promise<Record<string, boolean>> {
    const availableUpdates = this.getAvailableUpdates();
    const results: Record<string, boolean> = {};
    
    // 按照更新类型排序：强制更新 > 补丁 > 次要 > 主要
    availableUpdates.sort((a, b) => {
      if (a.isForceUpdate && !b.isForceUpdate) return -1;
      if (!a.isForceUpdate && b.isForceUpdate) return 1;
      
      const typeOrder = { patch: 0, minor: 1, major: 2, none: 3 };
      return typeOrder[a.updateType] - typeOrder[b.updateType];
    });
    
    // 依次更新
    for (const update of availableUpdates) {
      results[update.pluginId] = await this.updatePlugin(update.pluginId, inBackground);
    }
    
    return results;
  }
  
  /**
   * 获取更新进度
   * @param pluginId 插件ID
   * @returns 更新进度
   */
  getUpdateProgress(pluginId: string): UpdateProgress | undefined {
    return this.updateProgress.get(pluginId);
  }
  
  /**
   * 获取所有更新进度
   * @returns 所有更新进度
   */
  getAllUpdateProgress(): Map<string, UpdateProgress> {
    return new Map(this.updateProgress);
  }
  
  /**
   * 更新更新进度
   * @param pluginId 插件ID
   * @param progress 进度更新
   */
  private updateUpdateProgress(pluginId: string, progress: Partial<UpdateProgress>): void {
    const currentProgress = this.updateProgress.get(pluginId) || {
      pluginId,
      status: UpdateStatus.CHECKING,
      progress: 0
    };
    
    const updatedProgress = { ...currentProgress, ...progress };
    this.updateProgress.set(pluginId, updatedProgress);
    
    // 分发更新进度事件
    this.dispatchEvent({
      type: UpdateEventType.UPDATE_PROGRESS,
      pluginId,
      timestamp: Date.now(),
      details: updatedProgress
    });
  }
  
  /**
   * 添加事件监听器
   * @param type 事件类型
   * @param listener 监听器函数
   */
  addEventListener(type: UpdateEventType, listener: UpdateEventListener): void {
    if (!this.eventListeners.has(type)) {
      this.eventListeners.set(type, []);
    }
    
    this.eventListeners.get(type)?.push(listener);
  }
  
  /**
   * 移除事件监听器
   * @param type 事件类型
   * @param listener 监听器函数
   */
  removeEventListener(type: UpdateEventType, listener: UpdateEventListener): void {
    const listeners = this.eventListeners.get(type);
    if (!listeners) {
      return;
    }
    
    const index = listeners.indexOf(listener);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }
  
  /**
   * 分发事件
   * @param event 事件对象
   */
  private dispatchEvent(event: UpdateEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in update event listener:', error);
      }
    }
  }
}

// 创建插件更新管理器实例
let updateManagerInstance: PluginUpdateManager | null = null;

/**
 * 获取插件更新管理器实例
 * @param config 更新配置
 * @returns 插件更新管理器实例
 */
export function getPluginUpdateManager(config?: Partial<UpdateConfig>): PluginUpdateManager {
  if (!updateManagerInstance) {
    updateManagerInstance = new PluginUpdateManager(config);
    
    // 注册所有已加载的插件
    const pluginManager = getPluginManager();
    pluginManager.getAllPlugins().forEach(plugin => {
      updateManagerInstance?.registerPlugin(plugin);
    });
  }
  return updateManagerInstance;
}
