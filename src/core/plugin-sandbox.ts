/**
 * 插件沙箱系统
 * 提供安全的插件执行环境，限制插件的权限和资源访问
 */
import { Plugin, PluginContext } from './plugin-system';
import { pluginLogger, createPluginLogger } from '../utils/logger';

/**
 * 沙箱权限定义
 */
export interface SandboxPermissions {
  /** 是否允许DOM操作 */
  allowDOM: boolean;
  /** 是否允许网络请求 */
  allowNetwork: boolean;
  /** 是否允许存储访问 */
  allowStorage: boolean;
  /** 是否允许与其他插件通信 */
  allowPluginCommunication: boolean;
  /** 允许的API列表 */
  allowedAPIs: string[];
  /** 允许的域名列表（用于网络请求） */
  allowedDomains?: string[];
  /** 存储大小限制（字节） */
  storageLimit?: number;
  /** 网络请求频率限制（每分钟） */
  networkRateLimit?: number;
}

/**
 * 沙箱执行上下文
 */
export interface SandboxContext extends PluginContext {
  /** 沙箱ID */
  sandboxId: string;
  /** 插件ID */
  pluginId: string;
  /** 权限 */
  permissions: SandboxPermissions;
  /** 沙箱存储 */
  storage: {
    get: (key: string) => Promise<unknown>;
    set: (key: string, value: unknown) => Promise<boolean>;
    remove: (key: string) => Promise<boolean>;
    clear: () => Promise<boolean>;
    getUsage: () => Promise<number>;
  };
  /** 网络请求 */
  network: {
    fetch: (url: string, options?: RequestInit) => Promise<Response>;
    getUsage: () => Promise<{count: number; lastReset: Date}>;
  };
  /** 日志 */
  logger: {
    log: (message: string, ...args: unknown[]) => void;
    warn: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
  };
}

/**
 * 沙箱执行结果
 */
export interface SandboxExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** 结果值 */
  result?: unknown;
  /** 错误信息 */
  error?: string;
  /** 资源使用情况 */
  resourceUsage: {
    /** 执行时间（毫秒） */
    executionTime: number;
    /** 内存使用（字节） */
    memoryUsage: number;
    /** 存储使用（字节） */
    storageUsage: number;
    /** 网络请求数 */
    networkRequests: number;
  };
}

/**
 * 沙箱事件类型
 */
export enum SandboxEventType {
  /** 沙箱创建 */
  CREATED = 'sandbox:created',
  /** 沙箱销毁 */
  DESTROYED = 'sandbox:destroyed',
  /** 权限请求 */
  PERMISSION_REQUEST = 'sandbox:permission_request',
  /** 权限变更 */
  PERMISSION_CHANGED = 'sandbox:permission_changed',
  /** 资源超限 */
  RESOURCE_LIMIT_EXCEEDED = 'sandbox:resource_limit_exceeded',
  /** 错误发生 */
  ERROR = 'sandbox:error',
}

/**
 * 沙箱事件
 */
export interface SandboxEvent {
  /** 事件类型 */
  type: SandboxEventType;
  /** 沙箱ID */
  sandboxId: string;
  /** 插件ID */
  pluginId: string;
  /** 时间戳 */
  timestamp: number;
  /** 详情 */
  details?: Record<string, unknown>;
}

/**
 * 沙箱事件监听器
 */
export type SandboxEventListener = (event: SandboxEvent) => void;

/**
 * 插件沙箱管理器
 */
export class PluginSandboxManager {
  private sandboxes: Map<string, {
    iframe: HTMLIFrameElement;
    plugin: Plugin;
    permissions: SandboxPermissions;
    active: boolean;
  }> = new Map();
  
  private eventListeners: Map<SandboxEventType, SandboxEventListener[]> = new Map();
  
  private storageUsage: Map<string, number> = new Map();
  private networkUsage: Map<string, {count: number; lastReset: Date}> = new Map();
  
