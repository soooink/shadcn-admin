// 插件类型定义
export interface Plugin {
  id: string
  name: string
  version: string
  description: string
  author: string
  homepage?: string
  repository?: string
  license?: string
  active: boolean
  tags?: string[]
  dependencies?: string[] | PluginDependency[]
  permissions?: string[]
  icon?: string | React.ReactNode
  lastUpdated?: string
  issuesUrl?: string
  hasUpdate?: boolean
  routes?: PluginRoute[]
  menuItems?: MenuItem[]
}

// 插件依赖类型
export interface PluginDependency {
  id: string
  name: string
  version: string
  optional?: boolean
}

// 插件路由类型
export interface PluginRoute {
  path: string
  component: string | React.ComponentType
  exact?: boolean
}

// 菜单项类型
export interface MenuItem {
  id: string
  label: string
  icon?: string | React.ReactNode
  path?: string
  action?: () => void
  children?: MenuItem[]
}

// 插件包类型定义
export interface PluginPackage {
  name: string
  version: string
  description: string
  author: string
  main: string
  homepage?: string
  repository?: string
  license?: string
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  keywords?: string[]
  tags?: string[]
  permissions?: string[]
  icon?: string
}

// 插件安装状态
export type InstallStatus = 'idle' | 'uploading' | 'validating' | 'installing' | 'success' | 'error'

// 插件排序类型
export type SortType = 'name' | 'author' | 'version' | 'status' | 'custom'

// 插件排序方向
export type SortDirection = 'asc' | 'desc'

// 插件过滤器
export interface PluginFilter {
  search: string
  status: string
  tag: string
}
