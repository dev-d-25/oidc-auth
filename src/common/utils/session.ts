import crypto from "node:crypto";
import type { Response } from "express";

export const AUTH_SESSION_COOKIE_NAME =
  process.env.AUTH_SESSION_COOKIE_NAME ?? "autht_session";

const AUTH_SESSION_TTL_SECONDS = Number(process.env.AUTH_SESSION_TTL_SECONDS ?? "2592000");
const COOKIE_SECURE =
  process.env.COOKIE_SECURE === "true" || process.env.NODE_ENV === "production";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN;

export function getAuthSessionTtlSeconds() {
  return AUTH_SESSION_TTL_SECONDS;
}

export function hashSessionToken(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function generateAuthSessionToken() {
  return crypto.randomBytes(48).toString("base64url");
}

export function setAuthSessionCookie(res: Response, rawToken: string) {
  res.cookie(AUTH_SESSION_COOKIE_NAME, rawToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: "/",
    domain: COOKIE_DOMAIN,
    maxAge: AUTH_SESSION_TTL_SECONDS * 1000,
  });
}

export function clearAuthSessionCookie(res: Response) {
  res.clearCookie(AUTH_SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: COOKIE_SECURE,
    path: "/",
    domain: COOKIE_DOMAIN,
  });
}
