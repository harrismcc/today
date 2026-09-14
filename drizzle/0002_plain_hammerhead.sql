DROP TABLE `todos`;--> statement-breakpoint
CREATE TABLE `todos` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`text` text NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`scheduled_date` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT "todos_status_check" CHECK("todos"."status" in ('todo', 'postponed', 'canceled', 'done')),
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `todos_user_scheduled_date_idx` ON `todos` (`user_id`,`scheduled_date`);
