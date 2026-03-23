import { describe, it, expect, vi } from 'vitest';
import type { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { createHandler } from '../create-handler';

describe('create-handler', () => {
  const mockContext: Context = {
    awsRequestId: 'test-request-id',
    callbackWaitsForEmptyEventLoop: true,
    functionName: 'test-function',
    functionVersion: '1',
    invokedFunctionArn: 'arn',
    memoryLimitInMB: '128',
    logGroupName: 'log',
    logStreamName: 'stream',
    getRemainingTimeInMillis: () => 1000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };

  const createMockEvent = (body?: unknown): APIGatewayProxyEventV2 =>
    ({
      version: '2.0',
      routeKey: '$default',
      rawPath: '/test',
      rawQueryString: '',
      headers: {},
      requestContext: {
        accountId: '123456789012',
        apiId: 'api-id',
        domainName: 'id.execute-api.us-east-1.amazonaws.com',
        domainPrefix: 'id',
        http: {
          method: 'POST',
          path: '/test',
          protocol: 'HTTP/1.1',
          sourceIp: '127.0.0.1',
          userAgent: 'agent',
        },
        requestId: 'id',
        routeKey: '$default',
        stage: '$default',
        time: 'time',
        timeEpoch: 0,
        authorizer: {
          jwt: {
            claims: {
              sub: 'test-user-id',
            },
            scopes: [],
          },
        },
      },
      isBase64Encoded: false,
      body: body ? JSON.stringify(body) : undefined,
    }) as unknown as APIGatewayProxyEventV2;

  it('preserves falsy use-case results instead of replacing them with a success message', async () => {
    const useCase = {
      execute: vi.fn().mockResolvedValue(0),
    };
    const handler = createHandler('TestContext', useCase, {
      successMessage: 'Should not be used',
    });

    const result = await handler(createMockEvent({}), mockContext);
    const res = result as { statusCode: number; body: string };

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toBe(0);
    expect(useCase.execute).toHaveBeenCalledWith({ userId: 'test-user-id' });
  });

  it('falls back to the configured success message when the use case returns nullish', async () => {
    const useCase = {
      execute: vi.fn().mockResolvedValue(undefined),
    };
    const handler = createHandler('TestContext', useCase, {
      successMessage: 'All good',
    });

    const result = await handler(createMockEvent({ foo: 'bar' }), mockContext);
    const res = result as { statusCode: number; body: string };

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ message: 'All good' });
    expect(useCase.execute).toHaveBeenCalledWith({ userId: 'test-user-id', foo: 'bar' });
  });
});