  /**
   * 创建插件沙箱
   * @param plugin 插件对象
   * @param permissions 权限配置
   * @returns 沙箱ID
   */
  async createSandbox(plugin: Plugin, permissions?: Partial<SandboxPermissions>): Promise<string> {
    // 生成沙箱ID
    const sandboxId = `sandbox_${plugin.id}_${Date.now()}`;
    
    // 合并默认权限和自定义权限
    const defaultPermissions: SandboxPermissions = {
      allowDOM: false,
      allowNetwork: false,
      allowStorage: true,
      allowPluginCommunication: false,
      allowedAPIs: ['core'],
      allowedDomains: [],
      storageLimit: 1024 * 1024, // 1MB
      networkRateLimit: 60 // 每分钟60次请求
    };
    
    const finalPermissions = { ...defaultPermissions, ...permissions };
    
    // 从插件安全信息中获取权限
    if (plugin.security?.permissions) {
      if (plugin.security.permissions.includes('dom')) {
        finalPermissions.allowDOM = true;
      }
      if (plugin.security.permissions.includes('network')) {
        finalPermissions.allowNetwork = true;
      }
      if (plugin.security.permissions.includes('storage')) {
        finalPermissions.allowStorage = true;
      }
      if (plugin.security.permissions.includes('plugin-communication')) {
        finalPermissions.allowPluginCommunication = true;
      }
    }
    
    // 创建沙箱iframe
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.sandbox.add('allow-scripts');
    
    if (finalPermissions.allowDOM) {
      iframe.sandbox.add('allow-same-origin');
    }
    
    // 添加到文档
    document.body.appendChild(iframe);
    
    // 初始化存储和网络使用统计
    this.storageUsage.set(sandboxId, 0);
    this.networkUsage.set(sandboxId, { count: 0, lastReset: new Date() });
    
    // 保存沙箱信息
    this.sandboxes.set(sandboxId, {
      iframe,
      plugin,
      permissions: finalPermissions,
      active: true
    });
    
    // 触发沙箱创建事件
    this.dispatchEvent({
      type: SandboxEventType.CREATED,
      sandboxId,
      pluginId: plugin.id,
      timestamp: Date.now()
    });
    
    return sandboxId;
  }
  
  /**
   * 销毁插件沙箱
   * @param sandboxId 沙箱ID
   * @returns 是否成功
   */
  destroySandbox(sandboxId: string): boolean {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      return false;
    }
    
    // 移除iframe
    if (sandbox.iframe.parentNode) {
      sandbox.iframe.parentNode.removeChild(sandbox.iframe);
    }
    
    // 清理资源使用统计
    this.storageUsage.delete(sandboxId);
    this.networkUsage.delete(sandboxId);
    
    // 移除沙箱信息
    this.sandboxes.delete(sandboxId);
    
    // 触发沙箱销毁事件
    this.dispatchEvent({
      type: SandboxEventType.DESTROYED,
      sandboxId,
      pluginId: sandbox.plugin.id,
      timestamp: Date.now()
    });
    
