import { createFileRoute } from '@tanstack/react-router'
import { getPlugins, isPluginActive, activatePlugin, deactivatePlugin } from '@/core/plugin-system'
import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useTranslation } from 'react-i18next'
import { PluginLayout } from '@/features/plugins/common/plugin-layout'
import { IconSettings } from '@tabler/icons-react'
import { PluginBatchOperations } from '@/features/plugins/components/plugin-batch-operations'
import { PluginUpdateDialog } from '@/features/plugins/components/plugin-update-dialog'
import { PluginExportDialog } from '@/features/plugins/components/plugin-export-dialog'
import { PluginCloudSync } from '@/features/plugins/components/plugin-cloud-sync'
import { Plugin as PluginType } from '@/types/plugin-types'

export const Route = createFileRoute('/_authenticated/plugins/')({
  component: PluginsManagement,
})

function PluginsManagement() {
  const { t } = useTranslation('plugins')
  const [plugins] = useState(getPlugins())
  const [activePlugins, setActivePlugins] = useState<Record<string, boolean>>({})
  const [selectedPluginIds, setSelectedPluginIds] = useState<string[]>([])
  
  // 对话框状态
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)
  const [isCloudSyncOpen, setIsCloudSyncOpen] = useState(false)
  
  // 更新相关状态
  const [pluginsToUpdate, setPluginsToUpdate] = useState<PluginType[]>([])
  const [updatingPlugins, setUpdatingPlugins] = useState(false)
  
  // 将系统插件转换为组件需要的插件类型
  const compatiblePlugins = useMemo<PluginType[]>(() => {
    return plugins.map(plugin => ({
      ...plugin,
      active: activePlugins[plugin.id] || false
    })) as PluginType[]
  }, [plugins, activePlugins])
  
  // 更新相关函数 - 直接在组件中实现

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
    } catch (_error) {
      // 错误处理
      alert(t('operationFailed'))
    }
  }
  
  // 批量操作相关函数
  const handleToggleSelectAll = () => {
    if (selectedPluginIds.length === plugins.length) {
      setSelectedPluginIds([])
    } else {
      setSelectedPluginIds(plugins.map(p => p.id))
    }
  }
  
  const handleClearSelection = () => {
    setSelectedPluginIds([])
  }
  
  const handleEnableSelected = async () => {
    try {
      for (const id of selectedPluginIds) {
        if (!activePlugins[id]) {
          await activatePlugin(id)
          setActivePlugins(prev => ({
            ...prev,
            [id]: true
          }))
        }
      }
      alert(t('operationSuccess'))
    } catch (_error) {
      alert(t('operationFailed'))
    }
  }
  
  const handleDisableSelected = async () => {
    try {
      for (const id of selectedPluginIds) {
        if (activePlugins[id]) {
          await deactivatePlugin(id)
          setActivePlugins(prev => ({
            ...prev,
            [id]: false
          }))
        }
      }
      alert(t('operationSuccess'))
    } catch (_error) {
      alert(t('operationFailed'))
    }
  }
  
  const handleAddSelectedToGroup = (groupId: string) => {
    alert(`添加到分组 ${groupId} 功能待实现`)
  }
  
  const handleRemoveSelectedFromGroup = (groupId: string) => {
    alert(`从分组 ${groupId} 移除功能待实现`)
  }
  
  const handleCheckUpdates = () => {
    // 模拟检查更新
    setPluginsToUpdate(compatiblePlugins.filter(p => selectedPluginIds.includes(p.id)))
    setIsUpdateDialogOpen(true)
  }
  
  const handleExportConfig = () => {
    setIsExportDialogOpen(true)
  }
  
  const handleSyncToCloud = () => {
    setIsCloudSyncOpen(true)
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
            {t('description', '管理系统中已安装的插件，启用或禁用功能。')}
          </p>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/plugins/settings'}
            className="flex items-center gap-2"
          >
            <IconSettings className="h-4 w-4" />
            {t('goToSettings', '插件设置')}
          </Button>
        </div>
        
        {/* 批量操作组件 */}
        <div className="mb-6">
          <PluginBatchOperations
            plugins={compatiblePlugins}
            selectedPluginIds={selectedPluginIds}
            onToggleAll={handleToggleSelectAll}
            onClearSelection={handleClearSelection}
            onEnableSelected={handleEnableSelected}
            onDisableSelected={handleDisableSelected}
            onAddToGroup={handleAddSelectedToGroup}
            onRemoveFromGroup={handleRemoveSelectedFromGroup}
            onUpdateSelected={handleCheckUpdates}
            onExportSelected={handleExportConfig}
            onSyncToCloud={handleSyncToCloud}
            selectedGroupId=""
          />
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

      {/* 插件更新对话框 */}
      <PluginUpdateDialog
        open={isUpdateDialogOpen}
        onOpenChange={setIsUpdateDialogOpen}
        plugins={pluginsToUpdate}
        onUpdateSuccess={(updatedPlugins) => {
          setUpdatingPlugins(false)
          setIsUpdateDialogOpen(false)
          alert(t('batchOperations.updateSuccess', { count: updatedPlugins.length }))
        }}
        onUpdateError={(error) => {
          setUpdatingPlugins(false)
          alert(error.message || t('batchOperations.updateFailed'))
        }}
        isUpdating={updatingPlugins}
      />

      {/* 插件导出对话框 */}
      <PluginExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        plugins={compatiblePlugins.filter(p => selectedPluginIds.includes(p.id))}
        selectedPluginIds={selectedPluginIds}
        onExportSuccess={() => {
          setIsExportDialogOpen(false)
          alert(t('exportDialog.exportSuccess'))
        }}
        onExportError={(error) => {
          alert(error)
        }}
        onImportSuccess={() => {
          setIsExportDialogOpen(false)
          alert(t('importDialog.importSuccess'))
        }}
        onImportError={(error) => {
          alert(error)
        }}
      />

      {/* 插件云同步对话框 */}
      <PluginCloudSync
        isOpen={isCloudSyncOpen}
        onClose={() => setIsCloudSyncOpen(false)}
        onSyncSuccess={() => {
          alert(t('cloudSync.syncSuccess'))
        }}
        onSyncError={(error) => {
          alert(error)
        }}
      />
    </PluginLayout>
  )
}
