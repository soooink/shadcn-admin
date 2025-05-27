/**
 * 插件依赖管理系统
 * 提供插件依赖关系的定义、解析和管理功能
 */
import { Plugin } from './plugin-system';
import { getPluginMarketService } from './plugin-market';

// 由于semver可能没有安装，我们创建一个简单的版本比较函数
const semver = {
  satisfies: (version: string, range: string): boolean => {
    // 简单实现，仅支持基本的版本比较
    // 实际项目中应该使用完整的semver库
    if (range.startsWith('^')) {
      const minVersion = range.substring(1);
      const [major1, minor1, patch1] = minVersion.split('.').map(Number);
      const [major2, minor2, patch2] = version.split('.').map(Number);
      
      return major2 === major1 && 
        (minor2 > minor1 || (minor2 === minor1 && patch2 >= patch1));
    }
    
    if (range.startsWith('~')) {
      const minVersion = range.substring(1);
      const [major1, minor1, patch1] = minVersion.split('.').map(Number);
      const [major2, minor2, patch2] = version.split('.').map(Number);
      
      return major2 === major1 && minor2 === minor1 && patch2 >= patch1;
    }
    
    if (range.includes(' - ')) {
      const [minVersion, maxVersion] = range.split(' - ');
      return semver.gte(version, minVersion) && semver.lte(version, maxVersion);
    }
    
    return version === range;
  },
  
  gt: (version1: string, version2: string): boolean => {
    const [major1, minor1, patch1] = version1.split('.').map(Number);
    const [major2, minor2, patch2] = version2.split('.').map(Number);
    
    if (major1 !== major2) return major1 > major2;
    if (minor1 !== minor2) return minor1 > minor2;
    return patch1 > patch2;
  },
  
  gte: (version1: string, version2: string): boolean => {
    return semver.gt(version1, version2) || version1 === version2;
  },
  
  lt: (version1: string, version2: string): boolean => {
    return !semver.gte(version1, version2);
  },
  
  lte: (version1: string, version2: string): boolean => {
    return semver.lt(version1, version2) || version1 === version2;
  },
  
  major: (version: string): number => {
    return Number(version.split('.')[0]);
  },
  
  minor: (version: string): number => {
    return Number(version.split('.')[1]);
  },
  
  patch: (version: string): number => {
    return Number(version.split('.')[2]);
  }
};

/**
 * 依赖类型
 */
export enum DependencyType {
  /** 必需依赖 */
  REQUIRED = 'required',
  /** 可选依赖 */
  OPTIONAL = 'optional',
  /** 冲突依赖 */
  CONFLICTS = 'conflicts',
  /** 增强依赖 */
  ENHANCES = 'enhances',
  /** 推荐依赖 */
  RECOMMENDS = 'recommends'
}

/**
 * 依赖定义
 */
export interface DependencyDefinition {
  /** 依赖插件ID */
  pluginId: string;
  /** 依赖类型 */
  type: DependencyType;
  /** 版本范围 */
  versionRange?: string;
  /** 依赖描述 */
  description?: string;
  /** 是否已安装 */
  installed?: boolean;
  /** 是否满足版本要求 */
  versionSatisfied?: boolean;
}

/**
 * 依赖解析结果
 */
export interface DependencyResolutionResult {
  /** 是否成功 */
  success: boolean;
  /** 满足的依赖 */
  satisfied: DependencyDefinition[];
  /** 不满足的依赖 */
  unsatisfied: DependencyDefinition[];
  /** 冲突的依赖 */
  conflicts: DependencyDefinition[];
  /** 错误消息 */
  errorMessage?: string;
}

/**
 * 依赖解析选项
 */
export interface DependencyResolutionOptions {
  /** 是否自动安装缺失的依赖 */
  autoInstall?: boolean;
  /** 是否忽略可选依赖 */
  ignoreOptional?: boolean;
  /** 是否忽略推荐依赖 */
  ignoreRecommended?: boolean;
  /** 是否忽略增强依赖 */
  ignoreEnhanced?: boolean;
  /** 是否检查冲突 */
  checkConflicts?: boolean;
}

/**
 * 依赖图节点
 */
