import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { RefreshCw, Check, AlertCircle } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

import { Plugin } from '@/types/plugin-types'

interface PluginUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  plugins: Plugin[]
  onUpdateSuccess?: (updatedPlugins: Plugin[]) => void
  onUpdateError?: (error: Error) => void
  isUpdating?: boolean
}

interface PluginUpdateStatus {
  id: string
  name: string
  currentVersion: string
  newVersion?: string
  status: 'pending' | 'updating' | 'success' | 'error'
  selected: boolean
}

export function PluginUpdateDialog({
  open,
  onOpenChange,
  plugins,
  onUpdateSuccess,
  onUpdateError,
  isUpdating: externalIsUpdating = false
}: PluginUpdateDialogProps) {
  const { t } = useTranslation('plugins')
  const [isChecking, setIsChecking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [updateStatus, setUpdateStatus] = useState<PluginUpdateStatus[]>([])
  const [internalIsUpdating, setInternalIsUpdating] = useState(false)
  
  // 实际的更新状态
  const isUpdating = externalIsUpdating || internalIsUpdating
  
  // 检查更新
  const handleCheckUpdates = useCallback(async () => {
    setIsChecking(true)
    setProgress(0)
    
    try {
      // 模拟检查更新
      // 在真实环境中，这里应该调用后端 API
      const updatableIds: Record<string, string> = {}
      plugins.forEach(plugin => {
        // 模拟 50% 的插件有更新
        if (Math.random() > 0.5) {
          const currentVersion = plugin.version.split('.')
          const newPatch = parseInt(currentVersion[2]) + 1
          updatableIds[plugin.id] = `${currentVersion[0]}.${currentVersion[1]}.${newPatch}`
        }
      })
      
      // 更新状态
      setUpdateStatus(prev => 
        plugins.map(plugin => {
          const existingStatus = prev.find(s => s.id === plugin.id)
          if (updatableIds[plugin.id]) {
            return {
              id: plugin.id,
              name: plugin.name,
              currentVersion: plugin.version,
              newVersion: updatableIds[plugin.id],
              status: 'pending',
              selected: existingStatus?.selected ?? true
            }
          }
          return {
            id: plugin.id,
            name: plugin.name,
            currentVersion: plugin.version,
            status: 'pending',
            selected: existingStatus?.selected ?? true
          }
        })
      )
    } catch (error) {
      // 错误处理
      if (onUpdateError && error instanceof Error) {
        onUpdateError(error)
      }
    } finally {
      setIsChecking(false)
      setProgress(100)
    }
  }, [plugins, onUpdateError]);
  
  // 初始化
  useEffect(() => {
    if (open) {
      // 初始化状态
      setUpdateStatus(
        plugins.map(plugin => ({
          id: plugin.id,
          name: plugin.name,
          currentVersion: plugin.version,
          status: 'pending',
          selected: true
        }))
      )
      
      // 自动检查更新
      handleCheckUpdates()
    }
  }, [open, plugins, handleCheckUpdates])
  
  // 更新插件
  const handleUpdatePlugins = async () => {
    const selectedIds = updateStatus
      .filter(s => s.selected && s.newVersion)
      .map(s => s.id)
      
    if (selectedIds.length === 0) {
      if (onUpdateError) {
        onUpdateError(new Error(t('noPluginsSelected')))
      }
      return
    }
    
    setInternalIsUpdating(true)
    setProgress(0)
    
    try {
      // 更新状态为更新中
      setUpdateStatus(prev => 
        prev.map(status => {
          if (selectedIds.includes(status.id)) {
            return { ...status, status: 'updating' }
          }
          return status
        })
      )
      
      // 模拟更新过程
      for (let i = 0; i <= 100; i += 10) {
        setProgress(i)
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      // 模拟API调用结果
      const updatedPlugins = plugins.filter(p => selectedIds.includes(p.id))
      
      // 更新状态为成功
      setUpdateStatus(prev => 
        prev.map(status => {
          if (selectedIds.includes(status.id)) {
            return { 
              ...status, 
              status: 'success',
              currentVersion: status.newVersion || status.currentVersion 
            }
          }
          return status
        })
      )
      
      // 通知父组件更新成功
      if (onUpdateSuccess) {
        onUpdateSuccess(updatedPlugins)
      }
    } catch (error) {
      // 更新状态为错误
      setUpdateStatus(prev => 
        prev.map(status => {
          if (selectedIds.includes(status.id)) {
            return { ...status, status: 'error' }
          }
          return status
        })
      )
      
      // 通知父组件更新失败
      if (onUpdateError && error instanceof Error) {
        onUpdateError(error)
      } else if (onUpdateError) {
        onUpdateError(new Error(t('updateFailed')))
      }
    } finally {
      setInternalIsUpdating(false)
      setProgress(100)
    }
  }
  
  // 切换选择状态
  const toggleSelected = (id: string) => {
    setUpdateStatus(prev => 
      prev.map(status => {
        if (status.id === id) {
          return { ...status, selected: !status.selected }
        }
        return status
      })
    )
  }
  
  // 全选/取消全选
  const toggleSelectAll = () => {
    const allSelected = updateStatus.every(s => s.selected)
    setUpdateStatus(prev => 
      prev.map(status => ({ ...status, selected: !allSelected }))
    )
  }
  
  // 获取可更新的插件数量
  const getUpdatableCount = () => {
    return updateStatus.filter(s => s.newVersion).length
  }
  
  // 获取选中的可更新插件数量
  const getSelectedUpdatableCount = () => {
    return updateStatus.filter(s => s.selected && s.newVersion).length
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            {t('updatePlugins')}
          </DialogTitle>
          <DialogDescription>
            {isChecking 
              ? t('checkingForUpdates') 
              : getUpdatableCount() > 0 
                ? t('updatesAvailableDesc', { count: getUpdatableCount() }) 
                : t('noUpdatesAvailable')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {/* 进度条 */}
          {(isChecking || isUpdating) && (
            <Progress value={progress} className="mb-4" />
          )}
          
          {/* 插件列表 */}
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox 
                      checked={updateStatus.length > 0 && updateStatus.every(s => s.selected)}
                      onCheckedChange={toggleSelectAll}
                      disabled={isUpdating}
                    />
                  </TableHead>
                  <TableHead>{t('name')}</TableHead>
                  <TableHead>{t('currentVersion')}</TableHead>
                  <TableHead>{t('newVersion')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {updateStatus.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-4">
                      {isChecking ? t('checking') : t('noPluginsToUpdate')}
                    </TableCell>
                  </TableRow>
                ) : (
                  updateStatus.map(plugin => (
                    <TableRow key={plugin.id}>
                      <TableCell>
                        <Checkbox 
                          checked={plugin.selected}
                          onCheckedChange={() => toggleSelected(plugin.id)}
                          disabled={isUpdating || !plugin.newVersion}
                        />
                      </TableCell>
                      <TableCell>{plugin.name}</TableCell>
                      <TableCell>{plugin.currentVersion}</TableCell>
                      <TableCell>
                        {plugin.newVersion || '-'}
                      </TableCell>
                      <TableCell>
                        {plugin.status === 'updating' && (
                          <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                        )}
                        {plugin.status === 'success' && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                        {plugin.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        {plugin.status === 'pending' && plugin.newVersion && (
                          <span className="text-xs text-blue-500">{t('hasUpdateAvailable')}</span>
                        )}
                        {plugin.status === 'pending' && !plugin.newVersion && (
                          <span className="text-xs text-gray-500">{t('upToDate')}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          <div>
            <Button 
              variant="outline" 
              onClick={handleCheckUpdates}
              disabled={isChecking || isUpdating}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
              {t('checkAgain')}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleUpdatePlugins}
              disabled={
                isChecking || 
                isUpdating || 
                getSelectedUpdatableCount() === 0
              }
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
              {t('updateSelected', { count: getSelectedUpdatableCount() })}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
