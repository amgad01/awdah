import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import type express from 'express';
import { StatusCodes } from '@awdah/shared';
import { createLogger } from '../../middleware/logger';
import { SECURITY_HEADERS } from '../../middleware/security-headers';

const logger = createLogger('SimulationServer');

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

  if (!userId && process.env.DEV_AUTH_BYPASS !== 'true') {
    res
      .status(StatusCodes.UNAUTHORIZED)
      .set(SECURITY_HEADERS)
      .json({ error: { code: 'UNAUTHENTICATED', message: 'Missing x-user-id header' } });
    return;
  }

  const requestContext = event.requestContext as APIGatewayProxyEventV2['requestContext'] & {
    authorizer?: { jwt: { claims: { sub: string } } };
  };

  requestContext.authorizer = {
    jwt: {
      claims: {
        sub: userId || 'local-dev-user',
      },
    },
  };

  event.requestContext = requestContext as APIGatewayProxyEventV2['requestContext'];

  try {
    const result = normalizeHttpResult(
      await handler(event, { awsRequestId: 'local-dev-request' } as Context),
    );
    res
      .status(result.statusCode)
      .set({
        ...result.headers,
        ...SECURITY_HEADERS,
        'Content-Security-Policy':
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://localhost:3000; frame-ancestors 'none'; upgrade-insecure-requests;",
      })
      .send(result.body);
  } catch (error) {
    logger.error({ err: error }, 'Handler Error');
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .set(SECURITY_HEADERS)
      .json({ message: 'Internal Server Error' });
  }
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
