DELETE FROM `user` WHERE `email` LIKE '%@passkey.invalid';--> statement-breakpoint
DROP TABLE `passkey`;
