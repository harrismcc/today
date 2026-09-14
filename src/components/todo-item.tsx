import { Check, ArrowRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Todo, TodoStatus } from "@/db/schema"

interface TodoItemProps {
  todo: Todo
  onSetStatus: (id: string, status: TodoStatus) => void
}

export function TodoItem({ todo, onSetStatus }: TodoItemProps) {
  const { id, text, status } = todo

  // Clicking an active status again returns the item to plain "todo".
  const toggle = (next: TodoStatus) => onSetStatus(id, status === next ? "todo" : next)

  return (
    <li className="flex items-start gap-3 py-2.5 sm:gap-4 sm:py-3">
      <button
        type="button"
        onClick={() => toggle("done")}
        aria-label={status === "done" ? "Mark as not done" : "Mark as done"}
        aria-pressed={status === "done"}
        className={cn(
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border border-border transition-colors sm:mt-1 sm:size-6",
          "hover:border-done/70",
          status === "done" && "border-done bg-done/10",
        )}
      >
        {status === "done" && <Check className="size-3.5 text-done animate-done-pop sm:size-4" strokeWidth={3} />}
      </button>

      {/* Text and the two inline actions share one wrapping block, so the arrow
          and X always follow the end of the (possibly wrapped) text. */}
      <p className="min-w-0 flex-1 font-hand text-lg leading-relaxed sm:text-xl">
        <span
          className={cn(
            "transition-colors",
            status === "done" && "text-muted-foreground line-through",
            status === "canceled" && "text-canceled/70 line-through",
            status === "postponed" && "italic text-postponed",
          )}
        >
          {text}
        </span>

        <span className="ml-2 inline-flex items-center gap-1 align-middle whitespace-nowrap sm:ml-3 sm:gap-1.5">
          <button
            type="button"
            onClick={() => toggle("postponed")}
            aria-label="Postpone to tomorrow"
            aria-pressed={status === "postponed"}
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-postponed",
              status === "postponed" && "text-postponed",
            )}
          >
            <ArrowRight className="size-4 sm:size-[1.125rem]" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={() => toggle("canceled")}
            aria-label="Cancel this item"
            aria-pressed={status === "canceled"}
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-canceled",
              status === "canceled" && "text-canceled",
            )}
          >
            <X className="size-4 sm:size-[1.125rem]" strokeWidth={2.5} />
          </button>
        </span>
      </p>
    </li>
  )
}
