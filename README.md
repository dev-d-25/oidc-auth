# OIDC Auth Flow

This project is a small OpenID Connect provider with:

- dynamic client registration at `/o/client/register`
- authorization code flow with PKCE at `/o/authorize` and `/o/token`
- hosted sign-in and sign-up pages in `public/`
- an AuthT browser session for SSO-style re-login
- `userinfo` and refresh token support

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm
- Docker & Docker Compose (for PostgreSQL or full stack)
- OpenSSL or built-in Node.js crypto (for key generation)

### Running Locally (Development)

1. **Clone and install dependencies:**
   ```bash
   git clone <repo-url>
   cd oidc-auth
   pnpm install
   ```

2. **Start PostgreSQL:**
   ```bash
   docker compose up -d postgres
   ```
   Or use: `pnpm db:up`

3. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your values if needed
   ```

4. **Generate RSA keys for JWT signing:**
   ```bash
   pnpm gen-keys
   ```

5. **Run database migrations:**
   ```bash
   pnpm db:migrate
   ```

6. **Start development server:**
   ```bash
   pnpm dev
   ```
   Server runs at `http://localhost:8000`

### Running with Docker Compose (Recommended)

Start the entire stack with one command:
```bash
docker compose up -d
```

This starts:
- PostgreSQL database
- OIDC Auth Server (built from Dockerfile)

### Production Build
```bash
pnpm build
pnpm start
```

---

## Integrating Other Projects

### For Projects Like `kafka-learning` or `million-socket`

#### Step 1: Register Your Client

Make a POST request to register your app:

```bash
curl -X POST http://localhost:8000/o/client/register \
  -H "Content-Type: application/json" \
  -d '{
    "clientName": "Kafka Learning App",
    "redirectUris": ["http://localhost:3000/callback"]
  }'
```

Response:
```json
{
  "message": "Client registered successfully",
  "data": {
    "clientId": "generated-uuid",
    "clientSecret": "hex-secret",
    "clientName": "Kafka Learning App",
    "redirectUris": ["http://localhost:3000/callback"]
  }
}
```

#### Step 2: Configure Your Client App

**For a Node.js/Express app using `openid-client`:**
```javascript
import { Issuer, Client } from 'openid-client';

const issuer = await Issuer.discover('http://localhost:8000');
const client = new issuer.Client({
  client_id: 'YOUR_CLIENT_ID',
  client_secret: 'YOUR_CLIENT_SECRET', // optional, not enforced
  redirect_uris: ['http://localhost:3000/callback'],
  response_types: ['code'],
});
```

**For a React app using `oidc-client-ts`:**
```typescript
import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

const userManager = new UserManager({
  authority: 'http://localhost:8000',
  client_id: 'YOUR_CLIENT_ID',
  redirect_uri: 'http://localhost:3000/callback',
  response_type: 'code',
  scope: 'openid profile email',
  userStore: new WebStorageStateStore({ store: window.localStorage }),
});
```

#### Step 3: Initiate Login Flow

Redirect users to:
```
http://localhost:8000/o/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000/callback&response_type=code&scope=openid%20profile%20email&state=RANDOM_STATE&nonce=RANDOM_NONCE&code_challenge=PKCE_CHALLENGE&code_challenge_method=S256
```

#### Step 4: Exchange Code for Tokens

```bash
curl -X POST http://localhost:8000/o/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "AUTH_CODE",
    "client_id": "YOUR_CLIENT_ID",
    "redirect_uri": "http://localhost:3000/callback",
    "code_verifier": "PKCE_VERIFIER"
  }'
```

---

## Environment

