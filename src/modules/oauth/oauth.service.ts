import crypto from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import type { Response } from "express";
import { db } from "../../db/index.js";
import {
  authorizationCodesTable,
  authSessionsTable,
  oauthClientsTable,
  refreshTokensTable,
  usersTable,
} from "../../db/schema.js";
import { signJwt } from "../../common/utils/jwt.js";
import {
  AUTH_SESSION_COOKIE_NAME,
  clearAuthSessionCookie,
  generateAuthSessionToken,
  getAuthSessionTtlSeconds,
  hashSessionToken,
  setAuthSessionCookie,
} from "../../common/utils/session.js";
import {
  buildIdTokenPayload,
  getIssuer,
} from "../openid/openid.service.js";
import type {
  AuthorizeInput,
  SignInInput,
  SignUpInput,
  TokenInput,
} from "./oauth.dto.js";

const ACCESS_TOKEN_TTL_SECONDS = Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? "300");
const REFRESH_TOKEN_TTL_SECONDS = Number(process.env.REFRESH_TOKEN_TTL_SECONDS ?? "2592000");

export { AUTH_SESSION_COOKIE_NAME, clearAuthSessionCookie };

function hashValue(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function generateRefreshTokenValue() {
  return crypto.randomBytes(48).toString("base64url");
}

async function getUserById(userId: string) {
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  return user ?? null;
}

export function generateCodeChallenge(
  codeVerifier: string,
  method: "S256" | "plain" = "S256",
): string {
  if (method === "plain") {
    return codeVerifier;
  }

  return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
}

export function verifyCodeChallenge(
  codeVerifier: string,
  codeChallenge: string,
  method: string,
): boolean {
  const normalizedMethod = method === "plain" ? "plain" : "S256";
  return generateCodeChallenge(codeVerifier, normalizedMethod) === codeChallenge;
}

export async function validateClient(clientId: string, redirectUri: string) {
  const [client] = await db
    .select({
      clientId: oauthClientsTable.clientId,
      redirectUris: oauthClientsTable.redirectUris,
    })
    .from(oauthClientsTable)
    .where(eq(oauthClientsTable.clientId, clientId))
    .limit(1);

  if (!client) {
    return { valid: false, error: "Invalid client_id" };
  }

  if (!client.redirectUris.includes(redirectUri)) {
    return { valid: false, error: "Invalid redirect_uri" };
  }

  return { valid: true, client };
}

export async function validateAuthorizeRequest(input: AuthorizeInput) {
  const clientValidation = await validateClient(input.client_id, input.redirect_uri);
  if (!clientValidation.valid) {
    return clientValidation;
  }

  if (!input.code_challenge) {
    return { valid: false, error: "Missing code_challenge" };
  }

  if (!input.code_challenge_method) {
    return { valid: false, error: "Missing code_challenge_method" };
  }

  return { valid: true, client: clientValidation.client };
}

export async function authenticateUser(email: string, password: string) {
  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      password: usersTable.password,
      salt: usersTable.salt,
    })
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user?.password || !user.salt) {
    return { success: false, error: "Invalid credentials" };
  }

  const hashedPassword = crypto
    .createHash("sha256")
    .update(password + user.salt)
    .digest("hex");

  if (hashedPassword !== user.password) {
    return { success: false, error: "Invalid credentials" };
  }

  return { success: true, user: { id: user.id, email: user.email } };
}

export async function registerUser(input: Pick<SignUpInput, "email" | "password" | "firstName" | "lastName">) {
  const [existingUser] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, input.email))
    .limit(1);

  if (existingUser) {
    return { success: false, error: "User already exists" };
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const hashedPassword = crypto
    .createHash("sha256")
    .update(input.password + salt)
    .digest("hex");

  const [newUser] = await db
    .insert(usersTable)
    .values({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      password: hashedPassword,
      salt,
    })
    .returning({ id: usersTable.id, email: usersTable.email });

  return { success: true, user: newUser };
}

export async function createAuthSession(
  userId: string,
  options: {
    ipAddress?: string;
    userAgent?: string;
    res: Response;
  },
) {
  const rawToken = generateAuthSessionToken();
  const expiresAt = new Date(Date.now() + getAuthSessionTtlSeconds() * 1000);

  await db.insert(authSessionsTable).values({
    sessionTokenHash: hashSessionToken(rawToken),
    userId,
    expiresAt,
    lastSeenAt: new Date(),
    ipAddress: options.ipAddress ?? null,
    userAgent: options.userAgent ?? null,
  });

  setAuthSessionCookie(options.res, rawToken);
}

