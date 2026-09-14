"use client"

import { useCallback, useRef } from "react"

// A short, satisfying two-note "ding" synthesized with the Web Audio API,
// so we don't need to ship an audio asset.
export function useDoneSound() {
  const ctxRef = useRef<AudioContext | null>(null)

  return useCallback(() => {
    if (typeof window === "undefined") return

    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      ctxRef.current = new AudioCtx()
    }

    const ctx = ctxRef.current
    if (ctx.state === "suspended") void ctx.resume()

    const now = ctx.currentTime
    // Two rising notes: C6 -> G6 for a bright, rewarding chime.
    const notes = [1046.5, 1567.98]

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = now + i * 0.08

      osc.type = "triangle"
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35)

      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.4)
    })
  }, [])
}
