CREATE TABLE `sessions` (
	`id` varchar(255) NOT NULL,
	`shop_id` int NOT NULL,
	`shop_domain` varchar(255) NOT NULL,
	`state` varchar(255),
	`is_online` boolean NOT NULL DEFAULT false,
	`scope` varchar(500),
	`access_token` varchar(255),
	`expires_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `sessions_id_shop_domain_idx` UNIQUE(`id`,`shop_domain`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`shop_id` int NOT NULL,
	`shopify_product_id` varchar(100) NOT NULL,
	`title` varchar(255) NOT NULL,
	`handle` varchar(255),
	`vendor` varchar(255),
	`product_type` varchar(255),
	`status` enum('active','draft','archived') NOT NULL DEFAULT 'active',
	`image_url` varchar(1000),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_shop_product_idx` UNIQUE(`shop_id`,`shopify_product_id`)
);
--> statement-breakpoint
CREATE TABLE `product_metrics` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`inventory_quantity` int NOT NULL DEFAULT 0,
	`reorder_point` int NOT NULL DEFAULT 10,
	`units_sold_30d` int NOT NULL DEFAULT 0,
	`views_30d` int NOT NULL DEFAULT 0,
	`conversion_rate` decimal(6,4) NOT NULL DEFAULT '0.0000',
	`gross_margin` decimal(6,4) NOT NULL DEFAULT '0.0000',
	`days_since_last_sale` int NOT NULL DEFAULT 0,
	`inventory_age_days` int NOT NULL DEFAULT 0,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_metrics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signal_rules` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`shop_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`inventory_risk_weight` int NOT NULL DEFAULT 25,
	`stale_stock_weight` int NOT NULL DEFAULT 20,
	`sell_through_weight` int NOT NULL DEFAULT 20,
	`margin_weight` int NOT NULL DEFAULT 15,
	`conversion_weight` int NOT NULL DEFAULT 10,
	`manual_priority_weight` int NOT NULL DEFAULT 10,
	`low_stock_threshold` int NOT NULL DEFAULT 10,
	`stale_stock_days` int NOT NULL DEFAULT 60,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `signal_rules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `signal_recommendations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`shop_id` int NOT NULL,
	`rule_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`recommendation_type` enum('feature_on_homepage','discount','bundle','restock','watch_inventory','archive_or_clearance') NOT NULL,
	`priority` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
	`score` int NOT NULL DEFAULT 0,
	`reason` text,
	`recommendation_status` enum('open','accepted','dismissed') NOT NULL DEFAULT 'open',
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `signal_recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recommendation_items` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`recommendation_id` int NOT NULL,
	`product_id` int NOT NULL,
	`role` enum('primary','bundle_pair','alternative') NOT NULL DEFAULT 'primary',
	`product_score` int NOT NULL DEFAULT 0,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recommendation_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `activity_logs` ADD `actor_type` enum('merchant','system') DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE `activity_logs` ADD `metadata` json;--> statement-breakpoint
ALTER TABLE `shops` ADD `scope` varchar(500);--> statement-breakpoint
ALTER TABLE `shops` ADD `installed_at` timestamp DEFAULT (now()) NOT NULL;