/**
 * 插件性能监控系统
 * 监控插件资源使用情况，防止恶意插件影响系统性能
 */
import { Plugin } from './plugin-system';
import { SandboxEventType, getPluginSandboxManager, SandboxExecutionResult } from './plugin-sandbox';

/**
 * 资源类型
 */
export enum ResourceType {
  /** CPU使用 */
  CPU = 'cpu',
  /** 内存使用 */
  MEMORY = 'memory',
  /** 存储使用 */
  STORAGE = 'storage',
  /** 网络请求 */
  NETWORK = 'network',
  /** DOM操作 */
  DOM = 'dom',
  /** 渲染时间 */
  RENDER = 'render'
}

/**
 * 资源使用记录
 */
export interface ResourceUsageRecord {
  /** 插件ID */
  pluginId: string;
  /** 资源类型 */
  resourceType: ResourceType;
  /** 使用量 */
  usage: number;
  /** 限制 */
  limit?: number;
  /** 时间戳 */
  timestamp: number;
}

/**
 * 性能事件类型
 */
export enum PerformanceEventType {
  /** 资源使用超限 */
  RESOURCE_LIMIT_EXCEEDED = 'performance:resource_limit_exceeded',
  /** 性能下降 */
  PERFORMANCE_DEGRADATION = 'performance:degradation',
  /** 插件崩溃 */
  PLUGIN_CRASH = 'performance:plugin_crash',
  /** 资源使用报告 */
  RESOURCE_USAGE_REPORT = 'performance:resource_usage_report'
}

/**
 * 性能事件
 */
export interface PerformanceEvent {
  /** 事件类型 */
  type: PerformanceEventType;
  /** 插件ID */
  pluginId: string;
  /** 时间戳 */
  timestamp: number;
  /** 详情 */
  details?: Record<string, unknown>;
}

/**
 * 性能事件监听器
 */
export type PerformanceEventListener = (event: PerformanceEvent) => void;

/**
 * 资源限制配置
 */
export interface ResourceLimits {
  /** CPU使用限制（毫秒/秒） */
  cpuUsageLimit?: number;
  /** 内存使用限制（字节） */
  memoryLimit?: number;
  /** 存储使用限制（字节） */
  storageLimit?: number;
  /** 网络请求限制（次数/分钟） */
  networkRequestLimit?: number;
  /** DOM操作限制（次数/秒） */
  domOperationLimit?: number;
  /** 渲染时间限制（毫秒） */
  renderTimeLimit?: number;
}

/**
 * 插件性能监控器
 */
export class PluginPerformanceMonitor {
  private plugins: Map<string, Plugin> = new Map();
  private resourceUsage: Map<string, Map<ResourceType, number[]>> = new Map();
  private resourceLimits: Map<string, ResourceLimits> = new Map();
  private eventListeners: Map<PerformanceEventType, PerformanceEventListener[]> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private usageHistory: ResourceUsageRecord[] = [];
  private historyLimit = 1000; // 保留最近1000条记录
  
  /**
   * 构造函数
   */
  constructor() {
    // 监听沙箱事件
    const sandboxManager = getPluginSandboxManager();
    sandboxManager.addEventListener(SandboxEventType.RESOURCE_LIMIT_EXCEEDED, (event) => {
      const { sandboxId, pluginId, details } = event;
      
      if (details && typeof details.resource === 'string' && typeof details.usage === 'number') {
        let resourceType: ResourceType;
        
        switch (details.resource) {
          case 'storage':
            resourceType = ResourceType.STORAGE;
            break;
          case 'network':
            resourceType = ResourceType.NETWORK;
            break;
          default:
            resourceType = ResourceType.CPU;
        }
        
        this.recordResourceUsage(pluginId, resourceType, details.usage);
        
        this.dispatchEvent({
          type: PerformanceEventType.RESOURCE_LIMIT_EXCEEDED,
          pluginId,
          timestamp: Date.now(),
          details: {
            resourceType,
            usage: details.usage,
            limit: details.limit
          }
        });
      }
    });
    
    sandboxManager.addEventListener(SandboxEventType.ERROR, (event) => {
      const { pluginId, details } = event;
      
      this.dispatchEvent({
        type: PerformanceEventType.PLUGIN_CRASH,
        pluginId,
        timestamp: Date.now(),
        details
      });
    });
  }
  
  /**
   * 注册插件
   * @param plugin 插件对象
   * @param limits 资源限制
   */
  registerPlugin(plugin: Plugin, limits?: ResourceLimits): void {
    this.plugins.set(plugin.id, plugin);
    this.resourceUsage.set(plugin.id, new Map());
    
    // 设置默认限制
    const defaultLimits: ResourceLimits = {
      cpuUsageLimit: 100, // 100ms/s
      memoryLimit: 50 * 1024 * 1024, // 50MB
      storageLimit: 10 * 1024 * 1024, // 10MB
      networkRequestLimit: 60, // 60次/分钟
      domOperationLimit: 1000, // 1000次/秒
      renderTimeLimit: 16 // 16ms (60fps)
    };
    
    this.resourceLimits.set(plugin.id, { ...defaultLimits, ...limits });
    
    // 如果是第一个插件，启动监控
    if (this.plugins.size === 1) {
      this.startMonitoring();
    }
  }
  