    return true;
  }
  
  /**
   * 在沙箱中执行代码
   * @param sandboxId 沙箱ID
   * @param code 要执行的代码
   * @param context 执行上下文
   * @returns 执行结果
   */
  async executeInSandbox(
    sandboxId: string,
    code: string,
    context: Record<string, unknown> = {}
  ): Promise<SandboxExecutionResult> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox || !sandbox.active) {
      return {
        success: false,
        error: `Sandbox ${sandboxId} not found or not active`,
        resourceUsage: {
          executionTime: 0,
          memoryUsage: 0,
          storageUsage: 0,
          networkRequests: 0
        }
      };
    }
    
    const startTime = performance.now();
    const startMemory = window.performance.memory?.usedJSHeapSize || 0;
    
    try {
      // 创建沙箱上下文
      const sandboxContext: SandboxContext = {
        i18n: window.i18n,
        sandboxId,
        pluginId: sandbox.plugin.id,
        permissions: sandbox.permissions,
        storage: this.createStorageAPI(sandboxId),
        network: this.createNetworkAPI(sandboxId),
        logger: this.createLoggerAPI(sandboxId)
      };
      
      // 合并自定义上下文
      const fullContext = { ...sandboxContext, ...context };
      
      // 准备要执行的代码
      const wrappedCode = `
        try {
          ${code}
        } catch (error) {
          return { success: false, error: error.message };
        }
      `;
      
      // 在iframe中执行代码
      const iframe = sandbox.iframe;
      const iframeWindow = iframe.contentWindow;
      if (!iframeWindow) {
        throw new Error('Cannot access iframe content window');
      }
      
      // 注入上下文到iframe
      Object.entries(fullContext).forEach(([key, value]) => {
        (iframeWindow as Window & Record<string, unknown>)[key] = value;
      });
      
      // 执行代码
      const result = await new Promise<unknown>((resolve) => {
        const script = iframeWindow.document.createElement('script');
        script.textContent = `
          (function() {
            const result = (function() {
              ${wrappedCode}
            })();
            window.parent.postMessage({ type: 'sandbox-result', result }, '*');
          })();
        `;
        
        // 监听结果
        const messageHandler = (event: MessageEvent) => {
          if (event.data && event.data.type === 'sandbox-result') {
            window.removeEventListener('message', messageHandler);
            resolve(event.data.result);
          }
        };
        
        window.addEventListener('message', messageHandler);
        
        // 添加脚本到iframe
        iframeWindow.document.head.appendChild(script);
        
        // 设置超时
        setTimeout(() => {
          window.removeEventListener('message', messageHandler);
          resolve({ success: false, error: 'Execution timeout' });
        }, 5000); // 5秒超时
      });
      
      const endTime = performance.now();
      const endMemory = window.performance.memory?.usedJSHeapSize || 0;
      
      return {
        success: true,
        result,
        resourceUsage: {
          executionTime: endTime - startTime,
          memoryUsage: endMemory - startMemory,
          storageUsage: this.storageUsage.get(sandboxId) || 0,
          networkRequests: this.networkUsage.get(sandboxId)?.count || 0
        }
      };
    } catch (error) {
      const endTime = performance.now();
      
      // 触发错误事件
      this.dispatchEvent({
        type: SandboxEventType.ERROR,
        sandboxId,
        pluginId: sandbox.plugin.id,
        timestamp: Date.now(),
        details: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        resourceUsage: {
          executionTime: endTime - startTime,
          memoryUsage: 0,
          storageUsage: this.storageUsage.get(sandboxId) || 0,
          networkRequests: this.networkUsage.get(sandboxId)?.count || 0
        }
      };
    }
  }
  
  /**
   * 更新沙箱权限
   * @param sandboxId 沙箱ID
   * @param permissions 新权限
   * @returns 是否成功
   */
  updatePermissions(sandboxId: string, permissions: Partial<SandboxPermissions>): boolean {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      return false;
    }
    
    const oldPermissions = { ...sandbox.permissions };
    sandbox.permissions = { ...sandbox.permissions, ...permissions };
    
    // 触发权限变更事件
    this.dispatchEvent({
      type: SandboxEventType.PERMISSION_CHANGED,
      sandboxId,
      pluginId: sandbox.plugin.id,
      timestamp: Date.now(),
      details: {
        oldPermissions,
        newPermissions: sandbox.permissions
      }
    });
    
    return true;
  }
  
  /**
   * 请求临时权限
   * @param sandboxId 沙箱ID
   * @param permission 权限名称
   * @param reason 请求原因
   * @returns 是否授予权限
   */
  async requestPermission(
    sandboxId: string,
    permission: keyof SandboxPermissions,
    reason: string
  ): Promise<boolean> {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      return false;
    }
    
    // 触发权限请求事件
    this.dispatchEvent({
      type: SandboxEventType.PERMISSION_REQUEST,
      sandboxId,
      pluginId: sandbox.plugin.id,
      timestamp: Date.now(),
      details: {
        permission,
        reason
      }
    });
    
    // 这里可以实现用户确认逻辑
    // 简单起见，这里直接返回false，实际应用中应该弹出确认对话框
    return false;
  }
  
  /**
   * 添加事件监听器
   * @param type 事件类型
   * @param listener 监听器函数
   */
  addEventListener(type: SandboxEventType, listener: SandboxEventListener): void {
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
  removeEventListener(type: SandboxEventType, listener: SandboxEventListener): void {
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
   * 创建存储API
   * @param sandboxId 沙箱ID
   * @returns 存储API
   */
  private createStorageAPI(sandboxId: string) {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }
    
    const storagePrefix = `plugin_sandbox_${sandboxId}_`;
    
    return {
      get: async (key: string): Promise<unknown> => {
        if (!sandbox.permissions.allowStorage) {
          throw new Error('Storage access not allowed');
        }
        
        const item = localStorage.getItem(`${storagePrefix}${key}`);
        return item ? JSON.parse(item) : null;
      },
      
      set: async (key: string, value: unknown): Promise<boolean> => {
        if (!sandbox.permissions.allowStorage) {
          throw new Error('Storage access not allowed');
        }
        
        const json = JSON.stringify(value);
        const size = new Blob([json]).size;
        
        // 检查存储限制
        const currentUsage = this.storageUsage.get(sandboxId) || 0;
        const newUsage = currentUsage + size;
        
        if (sandbox.permissions.storageLimit && newUsage > sandbox.permissions.storageLimit) {
          this.dispatchEvent({
            type: SandboxEventType.RESOURCE_LIMIT_EXCEEDED,
            sandboxId,
            pluginId: sandbox.plugin.id,
            timestamp: Date.now(),
            details: {
              resource: 'storage',
              limit: sandbox.permissions.storageLimit,
              usage: newUsage
            }
          });
          
          throw new Error('Storage limit exceeded');
        }
        
        localStorage.setItem(`${storagePrefix}${key}`, json);
        this.storageUsage.set(sandboxId, newUsage);
        
        return true;
      },
      
      remove: async (key: string): Promise<boolean> => {
        if (!sandbox.permissions.allowStorage) {
          throw new Error('Storage access not allowed');
        }
        
        localStorage.removeItem(`${storagePrefix}${key}`);
        return true;
      },
      
      clear: async (): Promise<boolean> => {
        if (!sandbox.permissions.allowStorage) {
          throw new Error('Storage access not allowed');
        }
        
        // 清除所有以前缀开头的项
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(storagePrefix)) {
            localStorage.removeItem(key);
          }
        }
        
        this.storageUsage.set(sandboxId, 0);
        return true;
      },
      
      getUsage: async (): Promise<number> => {
        return this.storageUsage.get(sandboxId) || 0;
      }
    };
  }
  
  /**
   * 创建网络API
   * @param sandboxId 沙箱ID
   * @returns 网络API
   */
  private createNetworkAPI(sandboxId: string) {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }
    
    return {
      fetch: async (url: string, options?: RequestInit): Promise<Response> => {
        if (!sandbox.permissions.allowNetwork) {
          throw new Error('Network access not allowed');
        }
        
        // 检查域名白名单
        if (sandbox.permissions.allowedDomains && sandbox.permissions.allowedDomains.length > 0) {
          const urlObj = new URL(url);
          const domain = urlObj.hostname;
          
          if (!sandbox.permissions.allowedDomains.some(d => domain === d || domain.endsWith(`.${d}`))) {
            throw new Error(`Domain ${domain} not allowed`);
          }
        }
        
        // 检查请求频率限制
        const usage = this.networkUsage.get(sandboxId);
        if (!usage) {
          throw new Error('Network usage tracking not initialized');
        }
        
        // 重置计数器（如果上次重置是一分钟前）
        const now = new Date();
        if (now.getTime() - usage.lastReset.getTime() > 60000) {
          usage.count = 0;
          usage.lastReset = now;
        }
        
        // 检查是否超过限制
        if (sandbox.permissions.networkRateLimit && usage.count >= sandbox.permissions.networkRateLimit) {
          this.dispatchEvent({
            type: SandboxEventType.RESOURCE_LIMIT_EXCEEDED,
            sandboxId,
            pluginId: sandbox.plugin.id,
            timestamp: Date.now(),
            details: {
              resource: 'network',
              limit: sandbox.permissions.networkRateLimit,
              usage: usage.count
            }
          });
          
          throw new Error('Network rate limit exceeded');
        }
        
        // 增加计数器
        usage.count++;
        this.networkUsage.set(sandboxId, usage);
        
        // 执行请求
        return fetch(url, options);
      },
      
      getUsage: async (): Promise<{count: number; lastReset: Date}> => {
        return this.networkUsage.get(sandboxId) || { count: 0, lastReset: new Date() };
      }
    };
  }
  
  /**
   * 创建日志API
   * @param sandboxId 沙箱ID
   * @returns 日志API
   */
  private createLoggerAPI(sandboxId: string) {
    const sandbox = this.sandboxes.get(sandboxId);
    if (!sandbox) {
      throw new Error(`Sandbox ${sandboxId} not found`);
    }
    
    // 创建插件特定的日志器
    const logger = createPluginLogger(sandbox.plugin.id);
    
    return {
      log: (message: string, ...args: unknown[]) => {
        logger.info(message, ...args);
      },
      
      warn: (message: string, ...args: unknown[]) => {
        logger.warn(message, ...args);
      },
      
      error: (message: string, ...args: unknown[]) => {
        logger.error(message, ...args);
      }
    };
  }
  
  /**
   * 分发事件
   * @param event 事件对象
   */
  private dispatchEvent(event: SandboxEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        pluginLogger.error(`Error in sandbox event listener: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}

// 创建插件沙箱管理器实例
let sandboxManagerInstance: PluginSandboxManager | null = null;

/**
 * 获取插件沙箱管理器实例
 * @returns 插件沙箱管理器实例
 */
export function getPluginSandboxManager(): PluginSandboxManager {
  if (!sandboxManagerInstance) {
    sandboxManagerInstance = new PluginSandboxManager();
  }
  return sandboxManagerInstance;
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
