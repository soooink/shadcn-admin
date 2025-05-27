import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  getPluginUsageStats, 
  getMostUsedPlugins, 
  getRecentlyUsedPlugins,
  getRecommendedPluginOrder
} from '../utils/plugin-stats'
import { Plugin } from '@/types/plugin-types'

interface PluginStatsProps {
  plugins: Plugin[]
  onApplyRecommendedOrder: (order: string[]) => void
}

export function PluginStats({ plugins, onApplyRecommendedOrder }: PluginStatsProps) {
  const { t } = useTranslation('plugins')
  const [activeTab, setActiveTab] = useState('usage')
  const [mostUsed, setMostUsed] = useState<Plugin[]>([])
  const [recentlyUsed, setRecentlyUsed] = useState<Plugin[]>([])
  const [usageData, setUsageData] = useState<Array<{name: string, count: number}>>([])
  
  // 加载插件使用统计数据
  useEffect(() => {
    if (plugins.length === 0) return
    
    // 获取最常用的插件
    const mostUsedPlugins = getMostUsedPlugins(plugins, 5)
    setMostUsed(mostUsedPlugins)
    
    // 获取最近使用的插件
    const recentPlugins = getRecentlyUsedPlugins(plugins, 5)
    setRecentlyUsed(recentPlugins)
    
    // 准备图表数据
    const stats = getPluginUsageStats()
    const chartData = mostUsedPlugins.map(plugin => ({
      name: plugin.name,
      count: stats[plugin.id]?.usageCount || 0
    }))
    
    setUsageData(chartData)
  }, [plugins])
  
  // 应用推荐排序
  const handleApplyRecommendedOrder = () => {
    const recommendedOrder = getRecommendedPluginOrder(plugins)
    onApplyRecommendedOrder(recommendedOrder)
    
    // 显示成功提示
    const toast = document.getElementById('toast-container')
    if (toast) {
      toast.innerHTML = `<div class="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg transition-opacity duration-500">${t('recommendedOrderApplied')}</div>`
      setTimeout(() => {
        toast.innerHTML = ''
      }, 2000)
    }
  }
  
  // 如果没有使用记录，显示空状态
  if (mostUsed.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('pluginUsageStats')}</CardTitle>
          <CardDescription>{t('noUsageDataYet')}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-6">
          <p className="text-center text-muted-foreground mb-4">
            {t('startUsingPlugins')}
          </p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('pluginUsageStats')}</CardTitle>
        <CardDescription>{t('trackPluginUsage')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="usage">{t('usageStats')}</TabsTrigger>
            <TabsTrigger value="recent">{t('recentlyUsed')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="usage" className="space-y-4">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usageData} layout="vertical">
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} />
                  <RechartsTooltip 
                    formatter={(value: number, _name: string) => [
                      `${value} ${t('usageCount')}`, 
                      t('usageFrequency')
                    ]}
                  />
                  <Bar dataKey="count" fill="#8884d8">
                    {usageData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={`hsl(${index * 45 + 200}, 70%, 50%)`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4">
              <Button onClick={handleApplyRecommendedOrder}>
                {t('applyRecommendedOrder')}
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                {t('recommendedOrderDescription')}
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="recent">
            <ScrollArea className="h-[250px]">
              <div className="space-y-4">
                {recentlyUsed.map(plugin => {
                  const stats = getPluginUsageStats()[plugin.id]
                  return (
                    <div key={plugin.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <h4 className="font-medium">{plugin.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {t('lastUsed')}: {new Date(stats.lastUsed).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium">
                          {stats.usageCount} {t('uses')}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
