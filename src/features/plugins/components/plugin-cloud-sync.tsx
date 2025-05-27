import { useState, useEffect } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  Upload, 
  Download, 
  Clock, 
  Settings 
} from 'lucide-react'

import { 
  getCloudSyncConfig, 
  saveCloudSyncConfig, 
  syncToCloud, 
  syncFromCloud,
  CloudSyncConfig
} from '../services/cloud-sync'

interface PluginCloudSyncProps {
  isOpen: boolean
  onClose: () => void
  onSyncSuccess: () => void
  onSyncError: (error: string) => void
}

export function PluginCloudSync({
  isOpen,
  onClose,
  onSyncSuccess,
  onSyncError
}: PluginCloudSyncProps) {
  const { t } = useTranslation('plugins')
  const [config, setConfig] = useState<CloudSyncConfig>(getCloudSyncConfig())
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string>(config.lastSynced || '')
  
  // 同步间隔选项
  const syncIntervalOptions = [
    { value: 15, label: '15分钟' },
    { value: 30, label: '30分钟' },
    { value: 60, label: '1小时' },
    { value: 180, label: '3小时' },
    { value: 360, label: '6小时' },
    { value: 720, label: '12小时' },
    { value: 1440, label: '24小时' }
  ]
  
  // 加载配置
  useEffect(() => {
    const loadedConfig = getCloudSyncConfig()
    setConfig(loadedConfig)
    setLastSyncTime(loadedConfig.lastSynced)
  }, [isOpen])
  
  // 保存配置
  const handleSaveConfig = () => {
    saveCloudSyncConfig(config)
  }
  
  // 切换自动同步
  const handleToggleAutoSync = (checked: boolean) => {
    const newConfig = { ...config, autoSync: checked }
    setConfig(newConfig)
    saveCloudSyncConfig(newConfig)
  }
  
  // 更改同步间隔
  const handleChangeSyncInterval = (value: string) => {
    const interval = parseInt(value, 10)
    const newConfig = { ...config, syncInterval: interval }
    setConfig(newConfig)
    saveCloudSyncConfig(newConfig)
  }
  
  // 立即同步到云端
  const handleSyncToCloud = async () => {
    setIsSyncing(true)
    try {
      const success = await syncToCloud()
      if (success) {
        const newConfig = getCloudSyncConfig()
        setLastSyncTime(newConfig.lastSynced)
        onSyncSuccess()
      } else {
        onSyncError(t('syncFailed'))
      }
    } catch (error) {
      onSyncError(t('syncFailed'))
    } finally {
      setIsSyncing(false)
    }
  }
  
  // 从云端同步
  const handleSyncFromCloud = async () => {
    setIsSyncing(true)
    try {
      const success = await syncFromCloud()
      if (success) {
        const newConfig = getCloudSyncConfig()
        setLastSyncTime(newConfig.lastSynced)
        onSyncSuccess()
      } else {
        onSyncError(t('syncFailed'))
      }
    } catch (error) {
      onSyncError(t('syncFailed'))
    } finally {
      setIsSyncing(false)
    }
  }
  
  // 格式化上次同步时间
  const formatLastSyncTime = (timeString: string) => {
    if (!timeString) return t('never')
    
    try {
      const date = new Date(timeString)
      return date.toLocaleString()
    } catch (error) {
      return t('unknown')
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            {t('cloudSync')}
          </DialogTitle>
          <DialogDescription>
            {t('cloudSyncDescription')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-6">
          {/* 上次同步时间 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('lastSynced')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{formatLastSyncTime(lastSyncTime)}</p>
            </CardContent>
          </Card>
          
          {/* 同步操作 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                {t('syncNow')}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex gap-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={handleSyncToCloud}
                disabled={isSyncing}
              >
                <Upload className="h-4 w-4 mr-2" />
                {t('syncToCloud')}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={handleSyncFromCloud}
                disabled={isSyncing}
              >
                <Download className="h-4 w-4 mr-2" />
                {t('syncFromCloud')}
              </Button>
            </CardContent>
          </Card>
          
          {/* 同步设置 */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                {t('settings')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 自动同步开关 */}
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-sync" className="flex items-center gap-2">
                  {config.autoSync ? <Cloud className="h-4 w-4" /> : <CloudOff className="h-4 w-4" />}
                  {t('autoSync')}
                </Label>
                <Switch 
                  id="auto-sync" 
                  checked={config.autoSync}
                  onCheckedChange={handleToggleAutoSync}
                />
              </div>
              
              {/* 同步间隔 */}
              {config.autoSync && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sync-interval" className="col-span-1">
                    {t('syncInterval')}
                  </Label>
                  <Select 
                    value={config.syncInterval.toString()} 
                    onValueChange={handleChangeSyncInterval}
                  >
                    <SelectTrigger id="sync-interval" className="col-span-3">
                      <SelectValue placeholder={t('selectInterval')} />
                    </SelectTrigger>
                    <SelectContent>
                      {syncIntervalOptions.map(option => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {/* 用户ID */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="user-id" className="col-span-1">
                  {t('userId')}
                </Label>
                <Input 
                  id="user-id" 
                  value={config.userId}
                  onChange={e => setConfig({...config, userId: e.target.value})}
                  onBlur={handleSaveConfig}
                  className="col-span-3"
                  placeholder={t('enterUserId')}
                />
              </div>
              
              {/* 设备ID */}
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="device-id" className="col-span-1">
                  {t('deviceId')}
                </Label>
                <Input 
                  id="device-id" 
                  value={config.deviceId}
                  onChange={e => setConfig({...config, deviceId: e.target.value})}
                  onBlur={handleSaveConfig}
                  className="col-span-3"
                  placeholder={t('enterDeviceId')}
                />
              </div>
            </CardContent>
          </Card>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
