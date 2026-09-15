import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/settings/')({
  component: GeneralSettings,
})

function GeneralSettings() {
  return <h2 className="text-xl font-medium">General</h2>
}
