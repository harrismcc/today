import { Check, ArrowRight, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Todo, TodoStatus } from "@/db/schema"

interface TodoItemProps {
  todo: Todo
  onSetStatus: (id: string, status: TodoStatus) => void
  onDelete: (id: string) => void
}

export function TodoItem({ todo, onSetStatus, onDelete }: TodoItemProps) {
  const { id, text, status } = todo

  // Clicking an active status again returns the item to plain "todo".
  const toggle = (next: TodoStatus) => onSetStatus(id, status === next ? "todo" : next)

  return (
    <li className="flex items-start gap-3 py-2.5 sm:gap-4 sm:py-3">
      <Button
        type="button"
        variant="status"
        size="icon-xs"
        onClick={() => toggle("done")}
        aria-label={status === "done" ? "Mark as not done" : "Mark as done"}
        aria-pressed={status === "done"}
        className={cn(
          "mt-0.5 size-5 rounded-md sm:mt-1 sm:size-6",
          status === "done" && "border-done bg-done/10",
        )}
      >
        {status === "done" && <Check className="size-3.5 text-done animate-done-pop sm:size-4" strokeWidth={3} />}
      </Button>

      {/* Text and the two inline actions share one wrapping block, so the arrow
          and X always follow the end of the (possibly wrapped) text. */}
      <p className="min-w-0 flex-1 font-hand text-lg leading-relaxed sm:text-xl">
        <span
          className={cn(
            "transition-colors",
            status === "done" && "text-muted-foreground line-through",
            status === "postponed" && "italic text-postponed",
          )}
        >
          {text}
        </span>

        <span className="ml-2 inline-flex items-center gap-1 align-middle whitespace-nowrap sm:ml-3 sm:gap-1.5">
          <Button
            type="button"
            variant="quiet"
            size="icon-xs"
            onClick={() => toggle("postponed")}
            aria-label="Postpone to tomorrow"
            aria-pressed={status === "postponed"}
            className={cn(
              "rounded-md hover:text-postponed",
              status === "postponed" && "text-postponed",
            )}
          >
            <ArrowRight className="size-4 sm:size-[1.125rem]" strokeWidth={2.5} />
          </Button>
          <Button
            type="button"
            variant="quiet"
            size="icon-xs"
            onClick={() => onDelete(id)}
            aria-label="Delete this item"
            className="rounded-md hover:text-destructive"
          >
            <X className="size-4 sm:size-[1.125rem]" strokeWidth={2.5} />
          </Button>
        </span>
      </p>
    </li>
  )
}
