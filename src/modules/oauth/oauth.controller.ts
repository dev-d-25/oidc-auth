import type { Request, Response } from "express";
import { ApiResponse } from "../../common/utils/api-response.js";
import { ApiError } from "../../common/utils/api-error.js";
import * as openidService from "../openid/openid.service.js";
import * as oauthService from "./oauth.service.js";
import * as dto from "./oauth.dto.js";

export async function authorize(req: Request, res: Response) {
  const result = dto.authorizeSchema.safeParse(req.query);
  if (!result.success) {
    return ApiError.validation("Invalid authorize request", result.error.flatten()).send(res);
  }

  const validation = await oauthService.validateAuthorizeRequest(result.data);
  if (!validation.valid) {
    return ApiError.invalidRequest(validation.error).send(res);
  }

  const authSessionToken =
    typeof req.cookies?.[oauthService.AUTH_SESSION_COOKIE_NAME] === "string"
      ? req.cookies[oauthService.AUTH_SESSION_COOKIE_NAME]
      : null;

  if (authSessionToken) {
    const session = await oauthService.getAuthSession(authSessionToken);
    if (session?.userId) {
      const redirect = await oauthService.buildAuthorizationRedirect(result.data, session.userId);
      return res.redirect(redirect);
    }

    oauthService.clearAuthSessionCookie(res);
  }

  const loginUrl = new URL("/authenticate.html", openidService.getIssuer());
  Object.entries(result.data).forEach(([key, value]) => {
    if (value) {
      loginUrl.searchParams.set(key, value);
    }
  });

  return res.redirect(loginUrl.pathname + loginUrl.search);
}

export async function token(req: Request, res: Response) {
  const result = dto.tokenSchema.safeParse(req.body);
  if (!result.success) {
    return ApiError.validation("Invalid token request", result.error.flatten()).send(res);
  }

  const tokenResult = await oauthService.handleTokenRequest(result.data);
  if ("error" in tokenResult) {
    return ApiError.oauth(400, tokenResult.error, tokenResult.error_description).send(res);
  }

  return ApiResponse.json(res, tokenResult.tokens);
}

export async function signIn(req: Request, res: Response) {
  const result = dto.signInSchema.safeParse(req.body);
  if (!result.success) {
    return ApiError.badRequest(result.error.issues[0]?.message ?? "Invalid request").send(res);
  }

  const validation = await oauthService.validateAuthorizeRequest(result.data);
  if (!validation.valid) {
    return ApiError.badRequest(validation.error).send(res);
  }

  const authResult = await oauthService.authenticateUser(result.data.email, result.data.password);
  if (!authResult.success || !authResult.user) {
    return ApiError.unauthorized(authResult.error).send(res);
  }

  await oauthService.createAuthSession(authResult.user.id, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    res,
  });

  const redirect = await oauthService.buildAuthorizationRedirect(result.data, authResult.user.id);
  return ApiResponse.redirect(res, redirect);
}

export async function signUp(req: Request, res: Response) {
  const result = dto.signUpSchema.safeParse(req.body);
  if (!result.success) {
    return ApiError.badRequest(result.error.issues[0]?.message ?? "Invalid request").send(res);
  }

  const validation = await oauthService.validateAuthorizeRequest(result.data);
  if (!validation.valid) {
    return ApiError.badRequest(validation.error).send(res);
  }

  const regResult = await oauthService.registerUser(result.data);
  if (!regResult.success || !regResult.user) {
    return ApiError.badRequest(regResult.error).send(res);
  }

  await oauthService.createAuthSession(regResult.user.id, {
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    res,
  });

  const redirect = await oauthService.buildAuthorizationRedirect(result.data, regResult.user.id);
  return ApiResponse.redirect(res, redirect);
}

export async function logout(req: Request, res: Response) {
  const refreshToken = typeof req.body?.refresh_token === "string" ? req.body.refresh_token : null;
  const clientId = typeof req.body?.client_id === "string" ? req.body.client_id : undefined;

  if (!refreshToken) {
    return ApiError.invalidRequest("refresh_token is required").send(res);
  }

  const revoked = await oauthService.revokeRefreshToken(refreshToken, clientId);
  if (!revoked) {
    return ApiError.invalidRequest("Refresh token could not be revoked").send(res);
  }

  return ApiResponse.json(res, { revoked: true });
}

export async function sessionLogout(req: Request, res: Response) {
  const authSessionToken =
    typeof req.cookies?.[oauthService.AUTH_SESSION_COOKIE_NAME] === "string"
      ? req.cookies[oauthService.AUTH_SESSION_COOKIE_NAME]
      : null;

  if (authSessionToken) {
    await oauthService.revokeAuthSession(authSessionToken);
  }

  oauthService.clearAuthSessionCookie(res);
  return ApiResponse.ok(res, "Session logged out", { revoked: true });
}
