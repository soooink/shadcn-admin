import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ExamplePageProps {
  // Add any props if needed
}

/**
 * Example page component for the example plugin
 */
const ExamplePage: React.FC<ExamplePageProps> = () => {
  const { t } = useTranslation('example');
  
  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('title', 'Example Plugin')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            {t('description', 'This is an example plugin page')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExamplePage;