async function revokeAuthSessionById(id: string) {
  await db
    .update(authSessionsTable)
    .set({
      revokedAt: new Date(),
    })
    .where(
      and(
        eq(authSessionsTable.id, id),
        isNull(authSessionsTable.revokedAt),
      ),
    );
}

async function touchAuthSession(id: string) {
  await db
    .update(authSessionsTable)
    .set({
      lastSeenAt: new Date(),
    })
    .where(eq(authSessionsTable.id, id));
}

export async function getAuthSession(rawToken: string) {
  const [session] = await db
    .select({
      id: authSessionsTable.id,
      userId: authSessionsTable.userId,
      expiresAt: authSessionsTable.expiresAt,
      revokedAt: authSessionsTable.revokedAt,
    })
    .from(authSessionsTable)
    .where(eq(authSessionsTable.sessionTokenHash, hashSessionToken(rawToken)))
    .limit(1);

  if (!session) {
    return null;
  }

  if (session.revokedAt || new Date() > session.expiresAt) {
    await revokeAuthSessionById(session.id);
    return null;
  }

  const user = await getUserById(session.userId);
  if (!user) {
    await revokeAuthSessionById(session.id);
    return null;
  }

  await touchAuthSession(session.id);
  return session;
}

export async function revokeAuthSession(rawToken: string) {
  const [session] = await db
    .select({ id: authSessionsTable.id })
    .from(authSessionsTable)
    .where(eq(authSessionsTable.sessionTokenHash, hashSessionToken(rawToken)))
    .limit(1);

  if (!session) {
    return false;
  }

  await revokeAuthSessionById(session.id);
  return true;
}

export async function createAuthorizationCode(params: {
  clientId: string;
  userId: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  scope?: string;
  nonce?: string;
}) {
  const code = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(authorizationCodesTable).values({
    code,
    clientId: params.clientId,
    userId: params.userId,
    codeChallenge: params.codeChallenge,
    codeChallengeMethod: params.codeChallengeMethod,
    redirectUri: params.redirectUri,
    scope: params.scope,
    nonce: params.nonce,
    expiresAt,
  });

  return code;
}

async function getAuthorizationCode(code: string) {
  const [authCode] = await db
    .select()
    .from(authorizationCodesTable)
    .where(eq(authorizationCodesTable.code, code))
    .limit(1);

  return authCode ?? null;
}

async function markAuthorizationCodeUsed(code: string) {
  await db
    .update(authorizationCodesTable)
    .set({ used: true })
    .where(eq(authorizationCodesTable.code, code));
}

async function issueRefreshToken(params: {
  clientId: string;
  userId: string;
  scope?: string | null;
}) {
  const refreshToken = generateRefreshTokenValue();
  const tokenHash = hashValue(refreshToken);

  await db.insert(refreshTokensTable).values({
    tokenHash,
    clientId: params.clientId,
    userId: params.userId,
    scope: params.scope ?? null,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000),
  });

  return refreshToken;
}

async function getRefreshToken(refreshToken: string) {
  const [token] = await db
    .select()
    .from(refreshTokensTable)
    .where(eq(refreshTokensTable.tokenHash, hashValue(refreshToken)))
    .limit(1);

  return token ?? null;
}

async function revokeRefreshTokenById(id: string, consumed = true) {
  await db
    .update(refreshTokensTable)
    .set({
      consumedAt: consumed ? new Date() : null,
      revokedAt: new Date(),
    })
    .where(eq(refreshTokensTable.id, id));
}

