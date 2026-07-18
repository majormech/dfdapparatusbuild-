CREATE TABLE `inventory_import_batches` (
	`batch_id` text PRIMARY KEY NOT NULL,
	`source_name` text NOT NULL,
	`item_count` integer NOT NULL,
	`imported_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory_import_rows` (
	`source_key` text PRIMARY KEY NOT NULL,
	`batch_id` text NOT NULL,
	`equipment_id` text NOT NULL,
	`imported_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
