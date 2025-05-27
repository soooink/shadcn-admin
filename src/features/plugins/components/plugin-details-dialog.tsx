import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  IconPuzzle, 
  IconUser, 
  IconCalendar, 
  IconLink, 
  IconLicense, 
  IconPackage,
  IconBrandGithub,
  IconBug
} from '@tabler/icons-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { PluginItem } from '../data/plugins';

interface PluginDetailsDialogProps {
  plugin: PluginItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PluginDetailsDialog({
  plugin,
  open,
  onOpenChange
}: PluginDetailsDialogProps) {
  const { t } = useTranslation('plugins');

  if (!plugin) return null;

  const dependencies = plugin.dependencies || [];
  const hasPermissions = plugin.permissions && plugin.permissions.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="bg-muted flex size-12 items-center justify-center rounded-lg p-2">
              {plugin.icon || <IconPuzzle size={24} />}
            </div>
            <div>
              <DialogTitle className="text-xl">{plugin.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                <span>v{plugin.version}</span>
                {plugin.active && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300">
                    {t('active')}
                  </Badge>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">{t('details')}</TabsTrigger>
            <TabsTrigger value="dependencies">{t('dependencies')}</TabsTrigger>
            <TabsTrigger value="permissions">{t('permissions')}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">{t('description')}</h3>
                <p className="text-gray-600 dark:text-gray-300">{plugin.description}</p>
              </div>
              
              <Separator />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <IconUser size={16} className="text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{t('author')}: {plugin.author}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <IconCalendar size={16} className="text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t('lastUpdated')}: {plugin.lastUpdated || t('unknown')}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <IconLicense size={16} className="text-gray-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t('license')}: {plugin.license || t('unknown')}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {plugin.homepage && (
                    <div className="flex items-center gap-2">
                      <IconLink size={16} className="text-gray-500" />
                      <a 
                        href={plugin.homepage} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {t('homepage')}
                      </a>
                    </div>
                  )}
                  
                  {plugin.repository && (
                    <div className="flex items-center gap-2">
                      <IconBrandGithub size={16} className="text-gray-500" />
                      <a 
                        href={plugin.repository} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {t('repository')}
                      </a>
                    </div>
                  )}
                  
                  {plugin.issuesUrl && (
                    <div className="flex items-center gap-2">
                      <IconBug size={16} className="text-gray-500" />
                      <a 
                        href={plugin.issuesUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {t('reportIssue')}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              
              {plugin.tags && plugin.tags.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-medium mb-2">{t('tags')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {plugin.tags.map((tag) => (
                        <Badge key={tag} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="dependencies" className="mt-4">
            {dependencies.length > 0 ? (
              <div className="space-y-4">
                <h3 className="font-medium">{t('requiredDependencies')}</h3>
                <ul className="space-y-2">
                  {dependencies.map((dep) => (
                    <li key={dep.id} className="flex items-center gap-2 p-2 border rounded-md">
                      <IconPackage size={16} className="text-gray-500" />
                      <div>
                        <div className="font-medium">{dep.id}</div>
                        <div className="text-xs text-gray-500">v{dep.version}</div>
                      </div>
                      {dep.optional && (
                        <Badge variant="outline" className="ml-auto">
                          {t('optional')}
                        </Badge>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <IconPackage size={32} className="mx-auto mb-2 opacity-50" />
                <p>{t('noDependencies')}</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="permissions" className="mt-4">
            {hasPermissions ? (
              <div className="space-y-4">
                <h3 className="font-medium">{t('requiredPermissions')}</h3>
                <ul className="space-y-2">
                  {plugin.permissions?.map((permission) => (
                    <li key={permission.id} className="p-3 border rounded-md">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{permission.name}</div>
                        <Badge 
                          variant={permission.critical ? "destructive" : "outline"}
                          className={permission.critical ? "" : "bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"}
                        >
                          {permission.critical ? t('critical') : t('standard')}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {permission.description}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-500 italic">
                  {t('permissionsDisclaimer')}
                </p>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                <IconPackage size={32} className="mx-auto mb-2 opacity-50" />
                <p>{t('noPermissions')}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
