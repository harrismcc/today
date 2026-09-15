import { Dialog } from '@base-ui/react/dialog'
import { X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { buttonVariants } from '@/components/ui/button'
import type { Todo } from '@/db/schema'

const AUTOSAVE_DELAY = 500
const urlPattern = /(?:https?:\/\/|www\.)[^\s<]+/gi

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]!,
  )
}

function linkedLine(text: string) {
  let content = ''
  let cursor = 0

  for (const match of text.matchAll(urlPattern)) {
    const start = match.index
    const matchedText = match[0]
    const url = matchedText.replace(/[),.!?;:]+$/, '')
    const href = url.toLowerCase().startsWith('www.') ? `https://${url}` : url

    content += escapeHtml(text.slice(cursor, start))
    content += `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer" class="font-medium text-foreground underline decoration-border underline-offset-3 transition-colors duration-100 hover:decoration-foreground">${escapeHtml(url)}</a>`
    if (matchedText.length > url.length) {
      content += escapeHtml(matchedText.slice(url.length))
    }
    cursor = start + matchedText.length
  }

  content += escapeHtml(text.slice(cursor))
  return content
}

function linkedBody(body: string) {
  return body
    .split('\n')
    .map((line) => linkedLine(line))
    .join('<br>')
}

export function TodoDetailsDialog({
  todo,
  onClose,
  onSave,
}: {
  todo: Todo
  onClose: () => void
  onSave: (details: { text: string; body: string | null }) => Promise<boolean>
}) {
  const [open, setOpen] = useState(true)
  const [text, setText] = useState(todo.text)
  const [body, setBody] = useState(todo.body ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleDraft = useRef(text)
  const bodyDraft = useRef(body)
  const lastSaved = useRef({ text, body })
  const saveTimer = useRef(0)
  const savingRef = useRef(false)
  const resaveRequested = useRef(false)
  const titleHtml = useMemo(() => ({ __html: escapeHtml(text) }), [text])
  const bodyHtml = useMemo(() => ({ __html: linkedBody(body) }), [body])

  const persistDraft = useCallback(async function persistDraft(): Promise<boolean> {
    window.clearTimeout(saveTimer.current)
    saveTimer.current = 0

    const nextText = titleDraft.current.trim()
    if (!nextText) {
      setError('A title is required.')
      return false
    }

    const normalizedBody = bodyDraft.current.trim()
    if (
      nextText === lastSaved.current.text &&
      normalizedBody === lastSaved.current.body
    ) {
      return true
    }
    if (savingRef.current) {
      resaveRequested.current = true
      return true
    }

    savingRef.current = true
    setSaving(true)
    setError(null)
    const saved = await onSave({ text: nextText, body: normalizedBody || null })
    savingRef.current = false
    setSaving(false)

    if (saved) {
      lastSaved.current = { text: nextText, body: normalizedBody }
    } else {
      setError('Details could not be saved. Try again.')
    }

    const changedWhileSaving =
      titleDraft.current.trim() !== nextText ||
      bodyDraft.current.trim() !== normalizedBody
    if (resaveRequested.current && changedWhileSaving) {
      resaveRequested.current = false
      return persistDraft()
    }
    resaveRequested.current = false

    return saved
  }, [onSave])

  const scheduleSave = useCallback(() => {
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => void persistDraft(), AUTOSAVE_DELAY)
  }, [persistDraft])

  useEffect(
    () => () => {
      window.clearTimeout(saveTimer.current)
    },
    [],
  )

  const close = () => {
    void persistDraft()
    setOpen(false)
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => (nextOpen ? setOpen(true) : close())}
      onOpenChangeComplete={(nextOpen) => !nextOpen && onClose()}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-[1px] transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 motion-reduce:transition-none" />
        <Dialog.Viewport className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4 sm:p-8">
          <Dialog.Popup className="relative w-full max-w-lg rounded-2xl bg-card p-5 text-card-foreground shadow-card ring-1 ring-foreground/10 outline-none transition-[opacity,transform] duration-150 ease-out data-[ending-style]:scale-[0.98] data-[ending-style]:opacity-0 data-[starting-style]:scale-[0.98] data-[starting-style]:opacity-0 motion-reduce:transform-none motion-reduce:transition-none sm:p-7">
            <Dialog.Close
              aria-label="Close todo details"
              data-foley-click="tap"
              className={buttonVariants({
                variant: 'quiet',
                size: 'icon',
                className: 'absolute top-3 right-3 rounded-md sm:top-4 sm:right-4',
              })}
            >
              <X className="size-4" />
            </Dialog.Close>

            <Dialog.Description className="sr-only">
              Edit the todo title and details directly. Changes save automatically.
            </Dialog.Description>

            <div className="pr-10 sm:pr-8">
              <Dialog.Title className="sr-only">Todo details</Dialog.Title>
              <label htmlFor="todo-detail-title" className="sr-only">
                Title
              </label>
              <div
                id="todo-detail-title"
                role="textbox"
                aria-label="Title"
                contentEditable="plaintext-only"
                suppressContentEditableWarning
                data-foley-type="thock"
                data-placeholder="Todo title"
                onInput={(event) => {
                  titleDraft.current = event.currentTarget.innerText.replace(/\r?\n/g, ' ')
                  setError(null)
                  scheduleSave()
                }}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter' || event.nativeEvent.isComposing) return

                  event.preventDefault()
                  event.currentTarget.blur()
                }}
                onBlur={() => {
                  const normalizedTitle = titleDraft.current.trim()
                  titleDraft.current = normalizedTitle
                  setText(normalizedTitle)
                  void persistDraft()
                }}
                className="min-h-9 break-words rounded-md px-2 py-1 font-hand text-2xl leading-tight outline-none transition-colors duration-100 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:ring-3 focus-visible:ring-ring/50 sm:text-3xl [&:empty]:before:pointer-events-none [&:empty]:before:text-muted-foreground/70 [&:empty]:before:content-[attr(data-placeholder)]"
                dangerouslySetInnerHTML={titleHtml}
              />

              <div className="relative mt-3 rounded-md transition-colors duration-100 hover:bg-muted/40 focus-within:bg-muted/40 focus-within:ring-3 focus-within:ring-ring/50">
                <div
                  role="textbox"
                  aria-label="Details"
                  aria-multiline="true"
                  contentEditable="plaintext-only"
                  suppressContentEditableWarning
                  data-foley-type="thock"
                  data-placeholder="Add details or paste a link…"
                  onInput={(event) => {
                    const nextBody = event.currentTarget.innerText.replace(/\r/g, '')
                    bodyDraft.current = nextBody
                    setError(null)
                    scheduleSave()
                  }}
                  onClick={(event) => {
                    const target = event.target
                    const link = target instanceof Element ? target.closest('a') : null
                    if (!(link instanceof HTMLAnchorElement)) return

                    event.preventDefault()
                    const url = new URL(link.href)
                    if (url.protocol === 'http:' || url.protocol === 'https:') {
                      window.open(url.href, '_blank', 'noopener,noreferrer')
                    }
                  }}
                  onBlur={() => {
                    const normalizedBody = bodyDraft.current.trim()
                    bodyDraft.current = normalizedBody
                    setBody(normalizedBody)
                    void persistDraft()
                  }}
                  className="min-h-14 whitespace-pre-wrap break-words px-2 py-2 text-base leading-relaxed text-muted-foreground outline-none [&:empty]:before:pointer-events-none [&:empty]:before:text-muted-foreground/70 [&:empty]:before:content-[attr(data-placeholder)]"
                  dangerouslySetInnerHTML={bodyHtml}
                />
              </div>

              <span role="status" aria-live="polite" className="sr-only">
                {saving ? 'Saving changes' : ''}
              </span>

              {error && (
                <p role="alert" className="mt-4 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