Runtime configuration and local secrets live in `.env`.
The repo-safe template is `.env.example`.

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/oidc_auth` | PostgreSQL connection string |
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `8000` | Server port |
| `ISSUER_BASE_URL` | `http://localhost:8000` | OIDC issuer URL |
| `AUTH_SERVER_BASE_URL` | `http://localhost:8000` | Auth server base URL |
| `ACCESS_TOKEN_TTL_SECONDS` | `300` | Access token expiry in seconds |
| `REFRESH_TOKEN_TTL_SECONDS` | `2592000` | Refresh token expiry in seconds |
| `AUTH_SESSION_TTL_SECONDS` | `2592000` | Auth session expiry in seconds |
| `AUTH_SESSION_COOKIE_NAME` | `autht_session` | Session cookie name |
| `COOKIE_SECURE` | `false` | Set Secure flag on cookies |
| `COOKIE_DOMAIN` | (empty) | Cookie domain |
| `CLIENT_COOKIE_SECRET` | `replace-this-in-real-env` | Client cookie secret |
| `CLIENT_PORT` | `3000` | Sample client port |
| `CLIENT_BASE_URL` | `http://localhost:3000` | Sample client base URL |
| `SAMPLE_CLIENT_REDIRECT_URI` | `http://localhost:3000/callback` | Sample client redirect URI |
| `SAMPLE_CLIENT_SCOPE` | `openid profile email` | Sample client scopes |
| `SAMPLE_CLIENT_ID` | (empty) | Sample client ID (set after registration) |

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `build` | `pnpm build` | Compile TypeScript to `build/` directory |
| `start` | `pnpm start` | Run compiled server from `build/server.js` |
| `dev` | `pnpm dev` | Run with hot-reload using `tsx watch` |
| `db:up` | `pnpm db:up` | Start PostgreSQL via Docker Compose |
| `db:migrate` | `pnpm db:migrate` | Run database migrations |
| `db:generate` | `pnpm db:generate` | Generate migration files from schema |
| `db:studio` | `pnpm db:studio` | Open Drizzle Studio (database GUI) |
| `dev:auth` | `pnpm dev:auth` | Alias for `pnpm dev` |
| `gen-keys` | `pnpm gen-keys` | Generate RSA key pair for JWT signing (Node.js cross-platform) |

## Routes At A Glance

| Method | Path | Purpose | Entry point |
| --- | --- | --- | --- |
| `GET` | `/health` | Health check endpoint | `app.get("/health")` in `src/app.ts` |
| `GET` | `/o/.well-known/openid-configuration` | OIDC discovery document | `getOpenIdConfiguration()` in `src/modules/openid/openid.controller.ts` |
| `GET` | `/o/.well-known/jwks.json` | JWKS with RSA public key | `getJwks()` in `src/modules/openid/openid.controller.ts` |
| `GET` | `/o/authorize` | Validate auth request, then use AuthT session or redirect to hosted login page | `authorize()` in `src/modules/oauth/oauth.controller.ts` |
| `POST` | `/o/token` | Exchange auth code or refresh token for tokens | `token()` in `src/modules/oauth/oauth.controller.ts` |
| `GET` | `/o/userinfo` | Return claims from access token | `userInfo()` in `src/modules/openid/openid.controller.ts` |
| `POST` | `/o/logout` | Revoke refresh token for the client app only | `logout()` in `src/modules/oauth/oauth.controller.ts` |
| `POST` | `/o/session/logout` | Log out the AuthT provider session | `sessionLogout()` in `src/modules/oauth/oauth.controller.ts` |
| `POST` | `/o/authenticate/sign-in` | Login form submission | `signIn()` in `src/modules/oauth/oauth.controller.ts` |
| `POST` | `/o/authenticate/sign-up` | Signup form submission | `signUp()` in `src/modules/oauth/oauth.controller.ts` |
| `POST` | `/o/client/register` | Register a new OAuth client | `registerClient()` in `src/modules/client-register/client-register.controller.ts` |
| `GET` | `/o/client/:clientId/public` | Read public display metadata for hosted auth pages | `getClientDisplayById()` in `src/modules/client-register/client-register.controller.ts` |
| `GET` | `/o/client/:clientId` | Read registered client metadata | `getClientById()` in `src/modules/client-register/client-register.controller.ts` |