interface DependencyGraphNode {
  /** 插件ID */
  pluginId: string;
  /** 插件版本 */
  version: string;
  /** 依赖 */
  dependencies: DependencyDefinition[];
  /** 是否已访问（用于循环依赖检测） */
  visited?: boolean;
  /** 是否在当前路径上（用于循环依赖检测） */
  onPath?: boolean;
}

/**
 * 依赖图
 */
interface DependencyGraph {
  /** 节点映射 */
  nodes: Map<string, DependencyGraphNode>;
  /** 边映射（依赖关系） */
  edges: Map<string, string[]>;
}

/**
 * 循环依赖结果
 */
interface CyclicDependencyResult {
  /** 是否有循环依赖 */
  hasCycle: boolean;
  /** 循环依赖路径 */
  cycle?: string[];
}

/**
 * 插件依赖管理器
 */
export class PluginDependencyManager {
  private plugins: Map<string, Plugin> = new Map();
  private dependencies: Map<string, DependencyDefinition[]> = new Map();
  private dependencyGraph: DependencyGraph = {
    nodes: new Map(),
    edges: new Map()
  };
  
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
    // 获取已加载的插件
    // 注意：这里我们假设插件管理器已经在全局范围内可用
    // 实际项目中应该使用正确的方式获取插件管理器
    const pluginManager = (window as any).pluginManager;
    
    if (pluginManager) {
      const plugins = pluginManager.getAllPlugins();
      
      // 注册插件
      plugins.forEach((plugin: Plugin) => {
        this.registerPlugin(plugin);
      });
    }
    
