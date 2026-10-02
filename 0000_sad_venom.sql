CREATE TABLE `cases` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`title` text NOT NULL,
	`area` text DEFAULT '' NOT NULL,
	`number` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'em andamento' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`visible_to_client` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_cases_contact_id` ON `cases` (`contact_id`);--> statement-breakpoint
CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`phone` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'lead' NOT NULL,
	`stage` text DEFAULT 'novo' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_contacts_email` ON `contacts` (`email`);--> statement-breakpoint
CREATE INDEX `idx_contacts_kind_stage` ON `contacts` (`kind`,`stage`);--> statement-breakpoint
CREATE TABLE `staff` (
	`email` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`contact_id` text NOT NULL,
	`case_id` text,
	`title` text NOT NULL,
	`due_at` text DEFAULT '' NOT NULL,
	`done` integer DEFAULT 0 NOT NULL,
	`visible_to_client` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`contact_id`) REFERENCES `contacts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`case_id`) REFERENCES `cases`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_tasks_contact_due` ON `tasks` (`contact_id`,`due_at`);