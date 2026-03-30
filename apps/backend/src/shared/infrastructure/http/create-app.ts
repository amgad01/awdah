import cors from 'cors';
import express, { type Express } from 'express';
import { registerSalahRoutes } from './salah-routes';
import { registerSawmRoutes } from './sawm-routes';
import { registerUserRoutes } from './user-routes';
import { runLocalLambdaHandler } from './local-handler-runner';

const API_VERSION = '/v1';

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  registerSalahRoutes(app, API_VERSION, runLocalLambdaHandler);
  registerSawmRoutes(app, API_VERSION, runLocalLambdaHandler);
  registerUserRoutes(app, API_VERSION, runLocalLambdaHandler);

  // E2E Support
  if (process.env.ENABLE_E2E_SEED === 'true') {
    import('./e2e-seed-routes').then(({ registerE2eSeedRoutes }) => {
      registerE2eSeedRoutes(app);
    });
  }

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  return app;
}
