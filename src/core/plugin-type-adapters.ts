/**
 * 插件系统类型适配器
 * 用于解决不同模块之间类型定义不一致的问题
 */
import {
  PluginLanguageResources as TypesPluginLanguageResources,
  ConfigSchema as TypesConfigSchema,
  ConfigFieldDefinition as TypesConfigFieldDefinition,
  UpdateCheckResult as TypesUpdateCheckResult,
  PluginSearchResult as TypesPluginSearchResult,
  StorageStats as TypesStorageStats,
  PermissionRequest as TypesPermissionRequest
} from './plugin-types';

// 从其他模块导入类型
import { PluginLanguageResources as I18nPluginLanguageResources } from './plugin-i18n';
import { ConfigSchema as ConfigPluginSchema } from './plugin-config';
import { UpdateCheckResult as UpdaterUpdateCheckResult } from './plugin-updater';
import { PluginSearchResult as MarketPluginSearchResult } from './plugin-market';

/**
 * 将plugin-types中的PluginLanguageResources转换为plugin-i18n中的PluginLanguageResources
 * @param resources 原始资源
 * @returns 转换后的资源
 */
export function adaptPluginLanguageResources(
  resources: TypesPluginLanguageResources
): I18nPluginLanguageResources {
  // 创建一个符合I18nPluginLanguageResources接口的对象
  const adaptedResources: Record<string, Record<string, string | object>> = {};
  
  // 将原始资源转换为适配后的格式
  Object.entries(resources.resources).forEach(([lang, translations]) => {
    adaptedResources[lang] = translations;
  });
  
  return {
    namespace: resources.namespace,
    resources: adaptedResources
  };
}

/**
 * 将plugin-types中的ConfigSchema转换为plugin-config中的ConfigSchema
 * @param schema 原始配置模式
 * @param pluginId 插件ID
 * @param pluginName 插件名称
 * @returns 转换后的配置模式
 */
export function adaptConfigSchema(
  schema: Record<string, TypesConfigFieldDefinition>,
  pluginId: string,
  pluginName: string
): ConfigPluginSchema {
  // 创建符合plugin-config模块需要的配置模式
  const adaptedFields: Record<string, TypesConfigFieldDefinition> = {};
  
  // 将原始字段转换为适配后的格式
  Object.entries(schema).forEach(([key, field]) => {
    adaptedFields[key] = adaptConfigFieldDefinition(field);
  });
  
  // 返回符合ConfigPluginSchema接口的对象
  return {
    id: pluginId,
    version: '1.0',
    title: `${pluginName} 配置`,
    fields: adaptedFields
  };
}

/**
 * 转换配置字段定义
 * @param field 原始字段定义
 * @returns 转换后的字段定义
 */
export function adaptConfigFieldDefinition(
  field: TypesConfigFieldDefinition
): TypesConfigFieldDefinition {
  return {
    type: field.type,
    label: field.label,
    description: field.description || '',
    defaultValue: field.defaultValue,
    required: field.required || false,
    // 添加其他可能需要的字段
  };
}

/**
 * 将plugin-updater中的UpdateCheckResult转换为plugin-types中的UpdateCheckResult
 * @param result 原始更新检查结果
 * @returns 转换后的更新检查结果
 */
export function adaptUpdateCheckResult(
  result: UpdaterUpdateCheckResult | Map<string, UpdaterUpdateCheckResult>
): Record<string, TypesUpdateCheckResult[string]> {
  if (result instanceof Map) {
    // 如果是Map类型，转换为Record
    const adaptedResult: Record<string, TypesUpdateCheckResult[string]> = {};
    result.forEach((value, key) => {
      // 创建符合TypesUpdateCheckResult[string]接口的对象
      adaptedResult[key] = {
        hasUpdate: value.hasUpdate || false,
        currentVersion: value.currentVersion || '',
        latestVersion: value.latestVersion || '',
        // 使用可选链和空值合并操作符处理可选字段
        ...(value.releaseDate ? { releaseDate: value.releaseDate } : {}),
        ...(value.releaseNotes ? { releaseNotes: value.releaseNotes } : {}),
        ...(value.downloadUrl ? { downloadUrl: value.downloadUrl } : {})
      };
    });
    return adaptedResult;
  } else {
    // 如果已经是Record类型，进行安全的类型转换
    const adaptedResult: Record<string, TypesUpdateCheckResult[string]> = {};
    
    // 遍历原始结果，确保类型安全
    Object.entries(result).forEach(([key, value]) => {
      adaptedResult[key] = {
        hasUpdate: value.hasUpdate || false,
        currentVersion: value.currentVersion || '',
        latestVersion: value.latestVersion || '',
        // 使用可选链和空值合并操作符处理可选字段
        ...(value.releaseDate ? { releaseDate: value.releaseDate } : {}),
        ...(value.releaseNotes ? { releaseNotes: value.releaseNotes } : {}),
        ...(value.downloadUrl ? { downloadUrl: value.downloadUrl } : {})
      };
    });
    
    return adaptedResult;
  }
}

