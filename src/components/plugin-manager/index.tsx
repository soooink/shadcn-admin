/**
 * 插件管理器组件
 * 提供插件的安装、卸载、更新和配置功能
 */
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { InstalledPlugins } from './installed-plugins';
import { PluginMarketplace } from './plugin-marketplace';
import { PluginDetails } from './plugin-details';
import { useTranslation } from 'react-i18next';

/**
 * 插件管理器组件
 */
export function PluginManager() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('installed');
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // 处理插件选择
  const handleSelectPlugin = (pluginId: string) => {
    setSelectedPluginId(pluginId);
    setIsDetailsOpen(true);
  };

  // 处理关闭详情
  const handleCloseDetails = () => {
    setIsDetailsOpen(false);
    setSelectedPluginId(null);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t('plugins.manager.title', '插件管理')}</h1>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="installed">{t('plugins.manager.installed', '已安装')}</TabsTrigger>
          <TabsTrigger value="marketplace">{t('plugins.manager.marketplace', '插件市场')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="installed">
          <InstalledPlugins onSelectPlugin={handleSelectPlugin} />
        </TabsContent>
        
        <TabsContent value="marketplace">
          <PluginMarketplace onSelectPlugin={handleSelectPlugin} />
        </TabsContent>
      </Tabs>
      
      {isDetailsOpen && selectedPluginId && (
        <PluginDetails 
          pluginId={selectedPluginId} 
          isOpen={isDetailsOpen}
          onClose={handleCloseDetails}
        />
      )}
    </div>
  );
}

export default PluginManager;
