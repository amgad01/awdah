import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { AppError, InternalError, UnauthenticatedError, ValidationError } from '@awdah/shared';
import { createLogger } from './logger';
import { SECURITY_HEADERS } from './security-headers';

const JSON_RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  ...SECURITY_HEADERS,
};

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

export interface WarmupEvent {
  warmup?: boolean;
  source?: string;
  target?: string;
}

export type HandlerEvent = APIGatewayProxyEventV2 | WarmupEvent;

export function wrapHandler<TBody extends Record<string, unknown> = Record<string, unknown>>(
  contextName: string,
  handler: AuthenticatedHandler<TBody>,
): (event: HandlerEvent, context: Context) => Promise<APIGatewayProxyResultV2> {
  // Logger is created once at cold start; a cheap child is forked per invocation to bind requestId.
  const baseLogger = createLogger(contextName);

  return async (event, context) => {
    const startTime = Date.now();
    const path = isHttpApiEvent(event) ? event.rawPath : undefined;
    const method = isHttpApiEvent(event) ? event.requestContext?.http?.method : undefined;

    const logger = baseLogger.child({
      requestId: context.awsRequestId,
      path,
      method,
    });

    logger.debug('invocation started');

    try {
      if (isWarmupEvent(event)) {
        const duration = Date.now() - startTime;
        logger.debug({ duration, target: event.target }, 'warmup invocation completed');
        return jsonResponse(200, { warmed: true });
      }

      const userId = extractUserId(event);
      const body = parseRequestBody<TBody>(event.body);

      // 3. Execute Handler
      const query = (event.queryStringParameters ?? {}) as Record<string, string>;
      const result = await handler({ userId, body, query }, context);

      const duration = Date.now() - startTime;
      logger.debug({ duration, statusCode: result.statusCode }, 'invocation completed');

      return jsonResponse(result.statusCode, result.body);
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof AppError) {
        logger.warn({ duration, code: error.code, statusCode: error.statusCode }, error.message);
        return jsonResponse(error.statusCode, error.toJSON());
      }

      const unexpectedError = error instanceof Error ? error : new Error(String(error));
      logger.error({ duration, err: unexpectedError }, 'unexpected error');

      const internalError = new InternalError('An unexpected error occurred');
      return jsonResponse(internalError.statusCode, internalError.toJSON());
    }
  };
}

function isHttpApiEvent(event: HandlerEvent): event is APIGatewayProxyEventV2 {
  return 'rawPath' in event && 'requestContext' in event;
}

function isWarmupEvent(event: HandlerEvent): event is WarmupEvent {
  return !isHttpApiEvent(event) && event.warmup === true;
}

function extractUserId(event: APIGatewayProxyEventV2): string {
  // HTTP API JWT authorizer always populates authorizer.jwt.claims when auth succeeds.
  const authorizer = (event.requestContext as unknown as { authorizer?: Record<string, unknown> })
    .authorizer;
  const jwt = authorizer?.jwt as Record<string, unknown> | undefined;
  const claims = jwt?.claims as Record<string, string> | undefined;
  const userId = claims?.sub;

  if (!userId) {
    throw new UnauthenticatedError('Missing user identity');
  }

  return userId;
}

function parseRequestBody<TBody extends Record<string, unknown>>(rawBody?: string): TBody {
  if (!rawBody) {
    return {} as TBody;
  }

  try {
    return JSON.parse(rawBody) as TBody;
  } catch {
    throw new ValidationError('Invalid JSON body');
  }
}

function jsonResponse(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: JSON_RESPONSE_HEADERS,
    body: JSON.stringify(body),
  };
}
