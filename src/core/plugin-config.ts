/**
 * 插件配置管理系统
 * 提供插件配置的保存、加载和验证功能
 */
import { Plugin } from './plugin-system';
import { SandboxEventType, getPluginSandboxManager } from './plugin-sandbox';

/**
 * 配置字段类型
 */
export enum ConfigFieldType {
  /** 字符串 */
  STRING = 'string',
  /** 数字 */
  NUMBER = 'number',
  /** 布尔值 */
  BOOLEAN = 'boolean',
  /** 选项 */
  SELECT = 'select',
  /** 多选 */
  MULTISELECT = 'multiselect',
  /** 颜色 */
  COLOR = 'color',
  /** 日期 */
  DATE = 'date',
  /** 时间 */
  TIME = 'time',
  /** 文件 */
  FILE = 'file',
  /** 对象 */
  OBJECT = 'object',
  /** 数组 */
  ARRAY = 'array'
}

/**
 * 配置字段定义
 */
export interface ConfigFieldDefinition {
  /** 字段键 */
  key: string;
  /** 字段类型 */
  type: ConfigFieldType;
  /** 字段标签（用于UI显示） */
  label: string;
  /** 字段描述 */
  description?: string;
  /** 默认值 */
  defaultValue?: unknown;
  /** 是否必填 */
  required?: boolean;
  /** 验证规则 */
  validation?: {
    /** 最小值（对于数字） */
    min?: number;
    /** 最大值（对于数字） */
    max?: number;
    /** 最小长度（对于字符串） */
    minLength?: number;
    /** 最大长度（对于字符串） */
    maxLength?: number;
    /** 正则表达式（对于字符串） */
    pattern?: string;
    /** 自定义验证函数 */
    custom?: (value: unknown) => boolean | string;
  };
  /** 选项（对于SELECT和MULTISELECT类型） */
  options?: Array<{
    /** 选项值 */
    value: string | number | boolean;
    /** 选项标签 */
    label: string;
  }>;
  /** 子字段（对于OBJECT类型） */
  fields?: ConfigFieldDefinition[];
  /** 项目类型（对于ARRAY类型） */
  itemType?: Omit<ConfigFieldDefinition, 'key'>;
  /** 是否高级选项（在UI中可能会被折叠） */
  advanced?: boolean;
  /** 是否只读 */
  readonly?: boolean;
  /** 条件显示（基于其他字段的值） */
  showIf?: {
    /** 依赖的字段键 */
    field: string;
    /** 依赖字段的值 */
    value: unknown;
  };
  /** UI显示顺序 */
  order?: number;
  /** UI组（用于分组显示） */
  group?: string;
}

/**
 * 配置架构
 */
export interface ConfigSchema {
  /** 架构ID */
  id: string;
  /** 架构版本 */
  version: string;
  /** 架构标题 */
  title: string;
  /** 架构描述 */
  description?: string;
  /** 字段定义 */
  fields: ConfigFieldDefinition[];
  /** 分组定义 */
  groups?: Array<{
    /** 组ID */
    id: string;
    /** 组标题 */
    title: string;
    /** 组描述 */
    description?: string;
    /** 显示顺序 */
    order?: number;
  }>;
}

/**
 * 验证错误
 */
export interface ValidationError {
  /** 字段键 */
  key: string;
  /** 错误消息 */
  message: string;
  /** 错误类型 */
  type: string;
}

/**
 * 配置验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors: ValidationError[];
}

/**
 * 配置事件类型
 */
export enum ConfigEventType {
  /** 配置更新 */
  CONFIG_UPDATED = 'config:updated',
  /** 配置重置 */
  CONFIG_RESET = 'config:reset',
  /** 架构更新 */
  SCHEMA_UPDATED = 'schema:updated'
}

/**
 * 配置事件
 */
export interface ConfigEvent {
  /** 事件类型 */
  type: ConfigEventType;
  /** 插件ID */
  pluginId: string;
  /** 时间戳 */
  timestamp: number;
  /** 详情 */
  details?: Record<string, unknown>;
}