/**
 * 将plugin-market中的PluginSearchResult转换为plugin-types中的PluginSearchResult
 * @param result 原始搜索结果
 * @returns 转换后的搜索结果
 */
export function adaptPluginSearchResult(
  result: MarketPluginSearchResult
): TypesPluginSearchResult {
  // 安全地访问结果属性
  const resultObj = result as unknown as Record<string, unknown>;
  
  // 获取items数组，确保它是一个数组
  const items = Array.isArray(resultObj.items) ? resultObj.items : [];
  
  // 获取total数值，确保它是一个数字
  const total = typeof resultObj.total === 'number' ? resultObj.total : items.length;
  
  // 返回符合TypesPluginSearchResult接口的对象
  return { items, total };
}

/**
 * 安全地访问对象属性
 * @param obj 对象
 * @param key 属性键
 * @param defaultValue 默认值
 * @returns 属性值或默认值
 */
export function safeGet<T extends Record<string, unknown>, K extends string>(
  obj: T | null | undefined, 
  key: K, 
  defaultValue: unknown
): unknown {
  if (!obj) return defaultValue;
  return key in obj ? obj[key] : defaultValue;
}

/**
 * 将任意对象转换为PermissionRequest
 * @param perm 权限对象
 * @returns 转换后的权限请求
 */
export function adaptPermissionRequest(perm: unknown): TypesPermissionRequest {
  // 将未知类型转换为Record<string, unknown>
  const permObj = perm as Record<string, unknown>;
  
  // 安全地获取permission属性
  let name = '';
  if (typeof permObj.permission === 'string') {
    name = permObj.permission;
  } else if (permObj.permission) {
    name = String(permObj.permission);
  }
  
  // 安全地获取description属性
  const description = typeof permObj.description === 'string' 
    ? permObj.description 
    : '';
  
  // 安全地获取sensitive属性
  const sensitive = Boolean(permObj.sensitive);
  
  // 返回符合TypesPermissionRequest接口的对象
  return { name, description, sensitive };
}

/**
 * 将任意对象转换为StorageStats
 * @param stats 存储统计对象
 * @returns 转换后的存储统计
 */
export function adaptStorageStats(stats: unknown): TypesStorageStats {
  // 默认值
  let used = 0;
  let limit = 10 * 1024 * 1024; // 默认10MB
  
  // 安全地获取属性
  if (stats && typeof stats === 'object') {
    const statsObj = stats as Record<string, unknown>;
    
    // 处理used属性
    if ('used' in statsObj) {
      if (typeof statsObj.used === 'number') {
        used = statsObj.used;
      } else if (typeof statsObj.used === 'string') {
        const parsedUsed = Number(statsObj.used);
        if (!isNaN(parsedUsed)) {
          used = parsedUsed;
        }
      }
    }
    
    // 处理limit属性
    if ('limit' in statsObj) {
      if (typeof statsObj.limit === 'number') {
        limit = statsObj.limit;
      } else if (typeof statsObj.limit === 'string') {
        const parsedLimit = Number(statsObj.limit);
        if (!isNaN(parsedLimit)) {
          limit = parsedLimit;
        }
      }
    }
  }
  
  // 返回符合TypesStorageStats接口的对象
  return { used, limit };
}
