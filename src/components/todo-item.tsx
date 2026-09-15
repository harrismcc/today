import { Check, ArrowRight, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Todo } from "@/db/schema"
import type { TodoStatus } from "@/domain/todos"

interface TodoItemProps {
  todo: Todo
  pending: boolean
  onSetStatus: (id: string, status: TodoStatus, origin: { x: number; y: number }) => Promise<void>
  onPostpone: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function TodoItem({ todo, pending, onSetStatus, onPostpone, onDelete }: TodoItemProps) {
  const { id, text, status } = todo

  // Clicking an active status again returns the item to plain "todo".
  const toggle = (next: TodoStatus, target: HTMLButtonElement) => {
    const bounds = target.getBoundingClientRect()
    void onSetStatus(id, status === next ? "todo" : next, {
      x: (bounds.left + bounds.width / 2) / window.innerWidth,
      y: (bounds.top + bounds.height / 2) / window.innerHeight,
    })
  }

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -2 }}
      transition={{
        duration: 0.12,
        ease: "easeOut",
        layout: { duration: 0.12, ease: "easeOut" },
      }}
      aria-busy={pending}
      className="flex items-start gap-3 py-2.5 sm:gap-4 sm:py-3"
    >
      <Button
        type="button"
        variant="status"
        size="icon-xs"
        sound={false}
        disabled={pending}
        onClick={(event) => toggle("done", event.currentTarget)}
        aria-label={status === "done" ? "Mark as not done" : "Mark as done"}
        aria-pressed={status === "done"}
        className={cn(
          "mt-0.5 size-5 rounded-md sm:mt-1 sm:size-6",
          status === "done" && "border-done bg-done/10",
        )}
      >
        <AnimatePresence initial={false}>
          {status === "done" && (
            <motion.span
              key="check"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
            >
              <Check className="size-4 text-done sm:size-[1.125rem]" strokeWidth={4} />
            </motion.span>
          )}
        </AnimatePresence>
      </Button>

      {/* Text and the two inline actions share one wrapping block, so the arrow
          and X always follow the end of the (possibly wrapped) text. */}
      <p className="min-w-0 flex-1 font-hand text-lg leading-relaxed sm:text-xl">
        <span
          className={cn(
            "transition-colors duration-100",
            todo.postponedAt && "italic text-postponed",
            status === "done" && "text-muted-foreground line-through",
          )}
        >
          {text}
        </span>

        <span className="ml-2 inline-flex items-center gap-1 align-middle whitespace-nowrap sm:ml-3 sm:gap-1.5">
          <Button
            type="button"
            variant="quiet"
            size="icon-xs"
            sound={false}
            disabled={pending}
            onClick={() => void onPostpone(id)}
            aria-label="Move to next day"
            className="rounded-md hover:text-postponed"
          >
            <ArrowRight className="size-4 sm:size-[1.125rem]" strokeWidth={2.5} />
          </Button>
          <Button
            type="button"
            variant="quiet"
            size="icon-xs"
            sound={false}
            disabled={pending}
            onClick={() => void onDelete(id)}
            aria-label="Delete this item"
            className="rounded-md hover:text-destructive"
          >
            <X className="size-4 sm:size-[1.125rem]" strokeWidth={2.5} />
          </Button>
        </span>
      </p>
    </motion.li>
  )
}
