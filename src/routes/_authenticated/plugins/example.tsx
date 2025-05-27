import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'

// 使用懒加载加载示例插件页面
const ExamplePage = lazy(() => import('@/features/plugins/example/pages/example-page'))

export const Route = createFileRoute('/_authenticated/plugins/example')({
  component: () => (
    <Suspense fallback={<div>加载中...</div>}>
      <ExamplePage />
    </Suspense>
  ),
})
