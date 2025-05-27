/**
 * 插件国际化支持系统
 * 提供插件多语言支持功能
 */
import { Plugin } from './plugin-system';
import i18n from 'i18next';

/**
 * 插件语言资源
 */
export interface PluginLanguageResources {
  /** 语言代码 */
  [language: string]: {
    /** 翻译键值对 */
    [key: string]: string | object;
  };
}

/**
 * 插件翻译选项
 */
export interface PluginTranslationOptions {
  /** 命名空间 */
  ns?: string;
  /** 默认语言 */
  defaultLanguage?: string;
  /** 插值选项 */
  interpolation?: {
    /** 前缀 */
    prefix?: string;
    /** 后缀 */
    suffix?: string;
    /** 是否转义 */
    escapeValue?: boolean;
  };
}

/**
 * 插件国际化管理器
 */
export class PluginI18nManager {
  private plugins: Map<string, Plugin> = new Map();
  private resources: Map<string, PluginLanguageResources> = new Map();
  private namespaces: Set<string> = new Set();
  private initialized = false;
  
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
  private async initialize(): Promise<void> {
    // 检查i18next是否已初始化
    if (!i18n.isInitialized) {
      console.warn('[Plugin I18n] i18next is not initialized, waiting...');
      
      // 等待i18next初始化
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (i18n.isInitialized) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        
        // 超时处理
        setTimeout(() => {
          clearInterval(checkInterval);
          console.error('[Plugin I18n] Timeout waiting for i18next initialization');
          resolve();
        }, 5000);
      });
    }
    
    this.initialized = true;
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
    
    // 移除插件的语言资源
    this.resources.delete(pluginId);
    
    // 从i18next中移除插件的命名空间
    const ns = `plugin_${pluginId}`;
    if (this.namespaces.has(ns)) {
      this.namespaces.delete(ns);
      
      // 从i18next中移除命名空间
      Object.keys(i18n.services.resourceStore.data).forEach(lang => {
        if (i18n.services.resourceStore.data[lang] && i18n.services.resourceStore.data[lang][ns]) {
          delete i18n.services.resourceStore.data[lang][ns];
        }
      });
    }
  }
  
  /**
   * 注册插件语言资源
   * @param pluginId 插件ID
   * @param resources 语言资源
   * @param options 翻译选项
   * @returns 是否成功
   */
  registerResources(
    pluginId: string,
    resources: PluginLanguageResources,
    options: PluginTranslationOptions = {}
  ): boolean {
    if (!this.initialized) {
      console.error('[Plugin I18n] Manager is not initialized');
      return false;
    }
    
    if (!this.plugins.has(pluginId)) {
      console.error(`[Plugin I18n] Plugin ${pluginId} is not registered`);
      return false;
    }
    
    // 保存资源
    this.resources.set(pluginId, resources);
    
    // 默认命名空间
    const ns = options.ns || `plugin_${pluginId}`;
    this.namespaces.add(ns);
    
    // 添加资源到i18next
    Object.keys(resources).forEach(lang => {
      i18n.addResourceBundle(lang, ns, resources[lang], true, true);
    });
    
    return true;
  }
  
  /**
   * 获取插件翻译函数
   * @param pluginId 插件ID
   * @param options 翻译选项
   * @returns 翻译函数
   */
  getTranslationFunction(
    pluginId: string,
    options: PluginTranslationOptions = {}
  ): (key: string, defaultValue?: string, interpolation?: Record<string, unknown>) => string {
    if (!this.initialized) {
      console.error('[Plugin I18n] Manager is not initialized');
      return (key) => key;
    }
    
    if (!this.plugins.has(pluginId)) {
      console.error(`[Plugin I18n] Plugin ${pluginId} is not registered`);
      return (key) => key;
    }
    
    const ns = options.ns || `plugin_${pluginId}`;
    
    return (key: string, defaultValue?: string, interpolation?: Record<string, unknown>) => {
      return i18n.t(key, {
        ns,
        defaultValue,
        ...interpolation
      });
    };
  }
  
  /**
   * 获取插件当前语言
   * @returns 当前语言
   */
  getCurrentLanguage(): string {
    return i18n.language;
  }
  
  /**
   * 获取插件支持的语言
   * @param pluginId 插件ID
   * @returns 支持的语言列表
   */
  getSupportedLanguages(pluginId: string): string[] {
    const resources = this.resources.get(pluginId);
    if (!resources) {
      return [];
    }
    
    return Object.keys(resources);
  }
  
  /**
   * 获取所有插件支持的语言
   * @returns 支持的语言列表
   */
  getAllSupportedLanguages(): string[] {
    const languages = new Set<string>();
    
    this.resources.forEach(resources => {
      Object.keys(resources).forEach(lang => {
        languages.add(lang);
      });
    });
    
    return Array.from(languages);
  }
  
  /**
   * 切换语言
   * @param language 语言代码
   * @returns 是否成功
   */
  changeLanguage(language: string): Promise<boolean> {
    return new Promise((resolve) => {
      i18n.changeLanguage(language, (err) => {
        if (err) {
          console.error('[Plugin I18n] Failed to change language:', err);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }
  
  /**
   * 获取插件的语言资源
   * @param pluginId 插件ID
   * @param language 语言代码（如果为空则返回所有语言）
   * @returns 语言资源
   */
  getResources(pluginId: string, language?: string): PluginLanguageResources | Record<string, unknown> {
    const resources = this.resources.get(pluginId);
    if (!resources) {
      return {};
    }
    
    if (language) {
      return resources[language] || {};
    }
    
    return resources;
  }
  
  /**
   * 添加或更新插件语言资源
   * @param pluginId 插件ID
   * @param language 语言代码
   * @param resources 语言资源
   * @returns 是否成功
   */
  addOrUpdateResources(
    pluginId: string,
    language: string,
    resources: Record<string, string | object>
  ): boolean {
    if (!this.initialized) {
      console.error('[Plugin I18n] Manager is not initialized');
      return false;
    }
    
    if (!this.plugins.has(pluginId)) {
      console.error(`[Plugin I18n] Plugin ${pluginId} is not registered`);
      return false;
    }
    
    // 获取现有资源
    const existingResources = this.resources.get(pluginId) || {};
    
    // 更新资源
    existingResources[language] = {
      ...existingResources[language],
      ...resources
    };
    
    // 保存资源
    this.resources.set(pluginId, existingResources);
    
    // 更新i18next资源
    const ns = `plugin_${pluginId}`;
    i18n.addResourceBundle(language, ns, resources, true, true);
    
    return true;
  }
  
  /**
   * 移除插件语言资源
   * @param pluginId 插件ID
   * @param language 语言代码
   * @returns 是否成功
   */
  removeResources(pluginId: string, language: string): boolean {
    if (!this.initialized) {
      console.error('[Plugin I18n] Manager is not initialized');
      return false;
    }
    
    if (!this.plugins.has(pluginId)) {
      console.error(`[Plugin I18n] Plugin ${pluginId} is not registered`);
      return false;
    }
    
    // 获取现有资源
    const existingResources = this.resources.get(pluginId);
    if (!existingResources || !existingResources[language]) {
      return false;
    }
    
    // 移除资源
    delete existingResources[language];
    
    // 保存资源
    this.resources.set(pluginId, existingResources);
    
    // 从i18next中移除资源
    const ns = `plugin_${pluginId}`;
    i18n.removeResourceBundle(language, ns);
    
    return true;
  }
}

// 创建插件国际化管理器实例
let i18nManagerInstance: PluginI18nManager | null = null;

/**
 * 获取插件国际化管理器实例
 * @returns 插件国际化管理器实例
 */
export function getPluginI18nManager(): PluginI18nManager {
  if (!i18nManagerInstance) {
    i18nManagerInstance = new PluginI18nManager();
  }
  return i18nManagerInstance;
}

/**
 * 创建插件翻译助手
 * @param pluginId 插件ID
 * @param resources 语言资源
 * @param options 翻译选项
 * @returns 翻译助手
 */
export function createPluginTranslationHelper(
  pluginId: string,
  resources: PluginLanguageResources,
  options: PluginTranslationOptions = {}
) {
  const manager = getPluginI18nManager();
  
  // 注册资源
  manager.registerResources(pluginId, resources, options);
  
  // 获取翻译函数
  const t = manager.getTranslationFunction(pluginId, options);
  
  return {
    /**
     * 翻译函数
     * @param key 翻译键
     * @param defaultValue 默认值
     * @param interpolation 插值参数
     * @returns 翻译结果
     */
    t,
    
    /**
     * 获取当前语言
     * @returns 当前语言
     */
    getCurrentLanguage: () => manager.getCurrentLanguage(),
    
    /**
     * 获取支持的语言
     * @returns 支持的语言列表
     */
    getSupportedLanguages: () => manager.getSupportedLanguages(pluginId),
    
    /**
     * 切换语言
     * @param language 语言代码
     * @returns 是否成功
     */
    changeLanguage: (language: string) => manager.changeLanguage(language),
    
    /**
     * 添加或更新语言资源
     * @param language 语言代码
     * @param newResources 语言资源
     * @returns 是否成功
     */
    addOrUpdateResources: (language: string, newResources: Record<string, string | object>) => 
      manager.addOrUpdateResources(pluginId, language, newResources),
    
    /**
     * 移除语言资源
     * @param language 语言代码
     * @returns 是否成功
     */
    removeResources: (language: string) => manager.removeResources(pluginId, language)
  };
}

/**
 * 创建示例插件语言资源
 * @returns 示例语言资源
 */
export function createExamplePluginResources(): PluginLanguageResources {
  return {
    'en-US': {
      title: 'Example Plugin',
      description: 'This is an example plugin',
      settings: {
        title: 'Settings',
        language: 'Language',
        theme: 'Theme',
        save: 'Save'
      },
      messages: {
        success: 'Operation successful',
        error: 'An error occurred',
        confirmDelete: 'Are you sure you want to delete this?'
      }
    },
    'zh-CN': {
      title: '示例插件',
      description: '这是一个示例插件',
      settings: {
        title: '设置',
        language: '语言',
        theme: '主题',
        save: '保存'
      },
      messages: {
        success: '操作成功',
        error: '发生错误',
        confirmDelete: '确定要删除吗？'
      }
    }
  };
}
