import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PluginLayout } from '@/features/plugins/common/plugin-layout';
import { Button } from '@/components/ui/button';

interface ExamplePageProps {
  // Add any props if needed
}

/**
 * Example page component for the example plugin
 */
const ExamplePage: React.FC<ExamplePageProps> = () => {
  const { t } = useTranslation('example');
  
  // 定义插件页面的顶部导航链接
  const navLinks = [
    {
      title: t('overview', '概览'),
      href: '/plugins/example',
      isActive: true,
      disabled: false,
    },
    {
      title: t('settingsTab', '设置'),
      href: '/plugins/example/settings',
      isActive: false,
      disabled: false,
    },
    {
      title: t('help', '帮助'),
      href: '/plugins/example/help',
      isActive: false,
      disabled: false,
    },
  ];
  
  return (
    <PluginLayout title={t('title', 'Example Plugin')} navLinks={navLinks}>
      <div className="grid gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('content.title', '插件内容')}</CardTitle>
            <Button size="sm">{t('actions.refresh', '刷新')}</Button>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {t('description', 'This is an example plugin page with toolbar')}
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('card1.title', '功能一')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {t('card1.description', '这是插件的第一个功能区域')}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('card2.title', '功能二')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {t('card2.description', '这是插件的第二个功能区域')}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">{t('card3.title', '功能三')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    {t('card3.description', '这是插件的第三个功能区域')}
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>
    </PluginLayout>
  );
};

export default ExamplePage;
