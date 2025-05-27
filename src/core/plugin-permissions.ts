/**
 * 插件权限管理系统
 * 提供插件权限的定义、验证和管理功能
 */
import { Plugin } from './plugin-system';
import { SandboxEventType, getPluginSandboxManager } from './plugin-sandbox';

/**
 * 权限类型
 */
export enum PermissionType {
  /** 文件系统 */
  FILE_SYSTEM = 'file_system',
  /** 网络 */
  NETWORK = 'network',
  /** 存储 */
  STORAGE = 'storage',
  /** 剪贴板 */
  CLIPBOARD = 'clipboard',
  /** 通知 */
  NOTIFICATION = 'notification',
  /** 地理位置 */
  GEOLOCATION = 'geolocation',
  /** 摄像头 */
  CAMERA = 'camera',
  /** 麦克风 */
  MICROPHONE = 'microphone',
  /** 系统信息 */
  SYSTEM_INFO = 'system_info',
  /** 用户数据 */
  USER_DATA = 'user_data',
  /** 插件通信 */
  PLUGIN_COMMUNICATION = 'plugin_communication',
  /** UI集成 */
  UI_INTEGRATION = 'ui_integration',
  /** 后台运行 */
  BACKGROUND = 'background',
  /** 自动启动 */
  AUTO_START = 'auto_start',
  /** 自定义权限 */
  CUSTOM = 'custom'
}

/**
 * 权限范围
 */
export enum PermissionScope {
  /** 读取 */
  READ = 'read',
  /** 写入 */
  WRITE = 'write',
  /** 执行 */
  EXECUTE = 'execute',
  /** 所有 */
  ALL = 'all'
}

/**
 * 权限定义
 */
export interface PermissionDefinition {
  /** 权限类型 */
  type: PermissionType;
  /** 权限范围 */
  scope: PermissionScope;
  /** 权限目标（例如特定文件路径、域名等） */
  target?: string;
  /** 权限描述 */
  description: string;
  /** 是否为敏感权限 */
  sensitive: boolean;
  /** 是否为必需权限 */
  required: boolean;
  /** 权限图标 */
  icon?: string;
}

/**
 * 权限状态
 */
export enum PermissionStatus {
  /** 已授予 */
  GRANTED = 'granted',
  /** 已拒绝 */
  DENIED = 'denied',
  /** 待定 */
  PENDING = 'pending',
  /** 部分授予 */
  PARTIAL = 'partial'
}

/**
 * 权限请求
 */
export interface PermissionRequest {
  /** 请求ID */
  id: string;
  /** 插件ID */
  pluginId: string;
  /** 权限定义 */
  permission: PermissionDefinition;
  /** 请求时间 */
  requestedAt: number;
  /** 响应时间 */
  respondedAt?: number;
  /** 权限状态 */
  status: PermissionStatus;
  /** 请求原因 */
  reason?: string;
  /** 拒绝原因 */
  deniedReason?: string;
  /** 过期时间 */
  expiresAt?: number;
}

/**
 * 权限事件类型
 */
export enum PermissionEventType {
  /** 权限请求 */
  PERMISSION_REQUESTED = 'permission:requested',
  /** 权限授予 */
  PERMISSION_GRANTED = 'permission:granted',
  /** 权限拒绝 */
  PERMISSION_DENIED = 'permission:denied',
  /** 权限撤销 */
  PERMISSION_REVOKED = 'permission:revoked',
  /** 权限过期 */
  PERMISSION_EXPIRED = 'permission:expired'
}

/**
 * 权限事件
 */
export interface PermissionEvent {
  /** 事件类型 */
  type: PermissionEventType;
  /** 插件ID */
  pluginId: string;
  /** 权限请求 */
  request: PermissionRequest;
  /** 时间戳 */
  timestamp: number;
  /** 详情 */
  details?: Record<string, unknown>;
}

/**
 * 权限事件监听器
 */
export type PermissionEventListener = (event: PermissionEvent) => void;

/**
 * 插件权限管理器
 */
