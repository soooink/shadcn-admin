import {
  IconBrowserCheck,
  IconChecklist,
  IconError404,
  IconHelp,
  IconLayoutDashboard,
  IconLock,
  IconMessages,
  IconSettings,
  IconUsers,
} from '@tabler/icons-react'
import { AudioWaveform, Command, GalleryVerticalEnd } from 'lucide-react'
import type { NavGroup, NavItem } from '../types'
import { getPlugins, isPluginActive, MenuGroup } from '@/core/plugin-system'
import type { TFunction } from 'i18next'

export const getSidebarData = (t: TFunction) => {
  // 获取所有已注册的插件
  const plugins = getPlugins().filter(plugin => isPluginActive(plugin.id));
  
  // 生成插件菜单项，按菜单分组分类
  type MenuItem = {title: string; url: string; icon: typeof IconBrowserCheck};
  const menuItemsByGroup = new Map<MenuGroup, Array<MenuItem>>(); 
  
  // 初始化所有菜单分组
  Object.values(MenuGroup).forEach(group => {
    menuItemsByGroup.set(group, []);
  });
  
  // 添加插件管理入口到插件分组
  menuItemsByGroup.get(MenuGroup.PLUGINS)?.push({
    title: t('nav.plugins.pluginManagement') || '插件管理',
    url: '/plugins',
    icon: IconBrowserCheck,
  });
  
  // 处理所有插件的菜单项
  plugins.forEach(plugin => {
    plugin.menuItems?.filter(item => item.showInMenu !== false).forEach(item => {
      const group = item.menuGroup || MenuGroup.PLUGINS;
      menuItemsByGroup.get(group)?.push({
        title: item.label,
        url: item.path,
        icon: IconBrowserCheck,
      });
    });
  });
  
  // 定义通用菜单项
  const generalItems: MenuItem[] = [
    {
      title: t('nav.dashboard') || 'Dashboard',
      url: '/',
      icon: IconLayoutDashboard,
    },
    {
      title: t('nav.tasks') || 'Tasks',
      url: '/tasks',
      icon: IconChecklist,
    },
    {
      title: t('nav.apps') || 'Apps',
      url: '/apps',
      icon: IconBrowserCheck,
    },
    {
      title: t('nav.messages') || 'Messages',
      url: '/chats',
      icon: IconMessages,
    },
    {
      title: t('nav.users') || 'Users',
      url: '/users',
      icon: IconUsers,
    },
  ];
  
  // 合并通用菜单项和插件提供的通用菜单项
  const combinedGeneralItems = [
    ...generalItems,
    ...(menuItemsByGroup.get(MenuGroup.GENERAL) || [])
  ];

  return {
    user: {
      name: 'satnaing',
      email: 'satnaingdev@gmail.com',
      avatar: '/avatars/shadcn.jpg',
    },
    teams: [
      {
        name: t('teams.shadcnAdmin') || 'Shadcn Admin',
        logo: Command,
        plan: t('plans.viteShadcnUI') || 'Vite + Shadcn UI',
      },
      {
        name: t('teams.acmeInc') || 'Acme Inc',
        logo: GalleryVerticalEnd,
        plan: t('plans.enterprise') || 'Enterprise',
      },
      {
        name: t('teams.acmeCorp') || 'Acme Corp',
        logo: AudioWaveform,
        plan: t('plans.startup') || 'Startup',
      },
    ],
    navGroups: [
      // 通用菜单组 (只有一个，包含基本项和插件项)
      {
        title: t('nav.general') || 'General',
        items: combinedGeneralItems as unknown as NavItem[],
      },
      
      // 页面菜单组
      {
        title: t('nav.pages') || 'Pages',
        items: [
          // 添加插件中属于页面菜单组的项目
          ...(menuItemsByGroup.get(MenuGroup.PAGES) || []) as unknown as NavItem[],
        {
          title: t('nav.authentication') || 'Authentication',
          icon: IconLock,
          items: [
            {
              title: t('auth.signIn') || 'Sign In',
              url: '/sign-in',
            },
            {
              title: t('auth.signUp') || 'Sign Up',
              url: '/sign-up',
            },
            {
              title: t('auth.forgotPassword') || 'Forgot Password',
              url: '/forgot-password',
            },
            {
              title: t('auth.otp') || 'OTP',
              url: '/otp',
            },
          ],
        },
        {
          title: t('nav.helpCenter') || 'Help Center',
          url: '/help-center',
          icon: IconHelp,
        },
        {
          title: t('nav.errorPages') || 'Error Pages',
          icon: IconError404,
          items: [
            {
              title: '401',
              url: '/401',
            },
            {
              title: '403',
              url: '/403',
            },
            {
              title: '404',
              url: '/404',
            },
            {
              title: '500',
              url: '/500',
            },
            {
              title: '503',
              url: '/503',
            },
          ],
        },
      ] satisfies NavItem[],
    },
    // 插件菜单组
    ...(menuItemsByGroup.get(MenuGroup.PLUGINS)?.length ? [{
      title: t('nav.plugins.title') || 'Plugins',
      items: (menuItemsByGroup.get(MenuGroup.PLUGINS) || []) as unknown as NavItem[],
    }] : []),
    {
      title: t('nav.settings') || 'Settings',
      items: [
        // 添加插件中属于设置菜单组的项目
        ...(menuItemsByGroup.get(MenuGroup.SETTINGS) || []) as unknown as NavItem[],
        {
          title: t('settings.title') || 'Settings',
          icon: IconSettings,
          items: [
            {
              title: t('settings.account') || 'Account',
              url: '/settings/account',
            },
            {
              title: t('settings.appearance') || 'Appearance',
              url: '/settings/appearance',
            },
            {
              title: t('settings.display') || 'Display',
              url: '/settings/display',
            },
            {
              title: t('settings.notifications') || 'Notifications',
              url: '/settings/notifications',
            },
          ],
        },
      ] satisfies NavItem[],
    },
  ] satisfies NavGroup[]
  };
}
  