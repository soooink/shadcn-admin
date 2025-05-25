import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PluginLayout } from '@/plugins/common/plugin-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { IconAlertCircle, IconCheck, IconFolderPlus, IconRefresh, IconShield } from '@tabler/icons-react'

export const Route = createFileRoute('/_authenticated/plugins/settings')({
  component: PluginSettings,
})

// 插件权限设置接口
interface PluginPermission {
  id: string;
  name: string;
  description: string;
  defaultValue: boolean;
  value: boolean;
  category: 'system' | 'data' | 'network' | 'storage';
}

// 模拟插件权限数据
const MOCK_PERMISSIONS: PluginPermission[] = [
  {
    id: 'read_user_data',
    name: '读取用户数据',
    description: '允许插件读取用户个人资料和设置',
    defaultValue: true,
    value: true,
    category: 'data',
  },
  {
    id: 'write_user_data',
    name: '修改用户数据',
    description: '允许插件修改用户个人资料和设置',
    defaultValue: false,
    value: false,
    category: 'data',
  },
  {
    id: 'network_access',
    name: '网络访问',
    description: '允许插件访问外部网络资源',
    defaultValue: true,
    value: true,
    category: 'network',
  },
  {
    id: 'file_system_access',
    name: '文件系统访问',
    description: '允许插件读写文件系统',
    defaultValue: false,
    value: false,
    category: 'storage',
  },
  {
    id: 'auto_update',
    name: '自动更新',
    description: '允许插件自动检查和安装更新',
    defaultValue: true,
    value: true,
    category: 'system',
  },
  {
    id: 'background_run',
    name: '后台运行',
    description: '允许插件在后台运行服务',
    defaultValue: false,
    value: false,
    category: 'system',
  },
  {
    id: 'notification',
    name: '发送通知',
    description: '允许插件发送系统通知',
    defaultValue: true,
    value: true,
    category: 'system',
  },
  {
    id: 'api_access',
    name: 'API 访问',
    description: '允许插件访问系统 API',
    defaultValue: true,
    value: true,
    category: 'system',
  },
];

