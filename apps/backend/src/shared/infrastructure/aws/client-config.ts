import { NodeHttpHandler } from '@smithy/node-http-handler';
import * as https from 'https';

interface AwsClientConfigOptions {
  region?: string;
  endpoint?: string;
  maxAttempts?: number;
}

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 3000,
  maxSockets: 50,
});

const requestHandler = new NodeHttpHandler({
  httpsAgent,
  requestTimeout: 3000,
});

export function createAwsClientConfig({
  region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1',
  endpoint = process.env.LOCALSTACK_ENDPOINT,
  maxAttempts = 5,
}: AwsClientConfigOptions = {}) {
  return {
    region,
    ...(endpoint ? { endpoint } : {}),
    ...(endpoint
      ? {
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
          },
        }
      : {}),
    maxAttempts,
    retryMode: 'adaptive' as const,
    requestHandler,
  };
}