## Mermaid Flow

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Client Developer
    participant App as Client App
    participant Browser
    participant Auth as OIDC Server
    participant DB as PostgreSQL

    Dev->>Auth: POST /o/client/register
    Note over Auth: client-register.controller.registerClient()<br/>validates body with registerClientSchema
    Auth->>DB: INSERT oauth_clients
    Note over Auth,DB: client-register.service.registerClient()<br/>generateClientId()<br/>generateClientSecret()
    DB-->>Auth: client row stored
    Auth-->>Dev: 201 { clientId, clientSecret, redirectUris }

    App->>Browser: Redirect to /o/authorize with PKCE params
    Browser->>Auth: GET /o/authorize?client_id&redirect_uri&response_type=code&scope&state&nonce&code_challenge&code_challenge_method
    Note over Auth: oauth.controller.authorize()<br/>authorizeSchema.safeParse()
    Auth->>DB: SELECT oauth_clients by client_id
    Note over Auth,DB: oauth.service.validateAuthorizeRequest()<br/>validateClient()
    DB-->>Auth: client + redirect_uris
    alt No valid AuthT session
        Auth-->>Browser: 302 /authenticate.html?...same query params
        Browser->>Auth: POST /o/authenticate/sign-in or /o/authenticate/sign-up
        Note over Auth: oauth.controller.signIn()/signUp()<br/>re-validates authorize context
        alt Existing user signs in
            Auth->>DB: SELECT users by email
            Note over Auth,DB: oauth.service.authenticateUser()
            DB-->>Auth: user row with salt + password hash
        else New user signs up
            Auth->>DB: SELECT users by email
            DB-->>Auth: no existing user
            Auth->>DB: INSERT users
            Note over Auth,DB: oauth.service.registerUser()<br/>sha256(password + salt)
            DB-->>Auth: new user id
        end
        Auth->>DB: INSERT auth_sessions
    else Valid AuthT session
        Auth->>DB: SELECT auth_sessions by session_token_hash
        DB-->>Auth: active AuthT session + user_id
    end

    Auth->>DB: INSERT authorization_codes
    Note over Auth,DB: oauth.service.buildAuthorizationRedirect()<br/>createAuthorizationCode()
    DB-->>Auth: code stored with PKCE challenge, scope, nonce, expiry
    Auth-->>Browser: 200 { redirect: redirect_uri?code=...&state=... }
    Browser->>App: GET redirect_uri?code=...&state=...

    App->>Auth: POST /o/token { grant_type=authorization_code, code, client_id, redirect_uri, code_verifier }
    Note over Auth: oauth.controller.token()<br/>tokenSchema.safeParse()
    Auth->>DB: SELECT authorization_codes by code
    Note over Auth,DB: oauth.service.handleTokenRequest()
    DB-->>Auth: auth code row
    Auth->>Auth: verifyCodeChallenge()
    Auth->>DB: UPDATE authorization_codes SET used=true
    Auth->>DB: SELECT users by user_id
    Auth->>Auth: signJwt() for access token + ID token
    Auth->>DB: INSERT refresh_tokens with token_hash
    Note over Auth,DB: oauth.service.generateTokens()<br/>issueRefreshToken()
    DB-->>Auth: refresh token row stored
    Auth-->>App: 200 { access_token, id_token, refresh_token, expires_in, scope, token_type }

    App->>Auth: GET /o/userinfo Authorization: Bearer access_token
    Auth->>Auth: verifyJwt()
    Auth->>DB: SELECT users by sub
    Note over Auth,DB: oauth.service.getUserInfoFromAccessToken()<br/>buildUserClaims()
    DB-->>Auth: user profile fields
    Auth-->>App: 200 user claims

    App->>Auth: POST /o/token { grant_type=refresh_token, client_id, refresh_token }
    Auth->>DB: SELECT refresh_tokens by token_hash
    DB-->>Auth: refresh token row
    Auth->>DB: UPDATE refresh_tokens SET consumed_at, revoked_at
    Auth->>DB: SELECT users by user_id
    Auth->>DB: INSERT refresh_tokens for rotated token
    Auth-->>App: 200 new tokens

    App->>Auth: POST /o/logout { client_id, refresh_token }
    Auth->>DB: UPDATE refresh_tokens SET revoked_at
    Auth-->>App: 200 { revoked: true }
```

## How A New Client Registers And Gets Keys

### API call

`POST /o/client/register`

Example request:

```http
POST /o/client/register
Content-Type: application/json

