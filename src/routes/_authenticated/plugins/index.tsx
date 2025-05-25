import { createFileRoute } from '@tanstack/react-router'
import { getPlugins, isPluginActive, activatePlugin, deactivatePlugin } from '@/core/plugin-system'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useTranslation } from 'react-i18next'

export const Route = createFileRoute('/_authenticated/plugins/')({
  component: PluginsManagement,
})

function PluginsManagement() {
  const { t } = useTranslation()
  const [plugins] = useState(getPlugins())
  const [activePlugins, setActivePlugins] = useState<Record<string, boolean>>({})

  // 初始化插件激活状态
  useEffect(() => {
    const activeState: Record<string, boolean> = {}
    plugins.forEach(plugin => {
      activeState[plugin.id] = isPluginActive(plugin.id)
    })
    setActivePlugins(activeState)
  }, [plugins])

  // 切换插件激活状态
  const togglePluginActive = async (pluginId: string) => {
    try {
      if (activePlugins[pluginId]) {
        await deactivatePlugin(pluginId)
      } else {
        await activatePlugin(pluginId)
      }
      
      // 更新状态
      setActivePlugins(prev => ({
        ...prev,
        [pluginId]: !prev[pluginId]
      }))
    } catch (error) {
      console.error('Failed to toggle plugin:', error)
    }
  }

  // 打开插件页面
  const openPluginPage = (pluginId: string) => {
    window.location.href = `/plugins/${pluginId}`
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">{t('plugins.management') || '插件管理'}</h1>
      <p className="text-muted-foreground mb-8">
        {t('plugins.description') || '管理系统中已安装的插件，启用或禁用功能。'}
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plugins.map(plugin => (
          <Card key={plugin.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{plugin.name}</CardTitle>
                  <CardDescription className="mt-1">v{plugin.version}</CardDescription>
                </div>
                <Switch 
                  checked={activePlugins[plugin.id] || false}
                  onCheckedChange={() => togglePluginActive(plugin.id)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{plugin.description}</p>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                variant="outline" 
                size="sm"
                disabled={!activePlugins[plugin.id]}
                onClick={() => openPluginPage(plugin.id)}
              >
                {t('plugins.open') || '打开'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
