import { StrictMode, Suspense } from 'react'
import ReactDOM from 'react-dom/client'
import { AxiosError } from 'axios'
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'
import { handleServerError } from '@/utils/handle-server-error'
import { FontProvider } from './context/font-context'
import { ThemeProvider } from './context/theme-context'
import './index.css'
// Generated Routes
import { routeTree } from './routeTree.gen'
import { registerPlugin, activateAllPlugins, activatePlugin } from './core/plugin-system'
import i18n from '@/i18n/config'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // 在开发环境中记录重试信息
        if (import.meta.env.DEV) {
          // 使用控制台输出重试信息，因为这里不能使用await
          // eslint-disable-next-line no-console
          console.debug('API请求重试', { failureCount, error });
        }

        if (failureCount >= 0 && import.meta.env.DEV) return false
        if (failureCount > 3 && import.meta.env.PROD) return false

        return !(
          error instanceof AxiosError &&
          [401, 403].includes(error.response?.status ?? 0)
        )
      },
      refetchOnWindowFocus: import.meta.env.PROD,
      staleTime: 10 * 1000, // 10s
    },
    mutations: {
      onError: (error) => {
        handleServerError(error)

        if (error instanceof AxiosError) {
          if (error.response?.status === 304) {
            toast.error('Content not modified!')
          }
        }
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          toast.error('Session expired!')
          useAuthStore.getState().auth.reset()
          const redirect = `${router.history.location.href}`
          router.navigate({ to: '/sign-in', search: { redirect } })
        }
        if (error.response?.status === 500) {
          toast.error('Internal Server Error!')
          router.navigate({ to: '/500' })
        }
        if (error.response?.status === 403) {
          // router.navigate("/forbidden", { replace: true });
        }
      }
    },
  }),
})

// 创建路由
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

// 加载插件
async function loadPlugins() {
  try {
    // 预先加载示例插件的翻译资源
    const exampleI18n = (await import('./features/plugins/example/i18n')).default;
    
    // 手动注册翻译资源
    const { namespace, resources } = exampleI18n;
    Object.entries(resources).forEach(([lng, translations]) => {
      if (translations) {
        // 确保翻译资源已加载
        i18n.addResourceBundle(lng, namespace, translations, true, true);
      }
    });
    
    // 确保命名空间已添加
    if (!i18n.options.ns?.includes(namespace)) {
      i18n.loadNamespaces(namespace);
    }
    
    // 导入示例插件
    const examplePluginFactory = (await import('./features/plugins/example')).default;
    
    // 创建插件翻译函数工厂
    const createPluginTranslator = (pluginId: string) => {
      return (key: string, defaultValue?: string) => {
        // 使用插件ID作为命名空间
        return i18n.t(key, { defaultValue, ns: pluginId });
      };
    };
    
    // 注册示例插件
    const examplePlugin = examplePluginFactory(createPluginTranslator('example'));
    await registerPlugin(examplePlugin);
    
    // 激活示例插件
    await activatePlugin('example');
    
    const { pluginLogger } = await import('./utils/logger');
    pluginLogger.info('示例插件已加载');
    
    // 动态导入其他插件（如果有）
    const pluginModules = import.meta.glob('./plugins/*/index.ts', { eager: true }) as Record<
      string,
      { default: any }
    >;
    
    // 注册所有其他插件
    for (const path in pluginModules) {
      const pluginFactory = pluginModules[path].default;
      // 从路径中提取插件ID
      const pathMatch = path.match(/\.\/plugins\/([^/]+)/);
      const pluginId = pathMatch ? pathMatch[1] : 'unknown';
      const plugin = pluginFactory(createPluginTranslator(pluginId));
      registerPlugin(plugin);
    }
    
    // 激活所有插件
    await activateAllPlugins();
  } catch (error) {
    const { pluginLogger } = await import('./utils/logger');
    const err = error instanceof Error ? error.message : String(error);
    pluginLogger.error(`加载插件失败: ${err}`);
  }
}

// 启动应用
async function bootstrap() {
  // 加载插件
  await loadPlugins();
  
    // 注意：插件路由现在通过静态路由文件定义在 routes/_authenticated/plugins/ 目录下
  // 不再需要动态注册路由

  // 注册路由类型
  declare module '@tanstack/react-router' {
    interface Register {
      router: typeof router
    }
  }

  // 渲染应用
  const rootElement = document.getElementById('root')!
  if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement)
    root.render(
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
            <FontProvider defaultFont="sans" storageKey="vite-ui-font">
              <RouterProvider router={router} />
            </FontProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </StrictMode>
    )
  }
}

bootstrap()
