import express from 'express';
import cors from 'cors';
import { handler as logPrayerHandler } from './contexts/salah/infrastructure/handlers/log-prayer.handler';
import { handler as getSalahDebtHandler } from './contexts/salah/infrastructure/handlers/get-salah-debt.handler';
import { handler as logFastHandler } from './contexts/sawm/infrastructure/handlers/log-fast.handler';
import { handler as getSawmDebtHandler } from './contexts/sawm/infrastructure/handlers/get-sawm-debt.handler';
import { handler as addPracticingPeriodHandler } from './contexts/salah/infrastructure/handlers/add-practicing-period.handler';
import { handler as getUserSettingsHandler } from './contexts/user/infrastructure/handlers/get-user-settings.handler';
import { handler as updateUserSettingsHandler } from './contexts/user/infrastructure/handlers/update-user-settings.handler';

import { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { SECURITY_HEADERS } from './shared/middleware/security-headers';
import { StatusCodes } from '@awdah/shared';
import { createLogger } from './shared/middleware/logger';

const logger = createLogger('SimulationServer');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Helper to simulate Lambda execution
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

  // Safely add simulated authorizer data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (event.requestContext as any).authorizer = {
    jwt: {
      claims: {
        sub: req.headers['x-user-id'] || 'local-dev-user',
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
const ENDPOINTS = {
  SALAH: {
    LOG: '/salah/log',
    DEBT: '/salah/debt',
    PRACTICING_PERIOD: '/salah/practicing-period',
  },
  SAWM: {
    LOG: '/sawm/log',
    DEBT: '/sawm/debt',
  },
  USER: {
    PROFILE: '/user/profile',
  },
} as const;

// Routes
app.post(`${API_VERSION}${ENDPOINTS.SALAH.LOG}`, (req, res) =>
  runHandler(logPrayerHandler, req, res),
);
app.get(`${API_VERSION}${ENDPOINTS.SALAH.DEBT}`, (req, res) =>
  runHandler(getSalahDebtHandler, req, res),
);
app.post(`${API_VERSION}${ENDPOINTS.SAWM.LOG}`, (req, res) => runHandler(logFastHandler, req, res));
app.get(`${API_VERSION}${ENDPOINTS.SAWM.DEBT}`, (req, res) =>
  runHandler(getSawmDebtHandler, req, res),
);
app.post(`${API_VERSION}${ENDPOINTS.SALAH.PRACTICING_PERIOD}`, (req, res) =>
  runHandler(addPracticingPeriodHandler, req, res),
);

app.get(`${API_VERSION}${ENDPOINTS.USER.PROFILE}`, (req, res) =>
  runHandler(getUserSettingsHandler, req, res),
);
app.post(`${API_VERSION}${ENDPOINTS.USER.PROFILE}`, (req, res) =>
  runHandler(updateUserSettingsHandler, req, res),
);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Start server if run directly
if (require.main === module) {
  app.listen(port, () => {
    logger.info({ port }, 'Backend simulation server listening');
  });
}

export { app };
