PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_todos` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`text` text NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`scheduled_date` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "todos_status_check" CHECK("__new_todos"."status" in ('todo', 'postponed', 'done'))
);
--> statement-breakpoint
INSERT INTO `__new_todos`("id", "user_id", "text", "status", "scheduled_date", "created_at", "updated_at", "deleted_at") SELECT "id", "user_id", "text", CASE WHEN "status" = 'canceled' THEN 'todo' ELSE "status" END, "scheduled_date", "created_at", "updated_at", CASE WHEN "status" = 'canceled' THEN "updated_at" ELSE NULL END FROM `todos`;--> statement-breakpoint
DROP TABLE `todos`;--> statement-breakpoint
ALTER TABLE `__new_todos` RENAME TO `todos`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `todos_user_scheduled_date_idx` ON `todos` (`user_id`,`scheduled_date`);
