CREATE TABLE "authorization_codes" (
	"code" varchar(100) PRIMARY KEY NOT NULL,
	"client_id" varchar(100) NOT NULL,
	"user_id" uuid NOT NULL,
	"code_challenge" varchar(100) NOT NULL,
	"code_challenge_method" varchar(10) NOT NULL,
	"redirect_uri" text NOT NULL,
	"scope" text,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_clients" (
	"client_id" varchar(100) PRIMARY KEY NOT NULL,
	"client_secret" varchar(100),
	"client_name" varchar(100) NOT NULL,
	"redirect_uris" text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
