import { Menu } from '@base-ui/react/menu'
import { play } from '@foleyjs/react'
import { Eraser, LogOut, Menu as MenuIcon, Settings } from 'lucide-react'
import { useRef, useState } from 'react'

import { buttonVariants } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

const itemClassName =
  'flex cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none transition-colors duration-100 data-highlighted:bg-accent data-highlighted:text-foreground'
const signOutErrorMessage = 'Unable to log out. Please try again.'

export function AppMenu() {
  const [signOutError, setSignOutError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const signingOutRef = useRef(false)

  const signOut = async () => {
    if (signingOutRef.current) return

    signingOutRef.current = true
    setSignOutError('')
    setSigningOut(true)

    try {
      const result = await authClient.signOut()
      if (result.error) {
        play('error')
        setSignOutError(signOutErrorMessage)
        return
      }

      play('whoosh')
      window.location.replace('/login')
    } catch {
      play('error')
      setSignOutError(signOutErrorMessage)
    } finally {
      signingOutRef.current = false
      setSigningOut(false)
    }
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Open menu"
        data-foley-click="tap"
        className={buttonVariants({
          variant: 'quiet',
          size: 'icon',
          className: 'rounded-md',
        })}
      >
        <MenuIcon className="size-5" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={6} className="z-50">
          <Menu.Popup className="min-w-40 origin-top-right rounded-lg bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/10 outline-none data-ending-style:opacity-0 data-starting-style:opacity-0 motion-safe:transition-[opacity,transform] motion-safe:duration-150 motion-safe:ease-out motion-safe:data-ending-style:scale-[0.98] motion-safe:data-starting-style:scale-[0.98]">
            <Menu.LinkItem
              href="/cleanup"
              closeOnClick
              data-foley-click="swoosh"
              className={itemClassName}
            >
              <Eraser className="size-4 text-muted-foreground" />
              Clean up
            </Menu.LinkItem>
            <Menu.LinkItem
              href="/settings"
              closeOnClick
              data-foley-click="swoosh"
              className={itemClassName}
            >
              <Settings className="size-4 text-muted-foreground" />
              Settings
            </Menu.LinkItem>
            <Menu.Separator className="my-1 h-px bg-border/70" />
            <Menu.Item
              closeOnClick={false}
              disabled={signingOut}
              onClick={() => void signOut()}
              className={itemClassName}
            >
              <LogOut className="size-4 text-muted-foreground" />
              {signingOut ? 'Logging out…' : 'Log out'}
            </Menu.Item>
            {signOutError && (
              <p role="alert" className="max-w-56 px-2.5 py-2 text-sm text-destructive">
                {signOutError}
              </p>
            )}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}
