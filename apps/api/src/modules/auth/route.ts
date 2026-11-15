import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { dummyPasswordHash, hashPassword, verifyPassword } from '../../lib/auth.js';
import { signAccessToken } from '../../lib/token.js';
import { authMiddleware, type AuthEnv } from './middleware.js';
import {
  AuthErrorSchema,
  AuthHeaderSchema,
  AuthLoginResponseSchema,
  AuthLoginSchema,
  AuthRegisterSchema,
  AuthUserResponseSchema,
} from './schema.js';
import { createUser, findCredentialsByEmail, isUniqueViolation } from './service.js';

export const authRoute = new OpenAPIHono<AuthEnv>({
  defaultHook: (result, c) => {
    if (!result.success) {
      return c.json({ status: 'error' as const, message: 'Invalid request' }, 400);
    }
  },
});

authRoute.openapi(
  createRoute({
    method: 'post',
    path: '/register',
    tags: ['Auth'],
    operationId: 'registerUser',
    summary: 'Register a user',
    request: {
      body: {
        required: true,
        content: {
          'application/json': {
            schema: AuthRegisterSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: 'Account created',
        content: {
          'application/json': {
            schema: AuthUserResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request body',
        content: {
          'application/json': {
            schema: AuthErrorSchema,
          },
        },
      },
      409: {
        description: 'Email or username already registered',
        content: {
          'application/json': {
            schema: AuthErrorSchema,
          },
        },
      },
    },
  }),
  async (c) => {
    const { email, password, fullName, username } = c.req.valid('json');
    const passwordHash = await hashPassword(password);

    try {
      const user = await createUser({ username, email, fullName, passwordHash });
      return c.json({ status: 'ok' as const, user }, 201);
    } catch (error) {
      if (isUniqueViolation(error)) {
        return c.json({ status: 'error' as const, message: 'Could not create account' }, 409);
      }
      throw error;
    }
  },
);

authRoute.openapi(
  createRoute({
    method: 'post',
    path: '/login',
    tags: ['Auth'],
    operationId: 'loginUser',
    summary: 'Log in a user',
    request: {
      body: {
        required: true,
        content: {
          'application/json': {
            schema: AuthLoginSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Login successful',
        content: {
          'application/json': {
            schema: AuthLoginResponseSchema,
          },
        },
      },
      400: {
        description: 'Invalid request body',
        content: {
          'application/json': {
            schema: AuthErrorSchema,
          },
        },
      },
      401: {
        description: 'Invalid email or password',
        content: {
          'application/json': {
            schema: AuthErrorSchema,
          },
        },
      },
    },
  }),
  async (c) => {
    const { email, password } = c.req.valid('json');
    const credentials = await findCredentialsByEmail(email);
    const hash = credentials?.hash ?? (await dummyPasswordHash());
    const matches = await verifyPassword(hash, password).catch(() => false);

    if (credentials === null || !matches) {
      return c.json({ status: 'error' as const, message: 'Invalid email or password' }, 401);
    }

    const accessToken = await signAccessToken(credentials.id);

    return c.json(
      {
        status: 'ok' as const,
        accessToken,
        user: {
          id: credentials.id,
          username: credentials.username,
          email: credentials.email,
          fullName: credentials.fullName,
        },
      },
      200,
    );
  },
);

authRoute.openapi(
  createRoute({
    method: 'get',
    path: '/me',
    tags: ['Auth'],
    operationId: 'getCurrentUser',
    summary: 'Get the authenticated user',
    middleware: authMiddleware,
    request: {
      headers: AuthHeaderSchema,
    },
    responses: {
      200: {
        description: 'Authenticated user',
        content: {
          'application/json': {
            schema: AuthUserResponseSchema,
          },
        },
      },
      401: {
        description: 'Missing, invalid, or expired token',
        content: {
          'application/json': {
            schema: AuthErrorSchema,
          },
        },
      },
    },
  }),
  (c) => c.json({ status: 'ok' as const, user: c.get('user') }, 200),
);
