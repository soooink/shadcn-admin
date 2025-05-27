import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  IconPuzzle, 
  IconSettings, 
  IconInfoCircle,
  IconTrash,
  IconDownload,
  IconRefresh
} from '@tabler/icons-react';

import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import type { PluginItem } from '../data/plugins';

interface PluginCardProps {
  plugin: PluginItem;
  onToggle: (pluginId: string, isActive: boolean) => Promise<void>;
  onConfigure?: (pluginId: string) => void;
  onUninstall?: (pluginId: string) => void;
  onUpdate?: (pluginId: string) => void;
  onViewDetails?: (pluginId: string) => void;
}

export function PluginCard({
  plugin,
  onToggle,
  onConfigure,
  onUninstall,
  onUpdate,
  onViewDetails
}: PluginCardProps) {
  const { t } = useTranslation('plugins');
  const [isLoading, setIsLoading] = React.useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      await onToggle(plugin.id, plugin.active);
    } finally {
      setIsLoading(false);
    }
  };

  const hasUpdate = plugin.hasUpdate;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex size-10 items-center justify-center rounded-lg p-2">
              {plugin.icon || <IconPuzzle size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{plugin.name}</CardTitle>
                <span className="text-xs text-muted-foreground">v{plugin.version}</span>
              </div>
              <CardDescription className="text-xs">{plugin.author}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasUpdate && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8 text-yellow-600"
                      onClick={() => onUpdate?.(plugin.id)}
                    >
                      <IconRefresh size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('updateAvailable')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Switch
              checked={plugin.active}
              onCheckedChange={handleToggle}
              disabled={isLoading}
              aria-label={plugin.active ? t('deactivate') : t('activate')}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-2 text-sm text-gray-600 dark:text-gray-300 min-h-[40px]">
          {plugin.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {plugin.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-2 pb-3 border-t">
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8"
                  onClick={() => onViewDetails?.(plugin.id)}
                >
                  <IconInfoCircle size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('viewDetails')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-red-600"
                  onClick={() => onUninstall?.(plugin.id)}
                >
                  <IconTrash size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('uninstall')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        
        {plugin.active && plugin.menuItems?.some(item => item.menuGroup === 'settings') && (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs"
            onClick={() => onConfigure?.(plugin.id)}
          >
            <IconSettings size={14} className="mr-1" />
            {t('configure')}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
