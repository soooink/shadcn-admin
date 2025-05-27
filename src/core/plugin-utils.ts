/**
 * 插件系统工具函数
 * 提供插件依赖管理、版本管理、配置管理和安全检查功能
 */
import { Plugin, PluginDependency } from './plugin-system';
import semver from 'semver';

// 插件配置存储
const PLUGIN_CONFIG_STORAGE_KEY = 'plugin_configs';

/**
 * 插件配置类型
 */
export type PluginConfig = Record<string, string | number | boolean | Record<string, unknown>>;

/**
 * 检查插件版本是否满足依赖要求
 * @param version 当前版本
 * @param requirement 版本要求（semver格式）
 * @returns 是否满足要求
 */
export function checkVersionSatisfies(version: string, requirement: string): boolean {
  try {
    return semver.satisfies(version, requirement);
  } catch (error) {
    console.error(`[Plugin] Invalid semver version: ${version} or requirement: ${requirement}`);
    return false;
  }
}

/**
 * 检查插件依赖是否满足
 * @param plugin 要检查的插件
 * @param availablePlugins 可用的插件列表
 * @returns 依赖检查结果，包含是否满足和未满足的依赖列表
 */
export function checkDependencies(
  plugin: Plugin,
  availablePlugins: Map<string, Plugin>
): { satisfied: boolean; missingDependencies: PluginDependency[] } {
  if (!plugin.dependencies || plugin.dependencies.length === 0) {
    return { satisfied: true, missingDependencies: [] };
  }

  const missingDependencies: PluginDependency[] = [];

  for (const dependency of plugin.dependencies) {
    const dependencyPlugin = availablePlugins.get(dependency.id);
    
    // 检查依赖插件是否存在
    if (!dependencyPlugin) {
      if (!dependency.optional) {
        missingDependencies.push(dependency);
      }
      continue;
    }
    
    // 检查版本是否满足要求
    if (!checkVersionSatisfies(dependencyPlugin.version, dependency.version)) {
      if (!dependency.optional) {
        missingDependencies.push(dependency);
      }
    }
  }

  return {
    satisfied: missingDependencies.length === 0,
    missingDependencies
  };
}

/**
 * 获取插件配置
 * @param pluginId 插件ID
 * @returns 插件配置对象
 */
export function getPluginConfig(pluginId: string): PluginConfig {
  try {
    const configs = JSON.parse(localStorage.getItem(PLUGIN_CONFIG_STORAGE_KEY) || '{}');
    return configs[pluginId] || {};
  } catch (error) {
    console.error(`[Plugin] Failed to get config for plugin ${pluginId}:`, error);
    return {};
  }
}

/**
 * 保存插件配置
 * @param pluginId 插件ID
 * @param config 配置对象
 * @returns 是否保存成功
 */
export function savePluginConfig(pluginId: string, config: PluginConfig): boolean {
  try {
    const configs = JSON.parse(localStorage.getItem(PLUGIN_CONFIG_STORAGE_KEY) || '{}');
    configs[pluginId] = config;
    localStorage.setItem(PLUGIN_CONFIG_STORAGE_KEY, JSON.stringify(configs));
    return true;
  } catch (error) {
    console.error(`[Plugin] Failed to save config for plugin ${pluginId}:`, error);
    return false;
  }
}

/**
 * 验证插件配置是否有效
 * @param plugin 插件对象
 * @param config 配置对象
 * @returns 验证结果，包含是否有效和错误信息
 */
