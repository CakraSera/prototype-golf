import { MIN_REGISTRATION_PASSWORD_LENGTH } from '@golf/shared';
import { z } from '@hono/zod-openapi';

const email = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim().toLowerCase() : value),
  z.email().max(254),
);

export const AuthRegisterSchema = z
  .object({
    email,
    password: z.string().min(MIN_REGISTRATION_PASSWORD_LENGTH).max(128),
    username: z.string().trim().toLowerCase().min(1).max(32),
  })
  .openapi('AuthRegister');

export const AuthLoginSchema = z
  .object({
    email,
    password: z.string().min(1).max(128),
  })
  .openapi('AuthLogin');

export const AuthHeaderSchema = z.object({
  Authorization: z.string().openapi({ example: 'Bearer <access token>' }),
});

export const AuthUserSchema = z
  .object({
    id: z.uuid(),
    username: z.string(),
    email: z.string(),
    fullName: z.string(),
  })
  .openapi('AuthUser');

export const AuthUserResponseSchema = z
  .object({
    status: z.literal('ok'),
    user: AuthUserSchema,
  })
  .openapi('AuthUserResponse');

export const AuthLoginResponseSchema = z
  .object({
    status: z.literal('ok'),
    accessToken: z.string(),
    user: AuthUserSchema,
  })
  .openapi('AuthLoginResponse');

export const AuthErrorSchema = z
  .object({
    status: z.literal('error'),
    message: z.string(),
  })
  .openapi('AuthError');
