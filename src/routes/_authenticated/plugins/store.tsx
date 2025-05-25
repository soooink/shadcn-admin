import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { PluginLayout } from '@/plugins/common/plugin-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { IconDownload, IconSearch, IconStar, IconStarFilled } from '@tabler/icons-react'

export const Route = createFileRoute('/_authenticated/plugins/store')({
  component: PluginStore,
})

// 模拟插件市场数据
const MOCK_PLUGINS = [
  {
    id: 'data-visualization',
    name: '数据可视化',
    version: '1.2.0',
    author: 'Core Team',
    description: '提供强大的数据可视化功能，支持多种图表类型和自定义样式。',
    stars: 4.8,
    downloads: 12580,
    tags: ['数据分析', '图表', '仪表盘'],
    category: 'analytics',
    isOfficial: true,
    thumbnail: 'https://via.placeholder.com/300x180?text=Data+Visualization',
  },
  {
    id: 'workflow-automation',
    name: '工作流自动化',
    version: '2.1.3',
    author: 'Automation Labs',
    description: '创建和管理自动化工作流，提高工作效率和减少重复任务。',
    stars: 4.5,
    downloads: 8750,
    tags: ['自动化', '工作流', '效率'],
    category: 'productivity',
    isOfficial: false,
    thumbnail: 'https://via.placeholder.com/300x180?text=Workflow+Automation',
  },
  {
    id: 'advanced-reporting',
    name: '高级报表',
    version: '1.5.2',
    author: 'Core Team',
    description: '创建专业的报表和分析文档，支持导出多种格式和定时发送。',
    stars: 4.7,
    downloads: 10320,
    tags: ['报表', '分析', '导出'],
    category: 'analytics',
    isOfficial: true,
    thumbnail: 'https://via.placeholder.com/300x180?text=Advanced+Reporting',
  },
  {
    id: 'team-collaboration',
    name: '团队协作',
    version: '3.0.1',
    author: 'Collaboration Tools Inc.',
    description: '增强团队协作功能，包括实时编辑、评论和任务分配。',
    stars: 4.6,
    downloads: 9430,
    tags: ['协作', '团队', '任务管理'],
    category: 'productivity',
    isOfficial: false,
    thumbnail: 'https://via.placeholder.com/300x180?text=Team+Collaboration',
  },
  {
    id: 'ai-assistant',
    name: 'AI 助手',
    version: '1.0.0',
    author: 'AI Solutions',
    description: '集成智能AI助手，提供内容生成、数据分析和智能建议。',
    stars: 4.9,
    downloads: 15670,
    tags: ['AI', '智能', '助手'],
    category: 'ai',
    isOfficial: false,
    thumbnail: 'https://via.placeholder.com/300x180?text=AI+Assistant',
  },
  {
    id: 'calendar-sync',
    name: '日历同步',
    version: '2.2.0',
    author: 'Productivity Tools',
    description: '与多种日历服务同步，管理日程和提醒。',
    stars: 4.3,
    downloads: 7850,
    tags: ['日历', '同步', '提醒'],
    category: 'productivity',
    isOfficial: false,
    thumbnail: 'https://via.placeholder.com/300x180?text=Calendar+Sync',
  },
  {
    id: 'security-audit',
    name: '安全审计',
    version: '1.3.5',
    author: 'Security Team',
    description: '提供全面的安全审计和监控功能，保护系统和数据安全。',
    stars: 4.7,
    downloads: 6320,
    tags: ['安全', '审计', '监控'],
    category: 'security',
    isOfficial: true,
    thumbnail: 'https://via.placeholder.com/300x180?text=Security+Audit',
  },
  {
    id: 'form-builder',
    name: '表单构建器',
    version: '2.4.1',
    author: 'Form Solutions',
    description: '拖拽式表单构建工具，轻松创建复杂表单和问卷。',
    stars: 4.5,
    downloads: 8920,
    tags: ['表单', '拖拽', '设计'],
    category: 'design',
    isOfficial: false,
    thumbnail: 'https://via.placeholder.com/300x180?text=Form+Builder',
  },
];

