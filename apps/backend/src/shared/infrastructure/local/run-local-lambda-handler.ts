import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import type express from 'express';
import { StatusCodes } from '@awdah/shared';
import { createLogger } from '../../middleware/logger';
import { SECURITY_HEADERS } from '../../middleware/security-headers';

const logger = createLogger('SimulationServer');
const LOCAL_CONTENT_SECURITY_POLICY =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:3000; frame-ancestors 'none'; upgrade-insecure-requests;";

export type LocalLambdaHandler = (
  event: APIGatewayProxyEventV2,
  context: Context,
) => Promise<unknown>;

export async function runLocalLambdaHandler(
  handler: LocalLambdaHandler,
  req: express.Request,
  res: express.Response,
): Promise<void> {
  const event = buildLocalEvent(req);
  const userId = req.headers['x-user-id'] as string | undefined;

  if (!canResolveLocalUserId(userId)) {
    sendMissingUserIdResponse(res);
    return;
  }

  attachLocalAuthorizer(event, resolveLocalUserId(userId));

  try {
    const result = await invokeLocalHandler(handler, event);
    sendLocalHttpResult(res, result);
  } catch (error) {
    logger.error({ err: error }, 'Handler Error');
    sendLocalErrorResponse(res);
  }
}

function canResolveLocalUserId(userId: string | undefined): boolean {
  return Boolean(userId) || process.env.DEV_AUTH_BYPASS === 'true';
}

function resolveLocalUserId(userId: string | undefined): string {
  return userId || 'local-dev-user';
}

function sendMissingUserIdResponse(res: express.Response): void {
  res
    .status(StatusCodes.UNAUTHORIZED)
    .set(SECURITY_HEADERS)
    .json({ error: { code: 'UNAUTHENTICATED', message: 'Missing x-user-id header' } });
}

function attachLocalAuthorizer(event: APIGatewayProxyEventV2, userId: string): void {
  const requestContext = event.requestContext as APIGatewayProxyEventV2['requestContext'] & {
    authorizer?: { jwt: { claims: { sub: string } } };
  };

  requestContext.authorizer = {
    jwt: {
      claims: {
        sub: userId,
      },
    },
  };

  event.requestContext = requestContext as APIGatewayProxyEventV2['requestContext'];
}

async function invokeLocalHandler(
  handler: LocalLambdaHandler,
  event: APIGatewayProxyEventV2,
): Promise<{
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
}> {
  const rawResult = await handler(event, { awsRequestId: 'local-dev-request' } as Context);
  return normalizeHttpResult(rawResult);
}

function sendLocalHttpResult(
  res: express.Response,
  result: {
    statusCode: number;
    headers?: Record<string, string>;
    body?: string;
  },
): void {
  res.status(result.statusCode).set(buildLocalResponseHeaders(result.headers)).send(result.body);
}

function buildLocalResponseHeaders(
  headers: Record<string, string> | undefined,
): Record<string, string> {
  return {
    ...headers,
    ...SECURITY_HEADERS,
    'Content-Security-Policy': LOCAL_CONTENT_SECURITY_POLICY,
  };
}

function sendLocalErrorResponse(res: express.Response): void {
  res.status(StatusCodes.INTERNAL_SERVER_ERROR).set(SECURITY_HEADERS).json({
    message: 'Internal Server Error',
  });
}

function buildLocalEvent(req: express.Request): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: `${req.method} ${req.path}`,
    rawPath: req.path,
    rawQueryString: req.originalUrl.split('?')[1] ?? '',
    headers: req.headers as Record<string, string>,
    queryStringParameters: req.query as Record<string, string>,
    requestContext: {
      accountId: 'local',
      apiId: 'local',
      domainName: 'localhost',
      domainPrefix: 'localhost',
      requestId: 'local-dev-request',
      routeKey: `${req.method} ${req.path}`,
      stage: '$default',
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
      http: {
        method: req.method,
        path: req.path,
        protocol: 'HTTP/1.1',
        sourceIp: req.ip || '127.0.0.1',
        userAgent: req.get('user-agent') || 'unknown',
      },
    } as unknown as APIGatewayProxyEventV2['requestContext'],
    body: req.method === 'GET' || req.method === 'DELETE' ? undefined : JSON.stringify(req.body),
    isBase64Encoded: false,
  };
}

function normalizeHttpResult(result: unknown): {
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
} {
  if (
    result &&
    typeof result === 'object' &&
    'statusCode' in result &&
    typeof result.statusCode === 'number'
  ) {
    return result as {
      statusCode: number;
      headers?: Record<string, string>;
      body?: string;
    };
  }

  throw new Error('Local Lambda handler returned an invalid HTTP response');
}