export class PluginPermissionManager {
  private plugins: Map<string, Plugin> = new Map();
  private permissions: Map<string, Map<string, PermissionRequest>> = new Map();
  private eventListeners: Map<PermissionEventType, PermissionEventListener[]> = new Map();
  private pendingRequests: Map<string, PermissionRequest> = new Map();
  
  /**
   * 构造函数
   */
  constructor() {
    // 从本地存储加载权限
    this.loadPermissionsFromStorage();
    
    // 监听沙箱事件
    const sandboxManager = getPluginSandboxManager();
    sandboxManager.addEventListener(SandboxEventType.DESTROYED, (event) => {
      // 清理待处理的权限请求
      this.cleanupPendingRequests(event.pluginId);
    });
  }
  
  /**
   * 从本地存储加载权限
   */
  private loadPermissionsFromStorage(): void {
    try {
      const storedPermissions = localStorage.getItem('plugin_permissions');
      if (storedPermissions) {
        const parsedPermissions = JSON.parse(storedPermissions);
        
        Object.keys(parsedPermissions).forEach(pluginId => {
          const pluginPermissions = new Map<string, PermissionRequest>();
          
          Object.values(parsedPermissions[pluginId]).forEach((request: PermissionRequest) => {
            // 检查权限是否过期
            if (request.expiresAt && request.expiresAt < Date.now()) {
              // 权限已过期，更新状态
              request.status = PermissionStatus.DENIED;
              request.deniedReason = '权限已过期';
              
              // 分发权限过期事件
              this.dispatchEvent({
                type: PermissionEventType.PERMISSION_EXPIRED,
                pluginId,
                request,
                timestamp: Date.now()
              });
            }
            
            pluginPermissions.set(request.id, request);
          });
          
          this.permissions.set(pluginId, pluginPermissions);
        });
      }
    } catch (error) {
      console.error('[Plugin Permissions] Failed to load permissions from storage:', error);
    }
  }
  
  /**
   * 保存权限到本地存储
   */
  private savePermissionsToStorage(): void {
    try {
      const serializedPermissions: Record<string, Record<string, PermissionRequest>> = {};
      
      this.permissions.forEach((pluginPermissions, pluginId) => {
        serializedPermissions[pluginId] = {};
        
        pluginPermissions.forEach((request, requestId) => {
          serializedPermissions[pluginId][requestId] = request;
        });
      });
      
      localStorage.setItem('plugin_permissions', JSON.stringify(serializedPermissions));
    } catch (error) {
      console.error('[Plugin Permissions] Failed to save permissions to storage:', error);
    }
  }
  
  /**
   * 清理待处理的权限请求
   * @param pluginId 插件ID
   */
  private cleanupPendingRequests(pluginId: string): void {
    const requestsToRemove: string[] = [];
    
    this.pendingRequests.forEach((request, requestId) => {
      if (request.pluginId === pluginId) {
        requestsToRemove.push(requestId);
      }
    });
    
    requestsToRemove.forEach(requestId => {
      this.pendingRequests.delete(requestId);
    });
  }
  
  /**
   * 注册插件
   * @param plugin 插件对象
   */
  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
    
