CREATE TABLE `activity_logs` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`shop_id` int NOT NULL,
	`event_type` varchar(100) NOT NULL,
	`message` varchar(500) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shops` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`shop_domain` varchar(255) NOT NULL,
	`access_token` varchar(255),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shops_id` PRIMARY KEY(`id`),
	CONSTRAINT `shops_shop_domain_unique` UNIQUE(`shop_domain`)
);