export function validatePluginConfig(
  plugin: Plugin,
  config: PluginConfig
): { valid: boolean; errors: Record<string, string> } {
  if (!plugin.configOptions || plugin.configOptions.length === 0) {
    return { valid: true, errors: {} };
  }

  const errors: Record<string, string> = {};

  for (const option of plugin.configOptions) {
    const value = config[option.key];
    
    // 检查必填项
    if (option.required && (value === undefined || value === null || value === '')) {
      errors[option.key] = `${option.label}是必填项`;
      continue;
    }
    
    if (value !== undefined && value !== null) {
      // 类型检查
      if (option.type === 'number' && typeof value !== 'number') {
        errors[option.key] = `${option.label}必须是数字`;
      } else if (option.type === 'boolean' && typeof value !== 'boolean') {
        errors[option.key] = `${option.label}必须是布尔值`;
      } else if (option.type === 'string' && typeof value !== 'string') {
        errors[option.key] = `${option.label}必须是字符串`;
      } else if (option.type === 'select' && typeof value === 'string') {
        // 检查选项是否有效
        const validOptions = option.options?.map(opt => opt.value) || [];
        if (!validOptions.includes(value)) {
          errors[option.key] = `${option.label}的值不在有效选项范围内`;
        }
      }
      
      // 验证规则检查
      if (option.validation) {
        if (option.type === 'number' && typeof value === 'number') {
          if (option.validation.min !== undefined && value < option.validation.min) {
            errors[option.key] = option.validation.message || `${option.label}不能小于${option.validation.min}`;
          }
          if (option.validation.max !== undefined && value > option.validation.max) {
            errors[option.key] = option.validation.message || `${option.label}不能大于${option.validation.max}`;
          }
        } else if (option.type === 'string' && typeof value === 'string' && option.validation.pattern) {
          const regex = new RegExp(option.validation.pattern);
          if (!regex.test(value)) {
            errors[option.key] = option.validation.message || `${option.label}格式不正确`;
          }
        }
      }
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * 验证插件安全性
 * @param plugin 插件对象
 * @returns 安全检查结果
 */
export function validatePluginSecurity(plugin: Plugin): { 
  safe: boolean; 
  warnings: string[];
  permissions: string[];
} {
  const warnings: string[] = [];
  const permissions: string[] = [];

  // 检查插件是否有安全信息
  if (!plugin.security) {
    warnings.push('插件未提供安全信息');
    return { safe: false, warnings, permissions };
  }

  // 检查作者信息
  if (!plugin.security.author) {
    warnings.push('插件未提供作者信息');
  }

  // 检查许可证
  if (!plugin.security.license) {
    warnings.push('插件未提供许可证信息');
  }

  // 检查数字签名
  if (!plugin.security.signature) {
    warnings.push('插件未提供数字签名，无法验证完整性');
  }

  // 检查权限
  if (plugin.security.permissions && plugin.security.permissions.length > 0) {
    permissions.push(...plugin.security.permissions);
    
    // 检查敏感权限
    const sensitivePermissions = ['storage', 'network', 'filesystem', 'notifications'];
    const requestedSensitivePermissions = sensitivePermissions.filter(
      perm => plugin.security?.permissions?.includes(perm)
    );
    
    if (requestedSensitivePermissions.length > 0) {
      warnings.push(`插件请求敏感权限: ${requestedSensitivePermissions.join(', ')}`);
    }
  }

  // 根据警告数量判断安全性
  const safe = warnings.length === 0 || (warnings.length === 1 && warnings[0].includes('数字签名'));
  
  return { safe, warnings, permissions };
}

/**
 * 检查插件更新
 * @param plugin 插件对象
 * @returns 更新检查结果，包含是否有更新和新版本信息
 */
export async function checkPluginUpdate(plugin: Plugin): Promise<{
  hasUpdate: boolean;
  newVersion?: string;
  updateUrl?: string;
}> {
  if (!plugin.updateUrl) {
    return { hasUpdate: false };
  }

  try {
    const response = await fetch(plugin.updateUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch update info: ${response.statusText}`);
    }

    const updateInfo = await response.json();
    
    if (updateInfo.version && semver.gt(updateInfo.version, plugin.version)) {
      return {
        hasUpdate: true,
        newVersion: updateInfo.version,
        updateUrl: updateInfo.downloadUrl || plugin.updateUrl
      };
    }

    return { hasUpdate: false };
  } catch (error) {
    console.error(`[Plugin] Failed to check update for plugin ${plugin.id}:`, error);
    return { hasUpdate: false };
  }
}

/**
 * 更新插件
 * @param plugin 当前插件
 * @param updateUrl 更新URL
 * @returns 更新结果
 */
export async function updatePlugin(plugin: Plugin, updateUrl: string): Promise<{
  success: boolean;
  newVersion?: string;
  error?: string;
}> {
  try {
    // 保存当前版本号，用于更新后触发onUpdate钩子
    const previousVersion = plugin.version;
    
    // 从URL加载新版本插件
    const response = await fetch(updateUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch plugin update: ${response.statusText}`);
    }
    
    const pluginCode = await response.text();
    
    // 执行插件代码获取新版本插件对象
    // 注意：这里使用eval执行远程代码存在安全风险，实际应用中应使用更安全的方式
    // eslint-disable-next-line no-eval
    const updatedPlugin = eval(pluginCode) as Plugin;
    
    if (!updatedPlugin || !updatedPlugin.id || updatedPlugin.id !== plugin.id) {
      throw new Error('Invalid plugin update package');
    }
    
    // 检查版本是否确实更新了
    if (!semver.gt(updatedPlugin.version, previousVersion)) {
      return {
        success: false,
        error: '新版本号不大于当前版本'
      };
    }
    
    // 替换插件
    const context = { i18n: window.i18n };
    
    // 如果当前插件已激活，先停用
    if (window.isPluginActive?.(plugin.id)) {
      await window.deactivatePlugin?.(plugin.id);
    }
    
    // 注册新版本插件
    await window.registerPlugin?.(updatedPlugin);
    
    // 如果之前是激活状态，重新激活
    if (window.isPluginActive?.(plugin.id)) {
      await window.activatePlugin?.(plugin.id);
      
      // 触发更新钩子
      if (updatedPlugin.onUpdate) {
        await updatedPlugin.onUpdate(context, previousVersion);
      }
    }
    
    return {
      success: true,
      newVersion: updatedPlugin.version
    };
  } catch (error) {
    console.error(`[Plugin] Failed to update plugin ${plugin.id}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// 为了类型安全，声明全局插件系统函数
declare global {
  interface Window {
    registerPlugin?: (plugin: Plugin) => Promise<boolean>;
    activatePlugin?: (id: string) => Promise<boolean>;
    deactivatePlugin?: (id: string) => Promise<boolean>;
    isPluginActive?: (id: string) => boolean;
    i18n: any; // i18next实例
  }
}