    // 初始化插件权限映射
    if (!this.permissions.has(plugin.id)) {
      this.permissions.set(plugin.id, new Map());
    }
  }
  
  /**
   * 注销插件
   * @param pluginId 插件ID
   */
  unregisterPlugin(pluginId: string): void {
    this.plugins.delete(pluginId);
    
    // 清理待处理的权限请求
    this.cleanupPendingRequests(pluginId);
  }
  
  /**
   * 请求权限
   * @param pluginId 插件ID
   * @param permission 权限定义
   * @param reason 请求原因
   * @returns 权限请求
   */
  requestPermission(
    pluginId: string,
    permission: PermissionDefinition,
    reason?: string
  ): Promise<PermissionRequest> {
    if (!this.plugins.has(pluginId)) {
      return Promise.reject(new Error(`Plugin ${pluginId} is not registered`));
    }
    
    // 检查是否已有相同权限的请求
    const existingRequest = this.findExistingPermissionRequest(pluginId, permission);
    if (existingRequest) {
      // 如果权限已授予，直接返回
      if (existingRequest.status === PermissionStatus.GRANTED) {
        return Promise.resolve(existingRequest);
      }
      
      // 如果权限已拒绝，返回拒绝
      if (existingRequest.status === PermissionStatus.DENIED) {
        return Promise.reject(new Error(`Permission ${permission.type}:${permission.scope} has been denied`));
      }
    }
    
    // 创建新的权限请求
    const requestId = `${pluginId}:${permission.type}:${permission.scope}:${Date.now()}`;
    const request: PermissionRequest = {
      id: requestId,
      pluginId,
      permission,
      requestedAt: Date.now(),
      status: PermissionStatus.PENDING,
      reason
    };
    
    // 保存到待处理请求
    this.pendingRequests.set(requestId, request);
    
    // 分发权限请求事件
    this.dispatchEvent({
      type: PermissionEventType.PERMISSION_REQUESTED,
      pluginId,
      request,
      timestamp: Date.now()
    });
    
    // 返回Promise，等待用户响应
    return new Promise<PermissionRequest>((resolve, reject) => {
      // 创建事件监听器
      const listener = (event: PermissionEvent) => {
        if (event.request.id !== requestId) {
          return;
        }
        
        // 移除监听器
        this.removeEventListener(PermissionEventType.PERMISSION_GRANTED, listener);
        this.removeEventListener(PermissionEventType.PERMISSION_DENIED, listener);
        
        // 从待处理请求中移除
        this.pendingRequests.delete(requestId);
        
        // 根据事件类型解析或拒绝Promise
        if (event.type === PermissionEventType.PERMISSION_GRANTED) {
          resolve(event.request);
        } else {
          reject(new Error(event.request.deniedReason || 'Permission denied'));
        }
      };
      
      // 添加事件监听器
      this.addEventListener(PermissionEventType.PERMISSION_GRANTED, listener);
      this.addEventListener(PermissionEventType.PERMISSION_DENIED, listener);
    });
  }
  
  /**
   * 查找现有权限请求
   * @param pluginId 插件ID
   * @param permission 权限定义
   * @returns 权限请求
   */
  private findExistingPermissionRequest(
    pluginId: string,
    permission: PermissionDefinition
  ): PermissionRequest | undefined {
    const pluginPermissions = this.permissions.get(pluginId);
    if (!pluginPermissions) {
      return undefined;
    }
    
    // 查找匹配的权限请求
    for (const request of pluginPermissions.values()) {
      if (
        request.permission.type === permission.type &&
        request.permission.scope === permission.scope &&
        request.permission.target === permission.target
      ) {
        return request;
      }
    }
    
    return undefined;
  }
  
  /**
   * 授予权限
   * @param requestId 请求ID
   * @param expiresIn 过期时间（毫秒）
   * @returns 是否成功
   */
  grantPermission(requestId: string, expiresIn?: number): boolean {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      return false;
    }
    
    // 更新请求状态
    request.status = PermissionStatus.GRANTED;
    request.respondedAt = Date.now();
    
    // 设置过期时间（如果有）
    if (expiresIn) {
      request.expiresAt = Date.now() + expiresIn;
    }
    
    // 保存到插件权限映射
    let pluginPermissions = this.permissions.get(request.pluginId);
    if (!pluginPermissions) {
      pluginPermissions = new Map();
      this.permissions.set(request.pluginId, pluginPermissions);
    }
    
    pluginPermissions.set(requestId, request);
    
    // 保存到本地存储
    this.savePermissionsToStorage();
    
    // 分发权限授予事件
    this.dispatchEvent({
      type: PermissionEventType.PERMISSION_GRANTED,
      pluginId: request.pluginId,
      request,
      timestamp: Date.now()
    });
    
    return true;
  }
  
  /**
   * 拒绝权限
   * @param requestId 请求ID
   * @param reason 拒绝原因
   * @returns 是否成功
   */
  denyPermission(requestId: string, reason?: string): boolean {
    const request = this.pendingRequests.get(requestId);
    if (!request) {
      return false;
    }
    
    // 更新请求状态
    request.status = PermissionStatus.DENIED;
    request.respondedAt = Date.now();
    request.deniedReason = reason;
    
    // 保存到插件权限映射
    let pluginPermissions = this.permissions.get(request.pluginId);
    if (!pluginPermissions) {
      pluginPermissions = new Map();
      this.permissions.set(request.pluginId, pluginPermissions);
    }
    
    pluginPermissions.set(requestId, request);
    
    // 保存到本地存储
    this.savePermissionsToStorage();
    
    // 分发权限拒绝事件
    this.dispatchEvent({
      type: PermissionEventType.PERMISSION_DENIED,
      pluginId: request.pluginId,
      request,
      timestamp: Date.now()
    });
    
    return true;
  }
  
  /**
   * 撤销权限
   * @param pluginId 插件ID
   * @param permissionType 权限类型
   * @param permissionScope 权限范围
   * @param target 权限目标
   * @returns 是否成功
   */
  revokePermission(
    pluginId: string,
    permissionType: PermissionType,
    permissionScope: PermissionScope,
    target?: string
  ): boolean {
    const pluginPermissions = this.permissions.get(pluginId);
    if (!pluginPermissions) {
      return false;
    }
    
    // 查找匹配的权限请求
    const requestsToRevoke: PermissionRequest[] = [];
    
    pluginPermissions.forEach(request => {
      if (
        request.permission.type === permissionType &&
        request.permission.scope === permissionScope &&
        (target === undefined || request.permission.target === target) &&
        request.status === PermissionStatus.GRANTED
      ) {
        requestsToRevoke.push(request);
      }
    });
    
    if (requestsToRevoke.length === 0) {
      return false;
    }
    
    // 撤销所有匹配的权限
    requestsToRevoke.forEach(request => {
      // 更新请求状态
      request.status = PermissionStatus.DENIED;
      request.deniedReason = '权限已撤销';
      
      // 分发权限撤销事件
      this.dispatchEvent({
        type: PermissionEventType.PERMISSION_REVOKED,
        pluginId,
        request,
        timestamp: Date.now()
      });
    });
    
    // 保存到本地存储
    this.savePermissionsToStorage();
    
    return true;
  }
  
  /**
   * 检查权限
   * @param pluginId 插件ID
   * @param permissionType 权限类型
   * @param permissionScope 权限范围
   * @param target 权限目标
   * @returns 权限状态
   */
  checkPermission(
    pluginId: string,
    permissionType: PermissionType,
    permissionScope: PermissionScope,
    target?: string
  ): PermissionStatus {
    const pluginPermissions = this.permissions.get(pluginId);
    if (!pluginPermissions) {
      return PermissionStatus.DENIED;
    }
    
    // 查找匹配的权限请求
    const matchingRequests: PermissionRequest[] = [];
    
    pluginPermissions.forEach(request => {
      if (
        request.permission.type === permissionType &&
        (request.permission.scope === permissionScope || request.permission.scope === PermissionScope.ALL) &&
        (target === undefined || request.permission.target === target || request.permission.target === '*')
      ) {
        matchingRequests.push(request);
      }
    });
    
    if (matchingRequests.length === 0) {
      return PermissionStatus.DENIED;
    }
    
    // 检查是否所有匹配的权限都已授予
    const allGranted = matchingRequests.every(request => {
      // 检查权限是否过期
      if (request.expiresAt && request.expiresAt < Date.now()) {
        // 权限已过期，更新状态
        request.status = PermissionStatus.DENIED;
        request.deniedReason = '权限已过期';
        
        // 分发权限过期事件
        this.dispatchEvent({
          type: PermissionEventType.PERMISSION_EXPIRED,
          pluginId,
          request,
          timestamp: Date.now()
        });
        
        return false;
      }
      
      return request.status === PermissionStatus.GRANTED;
    });
    
    if (allGranted) {
      return PermissionStatus.GRANTED;
    }
    
    // 检查是否所有匹配的权限都已拒绝
    const allDenied = matchingRequests.every(request => request.status === PermissionStatus.DENIED);
    
    if (allDenied) {
      return PermissionStatus.DENIED;
    }
    
    // 部分授予
    return PermissionStatus.PARTIAL;
  }
  
  /**
   * 获取插件权限
   * @param pluginId 插件ID
   * @returns 权限请求列表
   */
  getPluginPermissions(pluginId: string): PermissionRequest[] {
    const pluginPermissions = this.permissions.get(pluginId);
    if (!pluginPermissions) {
      return [];
    }
    
    return Array.from(pluginPermissions.values());
  }
  
  /**
   * 获取待处理的权限请求
   * @returns 权限请求列表
   */
  getPendingRequests(): PermissionRequest[] {
    return Array.from(this.pendingRequests.values());
  }
  
  /**
   * 添加事件监听器
   * @param type 事件类型
   * @param listener 监听器函数
   */
  addEventListener(type: PermissionEventType, listener: PermissionEventListener): void {
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
  removeEventListener(type: PermissionEventType, listener: PermissionEventListener): void {
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
  private dispatchEvent(event: PermissionEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in permission event listener:', error);
      }
    }
  }
}

