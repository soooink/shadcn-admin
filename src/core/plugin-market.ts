/**
 * 插件市场服务
 * 提供插件发现、下载、评价等功能
 */
import { Plugin } from './plugin-system';
import { installPlugin, uninstallPlugin } from './plugin-system';
import { checkDependencies, validatePluginSecurity } from './plugin-utils';
import { pluginLogger } from '../utils/logger';

/**
 * 插件市场配置
 */
interface PluginMarketConfig {
  /** 插件市场API地址 */
  apiUrl: string;
  /** API密钥（如果需要） */
  apiKey?: string;
}

/**
 * 插件包信息
 */
export interface PluginPackage {
  /** 插件ID */
  id: string;
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version: string;
  /** 插件描述 */
  description: string;
  /** 插件作者 */
  author: string;
  /** 插件下载URL */
  downloadUrl: string;
  /** 插件图标URL */
  iconUrl?: string;
  /** 插件主页URL */
  homepageUrl?: string;
  /** 插件文档URL */
  documentationUrl?: string;
  /** 插件评分 */
  rating?: number;
  /** 下载次数 */
  downloads?: number;
  /** 发布日期 */
  publishedAt: string;
  /** 最后更新日期 */
  updatedAt: string;
  /** 插件标签 */
  tags?: string[];
  /** 插件截图 */
  screenshots?: string[];
  /** 插件价格（如果是付费插件） */
  price?: number;
  /** 插件依赖 */
  dependencies?: Array<{id: string; version: string; optional?: boolean}>;
  /** 插件所需权限 */
  permissions?: string[];
}

/**
 * 插件市场搜索参数
 */
export interface PluginSearchParams {
  /** 搜索关键词 */
  query?: string;
  /** 分类 */
  category?: string;
  /** 标签 */
  tags?: string[];
  /** 排序方式 */
  sort?: 'popular' | 'newest' | 'rating' | 'downloads';
  /** 是否只显示免费插件 */
  freeOnly?: boolean;
  /** 页码 */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
}

/**
 * 插件市场搜索结果
 */
export interface PluginSearchResult {
  /** 插件列表 */
  plugins: PluginPackage[];
  /** 总数 */
  total: number;
  /** 当前页 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
}

/**
 * 插件安装结果
 */
export interface PluginInstallResult {
  /** 是否成功 */
  success: boolean;
  /** 插件ID */
  pluginId?: string;
  /** 错误信息 */
  error?: string;
  /** 警告信息 */
  warnings?: string[];
  /** 依赖问题 */
  dependencyIssues?: Array<{id: string; version: string; message: string}>;
}

/**
 * 插件市场服务
 */
export class PluginMarketService {
  private config: PluginMarketConfig;
  private installedPlugins: Map<string, Plugin>;

  /**
   * 构造函数
   * @param config 插件市场配置
   * @param installedPlugins 已安装的插件
   */
  constructor(config: PluginMarketConfig, installedPlugins: Map<string, Plugin>) {
    this.config = config;
    this.installedPlugins = installedPlugins;
  }

  /**
   * 搜索插件
   * @param params 搜索参数
   * @returns 搜索结果
   */
  async searchPlugins(params: PluginSearchParams = {}): Promise<PluginSearchResult> {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.query) queryParams.set('query', params.query);
      if (params.category) queryParams.set('category', params.category);
      if (params.tags) params.tags.forEach(tag => queryParams.append('tag', tag));
      if (params.sort) queryParams.set('sort', params.sort);
      if (params.freeOnly) queryParams.set('freeOnly', 'true');
      if (params.page) queryParams.set('page', params.page.toString());
      if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());
      
      const response = await fetch(`${this.config.apiUrl}/plugins?${queryParams.toString()}`, {
        headers: this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      pluginLogger.error(`Failed to search plugins: ${error instanceof Error ? error.message : String(error)}`);
      return {
        plugins: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0
      };
    }
  }

