import type { Response } from "express";

export class ApiResponse {
  static json<T>(res: Response, data: T, statusCode = 200): Response {
    return res.status(statusCode).json(data);
  }

  static ok(res: Response, message: string, data?: unknown): Response {
    return this.json(res, { message, data }, 200);
  }

  static created(res: Response, message: string, data?: unknown): Response {
    return this.json(res, { message, data }, 201);
  }

  static redirect(res: Response, redirect: string): Response {
    return this.json(res, { redirect }, 200);
  }

  static noContent(res: Response): Response {
    return res.status(204).send();
  }
}
