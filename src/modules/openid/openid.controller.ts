import type { Request, Response } from "express";
import { ApiError } from "../../common/utils/api-error.js";
import { ApiResponse } from "../../common/utils/api-response.js";
import * as openidService from "./openid.service.js";

function getBearerToken(req: Request) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length);
}

export function getOpenIdConfiguration(_req: Request, res: Response) {
  const config = openidService.getOpenIdConfiguration();
  return ApiResponse.ok(res, "OpenID Configuration", config);
}

export async function getJwks(_req: Request, res: Response) {
  const jwks = await openidService.getJwks();
  return ApiResponse.json(res, jwks);
}

export async function userInfo(req: Request, res: Response) {
  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return ApiError.invalidToken("Missing bearer token").send(res);
  }

  try {
    const claims = await openidService.getUserInfoFromAccessToken(accessToken);
    return ApiResponse.json(res, claims);
  } catch {
    return ApiError.invalidToken("Invalid access token").send(res);
  }
}
