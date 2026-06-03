import crypto from "node:crypto";
import {
  integer,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";

export const usersTable = sqliteTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  firstName: text("first_name"),
  lastName: text("last_name"),

  profileImageURL: text("profile_image_url"),

  email: text("email").notNull(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .default(false)
    .notNull(),

  password: text("password"),
  salt: text("salt"),

  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
    () => new Date(),
  ),
});

// OAuth Clients
export const oauthClientsTable = sqliteTable("oauth_clients", {
  clientId: text("client_id").primaryKey(),
  clientSecret: text("client_secret"),
  clientName: text("client_name").notNull(),
  redirectUris: text("redirect_uris").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

// Authorization Codes (for PKCE flow)
export const authorizationCodesTable = sqliteTable("authorization_codes", {
  code: text("code").primaryKey(),
  clientId: text("client_id").notNull(),
  userId: text("user_id").notNull(),
  codeChallenge: text("code_challenge").notNull(),
  codeChallengeMethod: text("code_challenge_method").notNull(),
  redirectUri: text("redirect_uri").notNull(),
  scope: text("scope"),
  nonce: text("nonce"),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  used: integer("used", { mode: "boolean" }).default(false).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const refreshTokensTable = sqliteTable("refresh_tokens", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  tokenHash: text("token_hash").notNull(),
  clientId: text("client_id").notNull(),
  userId: text("user_id").notNull(),
  scope: text("scope"),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  consumedAt: integer("consumed_at", { mode: "timestamp" }),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const authSessionsTable = sqliteTable(
  "auth_sessions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    sessionTokenHash: text("session_token_hash").notNull(),
    userId: text("user_id").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    revokedAt: integer("revoked_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .$defaultFn(() => new Date())
      .notNull(),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp" }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
  },
  (t) => [unique("session_token_hash_unique").on(t.sessionTokenHash)],
);
