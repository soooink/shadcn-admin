/**
 * 插件数据存储系统
 * 提供插件安全存储和访问数据的功能
 */
import { Plugin } from './plugin-system';
import { SandboxEventType, getPluginSandboxManager } from './plugin-sandbox';

/**
 * 存储项类型
 */
export enum StorageItemType {
  /** 字符串 */
  STRING = 'string',
  /** 数字 */
  NUMBER = 'number',
  /** 布尔值 */
  BOOLEAN = 'boolean',
  /** 对象 */
  OBJECT = 'object',
  /** 数组 */
  ARRAY = 'array',
  /** 二进制 */
  BINARY = 'binary'
}

/**
 * 存储项元数据
 */
export interface StorageItemMetadata {
  /** 键 */
  key: string;
  /** 类型 */
  type: StorageItemType;
  /** 大小（字节） */
  size: number;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
  /** 访问时间 */
  accessedAt: number;
  /** 是否加密 */
  encrypted: boolean;
  /** 是否压缩 */
  compressed: boolean;
  /** 自定义元数据 */
  custom?: Record<string, unknown>;
}

/**
 * 存储项
 */
export interface StorageItem<T = unknown> {
  /** 值 */
  value: T;
  /** 元数据 */
  metadata: StorageItemMetadata;
}

/**
 * 存储查询选项
 */
export interface StorageQueryOptions {
  /** 前缀 */
  prefix?: string;
  /** 类型 */
  type?: StorageItemType;
  /** 创建时间范围 */
  createdAt?: {
    /** 开始时间 */
    from?: number;
    /** 结束时间 */
    to?: number;
  };
  /** 更新时间范围 */
  updatedAt?: {
    /** 开始时间 */
    from?: number;
    /** 结束时间 */
    to?: number;
  };
  /** 自定义元数据查询 */
  custom?: Record<string, unknown>;
  /** 排序字段 */
  sortBy?: keyof StorageItemMetadata;
  /** 排序方向 */
  sortDirection?: 'asc' | 'desc';
  /** 限制数量 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
}

/**
 * 存储统计信息
 */
export interface StorageStats {
  /** 总项数 */
  totalItems: number;
  /** 总大小（字节） */
  totalSize: number;
  /** 按类型统计 */
  byType: Record<StorageItemType, {
    /** 项数 */
    count: number;
    /** 大小（字节） */
    size: number;
  }>;
  /** 使用率（0-1） */
  usageRatio: number;
  /** 限制（字节） */
  limit: number;
}

/**
 * 存储事件类型
 */
export enum StorageEventType {
  /** 项目创建 */
  ITEM_CREATED = 'storage:item_created',
  /** 项目更新 */
  ITEM_UPDATED = 'storage:item_updated',
  /** 项目删除 */
  ITEM_DELETED = 'storage:item_deleted',
  /** 存储清空 */
  STORAGE_CLEARED = 'storage:cleared',
  /** 存储限制超出 */
  STORAGE_LIMIT_EXCEEDED = 'storage:limit_exceeded'
}

/**
 * 存储事件
 */
export interface StorageEvent {
  /** 事件类型 */
  type: StorageEventType;
  /** 插件ID */
  pluginId: string;
  /** 时间戳 */
  timestamp: number;
  /** 详情 */
  details?: Record<string, unknown>;
}

/**
 * 存储事件监听器
 */
export type StorageEventListener = (event: StorageEvent) => void;

/**
 * 插件存储管理器
 */
export class PluginStorageManager {
  private plugins: Map<string, Plugin> = new Map();
  private storage: Map<string, Map<string, StorageItem>> = new Map();
  private eventListeners: Map<StorageEventType, StorageEventListener[]> = new Map();
  private storageLimits: Map<string, number> = new Map();
  private defaultStorageLimit = 10 * 1024 * 1024; // 10MB
  
  /**
   * 构造函数
   */
  constructor() {
    // 从本地存储加载数据
    this.loadFromStorage();
    
    // 监听沙箱事件
    const sandboxManager = getPluginSandboxManager();
    sandboxManager.addEventListener(SandboxEventType.DESTROYED, (event) => {
      // 保存插件数据
      this.saveToStorage(event.pluginId);
    });
    
    // 定期保存数据
    setInterval(() => {
      this.saveAllToStorage();
    }, 60000); // 每分钟保存一次
  }
  
