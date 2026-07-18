CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`action` text NOT NULL,
	`actor` text NOT NULL,
	`item_id` integer,
	`item_name` text NOT NULL,
	`apparatus_name` text NOT NULL,
	`compartment_name` text NOT NULL,
	`details` text DEFAULT '' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE `inventory_items` ADD `created_by` text DEFAULT 'First Due import' NOT NULL;