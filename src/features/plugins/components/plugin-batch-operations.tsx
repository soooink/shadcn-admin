import { useState } from 'react'
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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plugin } from '@/types/plugin-types'

interface PluginGroup {
  id: string
  name: string
  pluginIds: string[]
}

interface PluginBatchOperationsProps {
  plugins: Plugin[]
  selectedPluginIds: string[]
  onToggleAll: () => void
  onClearSelection: () => void
  onEnableSelected: () => void
  onDisableSelected: () => void
  onAddToGroup: (groupId: string) => void
  onRemoveFromGroup: (groupId: string) => void
  onUpdateSelected?: () => void
  onExportSelected?: () => void
  onSyncToCloud?: () => void
  selectedGroupId: string | null
}

export function PluginBatchOperations({
  plugins,
  selectedPluginIds,
  onToggleAll,
  onClearSelection,
  onEnableSelected,
  onDisableSelected,
  onAddToGroup,
  onRemoveFromGroup,
  onUpdateSelected,
  onExportSelected,
  onSyncToCloud,
  selectedGroupId,
}: PluginBatchOperationsProps) {
  // 强制显示组件，即使在没有选择插件的情况下
  const { t } = useTranslation('plugins')
  const [isAddToGroupOpen, setIsAddToGroupOpen] = useState(false)
  const [isRemoveFromGroupOpen, setIsRemoveFromGroupOpen] = useState(false)
  const [selectedGroupForAdd, setSelectedGroupForAdd] = useState<string>('')
  // 从分组移除时不需要选择分组，因为已经在当前分组中
  const [selectedGroupForRemove] = useState<string>('')
  const [groups] = useState<PluginGroup[]>(() => {
    try {
      const savedGroups = localStorage.getItem('plugin-groups')
      return savedGroups ? JSON.parse(savedGroups) : []
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('无法加载插件分组', error)
      return []
    }
  })
  
  // 处理添加到分组
  const handleAddToGroup = () => {
    if (!selectedGroupForAdd) return
    
    onAddToGroup(selectedGroupForAdd)
    setIsAddToGroupOpen(false)
  }
  
  // 处理从分组移除
  const handleRemoveFromGroup = () => {
    if (!selectedGroupForRemove) return
    
    onRemoveFromGroup(selectedGroupForRemove)
    setIsRemoveFromGroupOpen(false)
  }
  
  // 判断是否全选
  const isAllSelected = selectedPluginIds.length === plugins.length
  
  // 获取选中的插件数量
  const selectedCount = selectedPluginIds.length
  
  // 判断是否有选中的插件
  const hasSelection = selectedCount > 0
  
  return (
    <div className="space-y-4 border p-4 rounded-lg shadow-sm">
      <h3 className="text-lg font-medium mb-2">{t('batchOperations')}</h3>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox 
            id="select-all"
            checked={isAllSelected}
            onCheckedChange={onToggleAll}
          />
          <Label htmlFor="select-all">
            {isAllSelected ? t('deselectAll') : t('selectAll')}
          </Label>
          <span className="text-sm text-muted-foreground ml-2">
            {hasSelection ? `${selectedCount} ${t('selected')}` : t('selectPluginsHint')}
          </span>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* 始终显示的操作按钮 */}
          {onSyncToCloud && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onSyncToCloud}
              className="flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-cloud">
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
              </svg>
              {t('syncToCloud')}
            </Button>
          )}
          
          {onExportSelected && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onExportSelected}
              className="flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" x2="12" y1="15" y2="3"/>
              </svg>
              {t('exportConfig')}
            </Button>
          )}
          
          {onUpdateSelected && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={onUpdateSelected}
              className="flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-refresh-cw">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                <path d="M21 3v5h-5"/>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                <path d="M8 16H3v5"/>
              </svg>
              {t('checkUpdates')}
            </Button>
          )}
          
          {/* 只有在选择插件后才显示的操作按钮 */}
          {hasSelection && (
            <>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onEnableSelected}
              >
                {t('enableSelected')}
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onDisableSelected}
              >
                {t('disableSelected')}
              </Button>
              {onUpdateSelected && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onUpdateSelected}
                >
                  {t('updateSelectedAction')}
                </Button>
              )}
              {onExportSelected && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onExportSelected}
                >
                  {t('exportSelected')}
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsAddToGroupOpen(true)}
                disabled={groups.length === 0}
              >
                {t('addSelectedToGroup')}
              </Button>
              {selectedGroupId && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsRemoveFromGroupOpen(true)}
                >
                  {t('removeSelectedFromGroup')}
                </Button>
              )}
              {onSyncToCloud && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onSyncToCloud}
                >
                  {t('syncToCloud')}
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm"
                onClick={onClearSelection}
              >
                {t('deselectAll')}
              </Button>
            </>
          )}
        </div>
      </div>
      
      {/* 操作提示 */}
      <div className="text-sm text-muted-foreground mt-2">
        <p>{t('batchOperationsHint')}</p>
      </div>
      
      {/* 添加到分组对话框 */}
      <Dialog open={isAddToGroupOpen} onOpenChange={setIsAddToGroupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('addSelectedToGroup')}</DialogTitle>
            <DialogDescription>
              {t('selectGroup')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Select 
              value={selectedGroupForAdd} 
              onValueChange={setSelectedGroupForAdd}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectGroup')} />
              </SelectTrigger>
              <SelectContent>
                <ScrollArea className="h-[200px]">
                  {groups.map(group => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </ScrollArea>
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddToGroupOpen(false)}>
              {t('cancel')}
            </Button>
            <Button 
              onClick={handleAddToGroup}
              disabled={!selectedGroupForAdd}
            >
              {t('add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* 从分组移除确认对话框 */}
      <AlertDialog 
        open={isRemoveFromGroupOpen} 
        onOpenChange={setIsRemoveFromGroupOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeSelectedFromGroup')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmRemoveFromGroup')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveFromGroup}>
              {t('remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