    // 构建依赖图
    this.buildDependencyGraph();
  }
  
  /**
   * 注册插件
   * @param plugin 插件对象
   */
  registerPlugin(plugin: Plugin): void {
    this.plugins.set(plugin.id, plugin);
    
    // 初始化插件依赖
    if (!this.dependencies.has(plugin.id)) {
      this.dependencies.set(plugin.id, []);
    }
    
    // 如果插件定义了依赖，注册它们
    if ((plugin as any).dependencies) {
      this.registerDependencies(plugin.id, (plugin as any).dependencies);
    }
  }
  
  /**
   * 注销插件
   * @param pluginId 插件ID
   */
  unregisterPlugin(pluginId: string): void {
    this.plugins.delete(pluginId);
    this.dependencies.delete(pluginId);
    
    // 更新依赖图
    this.dependencyGraph.nodes.delete(pluginId);
    this.dependencyGraph.edges.delete(pluginId);
    
    // 从其他插件的边中移除
    this.dependencyGraph.edges.forEach((edges, nodeId) => {
      const index = edges.indexOf(pluginId);
      if (index !== -1) {
        edges.splice(index, 1);
      }
    });
  }
  
  /**
   * 注册依赖
   * @param pluginId 插件ID
   * @param dependencies 依赖定义列表
   */
  registerDependencies(pluginId: string, dependencies: DependencyDefinition[]): void {
    if (!this.plugins.has(pluginId)) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }
    
    // 更新依赖列表
    this.dependencies.set(pluginId, dependencies);
    
    // 更新依赖图
    this.buildDependencyGraph();
  }
  
  /**
   * 构建依赖图
   */
  private buildDependencyGraph(): void {
    // 清空现有图
    this.dependencyGraph.nodes.clear();
    this.dependencyGraph.edges.clear();
    
    // 为每个插件创建节点
    this.plugins.forEach((plugin, pluginId) => {
      this.dependencyGraph.nodes.set(pluginId, {
        pluginId,
        version: plugin.version,
        dependencies: this.dependencies.get(pluginId) || []
      });
      
      // 初始化边
      this.dependencyGraph.edges.set(pluginId, []);
    });
    
    // 添加边
    this.dependencies.forEach((deps, pluginId) => {
      const edges = this.dependencyGraph.edges.get(pluginId) || [];
      
      deps.forEach(dep => {
        if (dep.type !== DependencyType.CONFLICTS) {
          edges.push(dep.pluginId);
        }
      });
      
      this.dependencyGraph.edges.set(pluginId, edges);
    });
  }
  
  /**
   * 检查循环依赖
   * @param startNodeId 起始节点ID
   * @returns 循环依赖结果
   */
  private checkCyclicDependencies(startNodeId: string): CyclicDependencyResult {
    // 如果节点不存在，返回无循环
    if (!this.dependencyGraph.nodes.has(startNodeId)) {
      return { hasCycle: false };
    }
    // 重置所有节点的访问状态
    this.dependencyGraph.nodes.forEach(node => {
      node.visited = false;
      node.onPath = false;
    });
    
    // 存储循环路径
    const cyclePath: string[] = [];
    
    // DFS函数
    const dfs = (nodeId: string, path: string[] = []): boolean => {
      const node = this.dependencyGraph.nodes.get(nodeId);
      if (!node) {
        return false;
      }
      
      // 如果节点已在当前路径上，发现循环
      if (node.onPath) {
        cyclePath.push(...path, nodeId);
        return true;
      }
      
      // 如果节点已访问，无循环
      if (node.visited) {
        return false;
      }
      
      // 标记节点
      node.visited = true;
      node.onPath = true;
      
      // 访问所有依赖
      const edges = this.dependencyGraph.edges.get(nodeId) || [];
      for (const depId of edges) {
        if (dfs(depId, [...path, nodeId])) {
          return true;
        }
      }
      
      // 回溯
      node.onPath = false;
      
      return false;
    };
    
    // 从指定节点开始DFS
    const hasCycle = dfs(startNodeId);
    
    // 如果发现循环，提取循环路径
    let cycle: string[] | undefined;
    if (hasCycle && cyclePath.length > 0) {
      // 找到循环的起点
      const startIndex = cyclePath.indexOf(cyclePath[cyclePath.length - 1]);
      cycle = cyclePath.slice(startIndex);
    }
    
    return {
      hasCycle,
      cycle
    };
  }
  
  /**
   * 检查依赖
   * @param pluginId 插件ID
   * @param options 解析选项
   * @returns 依赖解析结果
   */
  async checkDependencies(
    pluginId: string,
    options: DependencyResolutionOptions = {}
  ): Promise<DependencyResolutionResult> {
    if (!this.plugins.has(pluginId)) {
      return {
        success: false,
        satisfied: [],
        unsatisfied: [],
        conflicts: [],
        errorMessage: `Plugin ${pluginId} is not registered`
      };
    }
    
    const plugin = this.plugins.get(pluginId)!;
    const dependencies = this.dependencies.get(pluginId) || [];
    
    // 默认选项
    const defaultOptions: DependencyResolutionOptions = {
      autoInstall: false,
      ignoreOptional: false,
      ignoreRecommended: false,
      ignoreEnhanced: false,
      checkConflicts: true
    };
    
    const resolveOptions = { ...defaultOptions, ...options };
    
    // 检查循环依赖
    const cyclicResult = this.checkCyclicDependencies(pluginId);
    if (cyclicResult.hasCycle) {
      return {
        success: false,
        satisfied: [],
        unsatisfied: [],
        conflicts: [],
        errorMessage: `Cyclic dependency detected: ${cyclicResult.cycle?.join(' -> ')}`
      };
    }
    
    const satisfied: DependencyDefinition[] = [];
    const unsatisfied: DependencyDefinition[] = [];
    const conflicts: DependencyDefinition[] = [];
    
    // 检查每个依赖
    for (const dep of dependencies) {
      // 根据选项忽略某些类型的依赖
      if (
        (dep.type === DependencyType.OPTIONAL && resolveOptions.ignoreOptional) ||
        (dep.type === DependencyType.RECOMMENDS && resolveOptions.ignoreRecommended) ||
        (dep.type === DependencyType.ENHANCES && resolveOptions.ignoreEnhanced)
      ) {
        continue;
      }
      
      // 检查依赖插件是否已安装
      const depPlugin = this.plugins.get(dep.pluginId);
      dep.installed = !!depPlugin;
      
      // 如果是冲突依赖，检查是否存在冲突
      if (dep.type === DependencyType.CONFLICTS) {
        if (depPlugin) {
          // 如果冲突的插件已安装，检查版本范围
          if (dep.versionRange) {
            const versionSatisfied = semver.satisfies(depPlugin.version, dep.versionRange);
            dep.versionSatisfied = versionSatisfied;
            
            if (versionSatisfied) {
              conflicts.push(dep);
            } else {
              satisfied.push(dep);
            }
          } else {
            // 无版本范围，任何版本都冲突
            conflicts.push(dep);
          }
        } else {
          // 冲突的插件未安装，满足条件
          satisfied.push(dep);
        }
        continue;
      }
      
      // 对于其他类型的依赖，检查是否已安装和版本是否满足
      if (depPlugin) {
        // 检查版本范围
        if (dep.versionRange) {
          const versionSatisfied = semver.satisfies(depPlugin.version, dep.versionRange);
          dep.versionSatisfied = versionSatisfied;
          
          if (versionSatisfied) {
            satisfied.push(dep);
          } else {
            unsatisfied.push(dep);
          }
        } else {
          // 无版本范围，任何版本都满足
          dep.versionSatisfied = true;
          satisfied.push(dep);
        }
      } else {
        // 依赖未安装
        dep.versionSatisfied = false;
        unsatisfied.push(dep);
        
        // 如果配置了自动安装，尝试安装依赖
        if (resolveOptions.autoInstall && (dep.type === DependencyType.REQUIRED || dep.type === DependencyType.OPTIONAL)) {
          try {
            const marketService = getPluginMarketService();
            const pluginInfo = await marketService.getPluginDetails(dep.pluginId);
            
            if (pluginInfo) {
              // 检查版本是否满足要求
              if (!dep.versionRange || semver.satisfies(pluginInfo.version, dep.versionRange)) {
                // 安装插件
                const pluginPackage = await marketService.getPluginPackage(dep.pluginId, pluginInfo.version);
                
                if (pluginPackage) {
                  // 获取插件管理器
                const pluginManager = (window as any).pluginManager;
                  const installed = await pluginManager.installPlugin(pluginPackage);
                  
                  if (installed) {
                    // 更新依赖状态
                    dep.installed = true;
                    dep.versionSatisfied = true;
                    
                    // 从不满足列表中移除
                    const index = unsatisfied.indexOf(dep);
                    if (index !== -1) {
                      unsatisfied.splice(index, 1);
                    }
                    
                    // 添加到满足列表
                    satisfied.push(dep);
                  }
                }
              }
            }
          } catch (error) {
            console.error(`[Plugin Dependencies] Failed to auto-install dependency ${dep.pluginId}:`, error);
          }
        }
      }
    }
    
    // 确定结果是否成功
    const requiredUnsatisfied = unsatisfied.filter(dep => dep.type === DependencyType.REQUIRED);
    const hasConflicts = conflicts.length > 0;
    
    const success = requiredUnsatisfied.length === 0 && (!resolveOptions.checkConflicts || !hasConflicts);
    
    return {
      success,
      satisfied,
      unsatisfied,
      conflicts,
      errorMessage: !success
        ? requiredUnsatisfied.length > 0
          ? `Missing required dependencies: ${requiredUnsatisfied.map(d => d.pluginId).join(', ')}`
          : hasConflicts
            ? `Conflicting dependencies: ${conflicts.map(d => d.pluginId).join(', ')}`
            : undefined
        : undefined
    };
  }
  
  /**
   * 获取插件依赖
   * @param pluginId 插件ID
   * @returns 依赖定义列表
   */
  getDependencies(pluginId: string): DependencyDefinition[] {
    return this.dependencies.get(pluginId) || [];
  }
  
  /**
   * 获取依赖插件
   * @param pluginId 插件ID
   * @returns 依赖插件ID列表
   */
  getDependentPlugins(pluginId: string): string[] {
    const result: string[] = [];
    
    this.dependencies.forEach((deps, depPluginId) => {
      deps.forEach(dep => {
        if (dep.pluginId === pluginId && dep.type !== DependencyType.CONFLICTS) {
          result.push(depPluginId);
        }
      });
    });
    
    return result;
  }
  
  /**
   * 获取插件的传递依赖
   * @param pluginId 插件ID
   * @param options 解析选项
   * @returns 依赖插件ID列表
   */
  getTransitiveDependencies(
    pluginId: string,
    options: {
      includeOptional?: boolean;
      includeRecommended?: boolean;
      includeEnhanced?: boolean;
    } = {}
  ): string[] {
    const result = new Set<string>();
    const visited = new Set<string>();
    
    // 默认选项
    const defaultOptions = {
      includeOptional: true,
      includeRecommended: false,
      includeEnhanced: false
    };
    
    const resolveOptions = { ...defaultOptions, ...options };
    
    // DFS函数
    const dfs = (nodeId: string): void => {
      if (visited.has(nodeId)) {
        return;
      }
      
      visited.add(nodeId);
      
      const deps = this.dependencies.get(nodeId) || [];
      
      deps.forEach(dep => {
        // 根据选项忽略某些类型的依赖
        if (
          dep.type === DependencyType.CONFLICTS ||
          (dep.type === DependencyType.OPTIONAL && !resolveOptions.includeOptional) ||
          (dep.type === DependencyType.RECOMMENDS && !resolveOptions.includeRecommended) ||
          (dep.type === DependencyType.ENHANCES && !resolveOptions.includeEnhanced)
        ) {
          return;
        }
        
        result.add(dep.pluginId);
        dfs(dep.pluginId);
      });
    };
    
    // 从指定插件开始DFS
    dfs(pluginId);
    
    // 移除起始插件
    result.delete(pluginId);
    
    return Array.from(result);
  }
  
  /**
   * 获取依赖图
   * @returns 依赖图
   */
  getDependencyGraph(): {
    nodes: Array<{
      pluginId: string;
      version: string;
      dependencies: DependencyDefinition[];
    }>;
    edges: Array<{
      source: string;
      target: string;
      type: DependencyType;
    }>;
  } {
    const nodes: Array<{
      pluginId: string;
      version: string;
      dependencies: DependencyDefinition[];
    }> = [];
    
    const edges: Array<{
      source: string;
      target: string;
      type: DependencyType;
    }> = [];
    
    // 添加节点
    this.dependencyGraph.nodes.forEach(node => {
      nodes.push({
        pluginId: node.pluginId,
        version: node.version,
        dependencies: node.dependencies
      });
    });
    
    // 添加边
    this.dependencies.forEach((deps, pluginId) => {
      deps.forEach(dep => {
        edges.push({
          source: pluginId,
          target: dep.pluginId,
          type: dep.type
        });
      });
    });
    
    return { nodes, edges };
  }
  
  /**
   * 获取安装顺序
   * @param pluginIds 插件ID列表
   * @returns 排序后的插件ID列表
   */
  getInstallationOrder(pluginIds: string[]): string[] {
    // 创建子图
    const subgraph: Map<string, string[]> = new Map();
    const inDegree: Map<string, number> = new Map();
    
    // 初始化
    pluginIds.forEach(id => {
      subgraph.set(id, []);
      inDegree.set(id, 0);
    });
    
    // 构建子图
    pluginIds.forEach(id => {
      const deps = this.dependencies.get(id) || [];
      
      deps.forEach(dep => {
        if (dep.type !== DependencyType.CONFLICTS && pluginIds.includes(dep.pluginId)) {
          // 添加边
          const edges = subgraph.get(dep.pluginId) || [];
          edges.push(id);
          subgraph.set(dep.pluginId, edges);
          
          // 增加入度
          inDegree.set(id, (inDegree.get(id) || 0) + 1);
        }
      });
    });
    
    // 拓扑排序
    const result: string[] = [];
    const queue: string[] = [];
    
    // 将入度为0的节点加入队列
    inDegree.forEach((degree, id) => {
      if (degree === 0) {
        queue.push(id);
      }
    });
    
    // BFS
    while (queue.length > 0) {
      const id = queue.shift()!;
      result.push(id);
      
      const edges = subgraph.get(id) || [];
      edges.forEach(targetId => {
        // 减少入度
        const newDegree = (inDegree.get(targetId) || 0) - 1;
        inDegree.set(targetId, newDegree);
        
        // 如果入度为0，加入队列
        if (newDegree === 0) {
          queue.push(targetId);
        }
      });
    }
    
    // 检查是否有环
    if (result.length !== pluginIds.length) {
      // 有环，使用原始顺序
      return pluginIds;
    }
    
    return result;
  }
}