  /**
   * 获取插件详情
   * @param pluginId 插件ID
   * @returns 插件详情
   */
  async getPluginDetails(pluginId: string): Promise<PluginPackage | null> {
    try {
      const response = await fetch(`${this.config.apiUrl}/plugins/${pluginId}`, {
        headers: this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      pluginLogger.error(`Failed to get plugin details for ${pluginId}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * 获取插件分类
   * @returns 分类列表
   */
  async getCategories(): Promise<Array<{id: string; name: string; count: number}>> {
    try {
      const response = await fetch(`${this.config.apiUrl}/categories`, {
        headers: this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      pluginLogger.error(`Failed to get categories: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * 获取热门标签
   * @returns 标签列表
   */
  async getPopularTags(): Promise<Array<{name: string; count: number}>> {
    try {
      const response = await fetch(`${this.config.apiUrl}/tags`, {
        headers: this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      pluginLogger.error(`Failed to get popular tags: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * 安装插件
   * @param pluginPackage 插件包信息
   * @param options 安装选项
   * @returns 安装结果
   */
  async installPluginFromMarket(
    pluginId: string,
    options: {
      skipDependencyCheck?: boolean;
      skipSecurityCheck?: boolean;
      force?: boolean;
    } = {}
  ): Promise<PluginInstallResult> {
    try {
      // 获取插件详情
      const pluginPackage = await this.getPluginDetails(pluginId);
      if (!pluginPackage) {
        return {
          success: false,
          error: `插件不存在: ${pluginId}`
        };
      }
      
      // 检查插件是否已安装
      if (this.installedPlugins.has(pluginId) && !options.force) {
        return {
          success: false,
          pluginId,
          error: `插件已安装: ${pluginId}`
        };
      }
      
      // 下载插件代码
      const response = await fetch(pluginPackage.downloadUrl);
      if (!response.ok) {
        throw new Error(`Failed to download plugin: ${response.statusText}`);
      }
      
      const pluginCode = await response.text();
      
      // 解析插件代码获取插件对象
      // 安全警告: 使用eval执行远程代码存在安全风险
      // 在生产环境中应使用沙箱或其他隔离机制
      // eslint-disable-next-line no-eval
      const plugin = eval(pluginCode) as Plugin;
      
      if (!plugin || !plugin.id || plugin.id !== pluginId) {
        return {
          success: false,
          error: '无效的插件包'
        };
      }
      
      // 检查依赖
      if (!options.skipDependencyCheck && plugin.dependencies) {
        const dependencyCheck = checkDependencies(plugin, this.installedPlugins);
        if (!dependencyCheck.satisfied) {
          return {
            success: false,
            pluginId,
            error: '依赖检查失败',
            dependencyIssues: dependencyCheck.missingDependencies.map(dep => ({
              id: dep.id,
              version: dep.version,
              message: `缺少依赖: ${dep.id} (${dep.version})`
            }))
          };
        }
      }
      
      // 安全检查
      if (!options.skipSecurityCheck && plugin.security) {
        const securityCheck = validatePluginSecurity(plugin);
        if (!securityCheck.safe) {
          return {
            success: false,
            pluginId,
            error: '安全检查失败',
            warnings: securityCheck.warnings
          };
        }
      }
      
      // 安装插件
      const installSuccess = await installPlugin({
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        url: pluginPackage.downloadUrl
      });
      
      if (!installSuccess) {
        return {
          success: false,
          pluginId,
          error: '插件安装失败'
        };
      }
      
      return {
        success: true,
        pluginId
      };
    } catch (error) {
      pluginLogger.error(`Failed to install plugin ${pluginId}: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 卸载插件
   * @param pluginId 插件ID
   * @returns 卸载结果
   */
  async uninstallPluginFromMarket(pluginId: string): Promise<{success: boolean; error?: string}> {
    try {
      const success = await uninstallPlugin(pluginId);
      
      if (!success) {
        return {
          success: false,
          error: `插件卸载失败: ${pluginId}`
        };
      }
      
      return { success: true };
    } catch (error) {
      pluginLogger.error(`Failed to uninstall plugin ${pluginId}: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 评价插件
   * @param pluginId 插件ID
   * @param rating 评分（1-5）
   * @param review 评价内容
   * @returns 评价结果
   */
  async ratePlugin(
    pluginId: string,
    rating: number,
    review?: string
  ): Promise<{success: boolean; error?: string}> {
    try {
      const response = await fetch(`${this.config.apiUrl}/plugins/${pluginId}/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {})
        },
        body: JSON.stringify({
          rating,
          review
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      return { success: true };
    } catch (error) {
      pluginLogger.error(`Failed to rate plugin ${pluginId}: ${error instanceof Error ? error.message : String(error)}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 获取插件评价
   * @param pluginId 插件ID
   * @param page 页码
   * @param pageSize 每页数量
   * @returns 评价列表
   */
  async getPluginReviews(
    pluginId: string,
    page = 1,
    pageSize = 10
  ): Promise<{
    reviews: Array<{
      id: string;
      userId: string;
      userName: string;
      rating: number;
      review?: string;
      createdAt: string;
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    try {
      const response = await fetch(
        `${this.config.apiUrl}/plugins/${pluginId}/ratings?page=${page}&pageSize=${pageSize}`,
        {
          headers: this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}
        }
      );
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      pluginLogger.error(`Failed to get reviews for plugin ${pluginId}: ${error instanceof Error ? error.message : String(error)}`);
      return {
        reviews: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0
      };
    }
  }

  /**
   * 获取推荐插件
   * @returns 推荐插件列表
   */
  async getRecommendedPlugins(): Promise<PluginPackage[]> {
    try {
      const response = await fetch(`${this.config.apiUrl}/plugins/recommended`, {
        headers: this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      pluginLogger.error(`Failed to get recommended plugins: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * 获取新发布的插件
   * @param limit 数量限制
   * @returns 新插件列表
   */
  async getNewPlugins(limit = 10): Promise<PluginPackage[]> {
    try {
      const response = await fetch(`${this.config.apiUrl}/plugins/new?limit=${limit}`, {
        headers: this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      pluginLogger.error(`Failed to get new plugins: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * 获取热门插件
   * @param limit 数量限制
   * @returns 热门插件列表
   */
  async getPopularPlugins(limit = 10): Promise<PluginPackage[]> {
    try {
      const response = await fetch(`${this.config.apiUrl}/plugins/popular?limit=${limit}`, {
        headers: this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      pluginLogger.error(`Failed to get popular plugins: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
}

// 创建插件市场服务实例
let pluginMarketInstance: PluginMarketService | null = null;

/**
 * 获取插件市场服务实例
 * @param config 插件市场配置
 * @param plugins 已安装的插件
 * @returns 插件市场服务实例
 */
export function getPluginMarketService(
  config: PluginMarketConfig,
  plugins: Map<string, Plugin>
): PluginMarketService {
  if (!pluginMarketInstance) {
    pluginMarketInstance = new PluginMarketService(config, plugins);
  }
  return pluginMarketInstance;
}