async function rotateRefreshToken(existingRefreshToken: string, clientId: string) {
  const storedToken = await getRefreshToken(existingRefreshToken);
  if (!storedToken) {
    return { error: "invalid_grant", error_description: "Invalid refresh_token" } as const;
  }

  if (storedToken.clientId !== clientId) {
    return { error: "invalid_grant", error_description: "Client ID mismatch" } as const;
  }

  if (storedToken.revokedAt || storedToken.consumedAt) {
    return { error: "invalid_grant", error_description: "Refresh token already used" } as const;
  }

  if (new Date() > storedToken.expiresAt) {
    return { error: "invalid_grant", error_description: "Refresh token expired" } as const;
  }

  await revokeRefreshTokenById(storedToken.id);

  const tokens = await generateTokens({
    clientId: storedToken.clientId,
    userId: storedToken.userId,
    scope: storedToken.scope ?? undefined,
  });

  return { success: true, tokens } as const;
}

export async function generateTokens(params: {
  clientId: string;
  userId: string;
  scope?: string;
  nonce?: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const issuer = getIssuer();

  const accessToken = signJwt(
    {
      iss: issuer,
      sub: params.userId,
      aud: params.clientId,
      exp: now + ACCESS_TOKEN_TTL_SECONDS,
      iat: now,
      scope: params.scope,
      token_use: "access_token",
    },
    `${ACCESS_TOKEN_TTL_SECONDS}s`,
  );

  const idTokenPayload = await buildIdTokenPayload({
    userId: params.userId,
    clientId: params.clientId,
    scope: params.scope,
    nonce: params.nonce,
    issuedAt: now,
    expiresAt: now + ACCESS_TOKEN_TTL_SECONDS,
  });
  const idToken = signJwt(idTokenPayload, `${ACCESS_TOKEN_TTL_SECONDS}s`);
  const refreshToken = await issueRefreshToken(params);

  return {
    access_token: accessToken,
    id_token: idToken,
    refresh_token: refreshToken,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    scope: params.scope ?? "openid",
  };
}

export async function handleTokenRequest(input: TokenInput) {
  if (input.grant_type === "refresh_token") {
    return rotateRefreshToken(input.refresh_token, input.client_id);
  }

  const authCode = await getAuthorizationCode(input.code);
  if (!authCode) {
    return { error: "invalid_grant", error_description: "Invalid authorization code" };
  }

  if (authCode.used) {
    return { error: "invalid_grant", error_description: "Authorization code already used" };
  }

  if (new Date() > authCode.expiresAt) {
    return { error: "invalid_grant", error_description: "Authorization code expired" };
  }

  if (authCode.clientId !== input.client_id) {
    return { error: "invalid_grant", error_description: "Client ID mismatch" };
  }

  if (authCode.redirectUri !== input.redirect_uri) {
    return { error: "invalid_grant", error_description: "Redirect URI mismatch" };
  }

  if (
    !verifyCodeChallenge(
      input.code_verifier,
      authCode.codeChallenge,
      authCode.codeChallengeMethod,
    )
  ) {
    return { error: "invalid_grant", error_description: "Invalid code_verifier" };
  }

  await markAuthorizationCodeUsed(input.code);

  const tokens = await generateTokens({
    clientId: authCode.clientId,
    userId: authCode.userId,
    scope: authCode.scope ?? undefined,
    nonce: authCode.nonce ?? undefined,
  });

  return { success: true, tokens };
}

export async function buildAuthorizationRedirect(
  input: Pick<
    AuthorizeInput,
    "client_id" | "redirect_uri" | "code_challenge" | "code_challenge_method" | "scope" | "nonce" | "state"
  >,
  userId: string,
) {
  const code = await createAuthorizationCode({
    clientId: input.client_id,
    userId,
    codeChallenge: input.code_challenge,
    codeChallengeMethod: input.code_challenge_method,
    redirectUri: input.redirect_uri,
    scope: input.scope,
    nonce: input.nonce,
  });

  const redirectUrl = new URL(input.redirect_uri);
  redirectUrl.searchParams.set("code", code);

  if (input.state) {
    redirectUrl.searchParams.set("state", input.state);
  }

  return redirectUrl.toString();
}

export async function revokeRefreshToken(refreshToken: string, clientId?: string) {
  const storedToken = await getRefreshToken(refreshToken);
  if (!storedToken) {
    return false;
  }

  if (clientId && storedToken.clientId !== clientId) {
    return false;
  }

  await db
    .update(refreshTokensTable)
    .set({
      revokedAt: new Date(),
    })
    .where(
      and(
        eq(refreshTokensTable.id, storedToken.id),
        isNull(refreshTokensTable.revokedAt),
      ),
    );

  return true;
}
