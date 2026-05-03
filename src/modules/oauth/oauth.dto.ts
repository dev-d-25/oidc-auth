import { z } from "zod";

const responseTypeSchema = z.literal("code");
const pkceMethodSchema = z.enum(["S256", "plain"]);

export const authorizeSchema = z.object({
  client_id: z.string().min(1, "client_id is required"),
  redirect_uri: z.string().url("Invalid redirect_uri"),
  response_type: responseTypeSchema,
  code_challenge: z.string().min(1, "code_challenge is required"),
  code_challenge_method: pkceMethodSchema,
  state: z.string().optional(),
  scope: z.string().optional(),
  nonce: z.string().optional(),
});

export const authorizationCodeTokenSchema = z.object({
  grant_type: z.literal("authorization_code"),
  code: z.string().min(1, "code is required"),
  redirect_uri: z.string().url("Invalid redirect_uri"),
  client_id: z.string().min(1, "client_id is required"),
  code_verifier: z.string().min(1, "code_verifier is required"),
});

export const refreshTokenSchema = z.object({
  grant_type: z.literal("refresh_token"),
  refresh_token: z.string().min(1, "refresh_token is required"),
  client_id: z.string().min(1, "client_id is required"),
});

export const tokenSchema = z.union([
  authorizationCodeTokenSchema,
  refreshTokenSchema,
]);

const authorizeContextSchema = authorizeSchema.omit({
  response_type: true,
}).extend({
  response_type: responseTypeSchema.optional().default("code"),
  code_challenge_method: pkceMethodSchema.default("S256"),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "password is required"),
}).merge(authorizeContextSchema);

export const signUpSchema = z.object({
  firstName: z.string().trim().min(1, "firstName is required"),
  lastName: z.string().trim().min(1, "lastName is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "password must be at least 8 characters"),
}).merge(authorizeContextSchema);

export type AuthorizeInput = z.infer<typeof authorizeSchema>;
export type TokenInput = z.infer<typeof tokenSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