function PluginSettings() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');
  const [permissions, setPermissions] = useState<PluginPermission[]>(MOCK_PERMISSIONS);
  const [pluginDirectory, setPluginDirectory] = useState('/plugins');
  const [autoUpdateEnabled, setAutoUpdateEnabled] = useState(true);
  const [developerMode, setDeveloperMode] = useState(false);
  const [pluginCacheSize, setPluginCacheSize] = useState(500);
  const [pluginLoadTimeout, setPluginLoadTimeout] = useState(30);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');

  // 定义插件设置页面的顶部导航链接
  const navLinks = [
    {
      title: t('plugins.installed', '已安装'),
      href: '/plugins',
      isActive: false,
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
      isActive: true,
      disabled: false,
    },
  ];

  // 按类别分组权限
  const permissionsByCategory = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, PluginPermission[]>);

  // 切换权限状态
  const togglePermission = (id: string) => {
    setPermissions(permissions.map(permission => 
      permission.id === id 
        ? { ...permission, value: !permission.value } 
        : permission
    ));
  };

  // 重置所有权限为默认值
  const resetPermissionsToDefault = () => {
    setPermissions(permissions.map(permission => 
      ({ ...permission, value: permission.defaultValue })
    ));
  };

  // 保存设置
  const saveSettings = () => {
    setSaveStatus('saving');
    
    // 模拟保存过程
    setTimeout(() => {
      setSaveStatus('success');
      
      // 3秒后重置状态
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    }, 1000);
  };

  return (
    <PluginLayout title={t('plugins.settings', '插件设置')} navLinks={navLinks}>
      <div className="container px-0 py-6">
        <p className="text-muted-foreground mb-8">
          {t('plugins.settings.description', '配置插件系统的全局设置和权限。')}
        </p>
        
        <div className="grid gap-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">{t('plugins.settings.general', '常规')}</TabsTrigger>
              <TabsTrigger value="permissions">{t('plugins.settings.permissions', '权限')}</TabsTrigger>
              <TabsTrigger value="advanced">{t('plugins.settings.advanced', '高级')}</TabsTrigger>
            </TabsList>
            
            {/* 常规设置 */}
            <TabsContent value="general" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('plugins.settings.general', '常规设置')}</CardTitle>
                  <CardDescription>
                    {t('plugins.settings.generalDescription', '配置插件系统的基本设置。')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="plugin-directory">
                        {t('plugins.settings.pluginDirectory', '插件目录')}
                      </Label>
                      <div className="flex gap-2">
                        <Input 
                          id="plugin-directory" 
                          value={pluginDirectory}
                          onChange={(e) => setPluginDirectory(e.target.value)}
                          className="flex-1"
                        />
                        <Button variant="outline" size="icon">
                          <IconFolderPlus className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('plugins.settings.pluginDirectoryDescription', '指定插件安装和加载的目录路径。')}
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>
                          {t('plugins.settings.autoUpdate', '自动更新插件')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('plugins.settings.autoUpdateDescription', '允许系统自动检查和安装插件更新。')}
                        </p>
                      </div>
                      <Switch
                        checked={autoUpdateEnabled}
                        onCheckedChange={setAutoUpdateEnabled}
                      />
                    </div>
                    
                    <Separator />
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>
                          {t('plugins.settings.developerMode', '开发者模式')}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {t('plugins.settings.developerModeDescription', '启用插件开发工具和调试功能。')}
                        </p>
                      </div>
                      <Switch
                        checked={developerMode}
                        onCheckedChange={setDeveloperMode}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline">
                    {t('plugins.settings.reset', '重置')}
                  </Button>
                  <Button onClick={saveSettings} disabled={saveStatus === 'saving'}>
                    {saveStatus === 'saving' 
                      ? t('plugins.settings.saving', '保存中...') 
                      : saveStatus === 'success'
                        ? <><IconCheck className="mr-2 h-4 w-4" /> {t('plugins.settings.saved', '已保存')}</>
                        : t('plugins.settings.save', '保存设置')}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* 权限设置 */}
            <TabsContent value="permissions" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('plugins.settings.permissions', '权限设置')}</CardTitle>
                  <CardDescription>
                    {t('plugins.settings.permissionsDescription', '管理插件系统的权限和安全设置。')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Alert>
                    <IconAlertCircle className="h-4 w-4" />
                    <AlertTitle>{t('plugins.settings.permissionsWarning', '权限警告')}</AlertTitle>
                    <AlertDescription>
                      {t('plugins.settings.permissionsWarningDescription', '修改这些设置可能会影响系统安全性。请谨慎操作。')}
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-6">
                    {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                      <div key={category} className="space-y-4">
                        <h3 className="text-lg font-medium flex items-center">
                          <IconShield className="mr-2 h-5 w-5 text-primary" />
                          {t(`plugins.settings.category.${category}`, category.charAt(0).toUpperCase() + category.slice(1))}
                        </h3>
                        
                        {categoryPermissions.map(permission => (
                          <div key={permission.id} className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label className="text-base">
                                {permission.name}
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                {permission.description}
                              </p>
                            </div>
                            <Switch
                              checked={permission.value}
                              onCheckedChange={() => togglePermission(permission.id)}
                            />
                          </div>
                        ))}
                        
                        {category !== Object.keys(permissionsByCategory).pop() && (
                          <Separator className="my-4" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={resetPermissionsToDefault}>
                    {t('plugins.settings.resetToDefault', '恢复默认')}
                  </Button>
                  <Button onClick={saveSettings} disabled={saveStatus === 'saving'}>
                    {saveStatus === 'saving' 
                      ? t('plugins.settings.saving', '保存中...') 
                      : saveStatus === 'success'
                        ? <><IconCheck className="mr-2 h-4 w-4" /> {t('plugins.settings.saved', '已保存')}</>
                        : t('plugins.settings.save', '保存设置')}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* 高级设置 */}
            <TabsContent value="advanced" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('plugins.settings.advanced', '高级设置')}</CardTitle>
                  <CardDescription>
                    {t('plugins.settings.advancedDescription', '配置插件系统的高级参数和性能选项。')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="cache-size">
                          {t('plugins.settings.cacheSize', '插件缓存大小')} (MB)
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          id="cache-size"
                          type="number"
                          min={100}
                          max={2000}
                          step={100}
                          value={pluginCacheSize}
                          onChange={(e) => setPluginCacheSize(Number(e.target.value))}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('plugins.settings.cacheSizeDescription', '设置插件缓存的最大大小（MB）。')}
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <Label htmlFor="load-timeout">
                        {t('plugins.settings.loadTimeout', '插件加载超时')} (秒)
                      </Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="load-timeout"
                          type="number"
                          min={5}
                          max={60}
                          step={5}
                          value={pluginLoadTimeout}
                          onChange={(e) => setPluginLoadTimeout(Number(e.target.value))}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {t('plugins.settings.loadTimeoutDescription', '设置插件加载的最大等待时间（秒）。')}
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2">
                      <Label htmlFor="log-level">
                        {t('plugins.settings.logLevel', '日志级别')}
                      </Label>
                      <Select defaultValue="info">
                        <SelectTrigger id="log-level">
                          <SelectValue placeholder={t('plugins.settings.selectLogLevel', '选择日志级别')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="debug">{t('plugins.settings.logLevels.debug', '调试')}</SelectItem>
                          <SelectItem value="info">{t('plugins.settings.logLevels.info', '信息')}</SelectItem>
                          <SelectItem value="warn">{t('plugins.settings.logLevels.warn', '警告')}</SelectItem>
                          <SelectItem value="error">{t('plugins.settings.logLevels.error', '错误')}</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        {t('plugins.settings.logLevelDescription', '设置插件系统的日志记录级别。')}
                      </p>
                    </div>
                    
                    <Separator />
                    
                    <div className="pt-2">
                      <Button variant="outline" className="w-full" size="sm">
                        <IconRefresh className="mr-2 h-4 w-4" />
                        {t('plugins.settings.clearCache', '清除插件缓存')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline">
                    {t('plugins.settings.reset', '重置')}
                  </Button>
                  <Button onClick={saveSettings} disabled={saveStatus === 'saving'}>
                    {saveStatus === 'saving' 
                      ? t('plugins.settings.saving', '保存中...') 
                      : saveStatus === 'success'
                        ? <><IconCheck className="mr-2 h-4 w-4" /> {t('plugins.settings.saved', '已保存')}</>
                        : t('plugins.settings.save', '保存设置')}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PluginLayout>
  );
}
