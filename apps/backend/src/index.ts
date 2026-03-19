import express from 'express';
import cors from 'cors';
import { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { SECURITY_HEADERS } from './shared/middleware/security-headers';
import { StatusCodes } from '@awdah/shared';
import { createLogger } from './shared/middleware/logger';

// Route Registers
import { registerSalahRoutes } from './shared/infrastructure/http/salah-routes';
import { registerSawmRoutes } from './shared/infrastructure/http/sawm-routes';
import { registerUserRoutes } from './shared/infrastructure/http/user-routes';

const logger = createLogger('SimulationServer');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper to simulate Lambda execution
const runHandler = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (event: APIGatewayProxyEventV2, context: Context) => Promise<any>,
  req: express.Request,
  res: express.Response,
) => {
  const event: Partial<APIGatewayProxyEventV2> = {
    body: JSON.stringify(req.body),
    headers: req.headers as Record<string, string>,
    queryStringParameters: req.query as Record<string, string>,
    rawPath: req.path,
    requestContext: {
      http: {
        method: req.method,
        path: req.path,
        protocol: 'HTTP/1.1',
        sourceIp: req.ip || '127.0.0.1',
        userAgent: req.get('user-agent') || 'unknown',
      },
    } as unknown as APIGatewayProxyEventV2['requestContext'],
  };

  // Fail closed: require explicit user identity unless dev bypass is enabled
  const userId = req.headers['x-user-id'] as string | undefined;
  if (!userId && process.env.DEV_AUTH_BYPASS !== 'true') {
    res
      .status(401)
      .set(SECURITY_HEADERS)
      .json({ error: { code: 'UNAUTHENTICATED', message: 'Missing x-user-id header' } });
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (event.requestContext as any).authorizer = {
    jwt: {
      claims: {
        sub: userId || 'local-dev-user',
      },
    },
  };

  const context: Partial<Context> = {
    awsRequestId: 'local-dev-request',
  };

  try {
    const result = await handler(event as APIGatewayProxyEventV2, context as Context);
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
};

// API Constants
const API_VERSION = '/v1';

// Register Routes
registerSalahRoutes(app, API_VERSION, runHandler);
registerSawmRoutes(app, API_VERSION, runHandler);
registerUserRoutes(app, API_VERSION, runHandler);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Start server if run directly
if (require.main === module) {
  const serverPort = typeof port === 'string' ? parseInt(port, 10) : port;
  app.listen(serverPort, '0.0.0.0', () => {
    logger.info({ port: serverPort }, 'Backend simulation server listening on 0.0.0.0');
  });
}

export { app };