{
  "clientName": "Acme Web App",
  "redirectUris": [
    "http://localhost:3000/callback"
  ]
}
```

You can also send `redirectUris` as a newline-separated string because `registerClientSchema` in `src/modules/client-register/client-register.dto.ts` accepts both forms.

### What code runs

1. Express mounts the route in `src/app.ts` with `app.use("/o/client", clientRegisterRoutes)`.
2. `src/modules/client-register/client-register.route.ts` maps the request to `registerClient()`.
3. `registerClient()` in `src/modules/client-register/client-register.controller.ts` validates the body using `registerClientSchema`.
4. `client-register.service.registerClient()` in `src/modules/client-register/client-register.service.ts`:
   - calls `generateClientId()` which returns `crypto.randomUUID()`
   - calls `generateClientSecret()` which returns `crypto.randomBytes(32).toString("hex")`
   - inserts the client into `oauthClientsTable`
5. `ApiResponse.created()` in `src/common/utils/api-response.ts` returns the JSON response.

### DB change

Table: `oauth_clients` from `src/db/schema.ts`

- `client_id`: generated UUID string
- `client_secret`: generated 64-byte hex string
- `client_name`: from request
- `redirect_uris`: saved as `text[]`
- `created_at`: default `now()`

### Success response

```json
{
  "message": "Client registered successfully",
  "data": {
    "clientId": "2ccf5da7-6e83-4697-b2ec-c0b57c9b8db4",
    "clientSecret": "hex-secret-value",
    "clientName": "Acme Web App",
    "redirectUris": [
      "http://localhost:3000/callback"
    ]
  }
}
```

Important: the current `/o/token` implementation does not authenticate with `client_secret`. The real security control in this server is PKCE plus redirect URI validation. The secret is generated and stored, but not used during token exchange.

## Happy Path: Step By Step

### 1. Discovery

Client apps can read:

- `GET /o/.well-known/openid-configuration`
- `GET /o/.well-known/jwks.json`

Functions involved:

- `getOpenIdConfiguration()` in `src/modules/openid/openid.controller.ts`
- `openid.service.getOpenIdConfiguration()` in `src/modules/openid/openid.service.ts`
- `getJwks()` in `src/modules/openid/openid.controller.ts`
- `openid.service.getJwks()` in `src/modules/openid/openid.service.ts`

`getJwks()` converts the RSA public key from `src/common/utils/cert.ts` into JWK format through the shared helper in `src/common/utils/jwt.ts`.

### 2. App starts login

The client app sends the browser to:

```text
GET /o/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=http://localhost:3000/callback
  &response_type=code
  &scope=openid%20profile%20email
  &state=RANDOM_STATE
  &nonce=RANDOM_NONCE
  &code_challenge=PKCE_CHALLENGE
  &code_challenge_method=S256
