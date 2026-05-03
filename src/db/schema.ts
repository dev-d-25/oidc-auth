import {
  uuid,
  pgTable,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";
import type { PgTableWithColumns } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),

  firstName: varchar("first_name", { length: 25 }),
  lastName: varchar("last_name", { length: 25 }),

  profileImageURL: text("profile_image_url"),

  email: varchar("email", { length: 322 }).notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),

  password: varchar("password", { length: 66 }),
  salt: text("salt"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => new Date()),
});

// OAuth Clients
export const oauthClientsTable = pgTable("oauth_clients", {
  clientId: varchar("client_id", { length: 100 }).primaryKey(),
  clientSecret: varchar("client_secret", { length: 100 }),
  clientName: varchar("client_name", { length: 100 }).notNull(),
  redirectUris: text("redirect_uris").array().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Authorization Codes (for PKCE flow)
export const authorizationCodesTable = pgTable("authorization_codes", {
  code: varchar("code", { length: 100 }).primaryKey(),
  clientId: varchar("client_id", { length: 100 }).notNull(),
  userId: uuid("user_id").notNull(),
  codeChallenge: varchar("code_challenge", { length: 100 }).notNull(),
  codeChallengeMethod: varchar("code_challenge_method", {
    length: 10,
  }).notNull(),
  redirectUri: text("redirect_uri").notNull(),
  scope: text("scope"),
  nonce: varchar("nonce", { length: 255 }),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const refreshTokensTable = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: varchar("token_hash", { length: 128 }).notNull(),
  clientId: varchar("client_id", { length: 100 }).notNull(),
  userId: uuid("user_id").notNull(),
  scope: text("scope"),
  expiresAt: timestamp("expires_at").notNull(),
  consumedAt: timestamp("consumed_at"),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const authSessionsTable = pgTable("auth_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionTokenHash: varchar("session_token_hash", { length: 128 }).notNull().unique(),
  userId: uuid("user_id").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
});
