import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  IconUpload, 
  IconSearch, 
  IconPackage,
  IconAlertCircle,
  IconCheck
} from '@tabler/icons-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import { getPluginSystemIntegration } from '@/core/plugin-system-integration';

interface PluginInstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInstallSuccess: () => void;
}

export function PluginInstallDialog({
  open,
  onOpenChange,
  onInstallSuccess
}: PluginInstallDialogProps) {
  const { t } = useTranslation('plugins');
  const [activeTab, setActiveTab] = React.useState('marketplace');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  
  // 定义插件类型
  interface PluginPackage {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    downloads?: number;
    tags?: string[];
  }
  
  // 扩展插件类型，包含文件数据
  interface PluginPackageExtended extends PluginPackage {
    _fileData?: ArrayBuffer | string;
  }
  
  const [searchResults, setSearchResults] = React.useState<PluginPackage[]>([]);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [installProgress, setInstallProgress] = React.useState(0);
  const [installStatus, setInstallStatus] = React.useState<'idle' | 'installing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = React.useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // 重置状态
  React.useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setSelectedFile(null);
      setInstallProgress(0);
      setInstallStatus('idle');
      setErrorMessage('');
    }
  }, [open]);

  // 搜索插件市场
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const integration = getPluginSystemIntegration();
      const results = await integration.searchPluginMarket(searchQuery);
      setSearchResults(results.items || []);
    } catch (error) {
      // 生产环境中静默处理错误
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.error('Failed to search plugin market:', error);
      }
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理文件选择
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  // 处理文件拖放
  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  // 安装插件
  const installPlugin = async (pluginData: PluginPackage | null) => {
    setInstallStatus('installing');
    setInstallProgress(10);
    
    try {
      const integration = getPluginSystemIntegration();
      
      // 模拟进度
      const progressInterval = setInterval(() => {
        setInstallProgress(prev => {
          const next = prev + Math.random() * 10;
          return next > 90 ? 90 : next;
        });
      }, 300);
      
      // 安装插件
      let success;
      if (activeTab === 'marketplace' && pluginData) {
        // 从市场安装
        success = await integration.installPlugin(pluginData as PluginPackageExtended);
      } else if (selectedFile) {
        // 从本地文件安装
        // 解析插件文件
        const pluginPackage = await parsePluginFile(selectedFile);
        success = await integration.installPlugin(pluginPackage);
      } else {
        throw new Error(t('noPluginSelected') || 'No plugin selected');
      }
      
      clearInterval(progressInterval);
      
      if (success) {
        setInstallProgress(100);
        setInstallStatus('success');
        setTimeout(() => {
          onInstallSuccess();
          onOpenChange(false);
        }, 1500);
      } else {
        setInstallStatus('error');
        setErrorMessage(t('installFailed'));
      }
    } catch (error) {
      setInstallStatus('error');
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  };
  
  // 解析插件文件
  const parsePluginFile = (file: File): Promise<PluginPackageExtended> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          // 根据文件类型处理
          const fileExtension = file.name.split('.').pop()?.toLowerCase();
          const content = e.target?.result as string;
          
          if (fileExtension === 'json') {
            // JSON格式插件
            const pluginData = JSON.parse(content);
            // 验证插件数据结构
            if (!pluginData.id || !pluginData.name || !pluginData.version) {
              reject(new Error(t('invalidPluginFile')));
              return;
            }
            resolve(pluginData);
          } else if (fileExtension === 'zip') {
            // ZIP格式插件 - 这里需要实际的ZIP解析逻辑
            // 由于浏览器端无法直接解析ZIP，可能需要服务端支持
            // 这里简单模拟一个成功的解析
            const pluginData: PluginPackageExtended = {
              id: `plugin-${Date.now()}`,
              name: file.name.replace('.zip', ''),
              version: '1.0.0',
              description: t('uploadedPlugin') || 'Uploaded Plugin',
              author: 'Unknown',
              _fileData: e.target?.result || new ArrayBuffer(0)
            };
            resolve(pluginData);
          } else {
            reject(new Error(t('unsupportedFileFormat')));
          }
        } catch (error) {
          // 生产环境中静默处理错误
          if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error('Plugin parse error:', error);
          }
          reject(new Error(t('invalidPluginFile')));
        }
      };
      
      reader.onerror = () => reject(new Error(t('fileReadError')));
      
      // 根据文件类型决定如何读取
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (fileExtension === 'json') {
        reader.readAsText(file);
      } else if (fileExtension === 'zip') {
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error(t('unsupportedFileFormat')));
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t('installPlugin')}</DialogTitle>
          <DialogDescription>
            {installStatus === 'idle' ? t('description') : ''}
          </DialogDescription>
        </DialogHeader>

        {installStatus === 'installing' && (
          <div className="py-8 text-center">
            <h3 className="font-medium mb-4">{t('installingPlugin')}</h3>
            <Progress value={installProgress} className="mb-2 h-2 w-full" />
            <p className="text-sm text-gray-500 mt-2">{t('pleaseWait')}</p>
          </div>
        )}

        {installStatus === 'success' && (
          <div className="py-8 text-center">
            <IconCheck size={48} className="mx-auto mb-4 text-green-500" />
            <h3 className="font-medium mb-2">{t('installSuccess')}</h3>
            <p className="text-sm text-gray-500">{t('pluginInstalledSuccessfully')}</p>
            <Button 
              className="mt-4" 
              onClick={() => {
                onOpenChange(false);
                onInstallSuccess();
              }}
            >
              {t('close')}
            </Button>
          </div>
        )}

        {installStatus === 'error' && (
          <Alert variant="destructive" className="mb-4">
            <IconAlertCircle className="h-4 w-4" />
            <AlertTitle>{t('installFailed')}</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {installStatus === 'idle' && (
          <Tabs defaultValue="marketplace" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="marketplace">{t('marketplace')}</TabsTrigger>
              <TabsTrigger value="upload">{t('uploadFile')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="marketplace" className="mt-4 space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder={t('searchPlugins')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={isLoading}>
                  {isLoading ? t('searching') : t('search')}
                </Button>
              </div>
              
              {searchResults.length > 0 ? (
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                  {searchResults.map((plugin) => (
                    <div 
                      key={plugin.id} 
                      className="flex items-center justify-between p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{plugin.name}</h3>
                          <span className="text-xs text-gray-500">v{plugin.version}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{plugin.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">{plugin.author}</span>
                          {plugin.downloads && (
                            <Badge variant="outline" className="text-xs">
                              {plugin.downloads} {t('downloads')}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => installPlugin(plugin)}
                      >
                        {t('install')}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                searchQuery && !isLoading && (
                  <div className="py-8 text-center text-gray-500">
                    <IconSearch size={32} className="mx-auto mb-2 opacity-50" />
                    <p>{t('noPluginsFound')}</p>
                  </div>
                )
              )}
            </TabsContent>
            
            <TabsContent value="upload" className="mt-4">
              <div
                className="border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".json,.zip"
                  onChange={handleFileChange}
                />
                <IconUpload size={32} className="mx-auto mb-2 text-gray-400" />
                <h3 className="font-medium mb-1">{t('dragAndDropPlugin')}</h3>
                <p className="text-sm text-gray-500 mb-4">{t('orClickToUpload')}</p>
                <p className="text-xs text-gray-400">{t('supportedFormats')}</p>
              </div>
              
              {selectedFile && (
                <div className="mt-4">
                  <div className="p-3 border rounded-md bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconPackage size={16} />
                        <span className="font-medium">{selectedFile.name}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          {installStatus === 'idle' && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('cancel')}
              </Button>
              {activeTab === 'upload' && selectedFile && (
                <Button onClick={() => installPlugin(null)}>
                  {t('install')}
                </Button>
              )}
            </>
          )}
          
          {installStatus === 'error' && (
            <Button variant="outline" onClick={() => setInstallStatus('idle')}>
              {t('tryAgain')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
