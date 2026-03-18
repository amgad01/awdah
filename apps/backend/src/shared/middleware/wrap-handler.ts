import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { AppError, InternalError, UnauthenticatedError, ValidationError } from '@awdah/shared';
import { createLogger } from './logger';
import { SECURITY_HEADERS } from './security-headers';

export interface AuthenticatedRequest<
  TBody extends Record<string, unknown> = Record<string, unknown>,
> {
  userId: string;
  body: TBody;
  query: Record<string, string>;
}

export type AuthenticatedHandler<TBody extends Record<string, unknown> = Record<string, unknown>> =
  (
    req: AuthenticatedRequest<TBody>,
    context: Context,
  ) => Promise<{ statusCode: number; body: unknown }>;

export function wrapHandler<TBody extends Record<string, unknown> = Record<string, unknown>>(
  contextName: string,
  handler: AuthenticatedHandler<TBody>,
): (event: APIGatewayProxyEventV2, context: Context) => Promise<APIGatewayProxyResultV2> {
  // Logger is created once at cold start; a cheap child is forked per invocation to bind requestId.
  const baseLogger = createLogger(contextName);

  return async (event, context) => {
    const logger = baseLogger.child({ requestId: context.awsRequestId });
    const startTime = Date.now();

    logger.info(
      { path: event.rawPath, method: event.requestContext?.http?.method },
      'invocation started',
    );

    try {
      // 1. Extract User Identity — HTTP API JWT authorizer always populates authorizer.jwt.claims
      const authorizer = (
        event.requestContext as unknown as { authorizer?: Record<string, unknown> }
      ).authorizer;

      const jwt = authorizer?.jwt as Record<string, unknown> | undefined;
      const claims = jwt?.claims as Record<string, string> | undefined;
      const userId = claims?.sub;
      if (!userId) {
        throw new UnauthenticatedError('Missing user identity');
      }

      // 2. Parse Body if present
      let body: TBody = {} as TBody;
      if (event.body) {
        try {
          body = JSON.parse(event.body);
        } catch {
          throw new ValidationError('Invalid JSON body');
        }
      }

      // 3. Execute Handler
      const query = (event.queryStringParameters ?? {}) as Record<string, string>;
      const result = await handler({ userId, body, query }, context);

      const duration = Date.now() - startTime;
      logger.info({ duration, statusCode: result.statusCode }, 'invocation completed');

      return {
        statusCode: result.statusCode,
        headers: {
          'Content-Type': 'application/json',
          ...SECURITY_HEADERS,
        },
        body: JSON.stringify(result.body),
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof AppError) {
        logger.warn({ duration, code: error.code, statusCode: error.statusCode }, error.message);
        return {
          statusCode: error.statusCode,
          headers: {
            'Content-Type': 'application/json',
            ...SECURITY_HEADERS,
          },
          body: JSON.stringify(error.toJSON()),
        };
      }

      const unexpectedError = error instanceof Error ? error : new Error(String(error));
      logger.error({ duration, err: unexpectedError }, 'unexpected error');

      const internalError = new InternalError('An unexpected error occurred');
      return {
        statusCode: internalError.statusCode,
        headers: {
          'Content-Type': 'application/json',
          ...SECURITY_HEADERS,
        },
        body: JSON.stringify(internalError.toJSON()),
      };
    }
  };
}
