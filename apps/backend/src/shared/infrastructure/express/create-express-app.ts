import cors from 'cors';
import express, { type Express } from 'express';
import { registerSalahRoutes } from './salah-routes';
import { registerSawmRoutes } from './sawm-routes';
import { registerUserRoutes } from './user-routes';
import { registerE2eSeedRoutes } from './e2e-seed-routes';
import { runLocalLambdaHandler } from '../local/run-local-lambda-handler';

const API_VERSION = '/v1';

function registerApiRoutes(app: Express): void {
  registerSalahRoutes(app, API_VERSION, runLocalLambdaHandler);
  registerSawmRoutes(app, API_VERSION, runLocalLambdaHandler);
  registerUserRoutes(app, API_VERSION, runLocalLambdaHandler);
}

function registerOptionalRoutes(app: Express): void {
  if (process.env.ENABLE_E2E_SEED === 'true') {
    registerE2eSeedRoutes(app);
  }
}

function registerHealthRoute(app: Express): void {
  app.get('/health', function healthHandler(_req, res) {
    res.json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    });
  });
}

export function createExpressApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());
  registerApiRoutes(app);
  registerOptionalRoutes(app);
  registerHealthRoute(app);

  return app;
}
