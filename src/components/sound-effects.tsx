import type { ReactNode } from "react"
import { useFoley } from "@foleyjs/react"

export function SoundEffects({ children }: { children: ReactNode }) {
  useFoley({
    volume: 0.5,
    theme: "soft",
    localize: 0.25,
  })

  return <>{children}</>
}
