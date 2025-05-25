import React from 'react';
import { Header } from '@/components/layout/header';
import { Main } from '@/components/layout/main';
import { TopNav } from '@/components/layout/top-nav';
import { ProfileDropdown } from '@/components/profile-dropdown';
import { Search } from '@/components/search';
import { ThemeSwitch } from '@/components/theme-switch';
import { LanguageSwitcher } from '@/components/language-switcher';

interface PluginLayoutProps {
  children: React.ReactNode;
  title?: string;
  navLinks?: {
    title: string;
    href: string;
    isActive: boolean;
    disabled?: boolean;
  }[];
}

/**
 * 通用插件布局组件
 * 为插件页面提供与主界面相同的工具栏结构
 */
export const PluginLayout: React.FC<PluginLayoutProps> = ({
  children,
  title,
  navLinks = [],
}) => {
  return (
    <>
      {/* ===== 顶部工具栏 ===== */}
      <Header>
        <TopNav links={navLinks} />
        <div className='ml-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <LanguageSwitcher />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== 主内容区域 ===== */}
      <Main>
        {title && (
          <div className='mb-4'>
            <h1 className='text-2xl font-bold tracking-tight'>{title}</h1>
          </div>
        )}
        {children}
      </Main>
    </>
  );
};
