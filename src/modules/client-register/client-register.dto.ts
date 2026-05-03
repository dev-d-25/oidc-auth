import { z } from "zod";

export const registerClientSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  redirectUris: z.union([
    z.array(z.string().url("Invalid redirect URI")),
    z.string().transform((val) => val.split("\n").map((uri) => uri.trim()).filter((uri) => uri)),
  ]).refine((uris) => uris.length > 0, "At least one redirect URI is required"),
});

export type RegisterClientInput = z.infer<typeof registerClientSchema>;
