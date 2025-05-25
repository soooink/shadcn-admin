import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/plugins')({
  component: PluginsLayout,
})

function PluginsLayout() {
  return <Outlet />
}