  /**
   * 注销插件
   * @param pluginId 插件ID
   */
  unregisterPlugin(pluginId: string): void {
    this.plugins.delete(pluginId);
    this.resourceUsage.delete(pluginId);
    this.resourceLimits.delete(pluginId);
    
    // 如果没有插件了，停止监控
    if (this.plugins.size === 0) {
      this.stopMonitoring();
    }
  }
  
  /**
   * 更新资源限制
   * @param pluginId 插件ID
   * @param limits 资源限制
   */
  updateResourceLimits(pluginId: string, limits: Partial<ResourceLimits>): void {
    const currentLimits = this.resourceLimits.get(pluginId);
    if (!currentLimits) {
      return;
    }
    
    this.resourceLimits.set(pluginId, { ...currentLimits, ...limits });
  }
  
  /**
   * 记录资源使用
   * @param pluginId 插件ID
   * @param resourceType 资源类型
   * @param usage 使用量
   */
  recordResourceUsage(pluginId: string, resourceType: ResourceType, usage: number): void {
    const pluginUsage = this.resourceUsage.get(pluginId);
    if (!pluginUsage) {
      return;
    }
    
    if (!pluginUsage.has(resourceType)) {
      pluginUsage.set(resourceType, []);
    }
    
    const usageHistory = pluginUsage.get(resourceType)!;
    usageHistory.push(usage);
    
    // 限制历史记录长度
    if (usageHistory.length > 100) {
      usageHistory.shift();
    }
    
    // 添加到全局历史记录
    this.usageHistory.push({
      pluginId,
      resourceType,
      usage,
      limit: this.getResourceLimit(pluginId, resourceType),
      timestamp: Date.now()
    });
    
    // 限制全局历史记录长度
    if (this.usageHistory.length > this.historyLimit) {
      this.usageHistory.shift();
    }
    
    // 检查是否超过限制
    this.checkResourceLimit(pluginId, resourceType, usage);
  }
  
  /**
   * 记录沙箱执行结果
   * @param pluginId 插件ID
   * @param result 执行结果
   */
  recordExecutionResult(pluginId: string, result: SandboxExecutionResult): void {
    if (!result.success) {
      this.dispatchEvent({
        type: PerformanceEventType.PLUGIN_CRASH,
        pluginId,
        timestamp: Date.now(),
        details: {
          error: result.error,
          resourceUsage: result.resourceUsage
        }
      });
      return;
    }
    
    // 记录各种资源使用
    this.recordResourceUsage(pluginId, ResourceType.CPU, result.resourceUsage.executionTime);
    this.recordResourceUsage(pluginId, ResourceType.MEMORY, result.resourceUsage.memoryUsage);
    this.recordResourceUsage(pluginId, ResourceType.STORAGE, result.resourceUsage.storageUsage);
    this.recordResourceUsage(pluginId, ResourceType.NETWORK, result.resourceUsage.networkRequests);
  }
  
  /**
   * 获取资源限制
   * @param pluginId 插件ID
   * @param resourceType 资源类型
   * @returns 资源限制
   */
  private getResourceLimit(pluginId: string, resourceType: ResourceType): number | undefined {
    const limits = this.resourceLimits.get(pluginId);
    if (!limits) {
      return undefined;
    }
    
    switch (resourceType) {
      case ResourceType.CPU:
        return limits.cpuUsageLimit;
      case ResourceType.MEMORY:
        return limits.memoryLimit;
      case ResourceType.STORAGE:
        return limits.storageLimit;
      case ResourceType.NETWORK:
        return limits.networkRequestLimit;
      case ResourceType.DOM:
        return limits.domOperationLimit;
      case ResourceType.RENDER:
        return limits.renderTimeLimit;
      default:
        return undefined;
    }
  }
  
  /**
   * 检查资源限制
   * @param pluginId 插件ID
   * @param resourceType 资源类型
   * @param usage 使用量
   */
  private checkResourceLimit(pluginId: string, resourceType: ResourceType, usage: number): void {
    const limit = this.getResourceLimit(pluginId, resourceType);
    if (!limit) {
      return;
    }
    
    if (usage > limit) {
      this.dispatchEvent({
        type: PerformanceEventType.RESOURCE_LIMIT_EXCEEDED,
        pluginId,
        timestamp: Date.now(),
        details: {
          resourceType,
          usage,
          limit
        }
      });
    }
  }
  
