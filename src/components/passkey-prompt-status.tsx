interface PasskeyPromptStatusProps {
  action: string
  embedded: boolean
  pending: boolean
}

export function PasskeyPromptStatus({
  action,
  embedded,
  pending,
}: PasskeyPromptStatusProps) {
  if (!embedded && !pending) return null

  return (
    <p
      role={pending ? 'status' : undefined}
      className="mt-3 text-center text-sm text-muted-foreground motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150 motion-safe:ease-out"
    >
      {embedded
        ? `Passkey prompts cannot open inside the preview. Continue in the new tab, then choose ${action} again.`
        : 'Look for the passkey prompt from your browser or device.'}
    </p>
  )
}
