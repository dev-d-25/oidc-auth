CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`session_token_hash` text NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` integer NOT NULL,
	`last_seen_at` integer,
	`ip_address` text,
	`user_agent` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_hash_unique` ON `auth_sessions` (`session_token_hash`);--> statement-breakpoint
CREATE TABLE `authorization_codes` (
	`code` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`user_id` text NOT NULL,
	`code_challenge` text NOT NULL,
	`code_challenge_method` text NOT NULL,
	`redirect_uri` text NOT NULL,
	`scope` text,
	`nonce` text,
	`expires_at` integer NOT NULL,
	`used` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `oauth_clients` (
	`client_id` text PRIMARY KEY NOT NULL,
	`client_secret` text,
	`client_name` text NOT NULL,
	`redirect_uris` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`client_id` text NOT NULL,
	`user_id` text NOT NULL,
	`scope` text,
	`expires_at` integer NOT NULL,
	`consumed_at` integer,
	`revoked_at` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`first_name` text,
	`last_name` text,
	`profile_image_url` text,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`password` text,
	`salt` text,
	`created_at` integer NOT NULL,
	`updated_at` integer
);
