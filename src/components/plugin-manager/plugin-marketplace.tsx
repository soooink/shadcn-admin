/**
 * 插件市场组件
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, Download, Info, Search } from 'lucide-react';
import { getPluginSystemIntegration } from '../../core/plugin-system-integration';
import { getPluginMarketService } from '../../core/plugin-market';
import { pluginLogger } from '../../utils/logger';

// 定义插件市场项目的接口
interface MarketplacePlugin {
  id: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  tags?: string[];
  downloads?: number;
  downloadUrl: string;
  category?: string;
}

interface PluginMarketplaceProps {
  onSelectPlugin: (pluginId: string) => void;
}

export function PluginMarketplace({ onSelectPlugin }: PluginMarketplaceProps) {
  const { t } = useTranslation();
  const [plugins, setPlugins] = useState<MarketplacePlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [installing, setInstalling] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('popular');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);

  // 加载插件列表
  const loadPlugins = useCallback(async () => {
    setLoading(true);
    try {
      const pluginSystem = getPluginSystemIntegration();
      const result = await pluginSystem.searchPluginMarket(searchQuery, {
        page,
        pageSize: 12,
        category: category === 'all' ? undefined : category,
        sort
      });
      
      setPlugins(result.items || []);
      setTotalPages(Math.ceil((result.total || 0) / 12));
      
      // 加载分类列表（仅首次加载）
      if (categories.length === 0) {
        loadCategories();
      }
    } catch (error) {
      pluginLogger.error('加载插件市场失败:', error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page, category, sort, categories.length]);

  // 加载分类列表
  const loadCategories = async () => {
    try {
      const marketService = getPluginMarketService();
      const cats = await marketService.getCategories();
      setCategories(cats || []);
    } catch (error) {
      pluginLogger.error('加载插件分类失败:', error);
    }
  };

  // 安装插件
  const handleInstall = async (plugin: MarketplacePlugin) => {
    setInstalling(prev => ({ ...prev, [plugin.id]: true }));
    
    try {
      const pluginSystem = getPluginSystemIntegration();
      const success = await pluginSystem.installPlugin({
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        url: plugin.downloadUrl
      });
      
      if (success) {
        alert(t('plugins.marketplace.installSuccess', '插件安装成功'));
      } else {
        alert(t('plugins.marketplace.installFailed', '插件安装失败'));
      }
    } catch (error) {
      pluginLogger.error(`安装插件 ${plugin.id} 失败:`, error);
      alert(t('plugins.marketplace.installError', '安装插件失败') + ': ' + (error as Error).message);
    } finally {
      setInstalling(prev => ({ ...prev, [plugin.id]: false }));
    }
  };

  // 处理搜索
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadPlugins();
  };

  // 处理分类变更
  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setPage(1);
  };

  // 处理排序变更
  const handleSortChange = (value: string) => {
    setSort(value);
    setPage(1);
  };

  // 处理页码变更
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // 监听筛选条件变化
  useEffect(() => {
    loadPlugins();
  }, [category, sort, page, loadPlugins]);

  // 初始加载
  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  return (
    <div>
      {/* 搜索和筛选 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <Input
            placeholder={t('plugins.marketplace.searchPlaceholder', '搜索插件...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit">
            <Search className="w-4 h-4 mr-2" />
            {t('plugins.marketplace.search', '搜索')}
          </Button>
        </form>
        
        <div className="flex gap-2">
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('plugins.marketplace.category', '分类')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('plugins.marketplace.allCategories', '全部分类')}</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('plugins.marketplace.sort', '排序')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="popular">{t('plugins.marketplace.sortPopular', '热门')}</SelectItem>
              <SelectItem value="newest">{t('plugins.marketplace.sortNewest', '最新')}</SelectItem>
              <SelectItem value="rating">{t('plugins.marketplace.sortRating', '评分')}</SelectItem>
              <SelectItem value="downloads">{t('plugins.marketplace.sortDownloads', '下载量')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {/* 加载中 */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2">{t('plugins.marketplace.loading', '加载中...')}</span>
        </div>
      )}
      
      {/* 无结果 */}
      {!loading && plugins.length === 0 && (
        <div className="text-center p-8">
          <p className="text-lg text-muted-foreground">
            {t('plugins.marketplace.noPluginsFound', '未找到插件')}
          </p>
        </div>
      )}
      
      {/* 插件列表 */}
      {!loading && plugins.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plugins.map(plugin => (
            <Card key={plugin.id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{plugin.name}</CardTitle>
                  <Badge variant="outline">{plugin.version}</Badge>
                </div>
                <CardDescription className="line-clamp-2">{plugin.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="pb-2">
                <div className="flex flex-wrap gap-2 text-xs">
                  {plugin.tags?.map((tag: string) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="mt-2 text-sm">
                  <span className="text-muted-foreground">
                    {t('plugins.marketplace.author', '作者')}: {plugin.author}
                  </span>
                  <span className="mx-2">•</span>
                  <span className="text-muted-foreground">
                    {t('plugins.marketplace.downloads', '下载量')}: {plugin.downloads}
                  </span>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between pt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onSelectPlugin(plugin.id)}
                >
                  <Info className="w-4 h-4 mr-1" />
                  {t('plugins.marketplace.details', '详情')}
                </Button>
                
                <Button 
                  variant="default" 
                  size="sm"
                  disabled={installing[plugin.id]}
                  onClick={() => handleInstall(plugin)}
                >
                  {installing[plugin.id] ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 mr-1" />
                  )}
                  {t('plugins.marketplace.install', '安装')}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => handlePageChange(page - 1)}
            >
              {t('plugins.marketplace.previous', '上一页')}
            </Button>
            
            <div className="flex items-center px-4">
              {t('plugins.marketplace.page', '第 {{page}} 页，共 {{total}} 页', { page, total: totalPages })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => handlePageChange(page + 1)}
            >
              {t('plugins.marketplace.next', '下一页')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
