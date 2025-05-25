import { createFileRoute } from '@tanstack/react-router'
import { getPlugins, isPluginActive, activatePlugin, deactivatePlugin } from '@/core/plugin-system'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useTranslation } from 'react-i18next'
import { PluginLayout } from '@/plugins/common/plugin-layout'
import { IconSettings } from '@tabler/icons-react'

export const Route = createFileRoute('/_authenticated/plugins/')({
  component: PluginsManagement,
})

function PluginsManagement() {
  const { t } = useTranslation()
  const [plugins] = useState(getPlugins())
  const [activePlugins, setActivePlugins] = useState<Record<string, boolean>>({})
  
  // 定义插件管理页面的顶部导航链接
  const navLinks = [
    {
      title: t('plugins.installed', '已安装'),
      href: '/plugins',
      isActive: true,
      disabled: false,
    },
    {
      title: t('plugins.store', '插件商店'),
      href: '/plugins/store',
      isActive: false,
      disabled: false,
    },
    {
      title: t('plugins.settings', '插件设置'),
      href: '/plugins/settings',
      isActive: false,
      disabled: false, // 启用插件设置链接
    },
  ]

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
    <PluginLayout title={t('plugins.management', '插件管理')} navLinks={navLinks}>
      <div className="container px-0 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <p className="text-muted-foreground mb-4 sm:mb-0">
            {t('plugins.description', '管理系统中已安装的插件，启用或禁用功能。')}
          </p>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/plugins/settings'}
            className="flex items-center gap-2"
          >
            <IconSettings className="h-4 w-4" />
            {t('plugins.goToSettings', '插件设置')}
          </Button>
        </div>
      
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
    </PluginLayout>
  )
}