/**
 * 配置事件监听器
 */
export type ConfigEventListener = (event: ConfigEvent) => void;

/**
 * 插件配置管理器
 */
export class PluginConfigManager {
  private plugins: Map<string, Plugin> = new Map();
  private schemas: Map<string, ConfigSchema> = new Map();
  private configs: Map<string, Record<string, unknown>> = new Map();
  private eventListeners: Map<ConfigEventType, ConfigEventListener[]> = new Map();
  
  /**
   * 构造函数
   */
  constructor() {
    // 从本地存储加载配置
    this.loadConfigsFromStorage();
    
    // 监听沙箱事件
    const sandboxManager = getPluginSandboxManager();
    sandboxManager.addEventListener(SandboxEventType.DESTROYED, (event) => {
      // 保存插件配置
      this.saveConfigToStorage(event.pluginId);
    });
  }
  
  /**
   * 从本地存储加载配置
   */
  private loadConfigsFromStorage(): void {
    try {
      const storedConfigs = localStorage.getItem('plugin_configs');
      if (storedConfigs) {
        const parsedConfigs = JSON.parse(storedConfigs);
        Object.keys(parsedConfigs).forEach(pluginId => {
          this.configs.set(pluginId, parsedConfigs[pluginId]);
        });
      }
    } catch (error) {
      console.error('[Plugin Config] Failed to load configs from storage:', error);
    }
  }
  
  /**
   * 保存配置到本地存储
   * @param pluginId 插件ID（如果为空则保存所有配置）
   */
  private saveConfigToStorage(pluginId?: string): void {
    try {
      if (pluginId) {
        // 保存单个插件配置
        const config = this.configs.get(pluginId);
        if (!config) {
          return;
        }
        
        const storedConfigs = localStorage.getItem('plugin_configs');
        const parsedConfigs = storedConfigs ? JSON.parse(storedConfigs) : {};
        parsedConfigs[pluginId] = config;
        
        localStorage.setItem('plugin_configs', JSON.stringify(parsedConfigs));
      } else {
        // 保存所有插件配置
        const allConfigs: Record<string, Record<string, unknown>> = {};
        
        this.configs.forEach((config, id) => {
          allConfigs[id] = config;
        });
        
        localStorage.setItem('plugin_configs', JSON.stringify(allConfigs));
      }
    } catch (error) {
      console.error('[Plugin Config] Failed to save configs to storage:', error);
    }
  }
  
  /**
   * 注册插件
   * @param plugin 插件对象
   */
  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
    
