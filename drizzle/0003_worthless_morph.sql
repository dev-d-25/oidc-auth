CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token_hash" varchar(128) NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_seen_at" timestamp,
	"ip_address" text,
	"user_agent" text,
	CONSTRAINT "auth_sessions_session_token_hash_unique" UNIQUE("session_token_hash")
);
