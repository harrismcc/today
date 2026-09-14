CREATE TABLE `todos` (
	`id` text PRIMARY KEY NOT NULL,
	`text` text NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`scheduled_date` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "todos_status_check" CHECK("todos"."status" in ('todo', 'postponed', 'canceled', 'done'))
);
--> statement-breakpoint
CREATE INDEX `todos_scheduled_date_idx` ON `todos` (`scheduled_date`);