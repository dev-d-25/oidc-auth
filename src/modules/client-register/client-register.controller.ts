import type { Request, Response } from "express";
import { ApiResponse } from "../../common/utils/api-response.js";
import { ApiError } from "../../common/utils/api-error.js";
import * as clientRegisterService from "./client-register.service.js";
import * as dto from "./client-register.dto.js";

export async function registerClient(req: Request, res: Response) {
  const result = dto.registerClientSchema.safeParse(req.body);

  if (!result.success) {
    return ApiError.badRequest(result.error.issues[0].message).send(res);
  }

  try {
    const client = await clientRegisterService.registerClient(result.data);
    return ApiResponse.created(res, "Client registered successfully", client);
  } catch {
    return ApiError.internalServerError("Failed to register client").send(res);
  }
}

export async function getClientById(req: Request, res: Response) {
  try {
    const clientId = req.params.clientId as string;
    const client = await clientRegisterService.getClientById(clientId);

    if (!client) {
      return ApiError.notFound("Client not found").send(res);
    }

    return ApiResponse.ok(res, "Client found", client);
  } catch {
    return ApiError.internalServerError("Failed to fetch client").send(res);
  }
}

export async function getClientDisplayById(req: Request, res: Response) {
  try {
    const clientId = req.params.clientId as string;
    const client = await clientRegisterService.getClientDisplayById(clientId);

    if (!client) {
      return ApiError.notFound("Client not found").send(res);
    }

    return ApiResponse.ok(res, "Client found", client);
  } catch {
    return ApiError.internalServerError("Failed to fetch client").send(res);
  }
}
