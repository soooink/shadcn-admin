import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Badge } from '@/components/ui/badge'
import { Plus, MoreVertical, Pencil, Trash2, FolderPlus } from 'lucide-react'
import { PluginGroup, PluginGroupDialog } from './plugin-group-dialog'
import { Plugin } from '@/types/plugin-types'

interface PluginGroupsProps {
  plugins: Plugin[]
  onSelectGroup: (groupId: string | null) => void
  selectedGroupId: string | null
}

export function PluginGroups({ plugins, onSelectGroup, selectedGroupId }: PluginGroupsProps) {
  const { t } = useTranslation('plugins')
  const [groups, setGroups] = useState<PluginGroup[]>(() => {
    // 从本地存储加载分组
    try {
      const savedGroups = localStorage.getItem('plugin-groups')
      return savedGroups ? JSON.parse(savedGroups) : []
    } catch (error) {
      console.error('Failed to load plugin groups', error)
      return []
    }
  })
  
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false)
  const [currentGroup, setCurrentGroup] = useState<PluginGroup | undefined>(undefined)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<PluginGroup | null>(null)
  
  // 保存分组到本地存储
  const saveGroups = (updatedGroups: PluginGroup[]) => {
    setGroups(updatedGroups)
    localStorage.setItem('plugin-groups', JSON.stringify(updatedGroups))
  }
  
  // 创建或更新分组
  const handleSaveGroup = (group: PluginGroup) => {
    const isEditing = groups.some(g => g.id === group.id)
    
    if (isEditing) {
      // 更新现有分组
      const updatedGroups = groups.map(g => 
        g.id === group.id ? group : g
      )
      saveGroups(updatedGroups)
      
      // 显示成功提示
      showToast(t('groupUpdated'))
    } else {
      // 创建新分组
      saveGroups([...groups, group])
      
      // 显示成功提示
      showToast(t('groupCreated'))
    }
  }
  
  // 打开创建分组对话框
  const handleCreateGroup = () => {
    setCurrentGroup(undefined)
    setIsGroupDialogOpen(true)
  }
  
  // 打开编辑分组对话框
  const handleEditGroup = (group: PluginGroup) => {
    setCurrentGroup(group)
    setIsGroupDialogOpen(true)
  }
  
  // 打开删除分组确认对话框
  const handleDeletePrompt = (group: PluginGroup) => {
    setGroupToDelete(group)
    setIsDeleteDialogOpen(true)
  }
  
  // 删除分组
  const handleDeleteGroup = () => {
    if (!groupToDelete) return
    
    const updatedGroups = groups.filter(g => g.id !== groupToDelete.id)
    saveGroups(updatedGroups)
    
    // 如果删除的是当前选中的分组，则选择"未分组"
    if (selectedGroupId === groupToDelete.id) {
      onSelectGroup(null)
    }
    
    // 显示成功提示
    showToast(t('groupDeleted'))
    
    // 关闭对话框
    setIsDeleteDialogOpen(false)
    setGroupToDelete(null)
  }
  
  // 显示提示信息
  const showToast = (message: string) => {
    const toast = document.getElementById('toast-container')
    if (toast) {
      toast.innerHTML = `<div class="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg transition-opacity duration-500">${message}</div>`
      setTimeout(() => {
        toast.innerHTML = ''
      }, 2000)
    }
  }
  
  // 获取分组中的插件数量
  const getPluginCount = (groupId: string) => {
    const group = groups.find(g => g.id === groupId)
    if (!group) return 0
    
    // 只计算存在的插件（避免计算已卸载的插件）
    return group.pluginIds.filter(id => plugins.some(p => p.id === id)).length
  }
  
  // 获取未分组的插件数量
  const getUngroupedCount = () => {
    // 所有已分组的插件ID
    const groupedPluginIds = groups.flatMap(g => g.pluginIds)
    // 计算未分组的插件数量
    return plugins.filter(p => !groupedPluginIds.includes(p.id)).length
  }
  
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">{t('groups')}</h3>
        <Button size="sm" onClick={handleCreateGroup}>
          <Plus className="h-4 w-4 mr-1" />
          {t('createGroup')}
        </Button>
      </div>
      
      <ScrollArea className="h-[calc(100vh-250px)]">
        <div className="space-y-1">
          {/* 未分组选项 */}
          <div
            className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer ${
              selectedGroupId === null ? 'bg-primary/10' : 'hover:bg-muted'
            }`}
            onClick={() => onSelectGroup(null)}
          >
            <div className="flex items-center">
              <span>{t('ungrouped')}</span>
              <Badge variant="outline" className="ml-2">
                {getUngroupedCount()}
              </Badge>
            </div>
          </div>
          
          {/* 分组列表 */}
          {groups.map(group => (
            <div
              key={group.id}
              className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer ${
                selectedGroupId === group.id ? 'bg-primary/10' : 'hover:bg-muted'
              }`}
              onClick={() => onSelectGroup(group.id)}
            >
              <div className="flex items-center">
                <span>{group.name}</span>
                <Badge variant="outline" className="ml-2">
                  {getPluginCount(group.id)}
                </Badge>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">更多选项</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation()
                    handleEditGroup(group)
                  }}>
                    <Pencil className="h-4 w-4 mr-2" />
                    {t('editGroup')}
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-500"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePrompt(group)
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('deleteGroup')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
          
          {/* 没有分组时显示提示 */}
          {groups.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FolderPlus className="h-12 w-12 mb-2" />
              <p>{t('noGroups')}</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={handleCreateGroup}
              >
                {t('createGroup')}
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* 分组对话框 */}
      <PluginGroupDialog
        isOpen={isGroupDialogOpen}
        onClose={() => setIsGroupDialogOpen(false)}
        onSave={handleSaveGroup}
        group={currentGroup}
        plugins={plugins}
        existingGroups={groups}
      />
      
      {/* 删除确认对话框 */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteGroup')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDeleteGroup')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-500 hover:bg-red-600"
              onClick={handleDeleteGroup}
            >
              {t('delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
