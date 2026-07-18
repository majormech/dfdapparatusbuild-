CREATE TABLE `apparatus` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`station_number` text,
	`is_reserve` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'Active' NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `apparatus_name_unique` ON `apparatus` (`name`);--> statement-breakpoint
CREATE TABLE `compartment_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`apparatus_type` text NOT NULL,
	`name` text NOT NULL,
	`compartment_type` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `compartments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`apparatus_id` integer NOT NULL,
	`name` text NOT NULL,
	`compartment_type` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`apparatus_id`) REFERENCES `apparatus`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`apparatus_id` integer,
	`compartment_id` integer,
	`name` text NOT NULL,
	`equipment_type` text,
	`equipment_id` text,
	`serial_number` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`make` text,
	`model` text,
	`description` text,
	`notes` text,
	`status` text DEFAULT 'In Service' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`apparatus_id`) REFERENCES `apparatus`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`compartment_id`) REFERENCES `compartments`(`id`) ON UPDATE no action ON DELETE no action
);
