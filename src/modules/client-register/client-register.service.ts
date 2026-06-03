import crypto from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { oauthClientsTable } from "../../db/schema.js";
import type { RegisterClientInput } from "./client-register.dto.js";

function generateClientId(): string {
  return crypto.randomUUID();
}

function generateClientSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function registerClient(input: RegisterClientInput) {
  const clientId = generateClientId();
  const clientSecret = generateClientSecret();

  const uris = Array.isArray(input.redirectUris) ? input.redirectUris : [input.redirectUris];

  await db.insert(oauthClientsTable).values({
    clientId,
    clientSecret,
    clientName: input.clientName,
    redirectUris: JSON.stringify(uris),
  });

  return {
    clientId,
    clientSecret,
    clientName: input.clientName,
    redirectUris: Array.isArray(input.redirectUris) ? input.redirectUris : [input.redirectUris],
  };
}

export async function getClientById(clientId: string) {
  const [client] = await db
    .select({
      clientId: oauthClientsTable.clientId,
      clientName: oauthClientsTable.clientName,
      redirectUris: oauthClientsTable.redirectUris,
      createdAt: oauthClientsTable.createdAt,
    })
    .from(oauthClientsTable)
    .where(eq(oauthClientsTable.clientId, clientId))
    .limit(1);

  return client
    ? { ...client, redirectUris: JSON.parse(client.redirectUris) as string[] }
    : null;
}

export async function getClientDisplayById(clientId: string) {
  const [client] = await db
    .select({
      clientId: oauthClientsTable.clientId,
      clientName: oauthClientsTable.clientName,
    })
    .from(oauthClientsTable)
    .where(eq(oauthClientsTable.clientId, clientId))
    .limit(1);

  return client || null;
}