```

What happens:

1. `authorize()` in `src/modules/oauth/oauth.controller.ts` validates query params with `authorizeSchema`.
2. `validateAuthorizeRequest()` in `src/modules/oauth/oauth.service.ts` runs.
3. `validateClient()` queries `oauthClientsTable`.
4. The server checks:
   - `client_id` exists
   - `redirect_uri` is in `oauth_clients.redirect_uris`
   - `code_challenge` exists
   - `code_challenge_method` exists
5. If there is a valid `autht_session` cookie, the server skips the hosted login page and immediately issues a fresh authorization code.
6. If there is no valid AuthT session, the server redirects the browser to `/authenticate.html` and copies the original OAuth params into the query string.
7. `public/authenticate.html` and `public/signup.html` resolve the client display name with `GET /o/client/:clientId/public` before enabling form submission.

DB activity:

- `SELECT client_id, redirect_uris FROM oauth_clients WHERE client_id = ?`

### 3. User signs in or signs up

Hosted pages:

- sign in page: `public/authenticate.html`
- sign up page: `public/signup.html`

Those pages are branded as `AuthT`, fetch `clientName` from `GET /o/client/:clientId/public`, and only enable submission after that lookup succeeds.
After successful sign-in or sign-up, AuthT creates an `autht_session` cookie so later `/o/authorize` requests can skip the hosted login page.

#### Existing user sign-in request

```http
POST /o/authenticate/sign-in
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "client_id": "YOUR_CLIENT_ID",
  "redirect_uri": "http://localhost:3000/callback",
  "response_type": "code",
  "scope": "openid profile email",
  "state": "RANDOM_STATE",
  "nonce": "RANDOM_NONCE",
  "code_challenge": "PKCE_CHALLENGE",
  "code_challenge_method": "S256"
}
```

Functions involved:

- `signIn()` in `src/modules/oauth/oauth.controller.ts`
- `validateAuthorizeRequest()` in `src/modules/oauth/oauth.service.ts`
- `authenticateUser()` in `src/modules/oauth/oauth.service.ts`
- `buildAuthorizationRedirect()` in `src/modules/oauth/oauth.service.ts`

DB activity:

- `SELECT` from `oauth_clients` to re-validate client and redirect URI
- `SELECT` from `users` by email
- no user table write on sign-in itself

Password verification:

- `authenticateUser()` loads `password` and `salt`
- computes `sha256(password + salt)`
- compares with saved hash

#### New user sign-up request

```http
POST /o/authenticate/sign-up
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "jane@example.com",
  "password": "password123",
  "client_id": "YOUR_CLIENT_ID",
  "redirect_uri": "http://localhost:3000/callback",
  "response_type": "code",
  "scope": "openid profile email",
  "state": "RANDOM_STATE",
  "nonce": "RANDOM_NONCE",
  "code_challenge": "PKCE_CHALLENGE",
  "code_challenge_method": "S256"
}
```

Functions involved:

- `signUp()` in `src/modules/oauth/oauth.controller.ts`
- `registerUser()` in `src/modules/oauth/oauth.service.ts`

DB activity:

1. `SELECT users.id FROM users WHERE email = ?`
2. If no user exists:
   - generate 16-byte random salt
   - hash `password + salt` with SHA-256
   - `INSERT INTO users`

Stored fields:

- `first_name`
- `last_name`
- `email`
- `password`
- `salt`
- `email_verified` stays `false` by default

### 4. Authorization code is created

After sign-in or sign-up succeeds:

1. `buildAuthorizationRedirect()` calls `createAuthorizationCode()`.
2. `createAuthorizationCode()` generates a UUID code and 10-minute expiry.
3. It inserts one row into `authorization_codes`.
4. The controller returns JSON with a `redirect` URL.
5. The browser navigates to `redirect_uri?code=...&state=...`.

DB change in `authorization_codes`:

- `code`
- `client_id`
- `user_id`
- `code_challenge`
- `code_challenge_method`
- `redirect_uri`
- `scope`
- `nonce`
- `expires_at`
- `used = false`

Actual response shape:

```json
{
  "redirect": "http://localhost:3000/callback?code=AUTH_CODE&state=RANDOM_STATE"
}
```

### 5. Client exchanges code for tokens

Request:

```http
POST /o/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "AUTH_CODE",
  "redirect_uri": "http://localhost:3000/callback",
  "client_id": "YOUR_CLIENT_ID",
  "code_verifier": "ORIGINAL_PKCE_CODE_VERIFIER"
}
```

Functions involved:

- `token()` in `src/modules/oauth/oauth.controller.ts`
- `handleTokenRequest()` in `src/modules/oauth/oauth.service.ts`
- `verifyCodeChallenge()` in `src/modules/oauth/oauth.service.ts`
- `markAuthorizationCodeUsed()` in `src/modules/oauth/oauth.service.ts`
- `generateTokens()` in `src/modules/oauth/oauth.service.ts`
- `issueRefreshToken()` in `src/modules/oauth/oauth.service.ts`
- `signJwt()` in `src/common/utils/jwt.ts`

Validation sequence inside `handleTokenRequest()`:

1. load auth code row with `getAuthorizationCode()`
2. reject if not found
3. reject if `used = true`
4. reject if expired
5. reject if `client_id` does not match
6. reject if `redirect_uri` does not match
7. verify `code_verifier` against stored PKCE challenge
8. mark code used
9. generate access token, ID token, and refresh token

DB activity:

1. `SELECT * FROM authorization_codes WHERE code = ?`
2. `UPDATE authorization_codes SET used = true WHERE code = ?`
3. `SELECT` user profile fields from `users`
4. `INSERT INTO refresh_tokens` with:
   - `token_hash = sha256(refresh_token)`
   - `client_id`
   - `user_id`
   - `scope`
   - `expires_at`

Success response:

```json
{
  "access_token": "JWT_ACCESS_TOKEN",
  "id_token": "JWT_ID_TOKEN",
  "refresh_token": "OPAQUE_REFRESH_TOKEN",
  "token_type": "Bearer",
  "expires_in": 300,
  "scope": "openid profile email"
}
```

Token contents:

- access token includes `iss`, `sub`, `aud`, `exp`, `iat`, `scope`, `token_use=access_token`
- ID token includes `iss`, `sub`, `aud`, `exp`, `iat`, plus OIDC claims from `buildUserClaims()`
- if `nonce` was present during auth, it is copied into the ID token

### 6. Client calls userinfo

Request:

```http
GET /o/userinfo
Authorization: Bearer JWT_ACCESS_TOKEN
```

Functions involved:

- `userInfo()` in `src/modules/openid/openid.controller.ts`
- `getUserInfoFromAccessToken()` in `src/modules/openid/openid.service.ts`
- `verifyJwt()` in `src/common/utils/jwt.ts`
- `buildUserClaims()` in `src/modules/openid/openid.service.ts`

What happens:

1. controller reads bearer token
2. `verifyJwt()` verifies RS256 signature with public key
3. server checks `payload.token_use === "access_token"`
4. server loads the user by `sub`
5. server rebuilds claims based on the `scope` stored in the token

DB activity:

- `SELECT` from `users` by `id`

Example response for `scope=openid profile email`:

```json
{
  "sub": "user-uuid",
  "email": "jane@example.com",
  "email_verified": false,
  "given_name": "Jane",
  "family_name": "Doe",
  "name": "Jane Doe",
  "picture": null
}
```

### 7. Client refreshes tokens

Request:

```http
POST /o/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "OPAQUE_REFRESH_TOKEN",
  "client_id": "YOUR_CLIENT_ID"
}
```

Functions involved:

- `handleTokenRequest()` in `src/modules/oauth/oauth.service.ts`
- `rotateRefreshToken()` in `src/modules/oauth/oauth.service.ts`
- `getRefreshToken()` in `src/modules/oauth/oauth.service.ts`
- `revokeRefreshTokenById()` in `src/modules/oauth/oauth.service.ts`
- `generateTokens()` in `src/modules/oauth/oauth.service.ts`

What happens:

1. hash incoming refresh token with SHA-256
2. find matching `refresh_tokens` row
3. verify same `client_id`
4. reject if revoked, consumed, or expired
5. mark old row as consumed and revoked
6. mint new access token, ID token, and refresh token
7. insert a new `refresh_tokens` row

DB changes:

- old row gets `consumed_at` and `revoked_at`
- new row inserted with new `token_hash` and expiry

### 8. Client logs out

Request:

```http
POST /o/logout
Content-Type: application/json

