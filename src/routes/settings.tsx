import { Link, Outlet, createFileRoute, redirect } from '@tanstack/react-router'

import { AppMenu } from '@/components/app-menu'
import { getSession } from '@/lib/auth-functions'

const navigationClassName =
  'block rounded-md px-3 py-2 text-sm transition-colors duration-100 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

export const Route = createFileRoute('/settings')({
  beforeLoad: async () => {
    if (!(await getSession())) throw redirect({ to: '/login' })
  },
  head: () => ({ meta: [{ title: 'Settings — Today' }] }),
  component: SettingsLayout,
})

function SettingsLayout() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-16">
      <header className="flex items-center justify-between">
        <Link
          to="/"
          data-foley-click="swoosh"
          className="font-hand text-2xl leading-none text-foreground underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Today
        </Link>
        <AppMenu />
      </header>

      <div className="mt-10 grid gap-8 sm:mt-14 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-12">
        <aside>
          <h1 className="font-hand text-4xl leading-tight text-foreground">Settings</h1>
          <nav aria-label="Settings" className="mt-5 space-y-1">
            <Link
              to="/settings"
              activeOptions={{ exact: true }}
              activeProps={{ className: 'bg-accent text-foreground' }}
              inactiveProps={{ className: 'text-muted-foreground' }}
              data-foley-click="swoosh"
              className={navigationClassName}
            >
              General
            </Link>
            <Link
              to="/settings/account"
              activeProps={{ className: 'bg-accent text-foreground' }}
              inactiveProps={{ className: 'text-muted-foreground' }}
              data-foley-click="swoosh"
              className={navigationClassName}
            >
              Account settings
            </Link>
          </nav>
        </aside>

        <section className="min-w-0 sm:pt-1">
          <Outlet />
        </section>
      </div>
    </main>
  )
}
