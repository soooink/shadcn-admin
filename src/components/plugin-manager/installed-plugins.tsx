/**
 * 已安装插件列表组件
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Loader2, Settings, Trash2, RefreshCw, Info } from 'lucide-react';
import { getPluginSystemIntegration } from '../../core/plugin-system-integration';
import { pluginLogger } from '../../utils/logger';
import { Plugin } from '../../core/plugin-system';
import { PluginConfigDialog } from './plugin-config-dialog';

// 扩展Plugin类型，添加可能存在的属性
interface ExtendedPlugin extends Plugin {
  tags?: string[];
  author?: string;
  homepage?: string;
  // description是Plugin接口中的必需属性，这里不需要重新定义为可选
}

interface InstalledPluginsProps {
  onSelectPlugin: (pluginId: string) => void;
}

export function InstalledPlugins({ onSelectPlugin }: InstalledPluginsProps): React.ReactElement {
  const { t } = useTranslation();
  const [plugins, setPlugins] = useState<ExtendedPlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const [uninstalling, setUninstalling] = useState<Record<string, boolean>>({});
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState<Record<string, boolean>>({});

  // 检查更新
  const checkForUpdates = useCallback(async () => {
    try {
      const pluginSystem = getPluginSystemIntegration();
      const updates = await pluginSystem.checkForUpdates();
      
      if (updates) {
        const newUpdateAvailable: Record<string, boolean> = {};
        
        Object.entries(updates).forEach(([pluginId, updateInfo]) => {
          // 确保updateInfo有hasUpdate属性
          if (updateInfo && typeof updateInfo === 'object' && 'hasUpdate' in updateInfo) {
            newUpdateAvailable[pluginId] = Boolean(updateInfo.hasUpdate);
          }
        });
        
        setUpdateAvailable(newUpdateAvailable);
      }
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      pluginLogger.error(`检查插件更新失败: ${err}`);
    }
  }, []);

  // 加载插件列表
  const loadPlugins = useCallback(async () => {
    setLoading(true);
    try {
      const pluginSystem = getPluginSystemIntegration();
      const installedPlugins = pluginSystem.getAllPlugins();
      setPlugins(installedPlugins);
      
      // 检查更新
      checkForUpdates();
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      pluginLogger.error(`加载插件列表失败: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [checkForUpdates]);

  // 更新插件
  const handleUpdate = useCallback(async (pluginId: string) => {
    setUpdating(prev => ({ ...prev, [pluginId]: true }));
    
    try {
      const pluginSystem = getPluginSystemIntegration();
      const success = await pluginSystem.updatePlugin(pluginId);
      
      if (success) {
        loadPlugins();
      }
    } catch (error) {
      const err = error instanceof Error ? error.message : String(error);
      pluginLogger.error(`更新插件 ${pluginId} 失败: ${err}`);
    } finally {
      setUpdating(prev => ({ ...prev, [pluginId]: false }));
    }
  }, [loadPlugins]);

  // 卸载插件
  const handleUninstall = useCallback(async (pluginId: string) => {
    if (window.confirm(t('plugins.manager.confirmUninstall', '确定要卸载此插件吗？'))) {
      setUninstalling(prev => ({ ...prev, [pluginId]: true }));
      
      try {
        const pluginSystem = getPluginSystemIntegration();
        const success = await pluginSystem.uninstallPlugin(pluginId);
        
        if (success) {
          loadPlugins();
        }
      } catch (error) {
        const err = error instanceof Error ? error.message : String(error);
        pluginLogger.error(`卸载插件 ${pluginId} 失败: ${err}`);
        alert(t('plugins.manager.uninstallError', '卸载插件失败') + ': ' + (error as Error).message);
      } finally {
        setUninstalling(prev => ({ ...prev, [pluginId]: false }));
      }
    }
  }, [loadPlugins, t]);

  // 打开配置对话框
  const handleOpenConfig = useCallback((pluginId: string) => {
    setSelectedPluginId(pluginId);
    setIsConfigOpen(true);
  }, []);

  // 关闭配置对话框
  const handleCloseConfig = useCallback(() => {
    setIsConfigOpen(false);
    setSelectedPluginId(null);
  }, []);

  // 初始加载
  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="ml-2">{t('plugins.manager.loading', '加载中...')}</span>
      </div>
    );
  }

  if (plugins.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        <p>{t('plugins.manager.noPlugins', '没有已安装的插件')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plugins.map(plugin => (
          <Card key={plugin.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                {/* 标签显示，如果存在的话 */}
                <div className="text-xs text-gray-500">
                  {/* 使用已定义的ExtendedPlugin类型 */}
                  {plugin.tags?.join(', ') || ''}
                </div>
                <CardTitle className="text-lg">{plugin.name}</CardTitle>
                <Badge variant="outline">{plugin.version}</Badge>
              </div>
              <CardDescription className="line-clamp-2">{plugin.description}</CardDescription>
            </CardHeader>
            
            <CardContent className="pb-2">
              <div className="text-sm">
                <div><strong>{t('plugins.manager.author', '作者')}:</strong> {plugin.author || '-'}</div>
                {plugin.homepage && (
                  <div>
                    <strong>{t('plugins.manager.homepage', '主页')}:</strong> 
                    <a href={plugin.homepage} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                      {plugin.homepage}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between pt-2">
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenConfig(plugin.id)}
                >
                  <Settings className="w-4 h-4 mr-1" />
                  {t('plugins.manager.settings', '设置')}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectPlugin(plugin.id)}
                >
                  <Info className="w-4 h-4 mr-1" />
                  {t('plugins.manager.details', '详情')}
                </Button>
              </div>
              
              <div className="flex space-x-2">
                {updateAvailable[plugin.id] && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdate(plugin.id)}
                    disabled={updating[plugin.id]}
                  >
                    {updating[plugin.id] ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-1" />
                    )}
                    {t('plugins.manager.update', '更新')}
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUninstall(plugin.id)}
                  disabled={uninstalling[plugin.id]}
                >
                  {uninstalling[plugin.id] ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-1" />
                  )}
                  {t('plugins.manager.uninstall', '卸载')}
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {/* 插件配置对话框 */}
      {selectedPluginId && (
        <PluginConfigDialog
          pluginId={selectedPluginId}
          isOpen={isConfigOpen}
          onClose={handleCloseConfig}
        />
      )}
    </div>
  );
}