  /**
   * 启动监控
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      return;
    }
    
    // 每秒检查一次性能
    this.monitoringInterval = setInterval(() => {
      this.checkPerformance();
    }, 1000);
  }
  
  /**
   * 停止监控
   */
  private stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
  
  /**
   * 检查性能
   */
  private checkPerformance(): void {
    // 检查系统整体性能
    const systemMemory = window.performance.memory;
    if (systemMemory && systemMemory.usedJSHeapSize > systemMemory.jsHeapSizeLimit * 0.8) {
      // 系统内存使用超过80%，可能有性能问题
      this.dispatchEvent({
        type: PerformanceEventType.PERFORMANCE_DEGRADATION,
        pluginId: 'system',
        timestamp: Date.now(),
        details: {
          resourceType: ResourceType.MEMORY,
          usage: systemMemory.usedJSHeapSize,
          limit: systemMemory.jsHeapSizeLimit,
          message: 'System memory usage is high'
        }
      });
    }
    
    // 生成资源使用报告
    this.generateResourceUsageReport();
  }
  
  /**
   * 生成资源使用报告
   */
  private generateResourceUsageReport(): void {
    const report: Record<string, Record<string, number>> = {};
    
    this.plugins.forEach((_, pluginId) => {
      report[pluginId] = {};
      
      const pluginUsage = this.resourceUsage.get(pluginId);
      if (!pluginUsage) {
        return;
      }
      
      // 计算每种资源的平均使用量
      pluginUsage.forEach((usageHistory, resourceType) => {
        if (usageHistory.length === 0) {
          return;
        }
        
        const sum = usageHistory.reduce((acc, val) => acc + val, 0);
        const average = sum / usageHistory.length;
        
        report[pluginId][resourceType] = average;
      });
    });
    
    // 分发报告事件
    this.dispatchEvent({
      type: PerformanceEventType.RESOURCE_USAGE_REPORT,
      pluginId: 'system',
      timestamp: Date.now(),
      details: {
        report
      }
    });
  }
  
  /**
   * 获取插件资源使用历史
   * @param pluginId 插件ID
   * @param resourceType 资源类型
   * @param limit 限制数量
   * @returns 资源使用记录
   */
  getResourceUsageHistory(
    pluginId?: string,
    resourceType?: ResourceType,
    limit = 100
  ): ResourceUsageRecord[] {
    let filtered = this.usageHistory;
    
    if (pluginId) {
      filtered = filtered.filter(record => record.pluginId === pluginId);
    }
    
    if (resourceType) {
      filtered = filtered.filter(record => record.resourceType === resourceType);
    }
    
    // 返回最近的记录
    return filtered.slice(-limit);
  }
  
  /**
   * 获取插件资源使用统计
   * @param pluginId 插件ID
   * @returns 资源使用统计
   */
  getResourceUsageStats(pluginId: string): Record<ResourceType, {
    min: number;
    max: number;
    avg: number;
    current: number;
    limit?: number;
  }> {
    const result: Record<string, any> = {};
    const pluginUsage = this.resourceUsage.get(pluginId);
    
    if (!pluginUsage) {
      return result as any;
    }
    
    // 计算每种资源的统计数据
    pluginUsage.forEach((usageHistory, resourceType) => {
      if (usageHistory.length === 0) {
        result[resourceType] = {
          min: 0,
          max: 0,
          avg: 0,
          current: 0,
          limit: this.getResourceLimit(pluginId, resourceType)
        };
        return;
      }
      
      const min = Math.min(...usageHistory);
      const max = Math.max(...usageHistory);
      const sum = usageHistory.reduce((acc, val) => acc + val, 0);
      const avg = sum / usageHistory.length;
      const current = usageHistory[usageHistory.length - 1];
      
      result[resourceType] = {
        min,
        max,
        avg,
        current,
        limit: this.getResourceLimit(pluginId, resourceType)
      };
    });
    
    return result as any;
  }
  
  /**
   * 添加事件监听器
   * @param type 事件类型
   * @param listener 监听器函数
   */
  addEventListener(type: PerformanceEventType, listener: PerformanceEventListener): void {
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
  removeEventListener(type: PerformanceEventType, listener: PerformanceEventListener): void {
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
  private dispatchEvent(event: PerformanceEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in performance event listener:', error);
      }
    }
  }
}

// 创建插件性能监控器实例
let performanceMonitorInstance: PluginPerformanceMonitor | null = null;

/**
 * 获取插件性能监控器实例
 * @returns 插件性能监控器实例
 */
export function getPluginPerformanceMonitor(): PluginPerformanceMonitor {
  if (!performanceMonitorInstance) {
    performanceMonitorInstance = new PluginPerformanceMonitor();
  }
  return performanceMonitorInstance;
}

// 类型声明扩展
declare global {
  interface Window {
    performance: {
      memory?: {
        usedJSHeapSize: number;
        totalJSHeapSize: number;
        jsHeapSizeLimit: number;
      };
    };
  }
}
