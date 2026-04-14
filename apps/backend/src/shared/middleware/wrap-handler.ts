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

interface InvocationMetadata {
  path: string | undefined;
  method: string | undefined;
}

interface InvocationLogger {
  debug: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
}

export function wrapHandler<TBody extends Record<string, unknown> = Record<string, unknown>>(
  contextName: string,
  handler: AuthenticatedHandler<TBody>,
): (event: HandlerEvent, context: Context) => Promise<APIGatewayProxyResultV2> {
  // Logger is created once at cold start; a cheap child is forked per invocation to bind requestId.
  const baseLogger = createLogger(contextName);

  return async function handleInvocation(event, context) {
    const startTime = Date.now();
    const logger = createInvocationLogger(baseLogger, event, context);
    logInvocationStarted(logger);

    try {
      if (isWarmupEvent(event)) {
        return handleWarmupInvocation(event, startTime, logger);
      }

      const authenticatedRequest = buildAuthenticatedRequest<TBody>(event);
      const result = await handler(authenticatedRequest, context);
      return handleSuccessfulInvocation(result, startTime, logger);
    } catch (error) {
      return handleInvocationError(error, startTime, logger);
    }
  };
}

function createInvocationLogger(
  baseLogger: ReturnType<typeof createLogger>,
  event: HandlerEvent,
  context: Context,
): InvocationLogger {
  const metadata = getInvocationMetadata(event);

  return baseLogger.child({
    requestId: context.awsRequestId,
    path: metadata.path,
    method: metadata.method,
  });
}

function getInvocationMetadata(event: HandlerEvent): InvocationMetadata {
  if (!isHttpApiEvent(event)) {
    return {
      path: undefined,
      method: undefined,
    };
  }

  return {
    path: event.rawPath,
    method: event.requestContext?.http?.method,
  };
}

function logInvocationStarted(logger: InvocationLogger): void {
  logger.debug({}, 'invocation started');
}

function handleWarmupInvocation(
  event: WarmupEvent,
  startTime: number,
  logger: InvocationLogger,
): APIGatewayProxyResultV2 {
  const duration = Date.now() - startTime;
  logger.debug({ duration, target: event.target }, 'warmup invocation completed');

  return jsonResponse(200, { warmed: true });
}

function buildAuthenticatedRequest<TBody extends Record<string, unknown>>(
  event: APIGatewayProxyEventV2,
): AuthenticatedRequest<TBody> {
  return {
    userId: extractUserId(event),
    body: parseRequestBody<TBody>(event.body),
    query: parseRequestQuery(event),
  };
}

function parseRequestQuery(event: APIGatewayProxyEventV2): Record<string, string> {
  return (event.queryStringParameters ?? {}) as Record<string, string>;
}

function handleSuccessfulInvocation(
  result: { statusCode: number; body: unknown },
  startTime: number,
  logger: InvocationLogger,
): APIGatewayProxyResultV2 {
  const duration = Date.now() - startTime;
  logger.debug({ duration, statusCode: result.statusCode }, 'invocation completed');

  return jsonResponse(result.statusCode, result.body);
}

function handleInvocationError(
  error: unknown,
  startTime: number,
  logger: InvocationLogger,
): APIGatewayProxyResultV2 {
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
