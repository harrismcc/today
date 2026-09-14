import type { ReactNode } from 'react'

import { Card } from '@/components/ui/card'

export function AuthShell({ children, title }: { children: ReactNode; title: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md gap-0 overflow-visible rounded-2xl border border-border/70 bg-card/75 p-6 shadow-card ring-0 backdrop-blur-sm sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <img src="/logo.png" alt="" className="size-14 object-contain" />
          <div>
            <p className="font-hand text-2xl leading-none">Today</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              A simple list
            </p>
          </div>
        </div>

        <h1 className="font-hand text-4xl leading-tight text-foreground">{title}</h1>
        {children}
      </Card>
    </main>
  )
}
