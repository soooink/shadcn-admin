/**
 * 插件详情组件
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Loader2, Download, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { getPluginSystemIntegration } from '../../core/plugin-system-integration';

interface PluginDetailsProps {
  pluginId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PluginDetails({ pluginId, isOpen, onClose }: PluginDetailsProps) {
  const { t } = useTranslation();
  const [plugin, setPlugin] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [uninstalling, setUninstalling] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [performanceStats, setPerformanceStats] = useState<any>(null);
  const [storageStats, setStorageStats] = useState<any>(null);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [dependencies, setDependencies] = useState<any[]>([]);

  // 加载插件详情
  const loadPluginDetails = async () => {
    setLoading(true);
    try {
      const pluginSystem = getPluginSystemIntegration();
      
      // 检查插件是否已安装
      const installedPlugin = pluginSystem.getPlugin(pluginId);
      
      if (installedPlugin) {
        // 已安装，使用本地数据
        setPlugin(installedPlugin);
        setIsInstalled(true);
        
        // 加载性能统计
        const stats = pluginSystem.getPluginPerformanceStats(pluginId);
        setPerformanceStats(stats);
        
        // 加载存储统计
        const storage = pluginSystem.getPluginStorageStats(pluginId);
        setStorageStats(storage);
        
        // 加载权限
        const perms = pluginSystem.getPluginPermissions(pluginId);
        setPermissions(perms || []);
        
        // 检查更新
        const updates = await pluginSystem.checkForUpdates(pluginId);
        if (updates && updates[pluginId]) {
          setUpdateAvailable(updates[pluginId].hasUpdate);
        }
        
        // 加载依赖
        const dependencyManager = await pluginSystem.getPluginDependencyManager();
        const deps = dependencyManager.getPluginDependencies(pluginId);
        setDependencies(deps || []);
      } else {
        // 未安装，从市场获取
        const details = await pluginSystem.getPluginDetails(pluginId);
        setPlugin(details);
        setIsInstalled(false);
      }
    } catch (error) {
      console.error(`加载插件详情失败 ${pluginId}:`, error);
    } finally {
      setLoading(false);
    }
  };

  // 安装插件
  const handleInstall = async () => {
    if (!plugin) return;
    
    setInstalling(true);
    try {
      const pluginSystem = getPluginSystemIntegration();
      const success = await pluginSystem.installPlugin({
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        url: plugin.downloadUrl
      });
      
      if (success) {
        // 重新加载详情
        await loadPluginDetails();
      } else {
        alert(t('plugins.details.installFailed', '插件安装失败'));
      }
    } catch (error) {
      console.error(`安装插件失败 ${pluginId}:`, error);
      alert(t('plugins.details.installError', '安装插件失败') + ': ' + (error as Error).message);
    } finally {
      setInstalling(false);
    }
  };

  // 卸载插件
  const handleUninstall = async () => {
    if (window.confirm(t('plugins.details.confirmUninstall', '确定要卸载此插件吗？'))) {
      setUninstalling(true);
      
      try {
        const pluginSystem = getPluginSystemIntegration();
        const success = await pluginSystem.uninstallPlugin(pluginId);
        
        if (success) {
          // 关闭对话框
          onClose();
        } else {
          alert(t('plugins.details.uninstallFailed', '插件卸载失败'));
          // 重新加载详情
          await loadPluginDetails();
        }
      } catch (error) {
        console.error(`卸载插件失败 ${pluginId}:`, error);
        alert(t('plugins.details.uninstallError', '卸载插件失败') + ': ' + (error as Error).message);
      } finally {
        setUninstalling(false);
      }
    }
  };

  // 更新插件
  const handleUpdate = async () => {
    setUpdating(true);
    
    try {
      const pluginSystem = getPluginSystemIntegration();
      const success = await pluginSystem.updatePlugin(pluginId);
      
      if (success) {
        // 重新加载详情
        await loadPluginDetails();
      } else {
        alert(t('plugins.details.updateFailed', '插件更新失败'));
      }
    } catch (error) {
      console.error(`更新插件失败 ${pluginId}:`, error);
      alert(t('plugins.details.updateError', '更新插件失败') + ': ' + (error as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  // 初始加载
  useEffect(() => {
    if (isOpen && pluginId) {
      loadPluginDetails();
    }
  }, [isOpen, pluginId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-2">{t('plugins.details.loading', '加载中...')}</span>
          </div>
        ) : plugin ? (
          <>
            <DialogHeader>
              <div className="flex justify-between items-start">
                <DialogTitle>{plugin.name}</DialogTitle>
                <Badge variant="outline">{plugin.version}</Badge>
              </div>
              <DialogDescription>{plugin.description}</DialogDescription>
            </DialogHeader>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="info">{t('plugins.details.info', '信息')}</TabsTrigger>
                <TabsTrigger value="permissions">{t('plugins.details.permissions', '权限')}</TabsTrigger>
                <TabsTrigger value="dependencies">{t('plugins.details.dependencies', '依赖')}</TabsTrigger>
                {isInstalled && (
                  <TabsTrigger value="stats">{t('plugins.details.stats', '统计')}</TabsTrigger>
                )}
              </TabsList>
              
              {/* 信息标签 */}
              <TabsContent value="info" className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{t('plugins.details.about', '关于')}</h3>
                  <p className="text-sm text-muted-foreground">{plugin.longDescription || plugin.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">{t('plugins.details.author', '作者')}</h4>
                    <p className="text-sm text-muted-foreground">{plugin.author}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium">{t('plugins.details.version', '版本')}</h4>
                    <p className="text-sm text-muted-foreground">{plugin.version}</p>
                  </div>
                  
                  {plugin.homepage && (
                    <div>
                      <h4 className="font-medium">{t('plugins.details.homepage', '主页')}</h4>
                      <a 
                        href={plugin.homepage} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-primary flex items-center"
                      >
                        {plugin.homepage}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </a>
                    </div>
                  )}
                  
                  {plugin.license && (
                    <div>
                      <h4 className="font-medium">{t('plugins.details.license', '许可证')}</h4>
                      <p className="text-sm text-muted-foreground">{plugin.license}</p>
                    </div>
                  )}
                </div>
                
                {plugin.tags && plugin.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">{t('plugins.details.tags', '标签')}</h4>
                    <div className="flex flex-wrap gap-2">
                      {plugin.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                
                {plugin.changelog && (
                  <div>
                    <h4 className="font-medium mb-2">{t('plugins.details.changelog', '更新日志')}</h4>
                    <div className="text-sm text-muted-foreground whitespace-pre-line border rounded-md p-3 max-h-40 overflow-y-auto">
                      {plugin.changelog}
                    </div>
                  </div>
                )}
              </TabsContent>
              
              {/* 权限标签 */}
              <TabsContent value="permissions">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t('plugins.details.permissions', '权限')}</h3>
                  
                  {permissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t('plugins.details.noPermissions', '此插件不需要任何特殊权限')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {permissions.map((perm, index) => (
                        <div key={index} className="border rounded-md p-3">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium">{perm.name}</h4>
                            <Badge variant={perm.sensitive ? "destructive" : "outline"}>
                              {perm.sensitive 
                                ? t('plugins.details.sensitive', '敏感') 
                                : t('plugins.details.normal', '普通')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{perm.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* 依赖标签 */}
              <TabsContent value="dependencies">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">{t('plugins.details.dependencies', '依赖')}</h3>
                  
                  {dependencies.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {t('plugins.details.noDependencies', '此插件没有依赖其他插件')}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {dependencies.map((dep, index) => (
                        <div key={index} className="border rounded-md p-3">
                          <div className="flex justify-between items-start">
                            <h4 className="font-medium">{dep.name}</h4>
                            <Badge variant="outline">{dep.version}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{dep.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
              
              {/* 统计标签 */}
              {isInstalled && (
                <TabsContent value="stats">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">{t('plugins.details.stats', '统计')}</h3>
                    
                    {performanceStats && (
                      <div className="border rounded-md p-3">
                        <h4 className="font-medium mb-2">{t('plugins.details.performance', '性能')}</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">{t('plugins.details.cpuUsage', 'CPU 使用率')}</p>
                            <p className="font-medium">{performanceStats.cpu.toFixed(2)}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t('plugins.details.memoryUsage', '内存使用')}</p>
                            <p className="font-medium">{(performanceStats.memory / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {storageStats && (
                      <div className="border rounded-md p-3">
                        <h4 className="font-medium mb-2">{t('plugins.details.storage', '存储')}</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">{t('plugins.details.storageUsed', '已使用存储')}</p>
                            <p className="font-medium">{(storageStats.used / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">{t('plugins.details.storageLimit', '存储限制')}</p>
                            <p className="font-medium">{(storageStats.limit / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}
            </Tabs>
            
            <DialogFooter>
              {isInstalled ? (
                <div className="flex gap-2">
                  {updateAvailable && (
                    <Button 
                      variant="default"
                      disabled={updating}
                      onClick={handleUpdate}
                    >
                      {updating ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      {t('plugins.details.update', '更新')}
                    </Button>
                  )}
                  
                  <Button 
                    variant="destructive"
                    disabled={uninstalling}
                    onClick={handleUninstall}
                  >
                    {uninstalling ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    {t('plugins.details.uninstall', '卸载')}
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="default"
                  disabled={installing}
                  onClick={handleInstall}
                >
                  {installing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-2" />
                  )}
                  {t('plugins.details.install', '安装')}
                </Button>
              )}
            </DialogFooter>
          </>
        ) : (
          <div className="text-center p-8">
            <p className="text-lg text-muted-foreground">
              {t('plugins.details.notFound', '未找到插件')}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
