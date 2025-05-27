import { Plugin } from '@/types/plugin-types'

// 插件使用统计类型
export interface PluginUsageStats {
  id: string
  usageCount: number
  lastUsed: string
  averageDuration?: number
  totalDuration?: number
}

// 插件使用记录类型
export interface PluginUsageRecord {
  pluginId: string
  timestamp: string
  duration?: number
  action: 'open' | 'close' | 'configure' | 'activate' | 'deactivate'
}

// 获取所有插件的使用统计
export function getPluginUsageStats(): Record<string, PluginUsageStats> {
  try {
    const stats = localStorage.getItem('plugin-usage-stats')
    return stats ? JSON.parse(stats) : {}
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('无法加载插件使用统计', error)
    return {}
  }
}

// 保存插件使用统计
export function savePluginUsageStats(stats: Record<string, PluginUsageStats>): void {
  try {
    localStorage.setItem('plugin-usage-stats', JSON.stringify(stats))
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('无法保存插件使用统计', error)
  }
}

// 记录插件使用
export function recordPluginUsage(pluginId: string, action: PluginUsageRecord['action'], duration?: number): void {
  const now = new Date().toISOString()
  const stats = getPluginUsageStats()
  
  // 更新或创建插件统计
  if (!stats[pluginId]) {
    stats[pluginId] = {
      id: pluginId,
      usageCount: 0,
      lastUsed: now,
      totalDuration: 0
    }
  }
  
  // 更新统计数据
  stats[pluginId].usageCount += 1
  stats[pluginId].lastUsed = now
  
  if (duration) {
    const totalDuration = (stats[pluginId].totalDuration || 0) + duration
    stats[pluginId].totalDuration = totalDuration
    stats[pluginId].averageDuration = totalDuration / stats[pluginId].usageCount
  }
  
  // 保存使用记录
  const records = getPluginUsageRecords()
  records.push({
    pluginId,
    timestamp: now,
    duration,
    action
  })
  
  // 只保留最近100条记录
  if (records.length > 100) {
    records.shift()
  }
  
  // 保存数据
  savePluginUsageStats(stats)
  savePluginUsageRecords(records)
}

// 获取插件使用记录
export function getPluginUsageRecords(): PluginUsageRecord[] {
  try {
    const records = localStorage.getItem('plugin-usage-records')
    return records ? JSON.parse(records) : []
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('无法加载插件使用记录', error)
    return []
  }
}

// 保存插件使用记录
export function savePluginUsageRecords(records: PluginUsageRecord[]): void {
  try {
    localStorage.setItem('plugin-usage-records', JSON.stringify(records))
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('无法保存插件使用记录', error)
  }
}

// 获取最常用的插件
export function getMostUsedPlugins(plugins: Plugin[], limit: number = 5): Plugin[] {
  const stats = getPluginUsageStats()
  
  // 根据使用次数对插件进行排序
  return [...plugins]
    .filter(plugin => stats[plugin.id]) // 只包含有使用记录的插件
    .sort((a, b) => {
      const statsA = stats[a.id]
      const statsB = stats[b.id]
      return statsB.usageCount - statsA.usageCount
    })
    .slice(0, limit)
}

// 获取最近使用的插件
export function getRecentlyUsedPlugins(plugins: Plugin[], limit: number = 5): Plugin[] {
  const stats = getPluginUsageStats()
  
  // 根据最后使用时间对插件进行排序
  return [...plugins]
    .filter(plugin => stats[plugin.id]) // 只包含有使用记录的插件
    .sort((a, b) => {
      const statsA = stats[a.id]
      const statsB = stats[b.id]
      return new Date(statsB.lastUsed).getTime() - new Date(statsA.lastUsed).getTime()
    })
    .slice(0, limit)
}

// 获取推荐的插件排序
export function getRecommendedPluginOrder(plugins: Plugin[]): string[] {
  const stats = getPluginUsageStats()
  
  // 创建一个包含所有插件ID的数组
  const allPluginIds = plugins.map(plugin => plugin.id)
  
  // 根据使用频率和最近使用时间计算插件的权重
  const weightedPlugins = plugins
    .map(plugin => {
      const stat = stats[plugin.id]
      if (!stat) {
        return { id: plugin.id, weight: 0 }
      }
      
      // 使用频率权重 (70%) + 最近使用权重 (30%)
      const usageWeight = stat.usageCount / Math.max(...Object.values(stats).map(s => s.usageCount) || [1])
      const recencyWeight = 1 - ((new Date().getTime() - new Date(stat.lastUsed).getTime()) / (30 * 24 * 60 * 60 * 1000))
      
      return {
        id: plugin.id,
        weight: (usageWeight * 0.7) + (Math.max(0, recencyWeight) * 0.3)
      }
    })
    .sort((a, b) => b.weight - a.weight)
  
  // 提取排序后的插件ID
  const orderedIds = weightedPlugins.map(p => p.id)
  
  // 确保所有插件都包含在结果中
  const missingIds = allPluginIds.filter(id => !orderedIds.includes(id))
  
  return [...orderedIds, ...missingIds]
}
