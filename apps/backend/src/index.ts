import { createLogger } from './shared/middleware/logger';
import { createApp } from './shared/infrastructure/http/create-app';

const logger = createLogger('SimulationServer');
const app = createApp();
const port = process.env.PORT || 3000;

// Start server if run directly
if (require.main === module) {
  const serverPort = typeof port === 'string' ? parseInt(port, 10) : port;
  app.listen(serverPort, '0.0.0.0', () => {
    logger.info({ port: serverPort }, 'Backend simulation server listening on 0.0.0.0');
  });
}

export { app };
