ALTER TABLE "authorization_codes" ADD COLUMN "nonce" varchar(255);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "token_hash" varchar(128) NOT NULL,
  "client_id" varchar(100) NOT NULL,
  "user_id" uuid NOT NULL,
  "scope" text,
  "expires_at" timestamp NOT NULL,
  "consumed_at" timestamp,
  "revoked_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
