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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Plugin } from '@/types/plugin-types'

export interface PluginGroup {
  id: string
  name: string
  pluginIds: string[]
}

interface PluginGroupDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (group: PluginGroup) => void
  group?: PluginGroup
  plugins: Plugin[]
  existingGroups: PluginGroup[]
}

export function PluginGroupDialog({
  isOpen,
  onClose,
  onSave,
  group,
  plugins,
  existingGroups,
}: PluginGroupDialogProps) {
  const { t } = useTranslation('plugins')
  const [name, setName] = useState('')
  const [selectedPlugins, setSelectedPlugins] = useState<string[]>([])
  const [nameError, setNameError] = useState('')
  
  // 当编辑现有分组时，加载分组数据
  useEffect(() => {
    if (group) {
      setName(group.name)
      setSelectedPlugins(group.pluginIds)
    } else {
      setName('')
      setSelectedPlugins([])
    }
    setNameError('')
  }, [group, isOpen])
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    setNameError('')
  }
  
  const handlePluginToggle = (pluginId: string) => {
    setSelectedPlugins(prev => 
      prev.includes(pluginId)
        ? prev.filter(id => id !== pluginId)
        : [...prev, pluginId]
    )
  }
  
  const handleSave = () => {
    // 验证分组名称
    if (!name.trim()) {
      setNameError(t('groupName') + ' ' + t('isRequired'))
      return
    }
    
    // 检查名称是否重复（编辑时排除自身）
    const isDuplicate = existingGroups.some(g => 
      g.name.toLowerCase() === name.toLowerCase() && 
      (!group || g.id !== group.id)
    )
    
    if (isDuplicate) {
      setNameError(t('groupName') + ' ' + t('alreadyExists'))
      return
    }
    
    // 保存分组
    onSave({
      id: group?.id || `group-${Date.now()}`,
      name,
      pluginIds: selectedPlugins,
    })
    
    onClose()
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {group ? t('editGroup') : t('createGroup')}
          </DialogTitle>
          <DialogDescription>
            {t('selectPluginsForGroup')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              {t('groupName')}
            </Label>
            <Input
              id="name"
              value={name}
              onChange={handleNameChange}
              className="col-span-3"
              placeholder={t('enterGroupName')}
            />
            {nameError && (
              <div className="col-start-2 col-span-3 text-red-500 text-sm">
                {nameError}
              </div>
            )}
          </div>
          
          <div className="mt-4">
            <Label>{t('selectPlugins')}</Label>
            <ScrollArea className="h-[200px] mt-2 border rounded-md p-2">
              <div className="space-y-2">
                {plugins.map(plugin => (
                  <div key={plugin.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`plugin-${plugin.id}`}
                      checked={selectedPlugins.includes(plugin.id)}
                      onCheckedChange={() => handlePluginToggle(plugin.id)}
                    />
                    <Label
                      htmlFor={`plugin-${plugin.id}`}
                      className="cursor-pointer"
                    >
                      {plugin.name}
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSave}>
            {t('save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