{
  "client_id": "YOUR_CLIENT_ID",
  "refresh_token": "OPAQUE_REFRESH_TOKEN"
}
```

Functions involved:

- `logout()` in `src/modules/oauth/oauth.controller.ts`
- `revokeRefreshToken()` in `src/modules/oauth/oauth.service.ts`

DB activity:

1. `SELECT` refresh token row by hashed token
2. if `client_id` was supplied, verify it matches
3. `UPDATE refresh_tokens SET revoked_at = now()`

Response:

```json
{
  "revoked": true
}
```

## File And Function Map

### App boot and routing

- `src/server.ts`: starts Express server
- `src/app.ts`: mounts middleware, static files, `/o` routes, and `/o/client` routes

### OAuth module

- `src/modules/oauth/oauth.route.ts`: route definitions
- `src/modules/oauth/oauth.controller.ts`: HTTP parsing, validation handling, JSON/redirect responses
- `src/modules/oauth/oauth.service.ts`: core OAuth logic, token issuance orchestration, PKCE verification, DB calls
- `src/modules/oauth/oauth.dto.ts`: Zod schemas for authorize, token, sign-in, sign-up payloads

### OpenID module

- `src/modules/openid/openid.route.ts`: discovery and `userinfo` route definitions
- `src/modules/openid/openid.controller.ts`: discovery and `userinfo` responses
- `src/modules/openid/openid.service.ts`: issuer metadata, OIDC claims, ID token payload construction

### Client registration module

- `src/modules/client-register/client-register.route.ts`: registration routes
- `src/modules/client-register/client-register.controller.ts`: request validation and API responses
- `src/modules/client-register/client-register.service.ts`: client ID/secret generation and DB insert/select
- `src/modules/client-register/client-register.dto.ts`: Zod schema for client registration

### Database

- `src/db/index.ts`: creates Drizzle DB connection from `DATABASE_URL`
- `src/db/schema.ts`: table definitions for `users`, `oauth_clients`, `authorization_codes`, `refresh_tokens`, `auth_sessions`
- `drizzle/*.sql`: schema migrations

### Token and key utilities

- `src/common/utils/jwt.ts`: `signJwt()`, `verifyJwt()`, and `getJwks()` using RS256
- `src/common/utils/cert.ts`: loads RSA private/public keys
- `src/common/utils/session.ts`: AuthT session cookie and token helpers
- `scripts/gen-keys.js`: cross-platform Node.js script to generate RSA key pair (`pnpm gen-keys`)
- `key-gen.sh`: bash script for generating RSA keys (Linux/macOS)
- `cert/private-key.pem`: signing key (generated by `pnpm gen-keys`)
- `cert/public-key.pub`: verification key exposed through JWKS

## Architecture Notes

- `src/common/utils` is reserved for shared low-level helpers used across modules.
- `src/modules/oauth` owns authorization-code flow, PKCE checks, refresh token rotation, and logout.
- `src/modules/oauth` also owns the AuthT provider session used to skip re-login on later `/o/authorize` requests.
- `src/modules/openid` owns discovery metadata, user claims, ID token payload construction, and `userinfo`.
- `client_secret` is currently registration metadata only. The token endpoint behavior remains public-client PKCE based and does not enforce client secret authentication. The OIDC discovery document advertises `token_endpoint_auth_methods_supported: ["none"]`.
- Hosted auth pages remain static files and resolve display-safe client metadata from `/o/client/:clientId/public` at runtime.

## Deferred Security Work

- Password hashing still uses `sha256(password + salt)` and should be upgraded in a dedicated security change.
- `client_secret` is generated and stored but is not yet enforced at `/o/token`.
- The current key-loading approach in `src/common/utils/cert.ts` is runtime-path coupled and could be improved separately.

### Hosted pages

- `public/client-register.html`: browser UI for registering clients
- `public/authenticate.html`: hosted login page
- `public/signup.html`: hosted signup page

### Session behavior

- `POST /o/logout` revokes the client app refresh token and does not clear the AuthT provider session.
- `POST /o/session/logout` clears the AuthT provider session cookie and revokes the backing `auth_sessions` row.
- The AuthT provider session cookie is `autht_session` and is stored as an opaque token whose SHA-256 hash is persisted in the database.
- Session rows track `lastSeenAt`, `ipAddress`, and `userAgent` for audit purposes.

## Sample Client

The standalone sample client has been moved to `D:\repos\sample-oauth-app`.

For app integration steps, see the main project documentation or the sample client repository.

---

## Docker Compose Multi-Project Setup

### Why Use Docker Compose?

Running the OIDC server with Docker Compose makes it easy to:
- Start the entire stack with one command (`docker compose up -d`)
- Integrate with other projects like `kafka-learning` or `million-socket`
- Have a consistent, isolated environment across different projects
- Avoid local setup issues

### Full Stack Setup

The `docker-compose.yml` and `Dockerfile` in this repo provide a complete setup:

```bash
# Start everything (PostgreSQL + OIDC Auth Server)
docker compose up -d

# View logs
docker compose logs -f

# Stop everything
docker compose down
```

### Integrating Multiple Projects

For running multiple projects that use this OIDC server, create a `docker-compose.stack.yml` in a parent directory:

```yaml
# docker-compose.stack.yml
services:
  oidc-auth:
    build: ./oidc-auth
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/oidc_auth
      NODE_ENV: production
      ISSUER_BASE_URL: http://localhost:8000
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: oidc_auth
    volumes:
      - postgres_data:/var/lib/postgresql/data

  kafka-learning:
    build: ./kafka-learning
    ports:
      - "3001:3000"
    environment:
      OIDC_ISSUER: http://oidc-auth:8000
      OIDC_CLIENT_ID: ${OIDC_CLIENT_ID}
      OIDC_REDIRECT_URI: http://localhost:3001/callback
    depends_on:
      - oidc-auth

  million-socket:
    build: ./million-socket
    ports:
      - "3002:3000"
    environment:
      OIDC_ISSUER: http://oidc-auth:8000
      OIDC_CLIENT_ID: ${OIDC_CLIENT_ID}
      OIDC_REDIRECT_URI: http://localhost:3002/callback
    depends_on:
      - oidc-auth

volumes:
  postgres_data:
```

All services communicate on the same Docker network, allowing easy service-to-service communication using service names (e.g., `oidc-auth` instead of `localhost`).

### Quick Test

After starting the stack, register a client and test the integration:

```bash
# Register a client
curl -X POST http://localhost:8000/o/client/register \
  -H "Content-Type: application/json" \
  -d '{"clientName":"Test App","redirectUris":["http://localhost:3000/callback"]}'
```
