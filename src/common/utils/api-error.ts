import type { Response } from "express";

type ApiErrorBody = {
  message: string;
  error?: string;
  error_description?: string;
  errors?: unknown;
  [key: string]: unknown;
};

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public body?: Omit<ApiErrorBody, "message">,
  ) {
    super(message);
    this.name = "ApiError";
  }

  static badRequest(message: string): ApiError {
    return new ApiError(400, message);
  }

  static unauthorized(message: string): ApiError {
    return new ApiError(401, message);
  }

  static notFound(message: string): ApiError {
    return new ApiError(404, message);
  }

  static conflict(message: string): ApiError {
    return new ApiError(409, message);
  }

  static forbidden(message: string): ApiError {
    return new ApiError(403, message);
  }

  static internalServerError(message: string): ApiError {
    return new ApiError(500, message);
  }

  static validation(message: string, errors?: unknown): ApiError {
    return new ApiError(400, message, { errors });
  }

  static oauth(
    statusCode: number,
    error: string,
    error_description: string,
  ): ApiError {
    return new ApiError(statusCode, error_description, {
      error,
      error_description,
    });
  }

  static invalidRequest(error_description: string): ApiError {
    return this.oauth(400, "invalid_request", error_description);
  }

  static invalidGrant(error_description: string): ApiError {
    return this.oauth(400, "invalid_grant", error_description);
  }

  static invalidToken(error_description: string): ApiError {
    return this.oauth(401, "invalid_token", error_description);
  }

  send(res: Response): Response {
    return res.status(this.statusCode).json({
      message: this.message,
      ...this.body,
    });
  }
}