// 插件分类
const CATEGORIES = [
  { id: 'all', name: '全部' },
  { id: 'analytics', name: '数据分析' },
  { id: 'productivity', name: '生产力' },
  { id: 'ai', name: '人工智能' },
  { id: 'security', name: '安全' },
  { id: 'design', name: '设计' },
];

function PluginStore() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [installingPlugins, setInstallingPlugins] = useState<Record<string, boolean>>({});

  // 定义插件市场页面的顶部导航链接
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
      isActive: true,
      disabled: false,
    },
    {
      title: t('plugins.settings', '插件设置'),
      href: '/plugins/settings',
      isActive: false,
      disabled: true,
    },
  ];

  // 过滤插件
  const filteredPlugins = MOCK_PLUGINS.filter(plugin => {
    const matchesSearch = 
      searchTerm === '' || 
      plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      plugin.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = activeCategory === 'all' || plugin.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  // 模拟安装插件
  const installPlugin = (pluginId: string) => {
    setInstallingPlugins(prev => ({ ...prev, [pluginId]: true }));
    
    // 模拟安装过程
    setTimeout(() => {
      setInstallingPlugins(prev => ({ ...prev, [pluginId]: false }));
      // 这里可以添加安装成功的提示或其他逻辑
    }, 1500);
  };

  return (
    <PluginLayout title={t('plugins.store', '插件商店')} navLinks={navLinks}>
      <div className="container px-0 py-6">
        <div className="mb-8 flex flex-col gap-4">
          <p className="text-muted-foreground">
            {t('plugins.store.description', '浏览和安装插件以扩展系统功能。')}
          </p>
          
          {/* 搜索和过滤 */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('plugins.store.searchPlaceholder', '搜索插件...')}
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Tabs 
              defaultValue="all" 
              value={activeCategory}
              onValueChange={setActiveCategory}
              className="w-full sm:w-auto"
            >
              <TabsList className="w-full sm:w-auto">
                {CATEGORIES.map(category => (
                  <TabsTrigger key={category.id} value={category.id}>
                    {category.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* 插件列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPlugins.length > 0 ? (
            filteredPlugins.map(plugin => (
              <Card key={plugin.id} className="overflow-hidden flex flex-col">
                <div className="aspect-[16/9] relative overflow-hidden bg-muted">
                  <img 
                    src={plugin.thumbnail} 
                    alt={plugin.name}
                    className="object-cover w-full h-full transition-transform hover:scale-105"
                  />
                  {plugin.isOfficial && (
                    <Badge className="absolute top-2 right-2 bg-primary">
                      {t('plugins.store.official', '官方')}
                    </Badge>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{plugin.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <span>v{plugin.version}</span>
                        <span className="mx-1">•</span>
                        <span>{plugin.author}</span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center">
                      <IconStarFilled className="h-4 w-4 text-yellow-400" />
                      <span className="ml-1 text-sm">{plugin.stars}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-2 flex-grow">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {plugin.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {plugin.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="pt-2 flex justify-between items-center">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <IconDownload className="h-3.5 w-3.5 mr-1" />
                    {plugin.downloads.toLocaleString()}
                  </div>
                  <Button 
                    size="sm"
                    onClick={() => installPlugin(plugin.id)}
                    disabled={installingPlugins[plugin.id]}
                  >
                    {installingPlugins[plugin.id] 
                      ? t('plugins.store.installing', '安装中...') 
                      : t('plugins.store.install', '安装')}
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-10">
              <p className="text-muted-foreground">
                {t('plugins.store.noResults', '没有找到匹配的插件。')}
              </p>
            </div>
          )}
        </div>
      </div>
    </PluginLayout>
  );
}