    // 如果没有配置，初始化空配置
    if (!this.configs.has(plugin.id)) {
      this.configs.set(plugin.id, {});
    }
  }
  
  /**
   * 注销插件
   * @param pluginId 插件ID
   */
  unregisterPlugin(pluginId: string): void {
    // 保存插件配置
    this.saveConfigToStorage(pluginId);
    
    // 移除插件
    this.plugins.delete(pluginId);
    this.schemas.delete(pluginId);
    this.configs.delete(pluginId);
  }
  
  /**
   * 注册配置架构
   * @param pluginId 插件ID
   * @param schema 配置架构
   * @returns 是否成功
   */
  registerSchema(pluginId: string, schema: ConfigSchema): boolean {
    if (!this.plugins.has(pluginId)) {
      console.error(`[Plugin Config] Plugin ${pluginId} is not registered`);
      return false;
    }
    
    // 保存架构
    this.schemas.set(pluginId, schema);
    
    // 初始化配置（使用默认值）
    const config = this.configs.get(pluginId) || {};
    const defaultConfig = this.getDefaultConfig(schema);
    
    // 合并默认配置和现有配置
    this.configs.set(pluginId, { ...defaultConfig, ...config });
    
    // 分发架构更新事件
    this.dispatchEvent({
      type: ConfigEventType.SCHEMA_UPDATED,
      pluginId,
      timestamp: Date.now(),
      details: {
        schema
      }
    });
    
    return true;
  }
  
  /**
   * 获取默认配置
   * @param schema 配置架构
   * @returns 默认配置
   */
  private getDefaultConfig(schema: ConfigSchema): Record<string, unknown> {
    const defaultConfig: Record<string, unknown> = {};
    
    schema.fields.forEach(field => {
      if (field.defaultValue !== undefined) {
        defaultConfig[field.key] = field.defaultValue;
      } else if (field.type === ConfigFieldType.OBJECT && field.fields) {
        // 递归处理对象类型
        const objectConfig: Record<string, unknown> = {};
        
        field.fields.forEach(subField => {
          if (subField.defaultValue !== undefined) {
            objectConfig[subField.key] = subField.defaultValue;
          }
        });
        
        if (Object.keys(objectConfig).length > 0) {
          defaultConfig[field.key] = objectConfig;
        }
      } else if (field.type === ConfigFieldType.ARRAY && field.itemType && field.itemType.defaultValue !== undefined) {
        // 数组类型使用空数组作为默认值
        defaultConfig[field.key] = [];
      }
    });
    
    return defaultConfig;
  }
  
  /**
   * 获取配置架构
   * @param pluginId 插件ID
   * @returns 配置架构
   */
  getSchema(pluginId: string): ConfigSchema | undefined {
    return this.schemas.get(pluginId);
  }
  
  /**
   * 获取配置
   * @param pluginId 插件ID
   * @returns 配置对象
   */
  getConfig(pluginId: string): Record<string, unknown> {
    return this.configs.get(pluginId) || {};
  }
  
  /**
   * 获取配置值
   * @param pluginId 插件ID
   * @param key 配置键
   * @param defaultValue 默认值
   * @returns 配置值
   */
  getConfigValue<T>(pluginId: string, key: string, defaultValue?: T): T | undefined {
    const config = this.configs.get(pluginId);
    if (!config) {
      return defaultValue;
    }
    
    // 支持嵌套键，如 'group.subgroup.key'
    const keys = key.split('.');
    let value: unknown = config;
    
    for (const k of keys) {
      if (typeof value === 'object' && value !== null && k in value) {
        value = (value as Record<string, unknown>)[k];
      } else {
        return defaultValue;
      }
    }
    
    return value as T;
  }
  
  /**
   * 设置配置值
   * @param pluginId 插件ID
   * @param key 配置键
   * @param value 配置值
   * @returns 是否成功
   */
  setConfigValue(pluginId: string, key: string, value: unknown): boolean {
    if (!this.plugins.has(pluginId)) {
      console.error(`[Plugin Config] Plugin ${pluginId} is not registered`);
      return false;
    }
    
    // 获取现有配置
    const config = this.configs.get(pluginId) || {};
    
    // 支持嵌套键，如 'group.subgroup.key'
    const keys = key.split('.');
    const lastKey = keys.pop();
    
    if (!lastKey) {
      console.error(`[Plugin Config] Invalid key: ${key}`);
      return false;
    }
    
    let target: Record<string, unknown> = config;
    
    // 遍历键路径
    for (const k of keys) {
      if (!(k in target) || typeof target[k] !== 'object' || target[k] === null) {
        target[k] = {};
      }
      target = target[k] as Record<string, unknown>;
    }
    
    // 设置值
    target[lastKey] = value;
    
    // 保存配置
    this.configs.set(pluginId, config);
    
    // 保存到本地存储
    this.saveConfigToStorage(pluginId);
    
    // 分发配置更新事件
    this.dispatchEvent({
      type: ConfigEventType.CONFIG_UPDATED,
      pluginId,
      timestamp: Date.now(),
      details: {
        key,
        value
      }
    });
    
    return true;
  }
  
  /**
   * 更新配置
   * @param pluginId 插件ID
   * @param config 配置对象
   * @param validate 是否验证
   * @returns 是否成功
   */
  updateConfig(
    pluginId: string,
    config: Record<string, unknown>,
    validate = true
  ): boolean | ValidationResult {
    if (!this.plugins.has(pluginId)) {
      console.error(`[Plugin Config] Plugin ${pluginId} is not registered`);
      return false;
    }
    
    // 验证配置
    if (validate) {
      const schema = this.schemas.get(pluginId);
      if (schema) {
        const validationResult = this.validateConfig(pluginId, config);
        if (!validationResult.valid) {
          return validationResult;
        }
      }
    }
    
    // 获取现有配置
    const existingConfig = this.configs.get(pluginId) || {};
    
    // 合并配置
    const newConfig = { ...existingConfig, ...config };
    
    // 保存配置
    this.configs.set(pluginId, newConfig);
    
    // 保存到本地存储
    this.saveConfigToStorage(pluginId);
    
    // 分发配置更新事件
    this.dispatchEvent({
      type: ConfigEventType.CONFIG_UPDATED,
      pluginId,
      timestamp: Date.now(),
      details: {
        config: newConfig
      }
    });
    
    return true;
  }
  
  /**
   * 重置配置
   * @param pluginId 插件ID
   * @returns 是否成功
   */
  resetConfig(pluginId: string): boolean {
    if (!this.plugins.has(pluginId)) {
      console.error(`[Plugin Config] Plugin ${pluginId} is not registered`);
      return false;
    }
    
    const schema = this.schemas.get(pluginId);
    if (!schema) {
      console.error(`[Plugin Config] Schema for plugin ${pluginId} not found`);
      return false;
    }
    
    // 获取默认配置
    const defaultConfig = this.getDefaultConfig(schema);
    
    // 保存配置
    this.configs.set(pluginId, defaultConfig);
    
    // 保存到本地存储
    this.saveConfigToStorage(pluginId);
    
    // 分发配置重置事件
    this.dispatchEvent({
      type: ConfigEventType.CONFIG_RESET,
      pluginId,
      timestamp: Date.now(),
      details: {
        config: defaultConfig
      }
    });
    
    return true;
  }
  
  /**
   * 验证配置
   * @param pluginId 插件ID
   * @param config 配置对象
   * @returns 验证结果
   */
  validateConfig(
    pluginId: string,
    config: Record<string, unknown>
  ): ValidationResult {
    const schema = this.schemas.get(pluginId);
    if (!schema) {
      return {
        valid: false,
        errors: [{
          key: '',
          message: `Schema for plugin ${pluginId} not found`,
          type: 'schema_not_found'
        }]
      };
    }
    
    const errors: ValidationError[] = [];
    
    // 验证每个字段
    schema.fields.forEach(field => {
      const value = config[field.key];
      
      // 验证必填字段
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push({
          key: field.key,
          message: `${field.label} is required`,
          type: 'required'
        });
        return;
      }
      
      // 如果值为空且非必填，跳过验证
      if (value === undefined || value === null || value === '') {
        return;
      }
      
      // 根据字段类型验证
      switch (field.type) {
        case ConfigFieldType.STRING:
          if (typeof value !== 'string') {
            errors.push({
              key: field.key,
              message: `${field.label} must be a string`,
              type: 'type'
            });
            return;
          }
          
          // 验证长度
          if (field.validation) {
            if (field.validation.minLength !== undefined && value.length < field.validation.minLength) {
              errors.push({
                key: field.key,
                message: `${field.label} must be at least ${field.validation.minLength} characters`,
                type: 'min_length'
              });
            }
            
            if (field.validation.maxLength !== undefined && value.length > field.validation.maxLength) {
              errors.push({
                key: field.key,
                message: `${field.label} must be at most ${field.validation.maxLength} characters`,
                type: 'max_length'
              });
            }
            
            // 验证正则表达式
            if (field.validation.pattern && !new RegExp(field.validation.pattern).test(value)) {
              errors.push({
                key: field.key,
                message: `${field.label} has an invalid format`,
                type: 'pattern'
              });
            }
          }
          break;
          
        case ConfigFieldType.NUMBER:
          if (typeof value !== 'number') {
            errors.push({
              key: field.key,
              message: `${field.label} must be a number`,
              type: 'type'
            });
            return;
          }
          
          // 验证范围
          if (field.validation) {
            if (field.validation.min !== undefined && value < field.validation.min) {
              errors.push({
                key: field.key,
                message: `${field.label} must be at least ${field.validation.min}`,
                type: 'min'
              });
            }
            
            if (field.validation.max !== undefined && value > field.validation.max) {
              errors.push({
                key: field.key,
                message: `${field.label} must be at most ${field.validation.max}`,
                type: 'max'
              });
            }
          }
          break;
          
        case ConfigFieldType.BOOLEAN:
          if (typeof value !== 'boolean') {
            errors.push({
              key: field.key,
              message: `${field.label} must be a boolean`,
              type: 'type'
            });
          }
          break;
          
        case ConfigFieldType.SELECT:
          if (field.options && !field.options.some(option => option.value === value)) {
            errors.push({
              key: field.key,
              message: `${field.label} must be one of the allowed values`,
              type: 'enum'
            });
          }
          break;
          
        case ConfigFieldType.MULTISELECT:
          if (!Array.isArray(value)) {
            errors.push({
              key: field.key,
              message: `${field.label} must be an array`,
              type: 'type'
            });
            return;
          }
          
          if (field.options) {
            const allowedValues = field.options.map(option => option.value);
            const invalidValues = (value as unknown[]).filter(v => !allowedValues.includes(v));
            
            if (invalidValues.length > 0) {
              errors.push({
                key: field.key,
                message: `${field.label} contains invalid values`,
                type: 'enum'
              });
            }
          }
          break;
          
        case ConfigFieldType.OBJECT:
          if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            errors.push({
              key: field.key,
              message: `${field.label} must be an object`,
              type: 'type'
            });
            return;
          }
          
          // 递归验证对象字段
          if (field.fields) {
            field.fields.forEach(subField => {
              const subValue = (value as Record<string, unknown>)[subField.key];
              
              // 验证必填字段
              if (subField.required && (subValue === undefined || subValue === null || subValue === '')) {
                errors.push({
                  key: `${field.key}.${subField.key}`,
                  message: `${subField.label} is required`,
                  type: 'required'
                });
              }
            });
          }
          break;
          
        case ConfigFieldType.ARRAY:
          if (!Array.isArray(value)) {
            errors.push({
              key: field.key,
              message: `${field.label} must be an array`,
              type: 'type'
            });
          }
          break;
      }
      
      // 自定义验证
      if (field.validation && field.validation.custom) {
        const customResult = field.validation.custom(value);
        
        if (customResult !== true) {
          errors.push({
            key: field.key,
            message: typeof customResult === 'string' ? customResult : `${field.label} is invalid`,
            type: 'custom'
          });
        }
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * 添加事件监听器
   * @param type 事件类型
   * @param listener 监听器函数
   */
  addEventListener(type: ConfigEventType, listener: ConfigEventListener): void {
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
  removeEventListener(type: ConfigEventType, listener: ConfigEventListener): void {
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
  private dispatchEvent(event: ConfigEvent): void {
    const listeners = this.eventListeners.get(event.type) || [];
    
    for (const listener of listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in config event listener:', error);
      }
    }
  }
}

// 创建插件配置管理器实例
let configManagerInstance: PluginConfigManager | null = null;

/**
 * 获取插件配置管理器实例
 * @returns 插件配置管理器实例
 */
export function getPluginConfigManager(): PluginConfigManager {
  if (!configManagerInstance) {
    configManagerInstance = new PluginConfigManager();
  }
  return configManagerInstance;
}

/**
 * 创建插件配置助手
 * @param pluginId 插件ID
 * @param schema 配置架构
 * @returns 配置助手
 */
export function createPluginConfigHelper(pluginId: string, schema: ConfigSchema) {
  const manager = getPluginConfigManager();
  
  // 注册架构
  manager.registerSchema(pluginId, schema);
  
  return {
    /**
     * 获取配置
     * @returns 配置对象
     */
    getConfig: () => manager.getConfig(pluginId),
    
    /**
     * 获取配置值
     * @param key 配置键
     * @param defaultValue 默认值
     * @returns 配置值
     */
    getConfigValue: <T>(key: string, defaultValue?: T) => 
      manager.getConfigValue<T>(pluginId, key, defaultValue),
    
    /**
     * 设置配置值
     * @param key 配置键
     * @param value 配置值
     * @returns 是否成功
     */
    setConfigValue: (key: string, value: unknown) => 
      manager.setConfigValue(pluginId, key, value),
    
    /**
     * 更新配置
     * @param config 配置对象
     * @param validate 是否验证
     * @returns 是否成功
     */
    updateConfig: (config: Record<string, unknown>, validate = true) => 
      manager.updateConfig(pluginId, config, validate),
    
    /**
     * 重置配置
     * @returns 是否成功
     */
    resetConfig: () => manager.resetConfig(pluginId),
    
    /**
     * 验证配置
     * @param config 配置对象
     * @returns 验证结果
     */
    validateConfig: (config: Record<string, unknown>) => 
      manager.validateConfig(pluginId, config),
    
    /**
     * 添加配置更新事件监听器
     * @param listener 监听器函数
     */
    onConfigUpdated: (listener: (config: Record<string, unknown>) => void) => {
      const eventListener = (event: ConfigEvent) => {
        if (event.pluginId === pluginId) {
          listener(manager.getConfig(pluginId));
        }
      };
      
      manager.addEventListener(ConfigEventType.CONFIG_UPDATED, eventListener);
      
      // 返回移除监听器的函数
      return () => {
        manager.removeEventListener(ConfigEventType.CONFIG_UPDATED, eventListener);
      };
    }
  };
}

/**
 * 创建示例配置架构
 * @returns 示例配置架构
 */
export function createExampleConfigSchema(): ConfigSchema {
  return {
    id: 'example-plugin-config',
    version: '1.0.0',
    title: '示例插件配置',
    description: '这是一个示例插件的配置架构',
    fields: [
      {
        key: 'general',
        type: ConfigFieldType.OBJECT,
        label: '常规设置',
        fields: [
          {
            key: 'enabled',
            type: ConfigFieldType.BOOLEAN,
            label: '启用插件',
            defaultValue: true,
            required: true
          },
          {
            key: 'name',
            type: ConfigFieldType.STRING,
            label: '名称',
            defaultValue: '示例插件',
            validation: {
              minLength: 2,
              maxLength: 50
            }
          },
          {
            key: 'theme',
            type: ConfigFieldType.SELECT,
            label: '主题',
            defaultValue: 'light',
            options: [
              { value: 'light', label: '浅色' },
              { value: 'dark', label: '深色' },
              { value: 'system', label: '跟随系统' }
            ]
          }
        ]
      },
      {
        key: 'advanced',
        type: ConfigFieldType.OBJECT,
        label: '高级设置',
        advanced: true,
        fields: [
          {
            key: 'debug',
            type: ConfigFieldType.BOOLEAN,
            label: '调试模式',
            defaultValue: false
          },
          {
            key: 'logLevel',
            type: ConfigFieldType.SELECT,
            label: '日志级别',
            defaultValue: 'info',
            options: [
              { value: 'debug', label: '调试' },
              { value: 'info', label: '信息' },
              { value: 'warn', label: '警告' },
              { value: 'error', label: '错误' }
            ],
            showIf: {
              field: 'advanced.debug',
              value: true
            }
          }
        ]
      }
    ],
    groups: [
      {
        id: 'general',
        title: '常规',
        order: 0
      },
      {
        id: 'advanced',
        title: '高级',
        order: 1
      }
    ]
  };
}