  /**
   * 从本地存储加载数据
   */
  private loadFromStorage(): void {
    try {
      // 加载存储限制
      const storedLimits = localStorage.getItem('plugin_storage_limits');
      if (storedLimits) {
        const parsedLimits = JSON.parse(storedLimits);
        Object.keys(parsedLimits).forEach(pluginId => {
          this.storageLimits.set(pluginId, parsedLimits[pluginId]);
        });
      }
      
      // 加载插件数据
      const pluginIds = localStorage.getItem('plugin_storage_ids');
      if (pluginIds) {
        const parsedIds = JSON.parse(pluginIds) as string[];
        
        for (const pluginId of parsedIds) {
          const storedData = localStorage.getItem(`plugin_storage_${pluginId}`);
          if (storedData) {
            try {
              const parsedData = JSON.parse(storedData);
              const pluginStorage = new Map<string, StorageItem>();
              
              Object.keys(parsedData).forEach(key => {
                const item = parsedData[key];
                pluginStorage.set(key, {
                  value: item.value,
                  metadata: item.metadata
                });
              });
              
              this.storage.set(pluginId, pluginStorage);
            } catch (error) {
              console.error(`[Plugin Storage] Failed to parse storage data for plugin ${pluginId}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error('[Plugin Storage] Failed to load from storage:', error);
    }
  }
  
  /**
   * 保存数据到本地存储
   * @param pluginId 插件ID（如果为空则保存所有数据）
   */
  private saveToStorage(pluginId?: string): void {
    try {
      if (pluginId) {
        // 保存单个插件数据
        const pluginStorage = this.storage.get(pluginId);
        if (!pluginStorage) {
          return;
        }
        
        const serializedData: Record<string, StorageItem> = {};
        
        pluginStorage.forEach((item, key) => {
          serializedData[key] = {
            value: item.value,
            metadata: item.metadata
          };
        });
        
        localStorage.setItem(`plugin_storage_${pluginId}`, JSON.stringify(serializedData));
        
        // 更新插件ID列表
        const pluginIds = Array.from(this.storage.keys());
        localStorage.setItem('plugin_storage_ids', JSON.stringify(pluginIds));
      } else {
        // 保存所有插件数据
        this.saveAllToStorage();
      }
    } catch (error) {
      console.error('[Plugin Storage] Failed to save to storage:', error);
    }
  }
  
  /**
   * 保存所有数据到本地存储
   */
  private saveAllToStorage(): void {
    try {
      // 保存存储限制
      const serializedLimits: Record<string, number> = {};
      this.storageLimits.forEach((limit, pluginId) => {
        serializedLimits[pluginId] = limit;
      });
      
      localStorage.setItem('plugin_storage_limits', JSON.stringify(serializedLimits));
      
      // 保存插件ID列表
      const pluginIds = Array.from(this.storage.keys());
      localStorage.setItem('plugin_storage_ids', JSON.stringify(pluginIds));
      
      // 保存每个插件的数据
      for (const pluginId of pluginIds) {
        this.saveToStorage(pluginId);
      }
    } catch (error) {
      console.error('[Plugin Storage] Failed to save all to storage:', error);
    }
  }
  
  /**
   * 注册插件
   * @param plugin 插件对象
   * @param storageLimit 存储限制（字节）
   */
  registerPlugin(plugin: Plugin, storageLimit?: number): void {
    this.plugins.set(plugin.id, plugin);
    
    // 设置存储限制
    if (storageLimit !== undefined) {
      this.storageLimits.set(plugin.id, storageLimit);
    } else if (!this.storageLimits.has(plugin.id)) {
      this.storageLimits.set(plugin.id, this.defaultStorageLimit);
    }
    
    // 初始化插件存储
    if (!this.storage.has(plugin.id)) {
      this.storage.set(plugin.id, new Map());
    }
  }
  
  /**
   * 注销插件
   * @param pluginId 插件ID
   */
  unregisterPlugin(pluginId: string): void {
    // 保存插件数据
    this.saveToStorage(pluginId);
    
    // 移除插件
    this.plugins.delete(pluginId);
  }
  
  /**
   * 设置存储限制
   * @param pluginId 插件ID
   * @param limit 限制（字节）
   * @returns 是否成功
   */
  setStorageLimit(pluginId: string, limit: number): boolean {
    if (!this.plugins.has(pluginId)) {
      console.error(`[Plugin Storage] Plugin ${pluginId} is not registered`);
      return false;
    }
    
    this.storageLimits.set(pluginId, limit);
    
    // 保存限制
    const serializedLimits: Record<string, number> = {};
    this.storageLimits.forEach((value, key) => {
      serializedLimits[key] = value;
    });
    
    localStorage.setItem('plugin_storage_limits', JSON.stringify(serializedLimits));
    
    return true;
  }
  
  /**
   * 获取存储限制
   * @param pluginId 插件ID
   * @returns 限制（字节）
   */
  getStorageLimit(pluginId: string): number {
    return this.storageLimits.get(pluginId) || this.defaultStorageLimit;
  }
  
  /**
   * 获取存储统计信息
   * @param pluginId 插件ID
   * @returns 统计信息
   */
  getStorageStats(pluginId: string): StorageStats {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }
    
    const pluginStorage = this.storage.get(pluginId) || new Map();
    const limit = this.getStorageLimit(pluginId);
    
    let totalSize = 0;
    const byType: Record<StorageItemType, { count: number; size: number }> = {
      [StorageItemType.STRING]: { count: 0, size: 0 },
      [StorageItemType.NUMBER]: { count: 0, size: 0 },
      [StorageItemType.BOOLEAN]: { count: 0, size: 0 },
      [StorageItemType.OBJECT]: { count: 0, size: 0 },
      [StorageItemType.ARRAY]: { count: 0, size: 0 },
      [StorageItemType.BINARY]: { count: 0, size: 0 }
    };
    
    pluginStorage.forEach(item => {
      totalSize += item.metadata.size;
      
      if (byType[item.metadata.type]) {
        byType[item.metadata.type].count++;
        byType[item.metadata.type].size += item.metadata.size;
      }
    });
    
    return {
      totalItems: pluginStorage.size,
      totalSize,
      byType,
      usageRatio: limit > 0 ? totalSize / limit : 0,
      limit
    };
  }
  
  /**
   * 获取项目
   * @param pluginId 插件ID
   * @param key 键
   * @returns 存储项
   */
  getItem<T = unknown>(pluginId: string, key: string): StorageItem<T> | undefined {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }
    
    const pluginStorage = this.storage.get(pluginId);
    if (!pluginStorage) {
      return undefined;
    }
    
    const item = pluginStorage.get(key) as StorageItem<T> | undefined;
    
    if (item) {
      // 更新访问时间
      item.metadata.accessedAt = Date.now();
      pluginStorage.set(key, item as StorageItem);
    }
    
    return item;
  }
  
  /**
   * 获取项目值
   * @param pluginId 插件ID
   * @param key 键
   * @param defaultValue 默认值
   * @returns 值
   */
  getValue<T = unknown>(pluginId: string, key: string, defaultValue?: T): T | undefined {
    const item = this.getItem<T>(pluginId, key);
    return item ? item.value : defaultValue;
  }
  
  /**
   * 设置项目
   * @param pluginId 插件ID
   * @param key 键
   * @param value 值
   * @param options 选项
   * @returns 是否成功
   */
  setItem<T = unknown>(
    pluginId: string,
    key: string,
    value: T,
    options: {
      encrypted?: boolean;
      compressed?: boolean;
      custom?: Record<string, unknown>;
    } = {}
  ): boolean {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }
    
    let pluginStorage = this.storage.get(pluginId);
    if (!pluginStorage) {
      pluginStorage = new Map();
      this.storage.set(pluginId, pluginStorage);
    }
    
    // 确定值类型
    let type: StorageItemType;
    if (typeof value === 'string') {
      type = StorageItemType.STRING;
    } else if (typeof value === 'number') {
      type = StorageItemType.NUMBER;
    } else if (typeof value === 'boolean') {
      type = StorageItemType.BOOLEAN;
    } else if (Array.isArray(value)) {
      type = StorageItemType.ARRAY;
    } else if (value instanceof ArrayBuffer || value instanceof Uint8Array) {
      type = StorageItemType.BINARY;
    } else {
      type = StorageItemType.OBJECT;
    }
    
    // 计算大小
    let size: number;
    if (type === StorageItemType.BINARY) {
      size = value instanceof ArrayBuffer ? value.byteLength : (value as Uint8Array).length;
    } else {
      size = JSON.stringify(value).length;
    }
    
    // 检查存储限制
    const stats = this.getStorageStats(pluginId);
    const existingItem = pluginStorage.get(key);
    const existingSize = existingItem ? existingItem.metadata.size : 0;
    const newTotalSize = stats.totalSize - existingSize + size;
    
    if (newTotalSize > stats.limit) {
      // 分发存储限制超出事件
      this.dispatchEvent({
        type: StorageEventType.STORAGE_LIMIT_EXCEEDED,
        pluginId,
        timestamp: Date.now(),
        details: {
          key,
          size,
          limit: stats.limit,
          totalSize: newTotalSize
        }
      });
      
      return false;
    }
    
    const now = Date.now();
    const isNewItem = !existingItem;
    
    // 创建或更新项目
    const item: StorageItem<T> = {
      value,
      metadata: {
        key,
        type,
        size,
        createdAt: existingItem ? existingItem.metadata.createdAt : now,
        updatedAt: now,
        accessedAt: now,
        encrypted: options.encrypted || false,
        compressed: options.compressed || false,
        custom: options.custom
      }
    };
    
    pluginStorage.set(key, item as StorageItem);
    
    // 分发事件
    this.dispatchEvent({
      type: isNewItem ? StorageEventType.ITEM_CREATED : StorageEventType.ITEM_UPDATED,
      pluginId,
      timestamp: now,
      details: {
        key,
        type,
        size
      }
    });
    
    // 保存到本地存储
    this.saveToStorage(pluginId);
    
    return true;
  }
  
  /**
   * 删除项目
   * @param pluginId 插件ID
   * @param key 键
   * @returns 是否成功
   */
  removeItem(pluginId: string, key: string): boolean {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }
    
    const pluginStorage = this.storage.get(pluginId);
    if (!pluginStorage) {
      return false;
    }
    
    const item = pluginStorage.get(key);
    if (!item) {
      return false;
    }
    
    pluginStorage.delete(key);
    
    // 分发事件
    this.dispatchEvent({
      type: StorageEventType.ITEM_DELETED,
      pluginId,
      timestamp: Date.now(),
      details: {
        key,
        type: item.metadata.type,
        size: item.metadata.size
      }
    });
    
    // 保存到本地存储
    this.saveToStorage(pluginId);
    
    return true;
  }
  
  /**
   * 清空存储
   * @param pluginId 插件ID
   * @returns 是否成功
   */
  clearStorage(pluginId: string): boolean {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }
    
    const pluginStorage = this.storage.get(pluginId);
    if (!pluginStorage) {
      return false;
    }
    
    pluginStorage.clear();
    
    // 分发事件
    this.dispatchEvent({
      type: StorageEventType.STORAGE_CLEARED,
      pluginId,
      timestamp: Date.now()
    });
    
    // 保存到本地存储
    this.saveToStorage(pluginId);
    
    return true;
  }
  
  /**
   * 获取所有键
   * @param pluginId 插件ID
   * @returns 键列表
   */
  getAllKeys(pluginId: string): string[] {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }
    
    const pluginStorage = this.storage.get(pluginId);
    if (!pluginStorage) {
      return [];
    }
    
    return Array.from(pluginStorage.keys());
  }
  
  /**
   * 查询项目
   * @param pluginId 插件ID
   * @param options 查询选项
   * @returns 项目列表
   */
  queryItems<T = unknown>(
    pluginId: string,
    options: StorageQueryOptions = {}
  ): StorageItem<T>[] {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }
    
    const pluginStorage = this.storage.get(pluginId);
    if (!pluginStorage) {
      return [];
    }
    
    let items = Array.from(pluginStorage.values()) as StorageItem<T>[];
    
    // 应用过滤条件
    if (options.prefix) {
      items = items.filter(item => item.metadata.key.startsWith(options.prefix!));
    }
    
    if (options.type) {
      items = items.filter(item => item.metadata.type === options.type);
    }
    
    if (options.createdAt) {
      if (options.createdAt.from !== undefined) {
        items = items.filter(item => item.metadata.createdAt >= options.createdAt!.from!);
      }
      
      if (options.createdAt.to !== undefined) {
        items = items.filter(item => item.metadata.createdAt <= options.createdAt!.to!);
      }
    }
    
    if (options.updatedAt) {
      if (options.updatedAt.from !== undefined) {
        items = items.filter(item => item.metadata.updatedAt >= options.updatedAt!.from!);
      }
      
      if (options.updatedAt.to !== undefined) {
        items = items.filter(item => item.metadata.updatedAt <= options.updatedAt!.to!);
      }
    }
    
    if (options.custom) {
      items = items.filter(item => {
        if (!item.metadata.custom) {
          return false;
        }
        
        for (const [key, value] of Object.entries(options.custom!)) {
          if (item.metadata.custom[key] !== value) {
            return false;
          }
        }
        
        return true;
      });
    }
    
    // 应用排序
    if (options.sortBy) {
      items.sort((a, b) => {
        const aValue = a.metadata[options.sortBy!];
        const bValue = b.metadata[options.sortBy!];
        
        if (aValue < bValue) {
          return options.sortDirection === 'desc' ? 1 : -1;
        }
        
        if (aValue > bValue) {
          return options.sortDirection === 'desc' ? -1 : 1;
        }
        
        return 0;
      });
    }
    
    // 应用分页
    if (options.offset !== undefined || options.limit !== undefined) {
      const offset = options.offset || 0;
      const limit = options.limit !== undefined ? options.limit : items.length;
      
      items = items.slice(offset, offset + limit);
    }
    
    return items;
  }
  
  /**
   * 添加事件监听器
   * @param type 事件类型
   * @param listener 监听器函数
   */
  addEventListener(type: StorageEventType, listener: StorageEventListener): void {
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
  removeEventListener(type: StorageEventType, listener: StorageEventListener): void {
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
  private dispatchEvent(event: StorageEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in storage event listener:', error);
      }
    }
  }
}

// 创建插件存储管理器实例
let storageManagerInstance: PluginStorageManager | null = null;

/**
 * 获取插件存储管理器实例
 * @returns 插件存储管理器实例
 */
export function getPluginStorageManager(): PluginStorageManager {
  if (!storageManagerInstance) {
    storageManagerInstance = new PluginStorageManager();
  }
  return storageManagerInstance;
}

/**
 * 创建插件存储助手
 * @param pluginId 插件ID
 * @param options 选项
 * @returns 存储助手
 */
export function createPluginStorageHelper(
  pluginId: string,
  options: {
    storageLimit?: number;
    defaultEncryption?: boolean;
    defaultCompression?: boolean;
  } = {}
) {
  const manager = getPluginStorageManager();
  
  // 设置存储限制
  if (options.storageLimit !== undefined) {
    manager.setStorageLimit(pluginId, options.storageLimit);
  }
  
  return {
    /**
     * 获取项目
     * @param key 键
     * @returns 存储项
     */
    getItem: <T = unknown>(key: string) => manager.getItem<T>(pluginId, key),
    
    /**
     * 获取项目值
     * @param key 键
     * @param defaultValue 默认值
     * @returns 值
     */
    getValue: <T = unknown>(key: string, defaultValue?: T) => 
      manager.getValue<T>(pluginId, key, defaultValue),
    
    /**
     * 设置项目
     * @param key 键
     * @param value 值
     * @param itemOptions 选项
     * @returns 是否成功
     */
    setItem: <T = unknown>(
      key: string,
      value: T,
      itemOptions: {
        encrypted?: boolean;
        compressed?: boolean;
        custom?: Record<string, unknown>;
      } = {}
    ) => manager.setItem<T>(pluginId, key, value, {
      encrypted: itemOptions.encrypted !== undefined ? itemOptions.encrypted : options.defaultEncryption,
      compressed: itemOptions.compressed !== undefined ? itemOptions.compressed : options.defaultCompression,
      custom: itemOptions.custom
    }),
    
    /**
     * 删除项目
     * @param key 键
     * @returns 是否成功
     */
    removeItem: (key: string) => manager.removeItem(pluginId, key),
    
    /**
     * 清空存储
     * @returns 是否成功
     */
    clearStorage: () => manager.clearStorage(pluginId),
    
    /**
     * 获取所有键
     * @returns 键列表
     */
    getAllKeys: () => manager.getAllKeys(pluginId),
    
    /**
     * 查询项目
     * @param options 查询选项
     * @returns 项目列表
     */
    queryItems: <T = unknown>(options?: StorageQueryOptions) => 
      manager.queryItems<T>(pluginId, options),
    
    /**
     * 获取存储统计信息
     * @returns 统计信息
     */
    getStorageStats: () => manager.getStorageStats(pluginId),
    
    /**
     * 获取存储限制
     * @returns 限制（字节）
     */
    getStorageLimit: () => manager.getStorageLimit(pluginId),
    
    /**
     * 设置存储限制
     * @param limit 限制（字节）
     * @returns 是否成功
     */
    setStorageLimit: (limit: number) => manager.setStorageLimit(pluginId, limit),
    
    /**
     * 添加事件监听器
     * @param type 事件类型
     * @param listener 监听器函数
     */
    addEventListener: (type: StorageEventType, listener: (event: StorageEvent) => void) => {
      const wrappedListener = (event: StorageEvent) => {
        if (event.pluginId === pluginId) {
          listener(event);
        }
      };
      
      manager.addEventListener(type, wrappedListener);
      
      // 返回移除监听器的函数
      return () => {
        manager.removeEventListener(type, wrappedListener);
      };
    }
  };
}