// 创建插件依赖管理器实例
let dependencyManagerInstance: PluginDependencyManager | null = null;

/**
 * 获取插件依赖管理器实例
 * @returns 插件依赖管理器实例
 */
export function getPluginDependencyManager(): PluginDependencyManager {
  if (!dependencyManagerInstance) {
    dependencyManagerInstance = new PluginDependencyManager();
  }
  return dependencyManagerInstance;
}

/**
 * 创建插件依赖助手
 * @param pluginId 插件ID
 * @returns 依赖助手
 */
export function createPluginDependencyHelper(pluginId: string) {
  const manager = getPluginDependencyManager();
  
  return {
    /**
     * 检查依赖
     * @param options 解析选项
     * @returns 依赖解析结果
     */
    checkDependencies: (options?: DependencyResolutionOptions) => 
      manager.checkDependencies(pluginId, options),
    
    /**
     * 获取依赖
     * @returns 依赖定义列表
     */
    getDependencies: () => manager.getDependencies(pluginId),
    
    /**
     * 获取依赖插件
     * @returns 依赖插件ID列表
     */
    getDependentPlugins: () => manager.getDependentPlugins(pluginId),
    
    /**
     * 获取传递依赖
     * @param options 解析选项
     * @returns 依赖插件ID列表
     */
    getTransitiveDependencies: (options?: {
      includeOptional?: boolean;
      includeRecommended?: boolean;
      includeEnhanced?: boolean;
    }) => manager.getTransitiveDependencies(pluginId, options),
    
    /**
     * 注册依赖
     * @param dependencies 依赖定义列表
     */
    registerDependencies: (dependencies: DependencyDefinition[]) => 
      manager.registerDependencies(pluginId, dependencies),
    
    /**
     * 创建必需依赖
     * @param dependencyId 依赖插件ID
     * @param versionRange 版本范围
     * @param description 描述
     * @returns 依赖定义
     */
    createRequiredDependency: (
      dependencyId: string,
      versionRange?: string,
      description?: string
    ): DependencyDefinition => ({
      pluginId: dependencyId,
      type: DependencyType.REQUIRED,
      versionRange,
      description: description || `需要插件 ${dependencyId}${versionRange ? ` (${versionRange})` : ''}`
    }),
    
    /**
     * 创建可选依赖
     * @param dependencyId 依赖插件ID
     * @param versionRange 版本范围
     * @param description 描述
     * @returns 依赖定义
     */
    createOptionalDependency: (
      dependencyId: string,
      versionRange?: string,
      description?: string
    ): DependencyDefinition => ({
      pluginId: dependencyId,
      type: DependencyType.OPTIONAL,
      versionRange,
      description: description || `可选插件 ${dependencyId}${versionRange ? ` (${versionRange})` : ''}`
    }),
    
    /**
     * 创建冲突依赖
     * @param dependencyId 依赖插件ID
     * @param versionRange 版本范围
     * @param description 描述
     * @returns 依赖定义
     */
    createConflictDependency: (
      dependencyId: string,
      versionRange?: string,
      description?: string
    ): DependencyDefinition => ({
      pluginId: dependencyId,
      type: DependencyType.CONFLICTS,
      versionRange,
      description: description || `与插件 ${dependencyId}${versionRange ? ` (${versionRange})` : ''} 冲突`
    }),
    
    /**
     * 创建增强依赖
     * @param dependencyId 依赖插件ID
     * @param versionRange 版本范围
     * @param description 描述
     * @returns 依赖定义
     */
    createEnhanceDependency: (
      dependencyId: string,
      versionRange?: string,
      description?: string
    ): DependencyDefinition => ({
      pluginId: dependencyId,
      type: DependencyType.ENHANCES,
      versionRange,
      description: description || `增强插件 ${dependencyId}${versionRange ? ` (${versionRange})` : ''}`
    }),
    
    /**
     * 创建推荐依赖
     * @param dependencyId 依赖插件ID
     * @param versionRange 版本范围
     * @param description 描述
     * @returns 依赖定义
     */
    createRecommendDependency: (
      dependencyId: string,
      versionRange?: string,
      description?: string
    ): DependencyDefinition => ({
      pluginId: dependencyId,
      type: DependencyType.RECOMMENDS,
      versionRange,
      description: description || `推荐插件 ${dependencyId}${versionRange ? ` (${versionRange})` : ''}`
    })
  };
}
