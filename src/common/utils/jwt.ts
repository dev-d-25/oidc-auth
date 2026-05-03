import JWT from "jsonwebtoken";
import jose from "node-jose";
import { PRIVATE_KEY, PUBLIC_KEY } from "./cert.js";

export function signJwt(
  payload: Record<string, unknown>,
  expiresIn = "1h",
): string {
  const options: JWT.SignOptions = {
    algorithm: "RS256",
  };

  if (payload.exp === undefined) {
    options.expiresIn = expiresIn as JWT.SignOptions["expiresIn"];
  }

  return JWT.sign(payload, PRIVATE_KEY, options);
}

export function verifyJwt(token: string): Record<string, unknown> {
  return JWT.verify(token, PUBLIC_KEY, {
    algorithms: ["RS256"],
  }) as Record<string, unknown>;
}

export async function getJwks() {
  const key = await jose.JWK.asKey(PUBLIC_KEY, "pem");
  return { keys: [key.toJSON()] };
}
