import { useEffect, useState, type ReactNode } from "react"
import { Volume2, VolumeX } from "lucide-react"
import { useFoley } from "@foleyjs/react"

import { Button } from "@/components/ui/button"

const MUTED_KEY = "today:sound-muted"

export function SoundEffects({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(false)
  const { play, set } = useFoley({
    volume: 0.5,
    theme: "soft",
    localize: 0.25,
  })

  useEffect(() => {
    const savedMuted = window.localStorage.getItem(MUTED_KEY) === "true"
    setMuted(savedMuted)
    set({ muted: savedMuted })
  }, [set])

  const toggleMuted = () => {
    const nextMuted = !muted
    setMuted(nextMuted)
    set({ muted: nextMuted })
    window.localStorage.setItem(MUTED_KEY, String(nextMuted))

    if (!nextMuted) play("on")
  }

  return (
    <>
      {children}
      <Button
        type="button"
        variant="outline"
        size="icon"
        sound={false}
        onClick={toggleMuted}
        aria-label={muted ? "Turn sounds on" : "Mute sounds"}
        aria-pressed={muted}
        className="fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 rounded-full bg-background/85 shadow-sm backdrop-blur-sm sm:right-4"
      >
        {muted ? <VolumeX /> : <Volume2 />}
      </Button>
    </>
  )
}
