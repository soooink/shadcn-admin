import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  IconAdjustmentsHorizontal,
  IconSortAscendingLetters,
  IconSortDescendingLetters,
  IconPuzzle,
  IconPlus,
  IconTag,
  IconFilter,
  IconRefresh,
  IconLoader2,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconChartBar
} from '@tabler/icons-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ThemeSwitch } from '@/components/theme-switch'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { getPluginList } from './data/plugins'
import { activatePlugin, deactivatePlugin, uninstallPlugin } from '@/core/plugin-system'
import { Plugin, SortType, SortDirection } from '@/types/plugin-types'
import { recordPluginUsage } from './utils/plugin-stats'

import { PluginCard } from './components/plugin-card'
import { PluginDetailsDialog } from './components/plugin-details-dialog'
import { PluginInstallDialog } from './components/plugin-install-dialog'
import { PluginGroups } from './components/plugin-groups'
import { PluginStats } from './components/plugin-stats'

// 插件标签映射
const tagLabels: Record<string, string> = {
  'all': '所有标签',
  'ui': 'UI',
  'data': '数据',
  'utility': '工具',
  'integration': '集成',
  'theme': '主题',
  'analytics': '分析',
  'development': '开发',
  'system': '系统',
  'experimental': '实验性'
}

export default function Plugins() {
  const { t } = useTranslation('plugins')
  
  // 基础状态管理
  const [plugins, setPlugins] = useState<Plugin[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortType>('name')
  const [sortOrder, setSortOrder] = useState<SortDirection>('asc')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all')
  const [tagFilter, setTagFilter] = useState<string>('all')
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(9)
  
  // 对话框状态
  const [isInstallOpen, setIsInstallOpen] = useState(false)
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  
  // 拖放排序状态
  const [draggedPlugin, setDraggedPlugin] = useState<string | null>(null)
  const [customOrder, setCustomOrder] = useState<string[]>([])
  const [isCustomOrder, setIsCustomOrder] = useState(false)
  
  // 状态管理
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)
  const [showStats, setShowStats] = useState(false)
  
  // 刷新插件列表
  const refreshPlugins = async () => {
    setIsLoading(true)
    try {
      const pluginList = await getPluginList()
      setPlugins(pluginList)
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('加载插件列表失败:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // 组件挂载时加载插件列表
  useEffect(() => {
    refreshPlugins()
  }, [])
  
  // 加载自定义排序
  useEffect(() => {
    // 从本地存储中加载自定义排序
    try {
      const savedOrder = localStorage.getItem('plugin-custom-order')
      if (savedOrder) {
        const orderData = JSON.parse(savedOrder)
        setCustomOrder(orderData)
      }
    } catch (_error) {
      // 忽略错误，使用默认排序
      // eslint-disable-next-line no-console
      console.warn('加载插件自定义排序失败')
    }
  }, [])
  
  // 过滤和排序插件
  const filteredAndSortedPlugins = useMemo(() => {
    // 首先根据分组过滤
    let filteredPlugins = [...plugins]
    
    if (selectedGroupId) {
      // 从本地存储加载分组信息
      try {
        const savedGroups = localStorage.getItem('plugin-groups')
        if (savedGroups) {
          const groups = JSON.parse(savedGroups)
          const group = groups.find((g: {id: string; pluginIds: string[]}) => g.id === selectedGroupId)
          if (group) {
            filteredPlugins = filteredPlugins.filter(plugin => 
              group.pluginIds.includes(plugin.id)
            )
          }
        }
      } catch (_error) {
        // 忽略错误
      }
    }
    
    // 然后应用其他过滤条件
    filteredPlugins = filteredPlugins.filter(plugin => {
      // 搜索词过滤
      const matchesSearch = searchTerm === '' || 
        plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plugin.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plugin.author.toLowerCase().includes(searchTerm.toLowerCase())
      
      // 状态过滤
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && plugin.active) ||
        (statusFilter === 'inactive' && !plugin.active)
      
      // 标签过滤
      const matchesTag = tagFilter === 'all' || 
        (plugin.tags && plugin.tags.includes(tagFilter))
      
      return matchesSearch && matchesStatus && matchesTag
    })
    
    // 最后排序
    return filteredPlugins.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'author':
          comparison = a.author.localeCompare(b.author)
          break
        case 'version':
          comparison = a.version.localeCompare(b.version)
          break
        case 'status':
          comparison = Number(b.active) - Number(a.active)
          break
        default:
          comparison = a.name.localeCompare(b.name)
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [plugins, searchTerm, sortBy, sortOrder, statusFilter, tagFilter, selectedGroupId])
  
  // 获取当前页的插件，应用自定义排序
  const currentPagePlugins = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    
    // 应用自定义排序
    const applyCustomOrder = (plugins: Plugin[]) => {
      if (customOrder.length === 0) return plugins
      
      return [...plugins].sort((a, b) => {
        const indexA = customOrder.indexOf(a.id)
        const indexB = customOrder.indexOf(b.id)
        
        // 如果两个插件都在自定义排序中
        if (indexA !== -1 && indexB !== -1) {
          return indexA - indexB
        }
        
        // 如果只有一个插件在自定义排序中
        if (indexA !== -1) return -1
        if (indexB !== -1) return 1
        
        // 如果都不在，保持原排序
        return 0
      })
    }
    
    const orderedPlugins = isCustomOrder 
      ? applyCustomOrder(filteredAndSortedPlugins) 
      : filteredAndSortedPlugins
    return orderedPlugins.slice(startIndex, startIndex + pageSize)
  }, [filteredAndSortedPlugins, currentPage, pageSize, isCustomOrder, customOrder])
  
  // 确保当前页在有效范围内
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredAndSortedPlugins.length / pageSize))
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [filteredAndSortedPlugins, pageSize, currentPage])
  
  // 切换插件启用状态
  const togglePlugin = async (pluginId: string, isActive: boolean) => {
    try {
      if (isActive) {
        await activatePlugin(pluginId)
        // 记录插件启用
        recordPluginUsage(pluginId, 'activate')
      } else {
        await deactivatePlugin(pluginId)
        // 记录插件禁用
        recordPluginUsage(pluginId, 'deactivate')
      }
      
      // 更新插件列表
      setPlugins(prevPlugins => 
        prevPlugins.map(plugin => 
          plugin.id === pluginId 
            ? { ...plugin, active: isActive } 
            : plugin
        )
      )
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`${isActive ? '启用' : '禁用'}插件失败:`, error)
    }
  }
  
  // 查看插件详情
  const handleViewDetails = (pluginId: string) => {
    const plugin = plugins.find(p => p.id === pluginId)
    if (plugin) {
      // 记录插件查看
      recordPluginUsage(pluginId, 'open')
      setSelectedPlugin(plugin)
      setIsDetailsOpen(true)
    }
  }
  
  // 卸载插件
  const handleUninstallPlugin = async (pluginId: string) => {
    try {
      await uninstallPlugin(pluginId)
      // 更新插件列表
      setPlugins(prevPlugins => prevPlugins.filter(plugin => plugin.id !== pluginId))
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('卸载插件失败:', error)
    }
  }
  
  // 更新插件
  const handleUpdatePlugin = (_pluginId: string) => {
    // 打开安装对话框，预设为更新模式
    setIsInstallOpen(true)
  }
  
  // 配置插件
  const handleConfigurePlugin = (pluginId: string) => {
    // 记录插件配置
    recordPluginUsage(pluginId, 'configure')
    // 实现插件配置逻辑
  }
  
  // 拖放相关函数
  const handleDragStart = (pluginId: string) => {
    setDraggedPlugin(pluginId)
  }
  
  const handleDragOver = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault()
  }
  
  const handleDrop = (targetPluginId: string) => {
    if (!draggedPlugin || draggedPlugin === targetPluginId) return
    
    // 更新自定义排序
    const updatedOrder = [...customOrder]
    
    // 如果还没有自定义排序，则初始化为当前插件顺序
    if (updatedOrder.length === 0) {
      currentPagePlugins.forEach(plugin => {
        updatedOrder.push(plugin.id)
      })
    }
    
    // 如果拖放的插件不在自定义排序中，则添加
    if (!updatedOrder.includes(draggedPlugin)) {
      updatedOrder.push(draggedPlugin)
    }
    if (!updatedOrder.includes(targetPluginId)) {
      updatedOrder.push(targetPluginId)
    }
    
    // 移动拖放的插件到目标位置
    const draggedIndex = updatedOrder.indexOf(draggedPlugin)
    const targetIndex = updatedOrder.indexOf(targetPluginId)
    
    updatedOrder.splice(draggedIndex, 1)
    updatedOrder.splice(targetIndex, 0, draggedPlugin)
    
    // 更新状态并保存到本地存储
    setCustomOrder(updatedOrder)
    setIsCustomOrder(true)
    localStorage.setItem('plugin-custom-order', JSON.stringify(updatedOrder))
    
    // 显示成功提示
    const toast = document.getElementById('toast-container')
    if (toast) {
      toast.innerHTML = `<div class="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg transition-opacity duration-500">${t('orderSaved')}</div>`
      setTimeout(() => {
        toast.innerHTML = ''
      }, 2000)
    }
    
    // 清除拖放状态
    setDraggedPlugin(null)
  }
  
  const handleDragEnd = () => {
    setDraggedPlugin(null)
  }
  
  // 处理分组选择
  const handleGroupSelect = (groupId: string | null) => {
    setSelectedGroupId(groupId)
    setCurrentPage(1) // 重置到第一页
  }
  
  // 切换侧边栏
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }
  
  // 计算总页数
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedPlugins.length / pageSize))
  
  return (
    <>
      {/* 提示容器 */}
      <div id="toast-container"></div>
      
      {/* ===== 顶部导航 ===== */}
      <Header>
        <div className="flex items-center gap-4">
          <IconPuzzle size={24} />
          <h1 className="text-xl font-semibold">{t('pluginManagement')}</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeSwitch />
          <LanguageSwitcher />
          <ProfileDropdown />
        </div>
      </Header>
      
      <div className="flex">
        {/* ===== 侧边栏 ===== */}
        {isSidebarOpen && (
          <div className="w-64 border-r p-4 h-[calc(100vh-64px)]">
            <PluginGroups 
              plugins={plugins}
              onSelectGroup={handleGroupSelect}
              selectedGroupId={selectedGroupId}
            />
          </div>
        )}
        
        {/* ===== 主内容区 ===== */}
        <Main className={`flex-1 ${isSidebarOpen ? 'ml-0' : 'ml-0'}`}>
          <div className="flex items-center mb-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleSidebar}
              className="mr-2"
            >
              {isSidebarOpen 
                ? <IconLayoutSidebarLeftCollapse className="h-5 w-5" /> 
                : <IconLayoutSidebarLeftExpand className="h-5 w-5" />
              }
            </Button>
            
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">
                {t('manageYourPluginsAndTheirSettings')}
              </p>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowStats(!showStats)}
              className="ml-auto mr-2"
            >
              <IconChartBar className="h-4 w-4 mr-2" />
              {showStats ? t('hideStats') : t('showStats')}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshPlugins}
              disabled={isLoading}
              className="mr-2"
            >
              {isLoading ? (
                <IconLoader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <IconRefresh className="h-4 w-4 mr-2" />
              )}
              {t('refreshPluginList')}
            </Button>
            
            <Button onClick={() => setIsInstallOpen(true)}>
              <IconPlus size={16} className="mr-2" />
              {t('installNewPlugin')}
            </Button>
          </div>
          
          {/* ===== 过滤和排序控件 ===== */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <Input
                placeholder={t('searchPlugins')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <IconAdjustmentsHorizontal size={18} />
              <Select value={sortBy} onValueChange={(value: SortType) => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue placeholder={t('sortBy')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">{t('byName')}</SelectItem>
                  <SelectItem value="author">{t('byAuthor')}</SelectItem>
                  <SelectItem value="version">{t('byVersion')}</SelectItem>
                  <SelectItem value="status">{t('byStatus')}</SelectItem>
                </SelectContent>
              </Select>
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      {sortOrder === 'asc' ? (
                        <IconSortAscendingLetters size={18} />
                      ) : (
                        <IconSortDescendingLetters size={18} />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {sortOrder === 'asc' ? t('ascending') : t('descending')}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            <div className="flex items-center gap-2">
              <IconFilter size={18} />
              <Select 
                value={statusFilter} 
                onValueChange={(value: 'active' | 'inactive' | 'all') => setStatusFilter(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('allStatuses')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatuses')}</SelectItem>
                  <SelectItem value="active">{t('active')}</SelectItem>
                  <SelectItem value="inactive">{t('inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <IconTag size={18} />
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('allTags')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allTags')}</SelectItem>
                  {Object.entries(tagLabels).filter(([key]) => key !== 'all').map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <Separator className="mb-6" />
          
          {/* ===== 插件使用统计 ===== */}
          {showStats && (
            <div className="mb-6">
              <PluginStats 
                plugins={plugins} 
                onApplyRecommendedOrder={handleApplyRecommendedOrder} 
              />
            </div>
          )}
          
          {/* ===== 自定义排序控件 ===== */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant={isCustomOrder ? "default" : "outline"}
                size="sm"
                onClick={() => setIsCustomOrder(false)}
              >
                {t('defaultOrder')}
              </Button>
              <Button
                variant={isCustomOrder ? "outline" : "default"}
                size="sm"
                onClick={() => setIsCustomOrder(true)}
              >
                {t('customOrder')}
              </Button>
              {isCustomOrder && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCustomOrder([])
                    localStorage.removeItem('plugin-custom-order')
                  }}
                >
                  {t('resetOrder')}
                </Button>
              )}
            </div>
            
            {isCustomOrder && (
              <p className="text-sm text-muted-foreground">
                {t('dragToReorder')}
              </p>
            )}
          </div>
          
          {/* ===== 插件列表 ===== */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="border rounded-lg p-4 h-[200px]">
                  <div className="flex justify-between mb-2">
                    <Skeleton className="h-6 w-1/2" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <Skeleton className="h-4 w-1/3 mb-4" />
                  <Skeleton className="h-20 w-full mb-4" />
                  <div className="flex justify-end gap-2">
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-9 w-9" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {filteredAndSortedPlugins.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">{t('noPluginsFound')}</p>
                </div>
              ) : (
                <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentPagePlugins.map(plugin => (
                    <li 
                      key={plugin.id}
                      draggable={isCustomOrder}
                      onDragStart={() => handleDragStart(plugin.id)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(plugin.id)}
                      onDragEnd={handleDragEnd}
                      className={`transition-opacity ${draggedPlugin === plugin.id ? 'opacity-50' : 'opacity-100'}`}
                    >
                      <PluginCard
                        plugin={plugin}
                        onToggle={togglePlugin}
                        onConfigure={handleConfigurePlugin}
                        onUninstall={handleUninstallPlugin}
                        onUpdate={handleUpdatePlugin}
                        onViewDetails={handleViewDetails}
                      />
                    </li>
                  ))}
                </ul>
              )}
              
              {/* ===== 分页控件 ===== */}
              {totalPages > 1 && (
                <div className="flex flex-col md:flex-row justify-center items-center gap-2 mt-4 mb-2">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      {t('previous')}
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(totalPages, 5) }).map((_, index) => {
                        // 计算页码显示逻辑，确保当前页在中间
                        let pageNum = index + 1
                        if (totalPages > 5) {
                          if (currentPage > 3) {
                            pageNum = currentPage - 3 + index
                          }
                          if (pageNum > totalPages - 4 && index < 4) {
                            pageNum = totalPages - 4 + index
                          }
                          if (pageNum < 1) pageNum = 1
                          if (pageNum > totalPages) pageNum = totalPages
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                    >
                      {t('next')}
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{t('itemsPerPage')}:</span>
                    <Select 
                      value={String(pageSize)} 
                      onValueChange={(value) => {
                        const newSize = parseInt(value, 10)
                        setPageSize(newSize)
                        // 重置到第一页，避免页码越界
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="w-16 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="6">6</SelectItem>
                        <SelectItem value="9">9</SelectItem>
                        <SelectItem value="12">12</SelectItem>
                        <SelectItem value="24">24</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          )}
        </Main>
      </div>
      
      {/* ===== 对话框 ===== */}
      <PluginDetailsDialog
        plugin={selectedPlugin}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />
      
      <PluginInstallDialog
        open={isInstallOpen}
        onOpenChange={setIsInstallOpen}
        onInstallSuccess={refreshPlugins}
      />
    </>
  )
}
