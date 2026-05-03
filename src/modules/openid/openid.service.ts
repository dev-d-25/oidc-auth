import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema.js";
import { getJwks, verifyJwt } from "../../common/utils/jwt.js";

export type UserClaims = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  given_name?: string | null;
  family_name?: string | null;
  name?: string;
  picture?: string | null;
};

const PORT = process.env.PORT ?? "8000";
const ISSUER = process.env.ISSUER_BASE_URL ?? `http://localhost:${PORT}`;

function parseScopes(scope?: string | null): Set<string> {
  return new Set((scope ?? "").split(/\s+/).filter(Boolean));
}

function buildName(firstName?: string | null, lastName?: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ") || undefined;
}

async function getUserById(userId: string) {
  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      emailVerified: usersTable.emailVerified,
      firstName: usersTable.firstName,
      lastName: usersTable.lastName,
      profileImageURL: usersTable.profileImageURL,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  return user ?? null;
}

export function getIssuer() {
  return ISSUER;
}

export function getOpenIdConfiguration() {
  return {
    issuer: ISSUER,
    authorization_endpoint: `${ISSUER}/o/authorize`,
    token_endpoint: `${ISSUER}/o/token`,
    userinfo_endpoint: `${ISSUER}/o/userinfo`,
    jwks_uri: `${ISSUER}/o/.well-known/jwks.json`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256", "plain"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "profile", "email"],
    subject_types_supported: ["public"],
    // This server currently supports public PKCE clients at the token endpoint.
    token_endpoint_auth_methods_supported: ["none"],
  };
}

export async function buildUserClaims(
  userId: string,
  scope?: string | null,
): Promise<UserClaims> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("Unknown user");
  }

  const scopes = parseScopes(scope);
  const claims: UserClaims = { sub: user.id };

  if (scopes.has("email")) {
    claims.email = user.email;
    claims.email_verified = user.emailVerified;
  }

  if (scopes.has("profile")) {
    claims.given_name = user.firstName;
    claims.family_name = user.lastName;
    claims.name = buildName(user.firstName, user.lastName);
    claims.picture = user.profileImageURL;
  }

  return claims;
}

export async function buildIdTokenPayload(params: {
  userId: string;
  clientId: string;
  scope?: string | null;
  nonce?: string;
  issuedAt: number;
  expiresAt: number;
}) {
  const claims = await buildUserClaims(params.userId, params.scope);
  const payload: Record<string, unknown> = {
    iss: ISSUER,
    sub: params.userId,
    aud: params.clientId,
    exp: params.expiresAt,
    iat: params.issuedAt,
    ...claims,
  };

  if (params.nonce) {
    payload.nonce = params.nonce;
  }

  return payload;
}

export async function getUserInfoFromAccessToken(accessToken: string) {
  const payload = verifyJwt(accessToken);
  if (payload.token_use !== "access_token") {
    throw new Error("Invalid token type");
  }

  const userId = typeof payload.sub === "string" ? payload.sub : null;
  if (!userId) {
    throw new Error("Missing sub");
  }

  const scope = typeof payload.scope === "string" ? payload.scope : "openid";
  return buildUserClaims(userId, scope);
}

export { getJwks };