// 创建插件权限管理器实例
let permissionManagerInstance: PluginPermissionManager | null = null;

/**
 * 获取插件权限管理器实例
 * @returns 插件权限管理器实例
 */
export function getPluginPermissionManager(): PluginPermissionManager {
  if (!permissionManagerInstance) {
    permissionManagerInstance = new PluginPermissionManager();
  }
  return permissionManagerInstance;
}

/**
 * 创建插件权限助手
 * @param pluginId 插件ID
 * @returns 权限助手
 */
export function createPluginPermissionHelper(pluginId: string) {
  const manager = getPluginPermissionManager();
  
  return {
    /**
     * 请求权限
     * @param permission 权限定义
     * @param reason 请求原因
     * @returns 权限请求
     */
    requestPermission: (
      permission: PermissionDefinition,
      reason?: string
    ) => manager.requestPermission(pluginId, permission, reason),
    
    /**
     * 检查权限
     * @param permissionType 权限类型
     * @param permissionScope 权限范围
     * @param target 权限目标
     * @returns 权限状态
     */
    checkPermission: (
      permissionType: PermissionType,
      permissionScope: PermissionScope,
      target?: string
    ) => manager.checkPermission(pluginId, permissionType, permissionScope, target),
    
    /**
     * 获取插件权限
     * @returns 权限请求列表
     */
    getPermissions: () => manager.getPluginPermissions(pluginId),
    
    /**
     * 添加事件监听器
     * @param type 事件类型
     * @param listener 监听器函数
     */
    addEventListener: (type: PermissionEventType, listener: (event: PermissionEvent) => void) => {
      const wrappedListener = (event: PermissionEvent) => {
        if (event.pluginId === pluginId) {
          listener(event);
        }
      };
      
      manager.addEventListener(type, wrappedListener);
      
      // 返回移除监听器的函数
      return () => {
        manager.removeEventListener(type, wrappedListener);
      };
    },
    
    /**
     * 创建文件系统权限
     * @param scope 权限范围
     * @param path 文件路径
     * @param required 是否必需
     * @returns 权限定义
     */
    createFileSystemPermission: (
      scope: PermissionScope,
      path?: string,
      required = false
    ): PermissionDefinition => ({
      type: PermissionType.FILE_SYSTEM,
      scope,
      target: path,
      description: `${scope === PermissionScope.READ ? '读取' : scope === PermissionScope.WRITE ? '写入' : '访问'}文件系统${path ? `（路径：${path}）` : ''}`,
      sensitive: true,
      required
    }),
    
    /**
     * 创建网络权限
     * @param scope 权限范围
     * @param domain 域名
     * @param required 是否必需
     * @returns 权限定义
     */
    createNetworkPermission: (
      scope: PermissionScope,
      domain?: string,
      required = false
    ): PermissionDefinition => ({
      type: PermissionType.NETWORK,
      scope,
      target: domain,
      description: `${scope === PermissionScope.READ ? '发送' : scope === PermissionScope.WRITE ? '接收' : '访问'}网络请求${domain ? `（域名：${domain}）` : ''}`,
      sensitive: true,
      required
    }),
    
    /**
     * 创建存储权限
     * @param scope 权限范围
     * @param key 存储键
     * @param required 是否必需
     * @returns 权限定义
     */
    createStoragePermission: (
      scope: PermissionScope,
      key?: string,
      required = false
    ): PermissionDefinition => ({
      type: PermissionType.STORAGE,
      scope,
      target: key,
      description: `${scope === PermissionScope.READ ? '读取' : scope === PermissionScope.WRITE ? '写入' : '访问'}存储${key ? `（键：${key}）` : ''}`,
      sensitive: false,
      required
    }),
    
    /**
     * 创建剪贴板权限
     * @param scope 权限范围
     * @param required 是否必需
     * @returns 权限定义
     */
    createClipboardPermission: (
      scope: PermissionScope,
      required = false
    ): PermissionDefinition => ({
      type: PermissionType.CLIPBOARD,
      scope,
      description: `${scope === PermissionScope.READ ? '读取' : scope === PermissionScope.WRITE ? '写入' : '访问'}剪贴板`,
      sensitive: true,
      required
    }),
    
    /**
     * 创建通知权限
     * @param required 是否必需
     * @returns 权限定义
     */
    createNotificationPermission: (
      required = false
    ): PermissionDefinition => ({
      type: PermissionType.NOTIFICATION,
      scope: PermissionScope.WRITE,
      description: '发送通知',
      sensitive: false,
      required
    }),
    
    /**
     * 创建地理位置权限
     * @param required 是否必需
     * @returns 权限定义
     */
    createGeolocationPermission: (
      required = false
    ): PermissionDefinition => ({
      type: PermissionType.GEOLOCATION,
      scope: PermissionScope.READ,
      description: '获取地理位置',
      sensitive: true,
      required
    }),
    
    /**
     * 创建插件通信权限
     * @param targetPluginId 目标插件ID
     * @param required 是否必需
     * @returns 权限定义
     */
    createPluginCommunicationPermission: (
      targetPluginId?: string,
      required = false
    ): PermissionDefinition => ({
      type: PermissionType.PLUGIN_COMMUNICATION,
      scope: PermissionScope.ALL,
      target: targetPluginId,
      description: `与其他插件通信${targetPluginId ? `（目标插件：${targetPluginId}）` : ''}`,
      sensitive: false,
      required
    }),
    
    /**
     * 创建UI集成权限
     * @param slotType 插槽类型
     * @param required 是否必需
     * @returns 权限定义
     */
    createUIIntegrationPermission: (
      slotType?: string,
      required = false
    ): PermissionDefinition => ({
      type: PermissionType.UI_INTEGRATION,
      scope: PermissionScope.WRITE,
      target: slotType,
      description: `集成UI组件${slotType ? `（插槽：${slotType}）` : ''}`,
      sensitive: false,
      required
    }),
    
    /**
     * 创建自定义权限
     * @param name 权限名称
     * @param scope 权限范围
     * @param description 权限描述
     * @param sensitive 是否敏感
     * @param required 是否必需
     * @returns 权限定义
     */
    createCustomPermission: (
      name: string,
      scope: PermissionScope,
      description: string,
      sensitive = false,
      required = false
    ): PermissionDefinition => ({
      type: PermissionType.CUSTOM,
      scope,
      target: name,
      description,
      sensitive,
      required
    })
  };
}

/**
 * 创建权限请求对话框组件
 * 用于显示权限请求并获取用户响应
 */
export const createPermissionRequestDialog = () => {
  const manager = getPluginPermissionManager();
  
  // 监听权限请求事件
  manager.addEventListener(PermissionEventType.PERMISSION_REQUESTED, (event) => {
    // 在这里实现显示权限请求对话框的逻辑
    // 可以使用自定义的UI组件或系统对话框
    
    // 示例：在控制台显示权限请求
    console.log('[Permission Request]', event.request);
    
    // 示例：自动授予非敏感权限
    if (!event.request.permission.sensitive) {
      manager.grantPermission(event.request.id);
    } else {
      // 对于敏感权限，可以显示对话框让用户决定
      // 这里需要实现实际的UI交互
      
      // 示例：模拟用户授予权限
      // setTimeout(() => {
      //   manager.grantPermission(event.request.id);
      // }, 1000);
      
      // 示例：模拟用户拒绝权限
      // setTimeout(() => {
      //   manager.denyPermission(event.request.id, '用户拒绝');
      // }, 1000);
    }
  });
};
